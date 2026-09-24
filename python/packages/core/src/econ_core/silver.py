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
whose ``record_id`` Bronze no longer holds are dropped — every Silver row stays
traceable to its Bronze observation (AC2.6 추적 키 보존율 100%).

Silver is partitioned like Bronze: a row lives in the partition of its record's
collection cycle (``partition_of`` maps every Bronze ``record_id`` to it). A write
rewrites only the partitions its rows fall in, so an hourly run costs its own cycle,
not the whole history; :func:`reconcile` is the once-per-run pass that prunes rows
Bronze no longer holds across every partition.

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


def reconcile(store: LakeStore, partition_of: Mapping[str, str]) -> int:
    """Bring Silver in line with Bronze; return the rows pruned.

    Rows still in the unpartitioned file move to their record's partition, and rows
    whose ``record_id`` Bronze no longer holds (or that sit in another partition than
    their record's) are dropped. Partitions with nothing to drop are not rewritten.
    """
    _, pruned = store.partition_flat(
        domain.SILVER, domain.DS_ANALYSIS, lambda row: partition_of.get(row["record_id"])
    )
    for partition in store.partitions(domain.SILVER, domain.DS_ANALYSIS):
        rows = store.read_partition(domain.SILVER, domain.DS_ANALYSIS, partition)
        kept = [r for r in rows if partition_of.get(r["record_id"]) == partition]
        if len(kept) != len(rows):
            store.write_partition(domain.SILVER, domain.DS_ANALYSIS, partition, kept)
            pruned += len(rows) - len(kept)
    return pruned


def store_analyses(
    store: LakeStore,
    partition_of: Mapping[str, str],
    rows: Iterable[dict],
    *,
    coexist: bool = True,
    keep_versions: Iterable[str] = (),
) -> tuple[int, int]:
    """Upsert ``rows`` into Silver by ``(record_id, analyzer_version)``.

    With ``coexist`` (a scoped reprocess) every other version of a record survives.
    Without it (a whole-lake run) the records in ``rows`` keep only the version just
    written — plus any version in ``keep_versions`` (the serving version).

    Only the partitions ``rows`` fall in are read and rewritten. Returns ``(rows now in
    those partitions, rows pruned)``; pruned counts rows dropped because their Bronze
    record is gone or their version was retired.
    """
    protected = set(keep_versions)
    by_partition: dict[str, list[dict]] = {}
    for row in rows:
        by_partition.setdefault(partition_of[row["record_id"]], []).append(row)

    written = pruned = 0
    for partition, fresh in sorted(by_partition.items()):
        merged: dict[tuple[str, str], dict] = {}
        for row in store.read_partition(domain.SILVER, domain.DS_ANALYSIS, partition):
            if partition_of.get(row["record_id"]) != partition:
                pruned += 1
                continue
            merged[analysis_key(row)] = row
        if not coexist:
            touched = {r["record_id"] for r in fresh}
            for key in [k for k in merged if k[0] in touched and k[1] not in protected]:
                del merged[key]
                pruned += 1
        for row in fresh:
            merged[analysis_key(row)] = row
        ordered = sorted(merged.values(), key=lambda r: (r["record_id"], r["analyzer_version"]))
        written += store.write_partition(domain.SILVER, domain.DS_ANALYSIS, partition, ordered)
    return written, pruned


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
