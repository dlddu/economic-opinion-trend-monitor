"""Real feed-source tests — deterministic, offline (fixture feeds + fake transport).

Exercises the *real* parse / normalize path of :mod:`econ_ingestion.feeds` against
captured RSS/Atom fixtures, covering ingestion AC1.2–AC1.7. Emphasis on the
revised Bronze design: the observation record (``news_item``) carries only the
body's content address, and bodies live in a separate content-addressed store
(``news_body``) so identical text stores once and edits version (AC1.4, AC1.7).
"""

import hashlib
from pathlib import Path

import pytest
from econ_ingestion.feeds import FeedConfig, collect_feed, parse_feed, run_feed_ingestion

FIXTURES = Path(__file__).parent / "fixtures"
KR_URL = "https://feeds.example/kr-wire.xml"
US_URL = "https://feeds.example/us-markets.xml"
FLAKY_URL = "https://feeds.example/kr-flaky.xml"

CYCLE = "2026-07-26T06:00"
COLLECTED_AT = "2026-07-26T06:00:00+00:00"


class FakeFetcher:
    """Maps feed URLs to fixture bytes; configured URLs always raise (AC1.6)."""

    def __init__(self, mapping: dict[str, bytes], fail_urls: tuple[str, ...] = ()) -> None:
        self.mapping = mapping
        self.fail_urls = set(fail_urls)
        self.calls: dict[str, int] = {}

    def __call__(self, url: str) -> bytes:
        self.calls[url] = self.calls.get(url, 0) + 1
        if url in self.fail_urls:
            raise ConnectionError(f"boom: {url}")
        return self.mapping[url]


def _fetcher(fail_urls: tuple[str, ...] = ()) -> FakeFetcher:
    return FakeFetcher(
        {
            KR_URL: (FIXTURES / "kr_wire.rss.xml").read_bytes(),
            US_URL: (FIXTURES / "us_markets.atom.xml").read_bytes(),
        },
        fail_urls=fail_urls,
    )


def _all_configs() -> list[FeedConfig]:
    return [
        FeedConfig("kr-wire", "KR", KR_URL, limit=100),
        FeedConfig("us-markets", "US", US_URL, limit=100),
        FeedConfig("kr-flaky", "KR", FLAKY_URL, limit=20),
    ]


def test_axis_tagging_and_metadata_completeness() -> None:
    items, _, _ = run_feed_ingestion(_all_configs(), CYCLE, COLLECTED_AT, _fetcher((FLAKY_URL,)))
    required = (
        "record_id",
        "source_id",
        "axis",
        "source_url",
        "collected_at",
        "collection_cycle",
    )
    for item in items:
        # Every item is axis-tagged (AC1.3).
        assert item["axis"] in {"KR", "US", "GLOBAL"}
        # Required provenance/metadata fields are populated (AC1.5).
        for field in required:
            assert item[field], f"missing {field} in {item}"
        assert item["rank"] >= 1
        assert item["collection_cycle"] == CYCLE


def test_top_n_cap_ranks_by_views() -> None:
    # kr-wire offers 3 articles but the source caps at top-2 (AC1.2).
    config = FeedConfig("kr-wire", "KR", KR_URL, limit=2)
    items = [item for item, _ in collect_feed(config, _fetcher(), CYCLE, COLLECTED_AT)]
    assert len(items) == 2
    # Ranked by view count descending: 48210 then 41880; the 33240 item is dropped.
    assert [i.rank for i in items] == [1, 2]
    assert items[0].view_count == 48210
    assert items[1].view_count == 41880
    assert all(i.source_url != "https://news.example/kr/fx" for i in items)


def test_link_and_body_separation() -> None:
    # The observation carries only the body's content address; the body text is
    # yielded separately so it can land in the content-addressed store (AC1.4).
    pairs = list(collect_feed(FeedConfig("kr-wire", "KR", KR_URL), _fetcher(), CYCLE, COLLECTED_AT))
    by_url = {item.source_url: (item, body) for item, body in pairs}
    # Body captured -> non-empty hash that content-addresses the yielded body (AC1.4).
    rate_item, rate_body = by_url["https://news.example/kr/rate"]
    assert rate_item.body_available is True
    assert rate_item.body_hash != ""
    assert rate_body
    assert hashlib.sha256(rate_body.encode()).hexdigest() == rate_item.body_hash
    # Body unavailable -> link still stored, empty hash, no body, flag cleared (AC1.4).
    fx_item, fx_body = by_url["https://news.example/kr/fx"]
    assert fx_item.body_available is False
    assert fx_item.body_hash == ""
    assert fx_body is None
    assert fx_item.source_url == "https://news.example/kr/fx"


def test_atom_link_href_parsing() -> None:
    config = FeedConfig("us-markets", "US", US_URL)
    urls = {item.source_url for item, _ in collect_feed(config, _fetcher(), CYCLE, COLLECTED_AT)}
    # Atom <link href="..."> is resolved to the article URL (AC1.4).
    assert "https://news.example/us/fed" in urls


