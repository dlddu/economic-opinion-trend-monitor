"""Per-article model call records — AC4.2, test-pipeline-ops 시나리오 2.

Transcribes that scenario's expected results one for one: every article that reaches the
model leaves a call record whatever the outcome (a reply that parsed, a reply that did
not, a request that never came back, a cached reply replayed), the stored prompt is
byte-identical to what the transport was handed, a reuse names the call it replays, and
reprocessing adds records without disturbing the ones already written.
"""

import json

import pytest
from econ_analysis.llm import CompletionError, build_prompt, run_llm_analysis
from econ_core import calllog, domain
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
        "collection_cycle": "c",
    }
    item.update(overrides)
    return item


def _completer(replies: dict[str, str | Exception], model: str = "m-1", temperature=0.0):
    """Canned transport keyed by record title, recording exactly what it was handed."""
    seen: list[tuple[str, str]] = []

    def _complete(system: str, user: str) -> str:
        seen.append((system, user))
        for marker, reply in replies.items():
            if marker in user:
                if isinstance(reply, Exception):
                    raise reply
                return reply
        raise AssertionError(f"no canned reply for {user!r}")

    _complete.model = model
    _complete.temperature = temperature
    _complete.seen = seen
    return _complete


def _by_record(calls: list[dict]) -> dict[str, dict]:
    return {c["record_id"]: c for c in calls}


def test_every_outcome_leaves_a_call_record_with_its_verdict():
    """정상·파싱 실패·호출 실패 세 기사 모두 기록이 남고, 각각 자기 결말을 말한다."""
    items = [
        _bronze(record_id="ok", title="정상"),
        _bronze(record_id="bad", title="깨짐"),
        _bronze(record_id="down", title="불통"),
    ]
    completer = _completer(
        {
            "정상": GOOD,
            "깨짐": "not json at all",
            "불통": CompletionError("endpoint unreachable"),
        }
    )
    calls: list[dict] = []
    _, stats, _ = run_llm_analysis(
        items, {"h": "본문"}, completer, "llm-v1", calls=calls, run_id="run-42"
    )

    assert len(calls) == 3
    got = _by_record(calls)
    assert got["ok"]["call_outcome"] == "parsed"
    assert got["ok"]["response_raw"] == GOOD
    assert got["ok"]["call_failure_reason"] is None

    assert got["bad"]["call_outcome"] == "parse_failed"
    assert got["bad"]["response_raw"] == "not json at all"
    assert got["bad"]["call_failure_reason"]

    assert got["down"]["call_outcome"] == "call_failed"
    assert got["down"]["response_raw"] is None
    assert "unreachable" in got["down"]["call_failure_reason"]

    for call in calls:
        assert call["run_id"] == "run-42"
        assert call["analyzer_version"] == "llm-v1"
        assert call["call_model"] == "m-1"
        assert call["call_temperature"] == 0.0
        assert call["source_url"] == "https://example.test/a"
        assert call["called_at"]
        assert call["duration_ms"] >= 0
        assert call["call_attempt_count"] == 1
    assert stats.failed == 2


def test_the_recorded_prompt_is_byte_identical_to_what_was_sent():
    """기록된 프롬프트가 모델 더블이 실제로 받은 요청과 바이트 단위로 같다."""
    item = _bronze(record_id="ok", title="정상")
    completer = _completer({"정상": GOOD})
    calls: list[dict] = []
    run_llm_analysis([item], {"h": "본문"}, completer, calls=calls)

    sent_system, sent_user = completer.seen[0]
    call = calls[0]
    assert call["prompt_system"] == sent_system
    assert call["prompt_user"] == sent_user
    assert call["prompt_user"] == build_prompt(item, "본문")
    assert call["prompt_sha256"] == calllog.prompt_digest(sent_system, sent_user)


