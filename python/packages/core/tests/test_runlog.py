"""Run/stage record behaviour (PRD pipeline-ops, AC4.1).

The three stages of one pipeline are three processes, so what is pinned here is what
holds them together: one record per run, one stage entry per stage, a retry that
replaces rather than doubles, and per-outcome counts that always add up to the input.
"""

from pathlib import Path

import pytest
from econ_core import LocalFsStore, domain, runlog


def _store(tmp_path: Path) -> LocalFsStore:
    return LocalFsStore(tmp_path)


def _stage(run: dict, name: str) -> dict:
    return next(s for s in run["stages"] if s["stage_name"] == name)


def test_run_id_prefers_the_flag_then_the_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv(runlog.ENV_RUN_ID, "from-env")
    assert runlog.resolve_run_id("from-flag") == "from-flag"
    assert runlog.resolve_run_id(None) == "from-env"
    monkeypatch.delenv(runlog.ENV_RUN_ID)
    generated = runlog.resolve_run_id(None)
    assert generated.startswith("run-") and generated != runlog.resolve_run_id(None)


def test_three_stages_fold_into_one_run_record(tmp_path: Path) -> None:
    store = _store(tmp_path)
    for name, n in ((runlog.INGESTION, 4), (runlog.ANALYSIS, 4), (runlog.AGGREGATION, 3)):
        with runlog.run_stage(store, "run-1", name) as stage:
            stage.input_count = n
            stage.output_count = n
            stage.count("done", n)

    run = runlog.read_run(store, "run-1")
    assert [s["stage_name"] for s in run["stages"]] == [
        runlog.INGESTION,
        runlog.ANALYSIS,
        runlog.AGGREGATION,
    ]
    assert run["run_status"] == runlog.SUCCEEDED
    assert run["run_trigger"] == runlog.SCHEDULED
    assert run["run_ended_at"] is not None
    assert [r["run_id"] for r in runlog.read_runs(store)] == ["run-1"]


def test_a_stage_retry_replaces_its_earlier_record(tmp_path: Path) -> None:
    store = _store(tmp_path)
    with runlog.run_stage(store, "run-2", runlog.INGESTION) as stage:
        stage.input_count = 1
        stage.count("collected", 1)
    with runlog.run_stage(store, "run-2", runlog.INGESTION) as stage:
        stage.input_count = 7
        stage.count("collected", 7)

    run = runlog.read_run(store, "run-2")
    assert len(run["stages"]) == 1
    assert _stage(run, runlog.INGESTION)["input_count"] == 7


def test_a_raising_stage_is_recorded_failed_with_its_reason(tmp_path: Path) -> None:
    store = _store(tmp_path)
    with pytest.raises(RuntimeError):
        with runlog.run_stage(store, "run-3", runlog.ANALYSIS) as stage:
            stage.input_count = 10
            stage.count("analyzed", 2)
            raise RuntimeError("endpoint down")

    run = runlog.read_run(store, "run-3")
    analysis = _stage(run, runlog.ANALYSIS)
    assert analysis["stage_status"] == runlog.FAILED
    assert "endpoint down" in analysis["failure_reason"]
    # The input it never got to classify is booked, so the sum still equals the input
    # and the record says how far the run got (AC4.1).
    assert dict((o["outcome_name"], o["outcome_count"]) for o in analysis["outcomes"]) == {
        "analyzed": 2,
        runlog.NOT_REACHED: 8,
    }
    assert run["run_status"] == runlog.FAILED
    # A run cut short simply has no record for the stages after it.
    assert [s["stage_name"] for s in run["stages"]] == [runlog.ANALYSIS]


def test_a_stage_that_marks_itself_failed_needs_no_exception(tmp_path: Path) -> None:
    store = _store(tmp_path)
    with runlog.run_stage(store, "run-4", runlog.ANALYSIS) as stage:
        stage.input_count = 3
        stage.count("call_failed", 3)
        stage.fail("all 3 model calls failed")

    run = runlog.read_run(store, "run-4")
    assert _stage(run, runlog.ANALYSIS)["stage_status"] == runlog.FAILED
    assert run["run_status"] == runlog.FAILED


def test_outcomes_of_a_succeeded_stage_must_add_up_to_its_input(tmp_path: Path) -> None:
    store = _store(tmp_path)
    with pytest.raises(ValueError, match="do not add up"):
        with runlog.run_stage(store, "run-5", runlog.ANALYSIS) as stage:
            stage.input_count = 5
            stage.count("analyzed", 3)

    with pytest.raises(ValueError, match="not disjoint"):
        with runlog.run_stage(store, "run-6", runlog.ANALYSIS) as stage:
            stage.input_count = 2
            stage.count("analyzed", 2)
            stage.count("reused", 1)


def test_the_opening_stage_names_the_trigger_and_later_stages_keep_it(tmp_path: Path) -> None:
    store = _store(tmp_path)
    with runlog.run_stage(store, "run-7", runlog.ANALYSIS, trigger=runlog.REPROCESS):
        pass
    with runlog.run_stage(store, "run-7", runlog.AGGREGATION, trigger=runlog.SCHEDULED):
        pass
    assert runlog.read_run(store, "run-7")["run_trigger"] == runlog.REPROCESS


def test_source_failures_are_recorded_per_source(tmp_path: Path) -> None:
    store = _store(tmp_path)
    with runlog.run_stage(store, "run-8", runlog.INGESTION) as stage:
        stage.input_count = 1
        stage.count("collected", 1)
        stage.source_failed("kr-broken", "HTTP 503")

    ingestion = _stage(runlog.read_run(store, "run-8"), runlog.INGESTION)
    assert ingestion["source_failures"] == [
        {"source_id": "kr-broken", "source_failure_reason": "HTTP 503"}
    ]


def test_run_records_outlive_the_process_that_wrote_them(tmp_path: Path) -> None:
    """AC4.1's point: the record is in the lake, not in scheduler history."""
    store = _store(tmp_path)
    with runlog.run_stage(store, "run-9", runlog.INGESTION) as stage:
        stage.input_count = 0
    target = tmp_path / domain.SILVER / domain.DS_PIPELINE_RUN / "run_id_prefix=r" / "run-9.json"
    assert target.is_file()
    assert runlog.read_run(LocalFsStore(tmp_path), "run-9")["run_id"] == "run-9"
