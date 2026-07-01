from econ_ingestion.sources import run_ingestion


def test_failure_isolation_and_dedup() -> None:
    items, stats = run_ingestion("2026-06-23T14:00", "2026-06-23T14:00:00+00:00")
    # A broken source is isolated; the rest still produce records (AC1.6).
    assert "kr-flaky" in stats.failed_sources
    assert stats.collected == len(items) > 0
    # Duplicate URLs are de-duplicated (AC1.6).
    assert stats.duplicates >= 1
    urls = [i["source_url"] for i in items]
    assert len(urls) == len(set(urls))
    # Every item is axis-tagged (AC1.3).
    assert all(i["axis"] in {"KR", "US", "GLOBAL"} for i in items)


def test_top_n_cap_and_body_flag() -> None:
    items, _ = run_ingestion("c", "t")
    # kr-wire offers 6 of a 100 cap -> only the available 6 are collected (AC1.2).
    kr_wire = [i for i in items if i["source_id"] == "kr-wire"]
    assert len(kr_wire) == 6
    assert all(i["rank"] >= 1 for i in kr_wire)
    # Body-unavailable items are stored with the flag set (AC1.4).
    assert any(i["body_available"] is False for i in items)
