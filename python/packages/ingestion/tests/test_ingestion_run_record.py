"""Ingestion writes its stage into the batch run record (PRD pipeline-ops, AC4.1)."""

import json
from pathlib import Path

import pytest
from econ_core import LocalFsStore, runlog
from econ_ingestion import cli

CYCLE = "2026-06-23T14:00"

RSS = (
    '<?xml version="1.0"?><rss version="2.0"><channel>'
    "<item><title>한국은행 기준금리</title>"
    "<link>https://example.test/a</link>"
    "<description>tone=neutral</description></item>"
    "</channel></rss>"
).encode()


def _stage(root: Path, run_id: str, name: str) -> dict:
    run = runlog.read_run(LocalFsStore(root), run_id)
    return next(s for s in run["stages"] if s["stage_name"] == name)


def test_a_collection_run_records_its_stage_with_balanced_counts(tmp_path: Path) -> None:
    assert (
        cli.main(
            ["--source", "fake", "--data", str(tmp_path), "--cycle", CYCLE, "--run-id", "run-a"]
        )
        == 0
    )
    stage = _stage(tmp_path, "run-a", runlog.INGESTION)
    counts = {o["outcome_name"]: o["outcome_count"] for o in stage["outcomes"]}

    assert stage["stage_status"] == runlog.SUCCEEDED
    assert sum(counts.values()) == stage["input_count"]
    assert counts["collected"] == stage["output_count"] > 0
    assert stage["duration_ms"] >= 0
    run = runlog.read_run(LocalFsStore(tmp_path), "run-a")
    assert run["run_trigger"] == runlog.SCHEDULED


def test_a_failing_source_lands_in_the_stage_record_with_its_reason(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    feeds = tmp_path / "feeds.json"
    feeds.write_text(
        json.dumps(
            [
                {"source_id": "ok", "axis": "KR", "feed_url": "https://ok.test/rss"},
                {"source_id": "broken", "axis": "US", "feed_url": "https://broken.test/rss"},
            ]
        ),
        encoding="utf-8",
    )

    def _fetcher(_timeout: float = 15.0):
        def _fetch(url: str) -> bytes:
            if "broken" in url:
                raise RuntimeError("HTTP 503")
            return RSS

        return _fetch

    monkeypatch.setattr(cli, "http_fetcher", _fetcher)
    assert (
        cli.main(
            [
                "--data",
                str(tmp_path),
                "--cycle",
                CYCLE,
                "--feeds",
                str(feeds),
                "--run-id",
                "run-b",
            ]
        )
        == 0
    )

    stage = _stage(tmp_path, "run-b", runlog.INGESTION)
    assert [f["source_id"] for f in stage["source_failures"]] == ["broken"]
    assert "503" in stage["source_failures"][0]["source_failure_reason"]
    counts = {o["outcome_name"]: o["outcome_count"] for o in stage["outcomes"]}
    assert sum(counts.values()) == stage["input_count"]


def test_the_run_id_can_arrive_through_the_environment(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """How the three Pods of one Workflow agree — the template sets $ECON_RUN_ID."""
    monkeypatch.setenv(runlog.ENV_RUN_ID, "econ-batch-pipeline-abcde")
    assert cli.main(["--source", "fake", "--data", str(tmp_path), "--cycle", CYCLE]) == 0
    assert runlog.read_run(LocalFsStore(tmp_path), "econ-batch-pipeline-abcde") is not None
