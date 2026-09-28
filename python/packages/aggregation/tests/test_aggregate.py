import pytest
from econ_aggregation.aggregate import (
    BUCKET_UNITS,
    _bucket,
    build_axis_sentiment,
    build_axis_sentiment_all_units,
    build_subject_trends,
    build_subject_trends_all_units,
)


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
    assert round(sum(t["normalized_share"] for t in kr), 2) == 1.0
    assert all(t["bucket_unit"] == "hour" for t in kr)


def test_subject_trend_delta_and_spark_come_from_real_buckets() -> None:
    # 1/2 -> 3/4 (and the mirror image for B) keeps the deltas exact — nothing below rounds.
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

    assert rows[("A", "2026-06-23T14")]["delta"] == 0.0
    assert rows[("A", "2026-06-23T14")]["spark"] == [0.5]

    assert rows[("A", "2026-06-23T15")]["delta"] == 25.0
    assert rows[("A", "2026-06-23T15")]["spark"] == [0.5, 0.75]
    assert rows[("B", "2026-06-23T15")]["delta"] == -25.0

    # Raw counts stay per-bucket rather than cumulative (AC6.2).
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
    assert kr["distribution"]["unanalyzed"] == 0.5
    assert kr["distribution"]["positive"] == 1.0


# Two hours of one day, a second day in the same ISO week and a third in the next —
# so "day" and "week" each have something to actually roll up and a boundary to get wrong.
_SPAN = [
    ("1", "2026-06-23T14:00:00+00:00", ["A"]),
    ("2", "2026-06-23T14:30:00+00:00", ["B"]),
    ("3", "2026-06-23T15:00:00+00:00", ["A"]),
    ("4", "2026-06-28T09:00:00+00:00", ["A"]),
    ("5", "2026-06-29T09:00:00+00:00", ["B"]),
]


def _span_bronze() -> list[dict]:
    return [
        {"record_id": rid, "source_id": "src", "axis": "KR", "collected_at": stamp}
        for rid, stamp, _ in _SPAN
    ]


def _span_silver() -> list[dict]:
    return [_silver(rid, subjects, "positive", "analyzed") for rid, _, subjects in _SPAN]


def test_bucket_labels_are_zero_padded_per_unit() -> None:
    stamp = "2026-06-23T14:37:02+00:00"
    assert _bucket(stamp) == "2026-06-23T14"
    assert _bucket(stamp, "hour") == "2026-06-23T14"
    assert _bucket(stamp, "day") == "2026-06-23"
    assert _bucket(stamp, "week") == "2026-W26"
    assert _bucket("2026-06-29T09:00:00+00:00", "week") == "2026-W27"


def test_unknown_bucket_unit_is_refused_rather_than_silently_hour() -> None:
    with pytest.raises(ValueError, match="unknown bucket unit"):
        _bucket("2026-06-23T14:00:00+00:00", "fortnight")


def test_every_unit_is_emitted_finest_first() -> None:
    rows = build_subject_trends_all_units(_span_bronze(), _span_silver())
    units = [row["bucket_unit"] for row in rows]
    assert set(units) == set(BUCKET_UNITS)
    # Readers that stop at the first unit they recognize get the default (AC5.2: 기본 단위는 시간).
    assert units == sorted(units, key=lambda u: BUCKET_UNITS.index(u))


def test_rollup_raw_counts_equal_the_sum_of_the_finer_buckets() -> None:
    bronze, silver = _span_bronze(), _span_silver()
    by_unit = {unit: build_subject_trends(bronze, silver, unit) for unit in BUCKET_UNITS}

    def counts(unit: str) -> dict[tuple[str, str], int]:
        return {(row["time_bucket"], row["subject"]): row["raw_count"] for row in by_unit[unit]}

    hours, days, weeks = counts("hour"), counts("day"), counts("week")

    for (day, subject), n in days.items():
        rolled = sum(c for (bucket, s), c in hours.items() if s == subject and bucket[:10] == day)
        assert n == rolled, f"{day}/{subject}: day {n} != hours {rolled}"
    assert weeks[("2026-W26", "A")] == days[("2026-06-23", "A")] + days[("2026-06-28", "A")]
    assert weeks[("2026-W27", "B")] == days[("2026-06-29", "B")]

    for unit in BUCKET_UNITS:
        assert sum(row["raw_count"] for row in by_unit[unit]) == len(_SPAN)


def test_rollup_shares_stay_a_distribution_inside_each_bucket() -> None:
    bronze, silver = _span_bronze(), _span_silver()
    for unit in BUCKET_UNITS:
        per_bucket: dict[str, float] = {}
        for row in build_subject_trends(bronze, silver, unit):
            per_bucket[row["time_bucket"]] = (
                per_bucket.get(row["time_bucket"], 0.0) + row["normalized_share"]
            )
        for bucket, total in per_bucket.items():
            assert round(total, 2) == 1.0, f"{unit}/{bucket} shares sum to {total}"


def test_axis_sentiment_rolls_up_on_the_same_buckets() -> None:
    bronze, silver = _span_bronze(), _span_silver()
    by_unit = {
        unit: build_axis_sentiment_all_units(bronze, silver, (unit,)) for unit in BUCKET_UNITS
    }

    hours = {row["time_bucket"]: row["analyzed_total"] for row in by_unit["hour"]}
    days = {row["time_bucket"]: row["analyzed_total"] for row in by_unit["day"]}
    weeks = {row["time_bucket"]: row["analyzed_total"] for row in by_unit["week"]}

    assert days["2026-06-23"] == hours["2026-06-23T14"] + hours["2026-06-23T15"]
    assert weeks["2026-W26"] == days["2026-06-23"] + days["2026-06-28"]
    for unit in BUCKET_UNITS:
        assert sum(row["analyzed_total"] for row in by_unit[unit]) == len(_SPAN)


def test_default_unit_is_the_hour_so_existing_callers_are_unchanged() -> None:
    bronze, silver = _span_bronze(), _span_silver()
    assert build_subject_trends(bronze, silver) == build_subject_trends(bronze, silver, "hour")
    assert build_axis_sentiment(bronze, silver) == build_axis_sentiment(bronze, silver, "hour")
