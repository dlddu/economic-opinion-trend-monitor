"""Analysis writes its stage into the batch run record (PRD pipeline-ops, AC4.1)."""

from pathlib import Path

import pytest
from econ_analysis import cli, llm
from econ_core import LocalFsStore, domain, runlog

CYCLE = "2026-06-23T14:00"


def _seed(root: Path, n: int = 3) -> None:
    store = LocalFsStore(root)
    items = []
    for i in range(1, n + 1):
        items.append(
            {
                "record_id": f"r{i}",
                "source_id": "s",
                "axis": "KR",
                "rank": i,
                "view_count": 10,
                "title": f"한국은행 기준금리 보도 {i}",
                "source_url": f"https://example.test/{i}",
                "body_hash": f"h{i}",
                "body_available": True,
                "collected_at": "2026-06-23T14:00:00+00:00",
                "collection_cycle": CYCLE,
            }
        )
        store.put_object(
            domain.BRONZE,
            domain.DS_NEWS_BODY,
            "body_hash",
            {
                "body_hash": f"h{i}",
                "raw_text": "기준금리 동결. tone=neutral 대상국=KR.",
                "first_seen_at": "2026-06-23T14:00:00+00:00",
                "first_seen_cycle": CYCLE,
            },
        )
    store.write_partition(domain.BRONZE, domain.DS_NEWS_ITEM, domain.cycle_partition(CYCLE), items)


def _stage(root: Path, run_id: str) -> dict:
    run = runlog.read_run(LocalFsStore(root), run_id)
    return next(s for s in run["stages"] if s["stage_name"] == runlog.ANALYSIS)


def _counts(stage: dict) -> dict[str, int]:
    return {o["outcome_name"]: o["outcome_count"] for o in stage["outcomes"]}


def test_every_selected_record_lands_in_exactly_one_outcome(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    _seed(tmp_path)
    monkeypatch.delenv("ECON_LLM_API_KEY", raising=False)
    assert cli.main(["--data", str(tmp_path), "--analyzer", "fake", "--run-id", "run-a"]) == 0
    stage = _stage(tmp_path, "run-a")
    counts = _counts(stage)
    assert stage["stage_status"] == runlog.SUCCEEDED
    assert stage["input_count"] == 3
    assert sum(counts.values()) == 3
    assert stage["output_count"] == 3


def test_a_second_whole_lake_run_books_settled_records_as_skipped(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    _seed(tmp_path)
    monkeypatch.delenv("ECON_LLM_API_KEY", raising=False)
    cli.main(["--data", str(tmp_path), "--analyzer", "fake", "--run-id", "run-a"])
    cli.main(["--data", str(tmp_path), "--analyzer", "fake", "--run-id", "run-b"])

    counts = _counts(_stage(tmp_path, "run-b"))
    assert counts["skipped_settled"] == 3
    assert sum(counts.values()) == 3


def test_a_run_whose_model_never_answered_keeps_its_partial_stage(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    _seed(tmp_path)

    def _unreachable(*_args, **_kwargs):
        def _complete(_system: str, _user: str) -> str:
            raise llm.CompletionError("endpoint down")

        return _complete

    monkeypatch.setenv("ECON_LLM_API_KEY", "k")
    monkeypatch.setattr(llm, "http_completer", _unreachable)
    code = cli.main(
        ["--data", str(tmp_path), "--analyzer", "llm", "--batch-size", "1", "--run-id", "run-c"]
    )
    assert code == cli.EXIT_ALL_CALLS_FAILED

    run = runlog.read_run(LocalFsStore(tmp_path), "run-c")
    stage = _stage(tmp_path, "run-c")
    counts = _counts(stage)
    assert stage["stage_status"] == runlog.FAILED
    assert "model calls failed" in stage["failure_reason"]
    assert counts["call_failed"] == 1
    assert counts[runlog.NOT_REACHED] == 2
    assert sum(counts.values()) == stage["input_count"] == 3
    assert run["run_status"] == runlog.FAILED
    assert [s["stage_name"] for s in run["stages"]] == [runlog.ANALYSIS]


def test_a_reused_reply_is_booked_as_reuse_not_as_a_fresh_judgement(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    _seed(tmp_path, n=1)
    reply = '{"target_countries":["KR"],"narrative_subjects":["한국은행 기준금리"],'
    reply += '"sentiment":"neutral","analyzable":true,"confidence":0.9}'

    def _canned(*_args, **_kwargs):
        def _complete(_system: str, _user: str) -> str:
            return reply

        return _complete

    monkeypatch.setenv("ECON_LLM_API_KEY", "k")
    monkeypatch.setattr(llm, "http_completer", _canned)
    cli.main(["--data", str(tmp_path), "--analyzer", "llm", "--run-id", "run-d"])
    # Same version, same prompt: the second run answers from the reply cache. The row
    # is bumped out of "settled" first so the record is genuinely re-analyzed.
    store = LocalFsStore(tmp_path)
    rows = store.read_partitions(domain.SILVER, domain.DS_ANALYSIS)
    store.write_partition(domain.SILVER, domain.DS_ANALYSIS, domain.cycle_partition(CYCLE), [])
    cli.main(["--data", str(tmp_path), "--analyzer", "llm", "--run-id", "run-e"])

    assert rows
    counts = _counts(_stage(tmp_path, "run-e"))
    assert counts["reused"] == 1
    assert sum(counts.values()) == 1


def test_a_scoped_reprocess_opens_the_run_as_a_reprocess(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    _seed(tmp_path)
    monkeypatch.delenv("ECON_LLM_API_KEY", raising=False)
    cli.main(["--data", str(tmp_path), "--analyzer", "fake", "--axis", "KR", "--run-id", "run-f"])
    assert runlog.read_run(LocalFsStore(tmp_path), "run-f")["run_trigger"] == runlog.REPROCESS
