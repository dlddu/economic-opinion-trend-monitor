import hashlib

from econ_ingestion.sources import FakeArticle, FakeSource, run_ingestion


def test_failure_isolation_and_dedup() -> None:
    items, _, stats = run_ingestion("2026-06-23T14:00", "2026-06-23T14:00:00+00:00")
    assert "kr-flaky" in stats.failed_sources
    assert "kr-flaky" in stats.failure_reasons
    assert stats.collected == len(items) > 0
    assert stats.duplicates >= 1
    urls = [i["source_url"] for i in items]
    assert len(urls) == len(set(urls))
    assert all(i["axis"] in {"KR", "US", "GLOBAL"} for i in items)


def test_top_n_cap_and_body_flag() -> None:
    items, _, _ = run_ingestion("c", "t")
    kr_wire = [i for i in items if i["source_id"] == "kr-wire"]
    assert len(kr_wire) == 6
    assert all(i["rank"] >= 1 for i in kr_wire)
    assert any(i["body_available"] is False for i in items)


def test_body_store_is_content_addressed() -> None:
    items, bodies, _ = run_ingestion("c", "t")
    by_hash = {b["body_hash"]: b["raw_text"] for b in bodies}
    assert len(bodies) == len(by_hash) > 0
    for item in items:
        if item["body_available"]:
            text = by_hash[item["body_hash"]]
            assert hashlib.sha256(text.encode()).hexdigest() == item["body_hash"]
        else:
            assert item["body_hash"] == ""
    assert all(b["first_seen_cycle"] == "c" for b in bodies)


def test_edited_body_becomes_a_new_version_key() -> None:
    def src(tone: str, views: int) -> list[FakeSource]:
        article = FakeArticle("코스피", tone, ["KR"], views)
        return [FakeSource(source_id="s", axis="KR", limit=10, available=1, articles=[article])]

    items1, bodies1, _ = run_ingestion("c1", "t1", sources=src("neutral", 10))
    items2, bodies2, _ = run_ingestion("c2", "t2", sources=src("positive", 12))
    assert items1[0]["source_url"] == items2[0]["source_url"]
    assert items1[0]["body_hash"] != items2[0]["body_hash"]
    assert bodies1[0]["body_hash"] != bodies2[0]["body_hash"]
