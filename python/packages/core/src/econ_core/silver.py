"""Silver version coexistence and the serving-version choice (JRN-logic-backfill).

Silver holds one ``Analysis`` row per ``(record_id, analyzer_version)``. Two kinds of
run write it, and they differ in what happens to a record's *other* versions:

- a **scoped reprocess** (JRN-logic-backfill: a range, a sample) adds its rows beside
  the ones already there — 「로직 버전을 붙여 병존시키고 Gold 에서 어느 버전을 서빙할지
  선택」 (``STP-run-reprocess``). Coexistence is what the before/after comparison and
  a rollback read.
- a **whole-lake run** (the hourly pipeline) is AC2.6's 「재분석 = Silver 갱신」: the
  records it analyzes end up with that run's row and the versions it supersedes are
  retired — except the version a recorded decision currently serves, which stays so
  Gold keeps serving what was published until someone rolls it back.

Two rules hold for both: a row is replaced, not duplicated, when the same record is
analyzed again at the same version (a resumed run never double-counts), and rows
whose ``record_id`` Bronze no longer holds are dropped (:func:`prune_orphans`) —
every Silver row stays traceable to its Bronze observation (AC2.6 추적 키 보존율 100%).

Silver is partitioned like Bronze, by the collection cycle of the observation a row
analyzes (:func:`econ_core.domain.cycle_partition`), so a write rewrites only the
cycles it touched.

Which version reaches Gold is a recorded decision (``reprocess_decision``): the last
``publish``/``rollback`` names the serving version, and aggregation takes that
version's row for every record that has one, falling back to the record's newest
row otherwise so a partially reprocessed range never disappears from the charts.
"""

from __future__ import annotations

from collections.abc import Iterable, Mapping
from datetime import UTC, datetime

from econ_core import domain
from econ_core.storage import LakeStore

DECISIONS = ("publish", "rollback")


def analysis_key(row: dict) -> tuple[str, str]:
    return (row["record_id"], row["analyzer_version"])


def _partition_of(cycles: Mapping[str, str], record_id: str) -> dict[str, str]:
    return domain.cycle_partition(cycles[record_id])


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
    """Upsert ``rows`` into Silver by ``(record_id, analyzer_version)``.

    ``cycles`` is :func:`cycles_of` the current Bronze. Only the partitions of the
    rows' cycles are read and rewritten.

    With ``coexist`` (a scoped reprocess) every other version of a record survives.
    Without it (a whole-lake run) the records in ``rows`` keep only the version just
    written — plus any version in ``keep_versions`` (the serving version).

    Returns ``(rows now in the touched partitions, rows pruned)``; pruned counts rows
    dropped because their Bronze record is gone or their version was retired.
    """
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
    """Drop Silver rows whose record Bronze no longer holds in the same cycle.

    Reads every partition but rewrites only those that lose rows. Returns
    ``(rows now in Silver, rows pruned)``.
    """
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


def read_analyses(store: LakeStore) -> list[dict]:
    return store.read_partitions(domain.SILVER, domain.DS_ANALYSIS)


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
