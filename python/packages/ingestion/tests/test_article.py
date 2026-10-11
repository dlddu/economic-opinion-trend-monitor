"""Article-page body extraction for "article" feed sources — offline (fixture pages)."""

import hashlib
import json
from pathlib import Path

import pytest
from econ_ingestion.article import MIN_ARTICLE_CHARS, decode_html, extract_article_text
from econ_ingestion.feeds import (
    ARTICLE_MIN_FEED_CHARS,
    FeedConfig,
    collect_feed,
    default_feeds_path,
    load_feed_configs,
    run_feed_ingestion,
)
from econ_ingestion.sources import IngestStats

FIXTURES = Path(__file__).parent / "fixtures"
FEED_URL = "https://feeds.example/titles.xml"
KDT_URL = "https://news.example/titles/kdt"
SCF_URL = "https://news.example/titles/scf"
LONG_URL = "https://news.example/titles/long"

CYCLE = "2026-10-11T02:00"
COLLECTED_AT = "2026-10-11T02:00:08+00:00"


class FakeFetcher:
    def __init__(self, mapping: dict[str, bytes], fail_urls: tuple[str, ...] = ()) -> None:
        self.mapping = mapping
        self.fail_urls = set(fail_urls)
        self.calls: list[str] = []

    def __call__(self, url: str) -> bytes:
        self.calls.append(url)
        if url in self.fail_urls:
            raise ConnectionError(f"boom: {url}")
        return self.mapping[url]


def _fetcher(fail_urls: tuple[str, ...] = ()) -> FakeFetcher:
    return FakeFetcher(
        {
            FEED_URL: (FIXTURES / "title_only.rss.xml").read_bytes(),
            KDT_URL: (FIXTURES / "article_br_body.html").read_bytes(),
            SCF_URL: (FIXTURES / "article_paragraph_body.html").read_bytes(),
        },
        fail_urls=fail_urls,
    )


def _config(mode: str) -> FeedConfig:
    return FeedConfig("title-wire", "KR", FEED_URL, body_extraction=mode)


# --- extractor ---------------------------------------------------------------


def test_extracts_br_separated_body_and_drops_page_chrome() -> None:
    text = extract_article_text((FIXTURES / "article_br_body.html").read_bytes())

    assert text.startswith("인공지능과 빅데이터 등 첨단산업")
    assert "취업률은 6.7%포인트 하락" in text  # in-body subheading kept
    assert "온라인 100% 운영 기관의 평균 취업률은 45.3%" in text
    for chrome in (
        "스크립트 문자열",
        "사진 설명",
        "ADVERTISEMENT",
        "관련 뉴스",
        "회사소개",
        "금융",
    ):
        assert chrome not in text, chrome
    # <br> paragraphs stay separate lines; no blank lines or runs of spaces survive.
    assert "\n\n" not in text and "  " not in text
    assert len(text.splitlines()) >= 4


def test_extracts_paragraph_body_and_ignores_link_heavy_menu() -> None:
    text = extract_article_text((FIXTURES / "article_paragraph_body.html").read_bytes())

    assert text.splitlines()[0].startswith("The Board on Friday released")
    assert "Real median family income rose 7 percent" in text  # list items kept
    assert "summary report (PDF)" in text  # inline link inside the body is still text
    assert "Monetary Policy" not in text and "Payment Systems" not in text
    assert " " not in text  # &nbsp; normalized


def test_page_without_body_text_yields_empty() -> None:
    assert extract_article_text(b"<html><body><nav><a href='/'>Home</a></nav></body></html>") == ""
    assert extract_article_text(b"") == ""


def test_decode_honours_declared_charset_and_falls_back_to_cp949() -> None:
    body = "원/달러 환율 급등"
    declared = f'<html><head><meta charset="euc-kr"></head><body>{body}</body></html>'
    assert body in decode_html(declared.encode("cp949"))
    undeclared = f"<html><body>{body}</body></html>"
    assert body in decode_html(undeclared.encode("cp949"))


# --- collection --------------------------------------------------------------


