"""Every case builds the picks and ``build_subject_trends`` over the *same* input: the claim
under test is that the list and the count agree, not that either matches a literal.
"""

from collections import Counter

from econ_aggregation.aggregate import (
    ALL_AXIS,
    build_article_picks_all_units,
    build_subject_trends_all_units,
)


def _axes(rows: list[dict]) -> list[dict]:
    """ALL folds the axes' sources together and is decomposed only through them."""
    return [row for row in rows if row["axis"] != ALL_AXIS]


def _bronze(rid: str, axis: str, source: str, at: str, url: str = "") -> dict:
    return {
        "record_id": rid,
        "source_id": source,
        "axis": axis,
        "collected_at": at,
        "source_url": url or f"https://ex.test/{rid}",
    }


def _silver(rid: str, subjects: list[str], categories: list[str] | None = None) -> dict:
    row = {
        "record_id": rid,
        "narrative_subjects": subjects,
        "sentiment": "neutral",
        "analysis_status": "analyzed",
    }
    if categories is not None:
        row["subject_categories"] = categories
    return row


def _corpus() -> tuple[list[dict], list[dict]]:
    bronze = [
        _bronze("a1", "KR", "kr-wire", "2026-06-23T14:05:00+00:00", "https://ex.test/same"),
        # The same article seen again later in the same hour and day: only this one counts.
        _bronze("a2", "KR", "kr-daily", "2026-06-23T14:40:00+00:00", "https://ex.test/same"),
        _bronze("b1", "KR", "kr-wire", "2026-06-23T15:00:00+00:00"),
        _bronze("c1", "US", "us-desk", "2026-06-24T01:00:00+00:00"),
        _bronze("d1", "KR", "kr-wire", "2026-06-29T09:00:00+00:00"),
        _bronze("e1", "KR", "kr-wire", "2026-06-23T14:50:00+00:00"),
    ]
    silver = [
        _silver("a1", ["삼성전자"]),
        _silver("a2", ["삼성전자", "반도체", "삼성전자"]),
        _silver("b1", ["전기요금"], categories=["에너지"]),
        _silver("c1", ["연준"]),
        _silver("d1", ["삼성전자"]),
        _silver("e1", []),
    ]
    return bronze, silver


def test_picks_number_every_gold_raw_count_exactly() -> None:
    bronze, silver = _corpus()
    picks = build_article_picks_all_units(bronze, silver)
    trends = _axes(build_subject_trends_all_units(bronze, silver))

    def value(row: dict) -> tuple[str, str, str]:
        return row["axis"], row["bucket_unit"], row["time_bucket"]

    listed = Counter((*value(p), s) for p in picks for s in p["counted_subjects"])
    counted = {(*value(t), t["subject"]): t["raw_count"] for t in trends}
    assert dict(listed) == counted


def test_a_pick_is_the_articles_latest_observation_in_its_bucket() -> None:
    bronze, silver = _corpus()
    picks = build_article_picks_all_units(bronze, silver)

    hour = [p for p in picks if p["bucket_unit"] == "hour" and p["time_bucket"] == "2026-06-23T14"]
    assert [(p["record_id"], p["source_id"], p["counted_subjects"]) for p in hour] == [
        ("a2", "kr-daily", ["삼성전자", "반도체"])
    ]
    week = {p["record_id"] for p in picks if p["bucket_unit"] == "week" and p["axis"] == "KR"}
    assert week == {"a2", "b1", "d1"}
    energy = [p for p in picks if p["record_id"] == "b1"]
    assert {tuple(p["counted_subjects"]) for p in energy} == {("에너지",)}


def test_an_article_counted_under_no_subject_is_not_written() -> None:
    bronze, silver = _corpus()
    picks = build_article_picks_all_units(bronze, silver)

    assert all(p["counted_subjects"] for p in picks)
    assert not [p for p in picks if p["record_id"] == "e1"]
