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
from econ_core import LocalFsStore, domain

CYCLE = "2026-06-23T14:00"
NEXT_CYCLE = "2026-06-23T15:00"


def _seed_lake(root: Path, bodies_available: bool = True) -> None:
    """Write a two-item Bronze layer (plus its content-addressed bodies)."""
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
    _write_items(root, items)
    store = LocalFsStore(root)
    for n in (1, 2):
        store.put_object(
            "bronze",
            "news_body",
            "body_hash",
            {
                "body_hash": f"h{n}",
                "raw_text": "기준금리 동결. tone=neutral 대상국=KR.",
                "first_seen_at": "2026-06-23T14:00:00+00:00",
                "first_seen_cycle": CYCLE,
            },
        )


def _write_items(root: Path, items: list[dict]) -> None:
    by_cycle: dict[str, list[dict]] = {}
    for item in items:
        by_cycle.setdefault(item["collection_cycle"], []).append(item)
    for cycle, cycle_items in by_cycle.items():
        LocalFsStore(root).write_partition(
            "bronze", "news_item", domain.cycle_partition(cycle), cycle_items
        )


def _write_jsonl(path: Path, records: list[dict]) -> None:
    with path.open("w", encoding="utf-8") as fh:
        for record in records:
            fh.write(json.dumps(record, ensure_ascii=False) + "\n")


def _silver(root: Path) -> Path:
    """The Silver partition of the seeded cycle."""
    return root / "silver" / "analysis" / "date=2026-06-23" / "hour=14" / "data.jsonl"


def _canned(reply: str):
    def _factory(*_args, **_kwargs):
        def _complete(_system: str, _user: str) -> str:
            return reply

        return _complete

    return _factory


