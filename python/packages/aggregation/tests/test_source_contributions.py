"""AC3.9 — the source decomposition and the two sum identities it must satisfy.

Every case runs the decomposition and ``build_subject_trends`` over the *same*
input, because the claim under test is that the two agree, not that either one
matches a literal someone typed here.
"""

import pytest
from econ_aggregation.aggregate import build_subject_trends, build_subject_trends_all_units
from econ_aggregation.contributions import (
    build_subject_source_contributions,
    build_subject_source_contributions_all_units,
)


def _bronze(rid: str, axis: str, source: str, hour: int = 14) -> dict:
    return {
        "record_id": rid,
        "source_id": source,
        "axis": axis,
        "collected_at": f"2026-06-23T{hour:02d}:00:00+00:00",
    }


def _silver(rid: str, subjects: list[str]) -> dict:
    return {
        "record_id": rid,
        "narrative_subjects": subjects,
        "sentiment": "neutral",
        "analysis_status": "analyzed",
    }


def _corpus(daily_extra: int = 0) -> tuple[list[dict], list[dict]]:
    """A second subject on each source keeps both source totals above their
    ``삼성전자`` count, so the naive share and the normalized share do not coincide.
    """
    bronze = [
        _bronze("w1", "KR", "kr-wire"),
        _bronze("w2", "KR", "kr-wire"),
        _bronze("d1", "KR", "kr-daily"),
        _bronze("d2", "KR", "kr-daily"),
    ]
    silver = [
        _silver("w1", ["삼성전자"]),
        _silver("w2", ["전기요금"]),
        _silver("d1", ["삼성전자"]),
        _silver("d2", ["원/달러 환율"]),
    ]
    for i in range(daily_extra):
        rid = f"x{i}"
        bronze.append(_bronze(rid, "KR", "kr-daily"))
        silver.append(_silver(rid, ["삼성전자"]))
    return bronze, silver


def _thirds() -> tuple[list[dict], list[dict]]:
    """Three collectors, one subject each carries alone — a value that does not
    divide on the 4-decimal grid.

    Each source contributes exactly 1/3, so rounding the three parts on their own
    lands on 0.3333 and they miss the value's own 1.0 by a grid step. This is the
    corpus the residual handout exists for; without it the identity test passes
    for the wrong reason.
    """
    bronze = [_bronze(f"t{i}", "KR", f"kr-{i}") for i in range(3)]
    silver = [_silver(f"t{i}", ["삼성전자"]) for i in range(3)]
    return bronze, silver


def _by_value(rows: list[dict]) -> dict[tuple[str, str, str, str], list[dict]]:
    out: dict[tuple[str, str, str, str], list[dict]] = {}
    for row in rows:
        key = (row["subject"], row["axis"], row["bucket_unit"], row["time_bucket"])
        out.setdefault(key, []).append(row)
    return out


@pytest.mark.parametrize("corpus", [_corpus(), _corpus(daily_extra=6), _thirds()])
def test_raw_counts_sum_to_the_values_raw_count(corpus: tuple[list[dict], list[dict]]) -> None:
    bronze, silver = corpus
    trends = build_subject_trends_all_units(bronze, silver)
    parts = _by_value(build_subject_source_contributions_all_units(bronze, silver))
    assert parts
    for trend in trends:
        key = (trend["subject"], trend["axis"], trend["bucket_unit"], trend["time_bucket"])
        assert sum(p["raw_count"] for p in parts[key]) == trend["raw_count"]


@pytest.mark.parametrize("corpus", [_corpus(), _corpus(daily_extra=6), _thirds()])
def test_normalized_contributions_sum_to_the_values_share(
    corpus: tuple[list[dict], list[dict]],
) -> None:
    bronze, silver = corpus
    trends = build_subject_trends_all_units(bronze, silver)
    parts = _by_value(build_subject_source_contributions_all_units(bronze, silver))
    for trend in trends:
        key = (trend["subject"], trend["axis"], trend["bucket_unit"], trend["time_bucket"])
        total = round(sum(p["normalized_contribution"] for p in parts[key]), 4)
        assert total == trend["normalized_share"]


def test_a_value_that_does_not_divide_on_the_grid_still_adds_up() -> None:
    bronze, silver = _thirds()
    trend = next(t for t in build_subject_trends(bronze, silver) if t["subject"] == "삼성전자")
    parts = next(iter(_by_value(build_subject_source_contributions(bronze, silver)).values()))
    assert len(parts) == 3
    assert trend["normalized_share"] == 1.0
    assert sum(p["normalized_contribution"] for p in parts) == 1.0
    assert sorted(p["normalized_contribution"] for p in parts) == [0.3333, 0.3333, 0.3334]


def test_raw_share_is_the_sources_part_of_the_values_raw_count() -> None:
    bronze, silver = _thirds()
    trend = next(t for t in build_subject_trends(bronze, silver) if t["subject"] == "삼성전자")
    parts = next(iter(_by_value(build_subject_source_contributions(bronze, silver)).values()))
    assert trend["raw_count"] == 3
    for part in parts:
        assert part["raw_share"] == round(part["raw_count"] / trend["raw_count"], 4)


def test_every_value_is_decomposed_and_nothing_else_is() -> None:
    bronze, silver = _corpus()
    trends = build_subject_trends_all_units(bronze, silver)
    parts = _by_value(build_subject_source_contributions_all_units(bronze, silver))
    values = {(t["subject"], t["axis"], t["bucket_unit"], t["time_bucket"]) for t in trends}
    assert set(parts) == values


def test_two_sources_carrying_one_subject_are_both_listed() -> None:
    bronze, silver = _corpus()
    parts = _by_value(build_subject_source_contributions(bronze, silver))
    samsung = next(rows for key, rows in parts.items() if key[0] == "삼성전자")
    assert [row["source_id"] for row in samsung] == ["kr-daily", "kr-wire"]
    assert all(row["raw_count"] == 1 for row in samsung)


def test_the_collector_that_carried_the_value_is_listed_first() -> None:
    parts = _by_value(build_subject_source_contributions(*_corpus(daily_extra=6)))
    samsung = next(rows for key, rows in parts.items() if key[0] == "삼성전자")
    assert [(r["source_id"], r["raw_count"]) for r in samsung] == [("kr-daily", 7), ("kr-wire", 1)]


def test_one_sources_volume_moves_raw_share_far_more_than_normalized() -> None:
    base = _by_value(build_subject_source_contributions(*_corpus()))
    skew = _by_value(build_subject_source_contributions(*_corpus(daily_extra=6)))

    def daily(parts: dict) -> dict:
        rows = next(rows for key, rows in parts.items() if key[0] == "삼성전자")
        return next(row for row in rows if row["source_id"] == "kr-daily")

    before, after = daily(base), daily(skew)
    assert after["raw_share"] > before["raw_share"]
    raw_jump = after["raw_share"] - before["raw_share"]
    norm_jump = abs(after["normalized_contribution"] - before["normalized_contribution"])
    assert norm_jump < raw_jump


def test_decomposition_does_not_change_the_subject_level_gold() -> None:
    bronze, silver = _corpus()
    before = build_subject_trends_all_units(bronze, silver)
    build_subject_source_contributions_all_units(bronze, silver)
    assert build_subject_trends_all_units(bronze, silver) == before
