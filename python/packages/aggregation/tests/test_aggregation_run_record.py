"""Aggregation writes its stage into the batch run record (PRD pipeline-ops, AC4.1)."""

from pathlib import Path

import pytest
from econ_aggregation import cli as agg_cli
from econ_analysis import cli as ana_cli
from econ_core import LocalFsStore, domain, runlog
from econ_ingestion import cli as ing_cli

CYCLE = "2026-06-23T14:00"


def _stage(root: Path, run_id: str, name: str) -> dict:
    run = runlog.read_run(LocalFsStore(root), run_id)
    return next(s for s in run["stages"] if s["stage_name"] == name)


def _pipeline(root: Path, run_id: str, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("ECON_LLM_API_KEY", raising=False)
    args = ["--data", str(root), "--run-id", run_id]
    assert ing_cli.main(["--source", "fake", "--cycle", CYCLE, *args]) == 0
    assert ana_cli.main(["--analyzer", "fake", *args]) == 0
    assert agg_cli.main(args) == 0


def test_one_pipeline_run_records_all_three_stages_in_order(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    _pipeline(tmp_path, "run-a", monkeypatch)
    run = runlog.read_run(LocalFsStore(tmp_path), "run-a")

    assert [s["stage_name"] for s in run["stages"]] == [
        runlog.INGESTION,
        runlog.ANALYSIS,
        runlog.AGGREGATION,
    ]
    assert run["run_status"] == runlog.SUCCEEDED
    assert run["run_trigger"] == runlog.SCHEDULED
    assert run["run_started_at"] <= run["run_ended_at"]


def test_every_stage_balances_and_the_stages_chain(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    _pipeline(tmp_path, "run-b", monkeypatch)
    run = runlog.read_run(LocalFsStore(tmp_path), "run-b")

    for stage in run["stages"]:
        total = sum(o["outcome_count"] for o in stage["outcomes"])
        assert total == stage["input_count"], stage["stage_name"]

    ingestion = _stage(tmp_path, "run-b", runlog.INGESTION)
    analysis = _stage(tmp_path, "run-b", runlog.ANALYSIS)
    aggregation = _stage(tmp_path, "run-b", runlog.AGGREGATION)
    assert ingestion["output_count"] == analysis["input_count"]
    assert analysis["output_count"] == aggregation["input_count"]
    assert aggregation["output_count"] > 0


def test_the_aggregation_buckets_split_silver_into_served_and_superseded(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    _pipeline(tmp_path, "run-c", monkeypatch)
    counts = {
        o["outcome_name"]: o["outcome_count"]
        for o in _stage(tmp_path, "run-c", runlog.AGGREGATION)["outcomes"]
    }
    silver_rows = LocalFsStore(tmp_path).read_partitions(domain.SILVER, domain.DS_ANALYSIS)
    assert counts["served"] + counts["superseded"] == len(silver_rows)


def test_a_refused_publish_decision_records_a_failed_stage(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    _pipeline(tmp_path, "run-d", monkeypatch)
    # No --memo: the decision is refused, and the stage says so rather than looking clean.
    refused = ["--decision", "publish", "--version", "fake-v1"]
    assert agg_cli.main(["--data", str(tmp_path), "--run-id", "run-e", *refused]) == 2
    run = runlog.read_run(LocalFsStore(tmp_path), "run-e")
    stage = _stage(tmp_path, "run-e", runlog.AGGREGATION)
    assert stage["stage_status"] == runlog.FAILED
    assert "decision not recorded" in stage["failure_reason"]
    assert run["run_status"] == runlog.FAILED
    assert run["run_trigger"] == runlog.REPROCESS


def test_gold_read_cycle_by_cycle_equals_gold_built_over_the_whole_lake(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    import json

    from econ_aggregation.aggregate import (
        build_axis_sentiment_all_units,
        build_subject_trends_all_units,
    )
    from econ_aggregation.contributions import build_subject_source_contributions_all_units
    from econ_core import silver

    monkeypatch.delenv("ECON_LLM_API_KEY", raising=False)
    args = ["--data", str(tmp_path)]
    for cycle in ("2026-06-23T13:00", CYCLE, "2026-06-24T02:00"):
        assert ing_cli.main(["--source", "fake", "--cycle", cycle, *args]) == 0
    assert ana_cli.main(["--analyzer", "fake", *args]) == 0
    assert agg_cli.main(args) == 0

    store = LocalFsStore(tmp_path)
    bronze = store.read_partitions(domain.BRONZE, domain.DS_NEWS_ITEM)
    chosen = silver.select_serving(silver.read_analyses(store), silver.serving_version(store))
    expected = {
        domain.DS_SUBJECT_TREND: build_subject_trends_all_units(bronze, chosen),
        domain.DS_AXIS_SENTIMENT: build_axis_sentiment_all_units(bronze, chosen),
        domain.DS_SUBJECT_SOURCE_CONTRIBUTION: build_subject_source_contributions_all_units(
            bronze, chosen
        ),
    }
    for dataset, rows in expected.items():
        assert rows
        written = (tmp_path / "gold" / f"{dataset}.jsonl").read_text().splitlines()
        assert [json.loads(line) for line in written] == rows
