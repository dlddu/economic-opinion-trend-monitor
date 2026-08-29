"""CLI tests — analyzer selection and the two guards that keep Silver honest.

``LocalFsStore.write_records`` *replaces* the Silver dataset, and ``unanalyzed`` is the
data-quality signal AC2.5 defines and aggregation separates on (AC3.4). So a run that
never reached the model must not write: these tests pin the exit codes and, more
importantly, that the previous Silver survives.
"""

import json
from pathlib import Path

import pytest
from econ_analysis import cli, llm

CYCLE = "2026-06-23T14:00"


def _seed_lake(root: Path, bodies_available: bool = True) -> None:
    """Write a two-item Bronze layer (plus its content-addressed bodies)."""
    bronze = root / "bronze"
    bronze.mkdir(parents=True, exist_ok=True)
    items = [
        {
            "record_id": f"r{n}",
            "source_id": "s",
            "axis": "KR",
            "rank": n,
            "view_count": 10,
            "title": f"한국은행 기준금리 보도 {n}",
            "source_url": f"https://example.test/{n}",
            "body_hash": f"h{n}" if bodies_available else "",
            "body_available": bodies_available,
            "collected_at": "2026-06-23T14:00:00+00:00",
            "collection_cycle": CYCLE,
        }
        for n in (1, 2)
    ]
    _write_jsonl(bronze / "news_item.jsonl", items)
    _write_jsonl(
        bronze / "news_body.jsonl",
        [
            {
                "body_hash": f"h{n}",
                "raw_text": "기준금리 동결. tone=neutral 대상국=KR.",
                "first_seen_at": "2026-06-23T14:00:00+00:00",
                "first_seen_cycle": CYCLE,
            }
            for n in (1, 2)
        ],
    )


def _write_jsonl(path: Path, records: list[dict]) -> None:
    with path.open("w", encoding="utf-8") as fh:
        for record in records:
            fh.write(json.dumps(record, ensure_ascii=False) + "\n")


def _silver(root: Path) -> Path:
    return root / "silver" / "analysis.jsonl"


def _canned(reply: str):
    def _factory(*_args, **_kwargs):
        def _complete(_system: str, _user: str) -> str:
            return reply

        return _complete

    return _factory


def test_fake_is_the_default(tmp_path: Path) -> None:
    _seed_lake(tmp_path)
    assert cli.main(["--data", str(tmp_path)]) == 0
    records = [json.loads(line) for line in _silver(tmp_path).read_text().splitlines()]
    assert len(records) == 2
    # No --analyzer, no ECON_LLM_* needed: the offline stand-in still runs.
    assert {r["analyzer_version"] for r in records} == {"fake-v1"}


def test_llm_without_api_key_writes_nothing(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    _seed_lake(tmp_path)
    monkeypatch.delenv("ECON_LLM_API_KEY", raising=False)
    assert cli.main(["--data", str(tmp_path), "--analyzer", "llm"]) == cli.EXIT_CONFIG
    # Aborted before the lake was touched — not even an empty Silver dataset appeared.
    assert not _silver(tmp_path).exists()


def test_llm_total_failure_preserves_existing_silver(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    _seed_lake(tmp_path)
    assert cli.main(["--data", str(tmp_path)]) == 0  # a good fake run lands first
    before = _silver(tmp_path).read_bytes()

    def _unreachable(*_args, **_kwargs):
        def _complete(_system: str, _user: str) -> str:
            raise llm.CompletionError("endpoint down")

        return _complete

    monkeypatch.setattr(llm, "http_completer", _unreachable)
    code = cli.main(["--data", str(tmp_path), "--analyzer", "llm"])
    assert code == cli.EXIT_ALL_CALLS_FAILED
    # The outage did not replace real analyses with an all-unanalyzed batch.
    assert _silver(tmp_path).read_bytes() == before


def test_llm_writes_and_reports_call_stats(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    _seed_lake(tmp_path)
    reply = json.dumps(
        {
            "target_countries": ["KR"],
            "narrative_subjects": ["한국은행 기준금리"],
            "sentiment": "negative",
            "analyzable": True,
            "confidence": 0.9,
        }
    )
    monkeypatch.setattr(llm, "http_completer", _canned(reply))
    assert cli.main(["--data", str(tmp_path), "--analyzer", "llm"]) == 0
    records = [json.loads(line) for line in _silver(tmp_path).read_text().splitlines()]
    assert {r["analyzer_version"] for r in records} == {"llm-v1"}
    assert all(r["sentiment"] == "negative" for r in records)
    assert "model calls: attempted=2 failed=0" in capsys.readouterr().out


def test_llm_bodyless_batch_writes_without_calling_the_model(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    # Every item is unanalyzed here too, but nothing failed — the guard must not trip.
    _seed_lake(tmp_path, bodies_available=False)
    monkeypatch.setattr(llm, "http_completer", _canned("{}"))
    assert cli.main(["--data", str(tmp_path), "--analyzer", "llm"]) == 0
    records = [json.loads(line) for line in _silver(tmp_path).read_text().splitlines()]
    assert all(r["analysis_status"] == "unanalyzed" for r in records)
