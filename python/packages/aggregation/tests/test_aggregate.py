from econ_aggregation.aggregate import build_axis_sentiment, build_subject_trends


def _bronze(rid: str, axis: str, source: str) -> dict:
    return {
        "record_id": rid,
        "source_id": source,
        "axis": axis,
        "collected_at": "2026-06-23T14:00:00+00:00",
    }


def _silver(rid: str, subjects: list[str], sentiment: str | None, status: str) -> dict:
    return {
        "record_id": rid,
        "narrative_subjects": subjects,
        "sentiment": sentiment,
        "analysis_status": status,
    }


def test_subject_trend_shares_sum_to_one_per_axis() -> None:
    bronze = [_bronze("1", "KR", "src"), _bronze("2", "KR", "src")]
    silver = [
        _silver("1", ["A"], "positive", "analyzed"),
        _silver("2", ["B"], "neutral", "analyzed"),
    ]
    kr = [t for t in build_subject_trends(bronze, silver) if t["axis"] == "KR"]
    assert round(sum(t["normalized_share"] for t in kr), 2) == 1.0  # AC3.1
    assert all(t["bucket_unit"] == "hour" for t in kr)  # AC3.3


def test_axis_sentiment_separates_unanalyzed() -> None:
    bronze = [_bronze("1", "KR", "src"), _bronze("2", "KR", "src")]
    silver = [
        _silver("1", ["A"], "positive", "analyzed"),
        _silver("2", ["A"], None, "unanalyzed"),
    ]
    kr = next(r for r in build_axis_sentiment(bronze, silver) if r["axis"] == "KR")
    assert kr["analyzed_total"] == 1
    # Unanalyzed is separated out; sentiment ratios are over analyzed only (AC3.4).
    assert kr["distribution"]["unanalyzed"] == 0.5
    assert kr["distribution"]["positive"] == 1.0