def test_a_reused_reply_is_recorded_and_names_the_call_it_replays():
    """재사용 기사는 재사용 사실과 원 호출 기록을 가진다."""
    item = _bronze(record_id="ok", title="정상")
    completer = _completer({"정상": GOOD})

    first_calls: list[dict] = []
    cache: dict[str, str] = {}
    _, _, entries = run_llm_analysis(
        [item], {"h": "본문"}, completer, reply_cache=cache, calls=first_calls
    )
    origin = first_calls[0]["call_id"]
    assert entries[0]["call_id"] == origin

    origins = {e["cache_key"]: e["call_id"] for e in entries}
    second_calls: list[dict] = []
    _, stats, _ = run_llm_analysis(
        [item],
        {"h": "본문"},
        completer,
        reply_cache=cache,
        calls=second_calls,
        reply_origins=origins,
    )

    assert stats.reused == 1
    assert len(completer.seen) == 1  # the reuse sent nothing
    reuse = second_calls[0]
    assert reuse["call_outcome"] == "reused"
    assert reuse["reused_from_call_id"] == origin
    assert reuse["response_raw"] == GOOD
    assert reuse["call_attempt_count"] == 0
    assert reuse["call_id"] != origin


def test_a_reuse_from_a_pre_call_record_cache_is_still_recorded():
    """호출 기록 이전에 쌓인 캐시 항목을 재사용해도 기록은 남고, 원 호출만 null 이다."""
    item = _bronze(record_id="ok", title="정상")
    completer = _completer({"정상": GOOD})
    # A cache populated before call records existed: a reply, but no call_id anywhere.
    cache: dict[str, str] = {}
    run_llm_analysis([item], {"h": "본문"}, completer, reply_cache=cache)

    calls: list[dict] = []
    _, stats, _ = run_llm_analysis(
        [item], {"h": "본문"}, completer, reply_cache=cache, calls=calls, reply_origins={}
    )
    assert stats.reused == 1
    assert calls[0]["call_outcome"] == "reused"
    assert calls[0]["reused_from_call_id"] is None


def test_reprocessing_appends_and_never_overwrites_an_earlier_call(tmp_path):
    """재처리 후 새 버전의 호출 기록이 추가되고 이전 버전의 기록은 그대로 남는다."""
    store = LocalFsStore(tmp_path)
    item = _bronze(record_id="ok", title="정상")
    completer = _completer({"정상": GOOD})

    v1: list[dict] = []
    run_llm_analysis([item], {"h": "본문"}, completer, "llm-v1", calls=v1)
    for call in v1:
        assert calllog.record_call(store, call)

    v2: list[dict] = []
    run_llm_analysis([item], {"h": "본문"}, completer, "llm-v2", calls=v2)
    for call in v2:
        assert calllog.record_call(store, call)

    stored = calllog.read_calls(store)
    assert len(stored) == 2
    assert {c["analyzer_version"] for c in stored} == {"llm-v1", "llm-v2"}

    assert calllog.record_call(store, v1[0]) is False
    assert len(calllog.read_calls(store)) == 2


def test_an_article_that_never_reached_the_model_has_no_call_record():
    """본문 미확보 기사는 호출 자체가 없으므로 기록도 없고, 그 자리를 미호출 사유가 채운다."""
    item = _bronze(record_id="nobody", body_available=False)
    completer = _completer({"정상": GOOD})
    calls: list[dict] = []
    rows, _, _ = run_llm_analysis([item], {}, completer, calls=calls)

    assert rows[0]["analysis_status"] == "unanalyzed"
    assert calls == []
    assert completer.seen == []
    # The record AC4.2 does not write is answered by AC4.3 on the row itself.
    assert rows[0]["call_id"] is None
    assert rows[0]["no_call_reason"] == "body_unavailable"


def test_call_records_land_in_the_contract_dataset(tmp_path):
    """기록이 계약 데이터셋 `silver/llm_call` 에 call_id 를 키로 떨어진다."""
    store = LocalFsStore(tmp_path)
    completer = _completer({"정상": GOOD})
    calls: list[dict] = []
    run_llm_analysis([_bronze(record_id="ok", title="정상")], {"h": "본문"}, completer, calls=calls)
    calllog.record_call(store, calls[0])

    assert store.dataset_dir(domain.SILVER, domain.DS_LLM_CALL).exists()
    stored = store.get_object(domain.SILVER, domain.DS_LLM_CALL, "call_id", calls[0]["call_id"])
    assert stored is not None and stored["record_id"] == "ok"


@pytest.mark.parametrize("field", ["call_id", "run_id", "record_id", "prompt_sha256"])
def test_every_call_record_carries_its_identity_fields(field):
    completer = _completer({"정상": GOOD})
    calls: list[dict] = []
    run_llm_analysis(
        [_bronze(record_id="ok", title="정상")],
        {"h": "본문"},
        completer,
        calls=calls,
        run_id="run-7",
    )
    assert calls[0][field]
