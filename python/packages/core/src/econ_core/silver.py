"""Silver version coexistence and the serving-version choice (JRN-logic-backfill)."""

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
        for row in store.read_records(domain.SILVER, domain.DS_ANALYSIS_RETRY)
        if row["analyzer_version"] == version
    }


def record_retries(
    store: LakeStore,
    cycles: Mapping[str, str],
    version: str,
    analyzed: Iterable[str],
    failed: Iterable[str],
) -> int:
    """Update the retry list after writing a batch: ``failed`` records join it, the rest
    of ``analyzed`` leave it, and records Bronze no longer holds drop out. Returns its size.
    """
    failed = set(failed)
    done = set(analyzed) - failed
    kept = {
        (row["record_id"], row["analyzer_version"])
        for row in store.read_records(domain.SILVER, domain.DS_ANALYSIS_RETRY)
        if row["record_id"] in cycles
        and not (row["analyzer_version"] == version and row["record_id"] in done)
    }
    kept |= {(rid, version) for rid in failed}
    rows = [{"record_id": rid, "analyzer_version": v} for rid, v in sorted(kept)]
    return store.write_records(domain.SILVER, domain.DS_ANALYSIS_RETRY, rows)


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
