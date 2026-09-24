"""Silver version coexistence and the serving-version choice (JRN-logic-backfill)."""

import json
from pathlib import Path

import pytest
from econ_core import domain, open_store, silver


def _row(rid: str, version: str, analyzed_at: str, subjects: list[str]) -> dict:
    return {
        "record_id": rid,
        "source_url": f"https://ex.test/{rid}",
        "target_countries": ["KR"],
        "narrative_subjects": subjects,
        "sentiment": "neutral",
        "analysis_status": "analyzed",
        "confidence": 0.9,
        "analyzed_at": analyzed_at,
        "analyzer_version": version,
    }


P14 = "date=2026-06-23/hour=14"
P15 = "date=2026-06-23/hour=15"
BOTH = {"r1": P14, "r2": P14}


def test_versions_coexist_and_same_key_is_replaced(tmp_path: Path) -> None:
    store = open_store(tmp_path)
    silver.store_analyses(
        store, BOTH, [_row("r1", "v1", "t1", ["a"]), _row("r2", "v1", "t1", ["a"])]
    )
    # A second version lands beside the first — STP-run-reprocess 「병존」.
    written, pruned = silver.store_analyses(store, BOTH, [_row("r1", "v2", "t2", ["b"])])
    assert (written, pruned) == (3, 0)
    # The same record at the same version is one row, not two (resume never double-counts).
    written, _ = silver.store_analyses(store, BOTH, [_row("r1", "v2", "t3", ["c"])])
    rows = store.read_records(domain.SILVER, domain.DS_ANALYSIS)
    assert written == 3
    assert [r["narrative_subjects"] for r in rows if r["record_id"] == "r1"] == [["a"], ["c"]]


def test_whole_lake_write_retires_superseded_versions_except_the_kept_one(tmp_path: Path) -> None:
    store = open_store(tmp_path)
    silver.store_analyses(
        store, BOTH, [_row("r1", "v1", "t1", ["a"]), _row("r2", "v1", "t1", ["a"])]
    )
    silver.store_analyses(store, BOTH, [_row("r1", "v2", "t2", ["b"])])
    # A whole-lake run at v3 that touches only r1: r1's v1 goes, its v2 stays because it
    # is the served version; r2 is untouched.
    written, pruned = silver.store_analyses(
        store, BOTH, [_row("r1", "v3", "t3", ["c"])], coexist=False, keep_versions=["v2"]
    )
    rows = store.read_records(domain.SILVER, domain.DS_ANALYSIS)
    assert (written, pruned) == (3, 1)
    assert sorted((r["record_id"], r["analyzer_version"]) for r in rows) == [
        ("r1", "v2"),
        ("r1", "v3"),
        ("r2", "v1"),
    ]


def test_rows_without_a_bronze_record_are_pruned(tmp_path: Path) -> None:
    store = open_store(tmp_path)
    silver.store_analyses(
        store, BOTH, [_row("r1", "v1", "t1", ["a"]), _row("r2", "v1", "t1", ["a"])]
    )
    # Bronze dropped r2: its Silver rows can no longer be traced back (AC2.6), so they go.
    assert silver.reconcile(store, {"r1": P14}) == 1
    assert {r["record_id"] for r in store.read_records(domain.SILVER, domain.DS_ANALYSIS)} == {"r1"}


def test_a_write_rewrites_only_the_partitions_its_rows_fall_in(tmp_path: Path) -> None:
    store = open_store(tmp_path)
    cycles = {"r1": P14, "r2": P15}
    silver.store_analyses(
        store, cycles, [_row("r1", "v1", "t1", ["a"]), _row("r2", "v1", "t1", ["a"])]
    )
    assert store.partitions(domain.SILVER, domain.DS_ANALYSIS) == [P14, P15]
    earlier = store.partition_path(domain.SILVER, domain.DS_ANALYSIS, P14)
    before = earlier.stat().st_mtime_ns

    written, _ = silver.store_analyses(store, cycles, [_row("r2", "v2", "t2", ["b"])])
    assert written == 2  # rows now in the one partition that was rewritten
    assert earlier.stat().st_mtime_ns == before


def test_reconcile_moves_an_unpartitioned_silver_into_partitions(tmp_path: Path) -> None:
    store = open_store(tmp_path)
    store.write_records(
        domain.SILVER,
        domain.DS_ANALYSIS,
        [
            _row("r1", "v1", "t1", ["a"]),
            _row("r2", "v1", "t1", ["a"]),
            _row("gone", "v1", "t1", []),
        ],
    )
    assert silver.reconcile(store, {"r1": P14, "r2": P15}) == 1
    assert not store.path(domain.SILVER, domain.DS_ANALYSIS).exists()
    assert [
        r["record_id"] for r in store.read_partition(domain.SILVER, domain.DS_ANALYSIS, P14)
    ] == ["r1"]
    assert [
        r["record_id"] for r in store.read_partition(domain.SILVER, domain.DS_ANALYSIS, P15)
    ] == ["r2"]


def test_select_serving_prefers_the_serving_version_and_falls_back_to_newest() -> None:
    rows = [
        _row("r1", "v1", "2026-09-21T10:00:00+00:00", ["a"]),
        _row("r1", "v2", "2026-09-21T11:00:00+00:00", ["b"]),
        _row("r2", "v1", "2026-09-21T10:00:00+00:00", ["a"]),
    ]
    served = {r["record_id"]: r["analyzer_version"] for r in silver.select_serving(rows, "v1")}
    assert served == {"r1": "v1", "r2": "v1"}
    # Serving v2: r2 was never reprocessed, so its newest (v1) row still serves.
    served = {r["record_id"]: r["analyzer_version"] for r in silver.select_serving(rows, "v2")}
    assert served == {"r1": "v2", "r2": "v1"}
    # No decision at all: the newest row of every record.
    served = {r["record_id"]: r["analyzer_version"] for r in silver.select_serving(rows, None)}
    assert served == {"r1": "v2", "r2": "v1"}


def test_decision_log_names_the_serving_version(tmp_path: Path) -> None:
    store = open_store(tmp_path)
    assert silver.serving_version(store) is None
    silver.record_decision(store, "publish", "v2", "의도한 개선", True)
    assert silver.serving_version(store) == "v2"
    silver.record_decision(store, "rollback", "v1", "설명되지 않는 변화", False)
    assert silver.serving_version(store) == "v1"
    log = store.read_records(domain.SILVER, domain.DS_REPROCESS_DECISION)
    assert [d["decision"] for d in log] == ["publish", "rollback"]
    assert log[1]["notify_consumer"] is False


def test_decision_requires_a_choice_a_version_and_a_memo(tmp_path: Path) -> None:
    store = open_store(tmp_path)
    with pytest.raises(ValueError):
        silver.record_decision(store, "keep", "v2", "memo", True)
    with pytest.raises(ValueError):
        silver.record_decision(store, "publish", " ", "memo", True)
    with pytest.raises(ValueError):
        silver.record_decision(store, "publish", "v2", "  ", True)
    assert not (tmp_path / "silver" / "reprocess_decision.jsonl").exists()


def test_write_records_leaves_no_partial_file_behind(tmp_path: Path) -> None:
    store = open_store(tmp_path)
    store.write_records("gold", "x", [{"a": 1}])
    store.write_records("gold", "x", [{"a": 2}, {"a": 3}])
    files = sorted(p.name for p in (tmp_path / "gold").iterdir())
    assert files == ["x.jsonl"]
    assert [
        json.loads(line) for line in (tmp_path / "gold" / "x.jsonl").read_text().splitlines()
    ] == [
        {"a": 2},
        {"a": 3},
    ]