def test_article_source_takes_the_page_body_when_the_feed_has_none() -> None:
    fetcher = _fetcher()
    stats = IngestStats()
    pairs = {
        item.source_url: (item, body)
        for item, body in collect_feed(
            _config("article"), fetcher, CYCLE, COLLECTED_AT, stats=stats
        )
    }

    kdt_item, kdt_body = pairs[KDT_URL]
    assert kdt_item.body_available is True
    assert kdt_body is not None and kdt_body.startswith("인공지능과 빅데이터")
    assert kdt_item.body_hash == hashlib.sha256(kdt_body.encode("utf-8")).hexdigest()

    # A teaser (here: the title repeated) is also replaced by the page body.
    scf_item, scf_body = pairs[SCF_URL]
    assert scf_body is not None and scf_body.startswith("The Board on Friday released")
    assert len(scf_body) >= MIN_ARTICLE_CHARS

    assert (stats.article_fetches, stats.article_extracted, stats.article_failures) == (2, 2, 0)


def test_feed_body_long_enough_is_kept_without_fetching_the_page() -> None:
    fetcher = _fetcher()
    pairs = {
        item.source_url: body
        for item, body in collect_feed(_config("article"), fetcher, CYCLE, COLLECTED_AT)
    }
    assert len(pairs[LONG_URL]) >= ARTICLE_MIN_FEED_CHARS
    assert LONG_URL not in fetcher.calls


def test_feed_source_never_fetches_article_pages() -> None:
    fetcher = _fetcher()
    items = list(collect_feed(_config("feed"), fetcher, CYCLE, COLLECTED_AT))

    assert fetcher.calls == [FEED_URL]
    kdt = next(item for item, _ in items if item.source_url == KDT_URL)
    assert kdt.body_available is False and kdt.body_hash == ""


def test_unreachable_article_page_keeps_the_feed_record_and_does_not_fail_the_source() -> None:
    fetcher = _fetcher(fail_urls=(KDT_URL,))
    items, bodies, stats = run_feed_ingestion([_config("article")], CYCLE, COLLECTED_AT, fetcher)

    assert stats.failed_sources == []
    assert len(items) == 3
    kdt = next(i for i in items if i["source_url"] == KDT_URL)
    assert kdt["body_available"] is False and kdt["body_hash"] == ""
    assert fetcher.calls.count(KDT_URL) == 1  # one attempt, no retry for pages
    assert (stats.article_fetches, stats.article_extracted, stats.article_failures) == (2, 1, 1)
    assert {b["body_hash"] for b in bodies} >= {
        i["body_hash"] for i in items if i["body_available"]
    }


def test_page_without_usable_text_keeps_the_feed_body() -> None:
    fetcher = _fetcher()
    fetcher.mapping[SCF_URL] = b"<html><body><div>Too short.</div></body></html>"
    stats = IngestStats()
    pairs = {
        item.source_url: body
        for item, body in collect_feed(
            _config("article"), fetcher, CYCLE, COLLECTED_AT, stats=stats
        )
    }
    assert pairs[SCF_URL] == "Board releases survey results"
    assert stats.article_failures == 1


# --- config ------------------------------------------------------------------


def test_body_extraction_defaults_to_feed_and_is_validated(tmp_path: Path) -> None:
    assert FeedConfig("s", "KR", FEED_URL).body_extraction == "feed"
    with pytest.raises(ValueError, match="body_extraction"):
        FeedConfig("s", "KR", FEED_URL, body_extraction="scrape")

    path = tmp_path / "feeds.json"
    path.write_text(
        json.dumps(
            [
                {"source_id": "a", "axis": "KR", "feed_url": FEED_URL},
                {
                    "source_id": "b",
                    "axis": "US",
                    "feed_url": FEED_URL,
                    "body_extraction": "article",
                },
            ]
        ),
        encoding="utf-8",
    )
    assert [c.body_extraction for c in load_feed_configs(path)] == ["feed", "article"]


def test_every_default_source_declares_its_body_extraction() -> None:
    entries = json.loads(default_feeds_path().read_text(encoding="utf-8"))
    undeclared = [e["source_id"] for e in entries if "body_extraction" not in e]
    assert undeclared == [], f"declare body_extraction for: {undeclared}"
