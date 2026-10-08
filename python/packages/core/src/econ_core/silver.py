"""Silver version coexistence and the serving-version choice (JRN-logic-backfill)."""

from __future__ import annotations

from collections.abc import Iterable, Mapping
from datetime import UTC, datetime

from econ_core import domain
from econ_core.storage import LakeStore

DECISIONS = ("publish", "rollback")


def analysis_key(row: dict) -> tuple[str, str]:
    return (row["record_id"], row["analyzer_version"])


def grouping_keys(row: dict) -> list[str]:
    """The keys aggregation counts an analysis under: its categories, or — for a row
    with no category judgement — its narrative subjects. Serving's ``groupingKeys``
    mirrors this; the two must agree or a Gold row's articles cannot be found again."""
    categories = row.get("subject_categories")
    return categories if categories is not None else row["narrative_subjects"]


def _partition_of(cycles: Mapping[str, str], record_id: str) -> dict[str, str]:
    return domain.cycle_partition(cycles[record_id])


class BronzeCycles(Mapping[str, str]):
    """``record_id -> collection_cycle`` over all of Bronze, read on first lookup.

    For callers that need the whole-lake mapping only on a rare path (a legacy file to
    migrate), so the common path never pays for reading every cycle.
    """

    def __init__(self, store: LakeStore) -> None:
        self._store = store
        self._cycles: dict[str, str] | None = None

    def _load(self) -> dict[str, str]:
        if self._cycles is None:
            bronze = (domain.BRONZE, domain.DS_NEWS_ITEM)
            self._cycles = {
                item["record_id"]: item["collection_cycle"]
                for partition in self._store.partitions(*bronze)
                for item in self._store.read_partition(*bronze, partition)
            }
        return self._cycles

    def __getitem__(self, record_id: str) -> str:
        return self._load()[record_id]

    def __iter__(self):
        return iter(self._load())

    def __len__(self) -> int:
        return len(self._load())


def cycles_of(bronze: Iterable[dict]) -> dict[str, str]:
    """``record_id -> collection_cycle`` — where each record's Silver rows live."""
    return {item["record_id"]: item["collection_cycle"] for item in bronze}


def store_analyses(
    store: LakeStore,
    cycles: Mapping[str, str],
    rows: Iterable[dict],
    *,
    coexist: bool = True,
    keep_versions: Iterable[str] = (),
) -> tuple[int, int]:
    """Upsert ``rows`` into Silver by ``(record_id, analyzer_version)``."""
    protected = set(keep_versions)
    by_partition: dict[tuple[tuple[str, str], ...], list[dict]] = {}
    for row in rows:
        partition = _partition_of(cycles, row["record_id"])
        by_partition.setdefault(tuple(partition.items()), []).append(row)

    total = pruned = 0
    for key, written in by_partition.items():
        partition = dict(key)
        merged: dict[tuple[str, str], dict] = {}
        for row in store.read_partition(domain.SILVER, domain.DS_ANALYSIS, partition):
            rid = row["record_id"]
            if rid not in cycles or _partition_of(cycles, rid) != partition:
                pruned += 1
                continue
            merged[analysis_key(row)] = row
        if not coexist:
            touched = {r["record_id"] for r in written}
            for k in [k for k in merged if k[0] in touched and k[1] not in protected]:
                del merged[k]
                pruned += 1
        for row in written:
            merged[analysis_key(row)] = row
        ordered = sorted(merged.values(), key=lambda r: (r["record_id"], r["analyzer_version"]))
        total += store.write_partition(domain.SILVER, domain.DS_ANALYSIS, partition, ordered)
    return total, pruned


