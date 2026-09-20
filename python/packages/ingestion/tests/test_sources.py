import hashlib

from econ_ingestion.sources import FakeArticle, FakeSource, run_ingestion


def test_failure_isolation_and_dedup() -> None:
    items, _, stats = run_ingestion("2026-06-23T14:00", "2026-06-23T14:00:00+00:00")
    # A broken source is isolated; the rest still produce records (AC1.6).
    assert "kr-flaky" in stats.failed_sources
    assert "kr-flaky" in stats.failure_reasons
    assert stats.collected == len(items) > 0
    # Duplicate URLs are de-duplicated (AC1.6).
    assert stats.duplicates >= 1
    urls = [i["source_url"] for i in items]
    assert len(urls) == len(set(urls))
    # Every item is axis-tagged (AC1.3).
    assert all(i["axis"] in {"KR", "US", "GLOBAL"} for i in items)


def test_top_n_cap_and_body_flag() -> None:
    items, _, _ = run_ingestion("c", "t")
    # kr-wire offers 6 of a 100 cap -> only the available 6 are collected (AC1.2).
    kr_wire = [i for i in items if i["source_id"] == "kr-wire"]
    assert len(kr_wire) == 6
    assert all(i["rank"] >= 1 for i in kr_wire)
    # Body-unavailable items are stored with the flag set (AC1.4).
    assert any(i["body_available"] is False for i in items)


def test_body_store_is_content_addressed() -> None:
    items, bodies, _ = run_ingestion("c", "t")
    by_hash = {b["body_hash"]: b["raw_text"] for b in bodies}
    # Bodies are unique by content hash within a run (AC1.7).
    assert len(bodies) == len(by_hash) > 0
    for item in items:
        if item["body_available"]:
            # Every observation resolves to its exact body version (AC1.4).
            text = by_hash[item["body_hash"]]
            assert hashlib.sha256(text.encode()).hexdigest() == item["body_hash"]
        else:
            # Uncaptured bodies keep the link but reference nothing (AC1.4).
            assert item["body_hash"] == ""
    assert all(b["first_seen_cycle"] == "c" for b in bodies)


def test_edited_body_becomes_a_new_version_key() -> None:
    # Same article (same URL) whose body was edited between cycles -> new
    # content key, so the store keeps both versions side by side (AC1.7).
    def src(tone: str, views: int) -> list[FakeSource]:
        article = FakeArticle("코스피", tone, ["KR"], views)
        return [FakeSource(source_id="s", axis="KR", limit=10, available=1, articles=[article])]

    items1, bodies1, _ = run_ingestion("c1", "t1", sources=src("neutral", 10))
    items2, bodies2, _ = run_ingestion("c2", "t2", sources=src("positive", 12))
    assert items1[0]["source_url"] == items2[0]["source_url"]
    assert items1[0]["body_hash"] != items2[0]["body_hash"]
    assert bodies1[0]["body_hash"] != bodies2[0]["body_hash"]
