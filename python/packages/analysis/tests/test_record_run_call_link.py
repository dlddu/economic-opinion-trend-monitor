"""Record ↔ run ↔ call links — AC4.3, test-pipeline-ops 시나리오 3.

Transcribes that scenario's expected results one for one: every Silver row reaches the
run that wrote it; a row the model was called for reaches its call record (and, for a
replayed reply, the original call through it); a row no call was made for carries the
reason instead; the lists read from the run's end match the rows that named it; and two
coexisting analyzer versions of one record name different runs and different calls while
both keep the AC2.6 Bronze tracking key.
"""

import json

from econ_analysis import fake_llm
from econ_analysis.llm import CompletionError, run_llm_analysis
from econ_core import calllog, silver
from econ_core.storage import LocalFsStore

GOOD = json.dumps(
    {
        "target_countries": ["한국"],
        "narrative_subjects": ["삼성전자"],
        "sentiment": "neutral",
        "analyzable": True,
        "confidence": 0.9,
    }
)
UNSURE = json.dumps(
    {
        "target_countries": ["한국"],
        "narrative_subjects": ["삼성전자"],
        "sentiment": "mixed",
        "analyzable": True,
        "confidence": 0.3,
    }
)
DECLINED = json.dumps({"analyzable": False, "confidence": 0.0})


def _bronze(**overrides) -> dict:
    item = {
        "record_id": "r",
        "source_id": "s",
        "axis": "KR",
        "rank": 1,
        "view_count": 1,
        "title": "삼성전자 실적 관련 보도",
        "source_url": "https://example.test/a",
        "body_hash": "h",
        "body_available": True,
        "collected_at": "2026-06-23T14:00:00+00:00",
        "collection_cycle": "2026-06-23T14:00",
    }
    item.update(overrides)
    return item


def _completer(replies: dict[str, str | Exception], model: str = "m-1", temperature=0.0):
    def _complete(system: str, user: str) -> str:
        for marker, reply in replies.items():
            if marker in user:
                if isinstance(reply, Exception):
                    raise reply
                return reply
        raise AssertionError(f"no canned reply for {user!r}")

    _complete.model = model
    _complete.temperature = temperature
    return _complete


def _by_record(rows: list[dict]) -> dict[str, dict]:
    return {r["record_id"]: r for r in rows}


def test_every_row_reaches_its_run_and_either_a_call_or_a_reason():
    """(1) 각 유형의 레코드에서 호출 기록과 실행 기록으로 이동한다."""
    items = [
        _bronze(record_id="analyzed", title="정상"),
        _bronze(record_id="low", title="애매"),
        _bronze(record_id="declined", title="거절"),
        _bronze(record_id="outage", title="불통"),
        _bronze(record_id="nobody", title="본문없음", body_available=False),
    ]
    completer = _completer(
        {
            "정상": GOOD,
            "애매": UNSURE,
            "거절": DECLINED,
            "불통": CompletionError("endpoint unreachable"),
        }
    )
    calls: list[dict] = []
    rows, _, _ = run_llm_analysis(
        items, {"h": "본문"}, completer, "llm-v1", calls=calls, run_id="run-42"
    )

    by_record = _by_record(rows)
    by_call = {c["call_id"]: c for c in calls}

    # Every row — whatever its status — leads back to the execution that wrote it.
    assert {r["run_id"] for r in rows} == {"run-42"}

    # A row is never silent about where its judgement came from: exactly one of the two.
    for row in rows:
        assert (row["call_id"] is None) != (row["no_call_reason"] is None), row

    # 분석 완료 · 저신뢰 · 미분석(모델이 거절) · 미분석(호출 실패) — 넷 다 호출 기록에 닿는다.
    assert by_record["analyzed"]["analysis_status"] == "analyzed"
    assert by_record["low"]["analysis_status"] == "low_confidence"
    assert by_record["declined"]["analysis_status"] == "unanalyzed"
    assert by_record["outage"]["analysis_status"] == "unanalyzed"
    for name, outcome in (
        ("analyzed", "parsed"),
        ("low", "parsed"),
        ("declined", "parsed"),
        ("outage", "call_failed"),
    ):
        call = by_call[by_record[name]["call_id"]]
        assert call["call_outcome"] == outcome, name
        assert call["record_id"] == name
        assert call["run_id"] == "run-42"

    # 본문 미확보 레코드만 호출이 없고, 그 자리를 미호출 사유가 채운다.
    nobody = by_record["nobody"]
    assert nobody["analysis_status"] == "unanalyzed"
    assert nobody["call_id"] is None
    assert nobody["no_call_reason"] == "body_unavailable"
    assert all(c["record_id"] != "nobody" for c in calls)


def test_a_reused_reply_reaches_the_original_call_through_its_own_record():
    """재사용 레코드는 자기 호출 기록을 거쳐 원 호출 기록에 도달한다."""
    item = _bronze(record_id="ok", title="정상")
    completer = _completer({"정상": GOOD})

    first_calls: list[dict] = []
    cache: dict[str, str] = {}
    first_rows, _, entries = run_llm_analysis(
        [item], {"h": "본문"}, completer, reply_cache=cache, calls=first_calls, run_id="run-1"
    )
    origin = first_calls[0]["call_id"]
    assert first_rows[0]["call_id"] == origin

    second_calls: list[dict] = []
    second_rows, stats, _ = run_llm_analysis(
        [item],
        {"h": "본문"},
        completer,
        reply_cache=cache,
        calls=second_calls,
        reply_origins={e["cache_key"]: e["call_id"] for e in entries},
        run_id="run-2",
    )
    assert stats.reused == 1

    row = second_rows[0]
    assert row["run_id"] == "run-2"
    # The row names the record this run wrote — that record is the reuse, and the call
    # AC4.3 asks for is one hop further on `reused_from_call_id`.
    reuse = {c["call_id"]: c for c in second_calls}[row["call_id"]]
    assert reuse["call_outcome"] == "reused"
    assert reuse["reused_from_call_id"] == origin


