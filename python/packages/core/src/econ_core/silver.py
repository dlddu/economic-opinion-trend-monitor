"""Silver version coexistence and the serving-version choice (JRN-logic-backfill).

Silver holds one ``Analysis`` row per ``(record_id, analyzer_version)``. A run at a
new version adds rows beside the old ones instead of replacing the dataset, which is
what makes 「재처리 전후 비교」 and 「이전 버전으로 되돌리기」 possible at all
(``STP-run-reprocess``: 로직 버전을 붙여 병존시키고 Gold 에서 어느 버전을 서빙할지
선택). Two rules keep the dataset bounded and traceable:

- a row is replaced, not duplicated, when the same record is analyzed again at the
  same version — so a resumed run never double-counts (체크포인트 재개);
- rows whose ``record_id`` Bronze no longer holds are dropped on every write — every
  Silver row stays traceable to its Bronze observation (AC2.6 추적 키 보존율 100%).

Which version reaches Gold is a recorded decision (``reprocess_decision``): the last
``publish``/``rollback`` names the serving version, and aggregation takes that
version's row for every record that has one, falling back to the record's newest
row otherwise so a partially reprocessed range never disappears from the charts.
"""

from __future__ import annotations

from collections.abc import Iterable
from datetime import UTC, datetime

from econ_core import domain
from econ_core.storage import LakeStore

DECISIONS = ("publish", "rollback")


def analysis_key(row: dict) -> tuple[str, str]:
    return (row["record_id"], row["analyzer_version"])


def store_analyses(
    store: LakeStore, bronze_ids: Iterable[str], rows: Iterable[dict]
) -> tuple[int, int]:
    """Upsert ``rows`` into Silver by ``(record_id, analyzer_version)``.

    Returns ``(rows now in Silver, rows pruned)`` — the pruned count is how many
    existing rows pointed at a Bronze record that is gone.
    """
    keep = set(bronze_ids)
    merged: dict[tuple[str, str], dict] = {}
    pruned = 0
    for row in store.read_records(domain.SILVER, domain.DS_ANALYSIS):
        if row["record_id"] not in keep:
            pruned += 1
            continue
        merged[analysis_key(row)] = row
    for row in rows:
        merged[analysis_key(row)] = row
    ordered = sorted(merged.values(), key=lambda r: (r["record_id"], r["analyzer_version"]))
    return store.write_records(domain.SILVER, domain.DS_ANALYSIS, ordered), pruned


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
