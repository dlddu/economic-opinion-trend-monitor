"""Real-analyzer tests — deterministic, offline (canned completer, no network).

Exercises the *real* prompt-build / response-parse / Silver-mapping path of
:mod:`econ_analysis.llm` (AC2.1-AC2.6), plus the boundary this module draws between an
article the model would not judge (``unanalyzed``, AC2.5) and an operational failure
that must never be spent on that signal (``ConfigError`` / ``CompletionError``).
"""

import json

import pytest
from econ_analysis.llm import (
    CompletionError,
    ConfigError,
    analyze_llm,
    build_prompt,
    http_completer,
    parse_response,
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
    assert a.sentiment == "positive"  # AC2.3
    assert a.analysis_status == "analyzed"
    assert a.target_countries == ["KR", "US"]  # AC2.1 multi-country (AC2.4 preserved)
    assert a.narrative_subjects == ["삼성전자"]  # AC2.2
    assert a.record_id == "r"  # Bronze tracking key preserved (AC2.6)
    assert a.source_url == "https://example.test/a"  # AC2.6


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
    assert a.analysis_status == "low_confidence"  # AC2.5


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
    assert a.analysis_status == "unanalyzed"  # AC2.5
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

    records, stats = run_llm_analysis([ok, dict(bad, title="bad-title"), nobody], bodies, _flaky)
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
    records, stats = run_llm_analysis(items, {"h": "본문"}, _boom)
    # Every record reads "unanalyzed", so only the stats can tell an outage apart.
    assert all(r["analysis_status"] == "unanalyzed" for r in records)
    assert (stats.attempted, stats.failed) == (2, 2)