def test_llm_is_the_default(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """The operational default is the real model — an unconfigured run must not write."""
    _seed_lake(tmp_path)
    monkeypatch.delenv("ECON_LLM_API_KEY", raising=False)
    # No --analyzer: this now selects llm, which refuses to run without its key.
    assert cli.main(["--data", str(tmp_path)]) == cli.EXIT_CONFIG
    assert not _silver(tmp_path).exists()


def test_fake_stays_available_offline(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """...and the deterministic stand-in is still one flag away, with no ECON_LLM_* at all."""
    _seed_lake(tmp_path)
    monkeypatch.delenv("ECON_LLM_API_KEY", raising=False)
    assert cli.main(["--data", str(tmp_path), "--analyzer", "fake"]) == 0
    records = [json.loads(line) for line in _silver(tmp_path).read_text().splitlines()]
    assert len(records) == 2
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
    # A good fake run lands first (explicit now that llm is the default).
    assert cli.main(["--data", str(tmp_path), "--analyzer", "fake"]) == 0
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


def test_second_run_reuses_stored_replies(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    # The next cycle re-observes the same articles: its new records must not re-ask.
    _seed_lake(tmp_path)
    reply = json.dumps({"sentiment": "neutral", "analyzable": True, "confidence": 0.9})
    monkeypatch.setattr(llm, "http_completer", _canned(reply))
    assert cli.main(["--data", str(tmp_path), "--analyzer", "llm"]) == 0
    assert "attempted=2 failed=0 reused=0" in capsys.readouterr().out
    cache = (tmp_path / "silver" / "analysis_cache.jsonl").read_text().splitlines()
    assert len(cache) == 2

    _write_items(
        tmp_path,
        [
            {**item, "record_id": f"{item['record_id']}-next", "collection_cycle": NEXT_CYCLE}
            for item in _bronze_rows(tmp_path)
        ],
    )
    assert cli.main(["--data", str(tmp_path), "--analyzer", "llm"]) == 0
    out = capsys.readouterr().out
    assert "attempted=0 failed=0 reused=2" in out
    assert "settled_already_at_version=2" in out
    assert len((tmp_path / "silver" / "analysis_cache.jsonl").read_text().splitlines()) == 2


def _bronze_rows(root: Path) -> list[dict]:
    return LocalFsStore(root).read_partitions("bronze", "news_item")


def _silver_rows(root: Path) -> list[dict]:
    return LocalFsStore(root).read_partitions("silver", "analysis")


def test_whole_lake_rerun_updates_silver_in_place(tmp_path: Path) -> None:
    """AC2.6: a whole-lake re-analysis at a bumped version replaces the rows, keys intact."""
    _seed_lake(tmp_path)
    assert cli.main(["--data", str(tmp_path), "--analyzer", "fake"]) == 0
    assert (
        cli.main(["--data", str(tmp_path), "--analyzer", "fake", "--analyzer-version", "fake-v2"])
        == 0
    )
    rows = _silver_rows(tmp_path)
    assert sorted((r["record_id"], r["analyzer_version"]) for r in rows) == [
        ("r1", "fake-v2"),
        ("r2", "fake-v2"),
    ]


def test_scoped_rerun_coexists_with_the_previous_version(tmp_path: Path) -> None:
    """STP-run-reprocess: a scoped reprocess lands beside the old rows, never over them."""
    _seed_lake(tmp_path)
    base = ["--data", str(tmp_path), "--analyzer", "fake"]
    assert cli.main(base) == 0
    assert cli.main([*base, "--analyzer-version", "fake-v2", "--axis", "KR"]) == 0
    rows = _silver_rows(tmp_path)
    assert sorted((r["record_id"], r["analyzer_version"]) for r in rows) == [
        ("r1", "fake-v1"),
        ("r1", "fake-v2"),
        ("r2", "fake-v1"),
        ("r2", "fake-v2"),
    ]


def test_whole_lake_run_keeps_the_published_version(tmp_path: Path) -> None:
    """The hourly run must not retire the version a decision serves — Gold would lose it."""
    from econ_core import open_store, silver

    _seed_lake(tmp_path)
    base = ["--data", str(tmp_path), "--analyzer", "fake"]
    assert cli.main(base) == 0
    assert cli.main([*base, "--analyzer-version", "fake-v2", "--axis", "KR"]) == 0
    silver.record_decision(open_store(tmp_path), "publish", "fake-v2", "의도한 개선", True)
    # The next whole-lake run is still at fake-v1 (code not bumped yet).
    assert cli.main(base) == 0
    versions = {r["analyzer_version"] for r in _silver_rows(tmp_path)}
    assert versions == {"fake-v1", "fake-v2"}


def test_scoped_run_skips_records_already_at_the_target_version(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    """A resumed scoped run starts from its checkpoint instead of re-analyzing everything."""
    _seed_lake(tmp_path)
    args = [
        "--data",
        str(tmp_path),
        "--analyzer",
        "fake",
        "--analyzer-version",
        "fake-v2",
        "--axis",
        "KR",
    ]
    assert cli.main([*args, "--sample", "1", "--sample-mode", "recent"]) == 0
    assert len([r for r in _silver_rows(tmp_path) if r["analyzer_version"] == "fake-v2"]) == 1
    assert cli.main(args) == 0
    out = capsys.readouterr().out
    assert "skipped_already_at_version=1" in out
    assert len([r for r in _silver_rows(tmp_path) if r["analyzer_version"] == "fake-v2"]) == 2


def test_scope_filters_by_axis_source_and_since(tmp_path: Path) -> None:
    _seed_lake(tmp_path)
    base = ["--data", str(tmp_path), "--analyzer", "fake", "--analyzer-version", "fake-v2"]
    assert cli.main([*base, "--axis", "US"]) == 0
    assert _silver_rows(tmp_path) == [] or all(
        r["analyzer_version"] != "fake-v2" for r in _silver_rows(tmp_path)
    )
    assert cli.main([*base, "--source", "s", "--since", "2026-06-23T15:00:00+00:00"]) == 0
    assert all(r["analyzer_version"] != "fake-v2" for r in _silver_rows(tmp_path))
    assert cli.main([*base, "--source", "s", "--since", "2026-06-23T14:00:00+00:00"]) == 0
    assert len([r for r in _silver_rows(tmp_path) if r["analyzer_version"] == "fake-v2"]) == 2


def test_failed_batch_keeps_the_checkpoint_of_earlier_batches(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """JRN-logic-backfill §4: 재분석 도중 실패 → 체크포인트 유지, 전량 재실행 금지."""
    _seed_lake(tmp_path)
    reply = json.dumps(
        {
            "target_countries": ["KR"],
            "narrative_subjects": ["한국은행 기준금리"],
            "sentiment": "neutral",
            "confidence": 0.9,
        }
    )
    calls = {"n": 0}

    def _flaky(*_args, **_kwargs):
        def _complete(_system: str, _user: str) -> str:
            calls["n"] += 1
            if calls["n"] > 1:
                raise llm.CompletionError("endpoint down")
            return reply

        return _complete

    monkeypatch.setenv("ECON_LLM_API_KEY", "k")
    monkeypatch.setattr(llm, "http_completer", _flaky)
    code = cli.main(
        ["--data", str(tmp_path), "--analyzer", "llm", "--axis", "KR", "--batch-size", "1"]
    )
    assert code == cli.EXIT_ALL_CALLS_FAILED
    # The first batch's row survived the second batch's outage.
    assert [r["record_id"] for r in _silver_rows(tmp_path)] == ["r1"]


def test_silver_rows_bronze_no_longer_holds_are_pruned(tmp_path: Path) -> None:
    _seed_lake(tmp_path)
    assert cli.main(["--data", str(tmp_path), "--analyzer", "fake"]) == 0
    _write_items(tmp_path, [b for b in _bronze_rows(tmp_path) if b["record_id"] == "r1"])
    assert cli.main(["--data", str(tmp_path), "--analyzer", "fake"]) == 0
    assert [r["record_id"] for r in _silver_rows(tmp_path)] == ["r1"]


def test_whole_lake_run_skips_settled_records_and_retries_unanalyzed(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    # Bronze keeps every cycle, so an unchanged version must not re-walk the history —
    # but a record left unanalyzed by a failed call is picked up again.
    _seed_lake(tmp_path)
    good = json.dumps({"sentiment": "neutral", "analyzable": True, "confidence": 0.9})
    replies = iter([good, "not json"])
    monkeypatch.setattr(
        llm, "http_completer", lambda *_a, **_k: lambda _system, _user: next(replies)
    )
    assert cli.main(["--data", str(tmp_path), "--analyzer", "llm"]) == 0
    status = {r["record_id"]: r["analysis_status"] for r in _silver_rows(tmp_path)}
    assert sorted(status.values()) == ["analyzed", "unanalyzed"]
    capsys.readouterr()

    monkeypatch.setattr(llm, "http_completer", _canned(good))
    assert cli.main(["--data", str(tmp_path), "--analyzer", "llm"]) == 0
    out = capsys.readouterr().out
    assert "wrote 1 silver records" in out
    assert "settled_already_at_version=1" in out
    assert {r["analysis_status"] for r in _silver_rows(tmp_path)} == {"analyzed"}


def test_whole_lake_run_does_not_revisit_bodyless_records(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    _seed_lake(tmp_path, bodies_available=False)
    assert cli.main(["--data", str(tmp_path), "--analyzer", "fake"]) == 0
    capsys.readouterr()
    assert cli.main(["--data", str(tmp_path), "--analyzer", "fake"]) == 0
    out = capsys.readouterr().out
    assert "wrote 0 silver records" in out
    assert "settled_already_at_version=2" in out


def test_silver_rows_land_in_the_partition_of_their_observation(tmp_path: Path) -> None:
    _seed_lake(tmp_path)
    _write_items(
        tmp_path,
        [
            {**item, "record_id": f"{item['record_id']}-next", "collection_cycle": NEXT_CYCLE}
            for item in _bronze_rows(tmp_path)
        ],
    )
    assert cli.main(["--data", str(tmp_path), "--analyzer", "fake"]) == 0
    root = tmp_path / "silver" / "analysis"
    ids = {
        part.parent.relative_to(root).as_posix(): sorted(
            json.loads(line)["record_id"] for line in part.read_text().splitlines()
        )
        for part in root.rglob("data.jsonl")
    }
    assert ids == {
        "date=2026-06-23/hour=14": ["r1", "r2"],
        "date=2026-06-23/hour=15": ["r1-next", "r2-next"],
    }


def test_legacy_silver_file_is_migrated_and_orphans_dropped(tmp_path: Path) -> None:
    _seed_lake(tmp_path)
    assert cli.main(["--data", str(tmp_path), "--analyzer", "fake"]) == 0
    store = LocalFsStore(tmp_path)
    rows = _silver_rows(tmp_path)
    _silver(tmp_path).unlink()
    orphan = {**rows[0], "record_id": "gone"}
    store.write_records("silver", "analysis", [*rows, orphan])

    assert cli.main(["--data", str(tmp_path), "--analyzer", "fake"]) == 0
    assert sorted(r["record_id"] for r in _silver_rows(tmp_path)) == ["r1", "r2"]
    assert (tmp_path / "silver" / "analysis.jsonl.migrated").exists()