def prune_orphans(store: LakeStore, cycles: Mapping[str, str]) -> tuple[int, int]:
    """Drop Silver rows whose record Bronze no longer holds in the same cycle."""
    total = pruned = 0
    for partition in store.partitions(domain.SILVER, domain.DS_ANALYSIS):
        rows = store.read_partition(domain.SILVER, domain.DS_ANALYSIS, partition)
        kept = [
            r
            for r in rows
            if r["record_id"] in cycles and _partition_of(cycles, r["record_id"]) == partition
        ]
        if len(kept) != len(rows):
            store.write_partition(domain.SILVER, domain.DS_ANALYSIS, partition, kept)
            pruned += len(rows) - len(kept)
        total += len(kept)
    return total, pruned


def pending_retries(store: LakeStore, version: str) -> set[str]:
    """Records whose row at ``version`` is unanalyzed because the model call failed."""
    return {
        row["record_id"]
        for row in store.iter_records(domain.SILVER, domain.DS_ANALYSIS_RETRY)
        if row["analyzer_version"] == version
    }


def pending_retry_cycles(store: LakeStore, version: str) -> set[str]:
    """Cycles holding a pending retry at ``version`` — a cycle in this set is not settled.

    A retry written before retries named their cycle is left out: the first incremental
    run visits every cycle, and visiting a retry's cycle rewrites it with its cycle.
    """
    return {
        row["collection_cycle"]
        for row in store.iter_records(domain.SILVER, domain.DS_ANALYSIS_RETRY)
        if row["analyzer_version"] == version and row.get("collection_cycle")
    }


def record_retries(
    store: LakeStore,
    cycle: str,
    present: Iterable[str],
    version: str,
    analyzed: Iterable[str],
    failed: Iterable[str],
) -> int:
    """Update the retry list after writing a batch of ``cycle``: ``failed`` records join
    it, the rest of ``analyzed`` leave it, and the cycle's retries whose record is not
    in ``present`` (the cycle's Bronze) drop out. Retries of other cycles are kept as
    they are. Returns the list's size.
    """
    present = set(present)
    failed = set(failed)
    done = set(analyzed) - failed
    kept: dict[tuple[str, str], str | None] = {}
    for row in store.iter_records(domain.SILVER, domain.DS_ANALYSIS_RETRY):
        rid, row_version, row_cycle = (
            row["record_id"],
            row["analyzer_version"],
            row.get("collection_cycle"),
        )
        mine = row_cycle == cycle or (row_cycle is None and rid in present)
        if mine and (rid not in present or (row_version == version and rid in done)):
            continue
        kept[(rid, row_version)] = cycle if mine else row_cycle
    for rid in failed:
        kept[(rid, version)] = cycle
    rows = [
        {"record_id": rid, "analyzer_version": v, "collection_cycle": c}
        for (rid, v), c in sorted(kept.items())
    ]
    return store.write_records(domain.SILVER, domain.DS_ANALYSIS_RETRY, rows)


def read_settled(store: LakeStore, version: str) -> dict[str, dict]:
    """``cycle -> settled mark`` of every cycle fully analyzed at ``version``.

    A mark holds the Bronze and Silver partition signatures seen when the cycle settled;
    the mark only stands while both signatures still match (:func:`still_settled`).
    """
    return {
        row["collection_cycle"]: row
        for row in store.iter_records(domain.SILVER, domain.DS_ANALYSIS_SETTLED)
        if row["analyzer_version"] == version
    }


def still_settled(store: LakeStore, mark: dict | None, partition: Mapping[str, str]) -> bool:
    """True when neither partition of ``mark``'s cycle was rewritten since it settled."""
    return (
        mark is not None
        and mark["bronze_signature"]
        == store.partition_signature(domain.BRONZE, domain.DS_NEWS_ITEM, partition)
        and mark["silver_signature"]
        == store.partition_signature(domain.SILVER, domain.DS_ANALYSIS, partition)
    )


