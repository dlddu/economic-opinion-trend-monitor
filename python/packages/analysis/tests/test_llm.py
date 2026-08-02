import json

from econ_analysis.llm import CompletionError, analyze_llm, build_prompt, parse_response


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
    c = _completer(_reply(analyzable=False, sentiment="neutral"))
    a = analyze_llm(_bronze(), "body", c)
    assert a.sentiment is None
    assert a.analysis_status == "unanalyzed"  # AC2.5 (not forced)


def test_unanalyzed_on_unusable_reply() -> None:
    c = _completer("sorry, I can't help with that")
    a = analyze_llm(_bronze(), "body", c)
    assert a.analysis_status == "unanalyzed"  # AC2.5 (no JSON -> degrade, not crash)


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
    try:
        parse_response("no json object here")
    except CompletionError:
        return
    raise AssertionError("expected CompletionError on non-JSON reply")
