from econ_aggregation.aggregate import build_axis_sentiment, build_subject_trends


def _bronze(rid: str, axis: str, source: str, hour: int = 14) -> dict:
    return {
        "record_id": rid,
        "source_id": source,
        "axis": axis,
        "collected_at": f"2026-06-23T{hour:02d}:00:00+00:00",
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


def test_subject_trend_delta_and_spark_come_from_real_buckets() -> None:
    # One source, two hour buckets. A goes 1/2 -> 3/4 of the bucket, B the
    # mirror image, so the deltas are exact and opposite.
    bronze = [
        _bronze("1", "KR", "src", hour=14),
        _bronze("2", "KR", "src", hour=14),
        _bronze("3", "KR", "src", hour=15),
        _bronze("4", "KR", "src", hour=15),
        _bronze("5", "KR", "src", hour=15),
        _bronze("6", "KR", "src", hour=15),
    ]
    silver = [
        _silver("1", ["A"], "positive", "analyzed"),
        _silver("2", ["B"], "neutral", "analyzed"),
        _silver("3", ["A"], "positive", "analyzed"),
        _silver("4", ["A"], "positive", "analyzed"),
        _silver("5", ["A"], "positive", "analyzed"),
        _silver("6", ["B"], "neutral", "analyzed"),
    ]
    rows = {
        (t["subject"], t["time_bucket"]): t
        for t in build_subject_trends(bronze, silver)
        if t["axis"] == "KR"
    }

    assert rows[("A", "2026-06-23T14")]["normalized_share"] == 0.5
    assert rows[("A", "2026-06-23T15")]["normalized_share"] == 0.75

    # The first bucket a subject appears in has nothing to look back at.
    assert rows[("A", "2026-06-23T14")]["delta"] == 0.0
    assert rows[("A", "2026-06-23T14")]["spark"] == [0.5]

    # The second reads its own previous bucket, in percentage points (AC3.3).
    assert rows[("A", "2026-06-23T15")]["delta"] == 25.0
    assert rows[("A", "2026-06-23T15")]["spark"] == [0.5, 0.75]
    assert rows[("B", "2026-06-23T15")]["delta"] == -25.0

    # Raw counts stay per-bucket rather than cumulative (AC3.8).
    assert rows[("A", "2026-06-23T15")]["raw_count"] == 3


def test_subject_trend_single_bucket_is_not_a_synthetic_ramp() -> None:
    bronze = [_bronze("1", "KR", "src")]
    silver = [_silver("1", ["A"], "positive", "analyzed")]
    (row,) = [t for t in build_subject_trends(bronze, silver) if t["axis"] == "KR"]
    assert row["delta"] == 0.0
    assert row["spark"] == [row["normalized_share"]]


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