def test_a_reuse_of_a_pre_call_record_cache_still_reaches_a_call_record():
    """원 호출을 모르는 캐시를 재사용해도 레코드는 자기 호출 기록에 도달한다."""
    item = _bronze(record_id="ok", title="정상")
    completer = _completer({"정상": GOOD})
    cache: dict[str, str] = {}
    run_llm_analysis([item], {"h": "본문"}, completer, reply_cache=cache, run_id="run-1")

    calls: list[dict] = []
    rows, stats, _ = run_llm_analysis(
        [item],
        {"h": "본문"},
        completer,
        reply_cache=cache,
        calls=calls,
        reply_origins={},
        run_id="run-2",
    )
    assert stats.reused == 1
    row = rows[0]
    assert row["no_call_reason"] is None
    # Pointing the row straight at the original would have had nothing to point at here;
    # pointing it at this run's record keeps the link total (AC4.3).
    assert row["call_id"] == calls[0]["call_id"]
    assert calls[0]["reused_from_call_id"] is None


def test_the_offline_analyzer_states_why_it_called_nothing():
    """모델을 전혀 호출하지 않는 분석기의 레코드도 사유와 실행을 가진다."""
    row = fake_llm.analyze(_bronze(record_id="ok"), "긍정적 흐름", "fake-v1", "run-7")
    assert row.run_id == "run-7"
    assert row.call_id is None
    assert row.no_call_reason == fake_llm.NO_CALL_KEYWORD_ANALYZER


def test_the_run_reaches_back_to_its_records_and_calls(tmp_path):
    """(2) 실행 기록에서 출발한 목록이 그 실행을 가리킨 레코드 집합과 일치한다."""
    store = LocalFsStore(tmp_path)
    items = [
        _bronze(record_id="a", title="정상"),
        _bronze(record_id="b", title="애매"),
        _bronze(record_id="c", title="본문없음", body_available=False),
    ]
    completer = _completer({"정상": GOOD, "애매": UNSURE})

    calls: list[dict] = []
    rows, _, _ = run_llm_analysis(
        items, {"h": "본문"}, completer, "llm-v1", calls=calls, run_id="run-42"
    )
    silver.store_analyses(store, silver.cycles_of(items), rows)
    for call in calls:
        calllog.record_call(store, call)

    # Another run's rows must not leak into the lists read from run-42's end.
    other = [_bronze(record_id="z", title="정상", collection_cycle="2026-06-23T15:00")]
    other_rows, _, _ = run_llm_analysis(other, {"h": "본문"}, completer, "llm-v1", run_id="run-99")
    silver.store_analyses(store, silver.cycles_of(other), other_rows)

    forward = {r["record_id"] for r in rows if r["run_id"] == "run-42"}
    assert forward == {"a", "b", "c"}
    assert {r["record_id"] for r in silver.records_of_run(store, "run-42")} == forward
    assert {r["record_id"] for r in silver.records_of_run(store, "run-99")} == {"z"}

    # The call list is the same fact read from the other end, and a row's call_id
    # resolves inside it.
    assert {c["call_id"] for c in calllog.calls_of_run(store, "run-42")} == {
        c["call_id"] for c in calls
    }
    for row in silver.records_of_run(store, "run-42"):
        if row["call_id"] is not None:
            assert calllog.read_call(store, row["call_id"])["record_id"] == row["record_id"]


def test_coexisting_versions_name_different_runs_and_calls(tmp_path):
    """(3) 병존하는 두 버전은 서로 다른 실행·호출을 가리키고 둘 다 Bronze 로 역추적된다."""
    store = LocalFsStore(tmp_path)
    item = _bronze(record_id="a", title="정상")
    completer = _completer({"정상": GOOD})
    cycles = silver.cycles_of([item])

    for version, run in (("llm-v1", "run-1"), ("llm-v2", "run-2")):
        calls: list[dict] = []
        rows, _, _ = run_llm_analysis(
            [item], {"h": "본문"}, completer, version, calls=calls, run_id=run
        )
        silver.store_analyses(store, cycles, rows, coexist=True)
        for call in calls:
            calllog.record_call(store, call)

    stored = sorted(silver.read_analyses(store), key=lambda r: r["analyzer_version"])
    assert [r["analyzer_version"] for r in stored] == ["llm-v1", "llm-v2"]
    assert [r["run_id"] for r in stored] == ["run-1", "run-2"]
    assert stored[0]["call_id"] != stored[1]["call_id"]
    for row in stored:
        call = calllog.read_call(store, row["call_id"])
        assert call["run_id"] == row["run_id"]
        assert call["analyzer_version"] == row["analyzer_version"]
        # AC2.6 원문 추적은 두 버전 모두에서 그대로다.
        assert row["record_id"] == item["record_id"]
        assert row["source_url"] == item["source_url"]