def mark_settled(
    store: LakeStore,
    version: str,
    cycle: str,
    *,
    settled: bool,
    bronze_count: int = 0,
    silver_count: int = 0,
) -> None:
    """Record (``settled``) or clear the settled mark of ``cycle`` at ``version``."""
    marks: list[dict] = []
    had_mark = False
    for row in store.iter_records(domain.SILVER, domain.DS_ANALYSIS_SETTLED):
        if (row["analyzer_version"], row["collection_cycle"]) == (version, cycle):
            had_mark = True
        else:
            marks.append(row)
    if not settled and not had_mark:
        return
    if settled:
        partition = domain.cycle_partition(cycle)
        marks.append(
            {
                "analyzer_version": version,
                "collection_cycle": cycle,
                "bronze_signature": store.partition_signature(
                    domain.BRONZE, domain.DS_NEWS_ITEM, partition
                ),
                "silver_signature": store.partition_signature(
                    domain.SILVER, domain.DS_ANALYSIS, partition
                ),
                "bronze_count": bronze_count,
                "silver_count": silver_count,
            }
        )
    marks.sort(key=lambda r: (r["analyzer_version"], r["collection_cycle"]))
    store.write_records(domain.SILVER, domain.DS_ANALYSIS_SETTLED, marks)


def read_analyses(store: LakeStore) -> list[dict]:
    return store.read_partitions(domain.SILVER, domain.DS_ANALYSIS)


def records_of_run(store: LakeStore, run_id: str) -> list[dict]:
    """Silver rows written by one run — the reverse of a row's ``run_id`` (AC4.3).

    The list is derived from the rows rather than kept on the run record, because a
    whole-lake run touches as many records as the lake holds and each stage rewrites
    its run record in place (:mod:`econ_core.runlog`): carrying the list there would
    grow one object without bound and state twice a fact the rows already carry. A
    scan is what makes the two directions the *same* fact read from two ends.
    """
    return [row for row in read_analyses(store) if row.get("run_id") == run_id]


def migrate_legacy(store: LakeStore, cycles: Mapping[str, str]) -> int:
    """Move a legacy ``silver/analysis.jsonl`` into cycle partitions; orphans are dropped."""
    return store.migrate_records_to_partitions(
        domain.SILVER,
        domain.DS_ANALYSIS,
        lambda row: _partition_of(cycles, row["record_id"]) if row["record_id"] in cycles else None,
    )


def newest_row(rows: list[dict]) -> dict:
    return max(rows, key=lambda r: (r["analyzed_at"], r["analyzer_version"]))


def select_serving(silver: list[dict], serving_version: str | None) -> list[dict]:
    """One Silver row per record: the serving version's when present, else the newest."""
    by_record: dict[str, list[dict]] = {}
    for row in silver:
        by_record.setdefault(row["record_id"], []).append(row)
    chosen: list[dict] = []
    for rows in by_record.values():
        pick = None
        if serving_version:
            pick = next((r for r in rows if r["analyzer_version"] == serving_version), None)
        chosen.append(pick or newest_row(rows))
    return chosen


def read_decisions(store: LakeStore) -> list[dict]:
    return store.read_records(domain.SILVER, domain.DS_REPROCESS_DECISION)


def serving_version(store: LakeStore) -> str | None:
    decisions = read_decisions(store)
    return decisions[-1]["analyzer_version"] if decisions else None


def record_decision(
    store: LakeStore, decision: str, version: str, memo: str, notify_consumer: bool
) -> dict:
    """Append one publish/rollback decision. Both the choice and its reason are required:
    a decision without a memo cannot explain later why the numbers changed."""
    if decision not in DECISIONS:
        raise ValueError(f"decision must be one of {DECISIONS}, got {decision!r}")
    if not version.strip():
        raise ValueError("a decision names the analyzer version it serves")
    if not memo.strip():
        raise ValueError("a decision is recorded with its reason (memo)")
    row = {
        "decided_at": datetime.now(UTC).replace(microsecond=0).isoformat(),
        "decision": decision,
        "analyzer_version": version.strip(),
        "memo": memo.strip(),
        "notify_consumer": bool(notify_consumer),
    }
    existing = read_decisions(store)
    store.write_records(domain.SILVER, domain.DS_REPROCESS_DECISION, [*existing, row])
    return row