def test_body_store_is_content_addressed() -> None:
    items, bodies, _ = run_feed_ingestion(
        _all_configs(), CYCLE, COLLECTED_AT, _fetcher((FLAKY_URL,))
    )
    by_hash = {b["body_hash"]: b["raw_text"] for b in bodies}
    # Bodies are unique by content hash within a run (AC1.7).
    assert len(bodies) == len(by_hash) > 0
    for item in items:
        if item["body_available"]:
            # Every captured observation resolves to its exact body version (AC1.4).
            assert (
                hashlib.sha256(by_hash[item["body_hash"]].encode()).hexdigest() == item["body_hash"]
            )
        else:
            # Uncaptured bodies keep the link but reference nothing (AC1.4).
            assert item["body_hash"] == ""
    assert all(b["first_seen_cycle"] == CYCLE for b in bodies)


def test_cross_source_reprint_body_deduplicates() -> None:
    # Same body reached through two different links (a reprint) -> the observation
    # store keeps both links, but the body store holds exactly one copy (AC1.7).
    raw = b"""<?xml version="1.0"?>
<rss version="2.0"><channel>
  <item>
    <title>A</title><link>https://news.example/a</link>
    <description>same body</description>
  </item>
  <item>
    <title>B</title><link>https://news.example/b</link>
    <description>same body</description>
  </item>
</channel></rss>"""
    fetcher = FakeFetcher({KR_URL: raw})
    items, bodies, _ = run_feed_ingestion(
        [FeedConfig("s", "KR", KR_URL)], CYCLE, COLLECTED_AT, fetcher
    )
    # Two distinct observations (different URLs, not URL-deduped)...
    assert len(items) == 2
    assert len({i["source_url"] for i in items}) == 2
    # ...but one content-addressed body shared by both (AC1.7).
    assert len(bodies) == 1
    assert items[0]["body_hash"] == items[1]["body_hash"] == bodies[0]["body_hash"]


def test_edited_body_becomes_a_new_version_key() -> None:
    # Same article URL whose body is edited between cycles -> a new content key,
    # so the store would append the new version beside the old one (AC1.7).
    def feed(body: str) -> bytes:
        return (
            '<?xml version="1.0"?>'
            '<rss version="2.0"><channel>'
            "<item><title>C</title><link>https://news.example/c</link>"
            f"<description>{body}</description></item>"
            "</channel></rss>"
        ).encode()

    cfg = [FeedConfig("s", "KR", KR_URL)]
    items1, bodies1, _ = run_feed_ingestion(
        cfg, "c1", "t1", FakeFetcher({KR_URL: feed("version-1")})
    )
    items2, bodies2, _ = run_feed_ingestion(
        cfg, "c2", "t2", FakeFetcher({KR_URL: feed("version-2")})
    )
    assert items1[0]["source_url"] == items2[0]["source_url"]
    assert items1[0]["body_hash"] != items2[0]["body_hash"]
    assert bodies1[0]["body_hash"] != bodies2[0]["body_hash"]


def test_dedup_failure_isolation_and_retry() -> None:
    fetcher = _fetcher((FLAKY_URL,))
    items, _, stats = run_feed_ingestion(_all_configs(), CYCLE, COLLECTED_AT, fetcher)
    # The broken source is isolated; the others still produce records (AC1.6).
    assert stats.failed_sources == ["kr-flaky"]
    # The /kr/fx URL appears in both feeds -> de-duplicated once (AC1.6).
    assert stats.duplicates == 1
    assert stats.collected == len(items) == 4
    urls = [i["source_url"] for i in items]
    assert len(urls) == len(set(urls))
    # The failing fetch is retried (default retries=2 -> 3 attempts) before isolation.
    assert fetcher.calls[FLAKY_URL] == 3


def test_malformed_feed_is_isolated() -> None:
    fetcher = FakeFetcher({KR_URL: b"<rss><channel><item>"})
    _, _, stats = run_feed_ingestion(
        [FeedConfig("kr-wire", "KR", KR_URL)], CYCLE, COLLECTED_AT, fetcher
    )
    assert stats.failed_sources == ["kr-wire"]


def test_invalid_axis_and_limit_rejected() -> None:
    with pytest.raises(ValueError):
        FeedConfig("bad", "EU", KR_URL)
    with pytest.raises(ValueError):
        FeedConfig("bad", "KR", KR_URL, limit=0)


def test_parse_feed_drops_entries_without_link() -> None:
    raw = b"""<?xml version="1.0"?>
<rss version="2.0"><channel>
  <item><title>no link here</title><description>orphan</description></item>
  <item><title>ok</title><link>https://news.example/x</link></item>
</channel></rss>"""
    parsed = parse_feed(raw)
    assert [a.url for a in parsed] == ["https://news.example/x"]
