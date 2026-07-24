from econ_analysis.fake_llm import analyze, normalize_subject


def _bronze(**overrides) -> dict:
    item = {
        "record_id": "r",
        "source_id": "s",
        "axis": "KR",
        "rank": 1,
        "view_count": 1,
        "title": "[삼성전자] 관련 보도 — positive 신호",
        "source_url": "u",
        "body_hash": "h",
        "body_available": True,
        "collected_at": "2026-06-23T14:00:00+00:00",
        "collection_cycle": "c",
    }
    item.update(overrides)
    return item


BODY = "삼성전자. tone=positive. 대상국=KR,US."


def test_analyze_extracts_sentiment_subjects_countries() -> None:
    a = analyze(_bronze(), BODY)
    assert a.sentiment == "positive"  # AC2.3
    assert a.analysis_status == "analyzed"
    assert a.narrative_subjects == ["삼성전자"]  # AC2.2
    assert a.target_countries == ["KR", "US"]  # AC2.1 (multi-country)
    assert a.record_id == "r"  # Bronze tracking key preserved (AC2.6)


def test_unanalyzed_when_body_missing() -> None:
    a = analyze(_bronze(body_hash="", body_available=False), None)
    assert a.sentiment is None
    assert a.analysis_status == "unanalyzed"  # AC2.5


def test_unanalyzed_when_body_hash_dangles() -> None:
    # body_available says captured but the hash resolves to nothing -> unanalyzed, not a crash.
    a = analyze(_bronze(), None)
    assert a.sentiment is None
    assert a.analysis_status == "unanalyzed"  # AC2.5


def test_low_confidence_on_mixed_tone() -> None:
    a = analyze(_bronze(title="[전기요금] x"), "x. tone=mixed. 대상국=KR.")
    assert a.sentiment == "mixed"
    assert a.analysis_status == "low_confidence"  # AC2.5


def test_alias_unification() -> None:
    # Surface variants collapse to one canonical key (AC2.2).
    assert normalize_subject("Samsung rallies on chips") == "삼성전자"
    assert normalize_subject("the Fed holds rates") == "Federal Reserve"
