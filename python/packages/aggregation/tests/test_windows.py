from econ_aggregation.aggregate import ALL_AXIS, build_axis_windows, build_subject_windows


def _bronze(rid: str, at: str, axis: str = "KR", source: str = "src", url: str = "") -> dict:
    return {
        "record_id": rid,
        "source_id": source,
        "axis": axis,
        "collected_at": f"{at}:00:00+00:00",
        "source_url": url or f"https://n.test/{rid}",
    }


def _silver(rid: str, subjects: list[str], sentiment: str | None = "neutral") -> dict:
    return {
        "record_id": rid,
        "narrative_subjects": subjects,
        "sentiment": sentiment,
        "analysis_status": "analyzed" if sentiment else "unanalyzed",
    }


def _rows(rows: list[dict], axis: str, rng: str, period: str) -> dict[str, dict]:
    return {
        r["subject"]: r
        for r in rows
        if r["axis"] == axis and r["range"] == rng and r["period"] == period
    }


def test_windows_end_at_the_latest_hour_and_split_current_from_previous() -> None:
    bronze = [
        _bronze("now", "2026-06-23T14"),
        _bronze("day-ago", "2026-06-22T14"),
        _bronze("two-days-ago", "2026-06-21T14"),
    ]
    silver = [_silver("now", ["A"]), _silver("day-ago", ["B"]), _silver("two-days-ago", ["C"])]
    rows = build_subject_windows(bronze, silver)

    current = _rows(rows, "KR", "24h", "current")
    assert set(current) == {"A"}
    assert current["A"]["window_start"] == "2026-06-22T15"
    assert current["A"]["window_end"] == "2026-06-23T14"
    previous = _rows(rows, "KR", "24h", "previous")
    assert set(previous) == {"B"}
    assert (previous["B"]["window_start"], previous["B"]["window_end"]) == (
        "2026-06-21T15",
        "2026-06-22T14",
    )
    assert set(_rows(rows, "KR", "7d", "current")) == {"A", "B", "C"}


def test_an_article_counts_once_in_a_window_through_its_latest_observation() -> None:
    url = "https://n.test/a"
    bronze = [
        _bronze("a1", "2026-06-23T12", url=url),
        _bronze("a2", "2026-06-23T14", url=url),
        _bronze("b", "2026-06-23T13"),
    ]
    silver = [_silver("a1", ["old"]), _silver("a2", ["A"]), _silver("b", ["B"])]
    current = _rows(build_subject_windows(bronze, silver), "KR", "24h", "current")
    assert set(current) == {"A", "B"}
    assert current["A"]["raw_count"] == 1
    assert current["A"]["normalized_share"] == 0.5


def test_window_shares_weigh_each_source_equally_and_sum_to_one() -> None:
    bronze = [
        _bronze("1", "2026-06-23T10", source="big"),
        _bronze("2", "2026-06-23T11", source="big"),
        _bronze("3", "2026-06-23T12", source="big"),
        _bronze("4", "2026-06-23T13", axis="US", source="small"),
    ]
    silver = [_silver("1", ["A"]), _silver("2", ["A"]), _silver("3", ["B"]), _silver("4", ["C"])]
    rows = build_subject_windows(bronze, silver)

    kr = _rows(rows, "KR", "7d", "current")
    assert {s: r["normalized_share"] for s, r in kr.items()} == {"A": 0.6667, "B": 0.3333}
    every = _rows(rows, ALL_AXIS, "7d", "current")
    assert {s: r["normalized_share"] for s, r in every.items()} == {
        "A": 0.3333,
        "B": 0.1667,
        "C": 0.5,
    }
    assert {s: r["raw_count"] for s, r in every.items()} == {"A": 2, "B": 1, "C": 1}


def test_axis_windows_count_collected_and_analyzed_articles() -> None:
    bronze = [
        _bronze("1", "2026-06-23T14"),
        _bronze("2", "2026-06-23T13"),
        _bronze("3", "2026-06-23T12", axis="US"),
        _bronze("4", "2026-06-22T09"),
    ]
    silver = [_silver("1", ["A"]), _silver("2", [], None), _silver("3", ["B"]), _silver("4", ["A"])]
    rows = {
        (r["axis"], r["range"], r["period"]): (r["collected"], r["analyzed_total"])
        for r in build_axis_windows(bronze, silver)
    }
    assert rows[("KR", "24h", "current")] == (2, 1)
    assert rows[("KR", "24h", "previous")] == (1, 1)
    assert rows[("US", "24h", "current")] == (1, 1)
    assert rows[(ALL_AXIS, "24h", "current")] == (3, 2)
    assert ("US", "24h", "previous") not in rows


def test_no_input_writes_no_windows() -> None:
    assert build_subject_windows([], []) == []
    assert build_axis_windows([], []) == []
