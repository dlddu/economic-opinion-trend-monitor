"""Real-analyzer tests — deterministic, offline (canned completer, no network).

Exercises the *real* prompt-build / response-parse / Silver-mapping path of
:mod:`econ_analysis.llm` (AC2.1-AC2.6), plus the boundary this module draws between an
article the model would not judge (``unanalyzed``, AC2.5) and an operational failure
that must never be spent on that signal (``ConfigError`` / ``CompletionError``).
"""

import json

import pytest
from econ_analysis.llm import (
    _SYSTEM_PROMPT,
    Completer,
    CompletionError,
    ConfigError,
    analyze_llm,
    build_prompt,
    http_completer,
    parse_response,
    reply_cache_key,
    run_llm_analysis,
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


def _completer(reply: str):
    """A canned completer that records the (system, user) prompts it was given."""
    calls: list[tuple[str, str]] = []

    def _complete(system: str, user: str) -> str:
        calls.append((system, user))
        return reply

    _complete.calls = calls  # type: ignore[attr-defined]
    return _complete


def _boom(_system: str, _user: str) -> str:
    """A completer standing in for an unreachable endpoint."""
    raise CompletionError("endpoint down")


def _reply(**fields) -> str:
    payload = {
        "target_countries": [],
        "narrative_subjects": [],
        "sentiment": "neutral",
        "analyzable": True,
        "confidence": 0.9,
    }
    payload.update(fields)
    return json.dumps(payload)


def test_analyze_maps_full_reply() -> None:
    c = _completer(
        _reply(
            target_countries=["KR", "US"],
            narrative_subjects=["삼성전자"],
            sentiment="positive",
            confidence=0.92,
        )
    )
    a = analyze_llm(_bronze(), "삼성전자 어닝 서프라이즈.", c)
    assert a.sentiment == "positive"
    assert a.analysis_status == "analyzed"
    assert a.target_countries == ["KR", "US"]
    assert a.narrative_subjects == ["삼성전자"]
    assert a.record_id == "r"
    assert a.source_url == "https://example.test/a"


def test_prompt_carries_title_and_body() -> None:
    c = _completer(_reply())
    analyze_llm(_bronze(title="원/달러 환율 급등"), "환율 상승 본문.", c)
    _system, user = c.calls[0]
    assert "원/달러 환율 급등" in user
    assert "환율 상승 본문." in user


def test_surface_variant_unifies() -> None:
    # The model returns a surface form; the known-catalog normalizer folds it (AC2.2).
    c = _completer(_reply(narrative_subjects=["Samsung"]))
    a = analyze_llm(_bronze(), "body", c)
    assert a.narrative_subjects == ["삼성전자"]


def test_novel_subject_kept_as_is() -> None:
    # A subject outside the known catalog is preserved, not dropped (AC2.2).
    c = _completer(_reply(narrative_subjects=["한국조선해양"]))
    a = analyze_llm(_bronze(), "body", c)
    assert a.narrative_subjects == ["한국조선해양"]


def test_low_confidence_below_threshold() -> None:
    c = _completer(_reply(sentiment="mixed", confidence=0.4))
    a = analyze_llm(_bronze(), "body", c)
    assert a.sentiment == "mixed"
    assert a.analysis_status == "low_confidence"


def test_unanalyzed_when_model_declines() -> None:
    # The model answered — with "I cannot judge". That is an analysis outcome (AC2.5).
    c = _completer(_reply(analyzable=False, sentiment="neutral"))
    a = analyze_llm(_bronze(), "body", c)
    assert a.sentiment is None
    assert a.analysis_status == "unanalyzed"  # not forced


def test_unusable_reply_raises_instead_of_degrading() -> None:
    # Nobody usable answered -> operational failure, not a judgement about the article.
    c = _completer("sorry, I can't help with that")
    with pytest.raises(CompletionError):
        analyze_llm(_bronze(), "body", c)


def test_invalid_sentiment_raises() -> None:
    c = _completer(_reply(sentiment="euphoric"))
    with pytest.raises(CompletionError):
        analyze_llm(_bronze(), "body", c)


def test_unanalyzed_when_body_missing_does_not_call_model() -> None:
    c = _completer(_reply())
    a = analyze_llm(_bronze(body_hash="", body_available=False), None, c)
    assert a.analysis_status == "unanalyzed"
    assert c.calls == []  # model is never called without a body


def test_bad_confidence_type_degrades_to_low() -> None:
    c = _completer(_reply(sentiment="negative", confidence="high"))
    a = analyze_llm(_bronze(), "body", c)
    assert a.sentiment == "negative"
    assert a.analysis_status == "low_confidence"  # unparseable confidence -> 0.0 -> low


def test_build_prompt_shape() -> None:
    p = build_prompt(_bronze(title="T"), "B")
    assert "TITLE: T" in p
    assert "BODY:\nB" in p


def test_parse_response_tolerates_code_fence() -> None:
    d = parse_response('```json\n{"sentiment": "negative"}\n```')
    assert d["sentiment"] == "negative"


def test_parse_response_rejects_non_json() -> None:
    with pytest.raises(CompletionError):
        parse_response("no json object here")


def test_http_completer_requires_api_key(monkeypatch: pytest.MonkeyPatch) -> None:
    # A missing key is an operator error: it surfaces at construction, before any read.
    monkeypatch.delenv("ECON_LLM_API_KEY", raising=False)
    with pytest.raises(ConfigError):
        http_completer()


def test_http_completer_builds_with_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ECON_LLM_API_KEY", "k")
    monkeypatch.setenv("ECON_LLM_BASE_URL", "https://llm.example/v1/")
    assert callable(http_completer())


def test_run_counts_attempts_and_isolates_failures() -> None:
    ok = _bronze(record_id="ok", body_hash="h1")
    bad = _bronze(record_id="bad", body_hash="h2")
    nobody = _bronze(record_id="nobody", body_hash="", body_available=False)
    bodies = {"h1": "본문", "h2": "본문"}

    def _flaky(system: str, user: str) -> str:
        if "bad-title" in user:
            raise CompletionError("endpoint down")
        return _reply(sentiment="positive", confidence=0.9)

    records, stats, _ = run_llm_analysis([ok, dict(bad, title="bad-title"), nobody], bodies, _flaky)
    by_id = {r["record_id"]: r for r in records}
    # Only items with a body reach the model; the body-less one is not an attempt.
    assert (stats.attempted, stats.failed) == (2, 1)
    assert by_id["ok"]["analysis_status"] == "analyzed"
    # A failed call degrades that record only — the batch still completes.
    assert by_id["bad"]["analysis_status"] == "unanalyzed"
    assert by_id["bad"]["record_id"] == "bad"  # tracking key survives the failure (AC2.6)
    assert by_id["nobody"]["analysis_status"] == "unanalyzed"


def test_run_reports_total_outage() -> None:
    items = [_bronze(record_id="a"), _bronze(record_id="b")]
    records, stats, _ = run_llm_analysis(items, {"h": "본문"}, _boom)
    # Every record reads "unanalyzed", so only the stats can tell an outage apart.
    assert all(r["analysis_status"] == "unanalyzed" for r in records)
    assert (stats.attempted, stats.failed) == (2, 2)


def _capture_payload(monkeypatch: pytest.MonkeyPatch) -> list[dict]:
    """Stub urlopen and record each request body the completer sends."""
    import io
    import urllib.request

    sent: list[dict] = []

    def _fake_urlopen(req, timeout=None):  # noqa: ANN001
        sent.append(json.loads(req.data))
        envelope = {"choices": [{"message": {"content": "{}"}}]}
        return io.BytesIO(json.dumps(envelope).encode())

    monkeypatch.setenv("ECON_LLM_API_KEY", "k")
    monkeypatch.setattr(urllib.request, "urlopen", _fake_urlopen)
    return sent


def test_temperature_defaults_to_zero(monkeypatch: pytest.MonkeyPatch) -> None:
    sent = _capture_payload(monkeypatch)
    monkeypatch.delenv("ECON_LLM_TEMPERATURE", raising=False)
    http_completer()("s", "u")
    assert sent[0]["temperature"] == 0


@pytest.mark.parametrize("raw", ["", "default", " Default "])
def test_temperature_can_be_omitted(monkeypatch: pytest.MonkeyPatch, raw: str) -> None:
    sent = _capture_payload(monkeypatch)
    monkeypatch.setenv("ECON_LLM_TEMPERATURE", raw)
    http_completer()("s", "u")
    assert "temperature" not in sent[0]


def test_bad_temperature_is_a_config_error(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ECON_LLM_API_KEY", "k")
    monkeypatch.setenv("ECON_LLM_TEMPERATURE", "warm")
    with pytest.raises(ConfigError):
        http_completer()


def test_run_keeps_the_last_failure_reason() -> None:
    items = [_bronze(record_id="a"), _bronze(record_id="b")]
    _, stats, _ = run_llm_analysis(items, {"h": "본문"}, _boom)
    assert stats.last_error


def _counting(reply: str) -> tuple[list[str], Completer]:
    calls: list[str] = []

    def _complete(system: str, user: str) -> str:
        calls.append(user)
        return reply

    return calls, _complete


def test_second_cycle_reuses_unchanged_replies() -> None:
    items = [_bronze(record_id="a", body_hash="h1"), _bronze(record_id="b", body_hash="h2")]
    bodies = {"h1": "본문1", "h2": "본문2"}
    calls, completer = _counting(_reply(sentiment="positive", confidence=0.9))

    first, stats1, entries = run_llm_analysis(items, bodies, completer)
    assert (stats1.attempted, stats1.reused, len(entries)) == (2, 0, 2)

    cache = {e["cache_key"]: e["reply"] for e in entries}
    second, stats2, entries2 = run_llm_analysis(items, bodies, completer, reply_cache=cache)
    assert len(calls) == 2
    assert (stats2.attempted, stats2.reused, entries2) == (0, 2, [])
    per_call = {"analyzed_at", "call_id"}
    strip = lambda rs: [{k: v for k, v in r.items() if k not in per_call} for r in rs]  # noqa: E731
    assert strip(first) == strip(second)
    assert [r["call_id"] for r in second] != [r["call_id"] for r in first]
    assert all(r["call_id"] for r in first + second)


def test_edited_body_or_version_bump_calls_again() -> None:
    item = _bronze(record_id="a", body_hash="h1")
    calls, completer = _counting(_reply(sentiment="neutral", confidence=0.9))
    _, _, entries = run_llm_analysis([item], {"h1": "본문"}, completer)
    cache = {e["cache_key"]: e["reply"] for e in entries}

    run_llm_analysis(
        [dict(item, body_hash="h2")], {"h2": "수정된 본문"}, completer, reply_cache=cache
    )
    run_llm_analysis([item], {"h1": "본문"}, completer, "llm-v2", reply_cache=cache)
    assert len(calls) == 3


def test_model_switch_misses_the_cache() -> None:
    item = _bronze(record_id="a", body_hash="h1")
    calls, completer = _counting(_reply(sentiment="neutral", confidence=0.9))
    completer.model = "old-model"  # type: ignore[attr-defined]
    _, _, entries = run_llm_analysis([item], {"h1": "본문"}, completer)
    cache = {e["cache_key"]: e["reply"] for e in entries}
    completer.model = "new-model"  # type: ignore[attr-defined]
    _, stats, _ = run_llm_analysis([item], {"h1": "본문"}, completer, reply_cache=cache)
    assert (stats.attempted, stats.reused, len(calls)) == (1, 0, 2)


def test_failed_replies_are_not_cached() -> None:
    _, stats, entries = run_llm_analysis([_bronze(record_id="a")], {"h": "본문"}, _boom)
    assert stats.failed == 1 and entries == []


def test_unparseable_cached_reply_falls_back_to_the_model() -> None:
    item = _bronze(record_id="a", body_hash="h1")
    calls, completer = _counting(_reply(sentiment="negative", confidence=0.9))
    key = reply_cache_key("llm-v1", "", _SYSTEM_PROMPT, build_prompt(item, "본문"))
    records, stats, _ = run_llm_analysis(
        [item], {"h1": "본문"}, completer, reply_cache={key: "not json"}
    )
    assert (stats.attempted, stats.reused, len(calls)) == (1, 0, 1)
    assert records[0]["sentiment"] == "negative"


def test_prompt_asks_for_korean_subjects() -> None:
    assert "Korean" in _SYSTEM_PROMPT
    assert "연준 not Federal Reserve" in _SYSTEM_PROMPT


@pytest.mark.parametrize(
    ("surface", "canonical"),
    [
        ("Fed", "연준"),
        ("Federal Reserve", "연준"),
        ("미 연준", "연준"),
        ("NVIDIA", "엔비디아"),
        ("US CPI", "미국 소비자물가지수"),
        ("AI 반도체 capex", "AI 반도체 설비투자"),
        ("samsung", "삼성전자"),
        ("기준금리", "한국은행 기준금리"),
    ],
)
def test_catalog_variants_fold_to_korean_key(surface: str, canonical: str) -> None:
    c = _completer(_reply(narrative_subjects=[surface]))
    assert analyze_llm(_bronze(), "body", c).narrative_subjects == [canonical]


@pytest.mark.parametrize(
    "subject", ["미국 기준금리", "엔/달러 환율", "삼성SDI", "삼성바이오로직스"]
)
def test_subject_containing_an_alias_is_not_folded(subject: str) -> None:
    # Substring folding would merge these into 한국은행 기준금리 / 원/달러 환율 / 삼성전자.
    c = _completer(_reply(narrative_subjects=[subject]))
    assert analyze_llm(_bronze(), "body", c).narrative_subjects == [subject]
