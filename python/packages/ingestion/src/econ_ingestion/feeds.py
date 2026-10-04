"""Real feed-based news sources (RSS / Atom)."""

from __future__ import annotations

import hashlib
import json
import urllib.request
from collections.abc import Iterator
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Protocol
from xml.etree import ElementTree as ET

from econ_core.domain import body_hash
from econ_core.models import AXIS_VALUES, Axis, NewsBody, NewsItem

from econ_ingestion.sources import IngestStats


class Fetcher(Protocol):
    """Transport returning the raw bytes of a feed URL (or raising on failure)."""

    def __call__(self, url: str) -> bytes: ...


class FetchError(RuntimeError):
    """Raised when a feed cannot be fetched after retries (network/HTTP/timeout)."""


FEED_FORMATS = ("rss", "worldbank-json")


@dataclass(frozen=True)
class FeedConfig:
    """One configured feed source.

    ``worldbank-json`` exists because the World Bank publishes no usable RSS/Atom;
    its search API is parsed instead.
    """

    source_id: str
    axis: Axis
    feed_url: str
    limit: int = 100
    format: str = "rss"

    def __post_init__(self) -> None:
        if self.axis not in AXIS_VALUES:
            raise ValueError(f"unknown axis {self.axis!r} (expected one of {AXIS_VALUES})")
        if self.format not in FEED_FORMATS:
            raise ValueError(f"unknown format {self.format!r} (expected one of {FEED_FORMATS})")
        if self.limit < 1:
            raise ValueError(f"limit must be >= 1, got {self.limit}")


@dataclass(frozen=True)
class ParsedArticle:
    """A single feed entry, parsed but not yet normalized into a Bronze record."""

    title: str
    url: str
    body: str
    body_available: bool
    view_count: int


def http_fetcher(timeout: float = 15.0) -> Fetcher:
    """Return a real HTTP transport (stdlib ``urllib``) for production runs."""

    def _fetch(url: str) -> bytes:
        req = urllib.request.Request(url, headers={"User-Agent": "econ-opinion-monitor/ingestion"})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.read()

    return _fetch


def load_feed_configs(path: str | Path) -> list[FeedConfig]:
    """Load a list of :class:`FeedConfig` from a JSON config file."""
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    return [
        FeedConfig(
            source_id=entry["source_id"],
            axis=entry["axis"],
            feed_url=entry["feed_url"],
            limit=int(entry.get("limit", 100)),
            format=entry.get("format", "rss"),
        )
        for entry in data
    ]


def default_feeds_path() -> Path:
    """Path to the checked-in default feed source list (used when ``--feeds`` is omitted)."""
    return Path(__file__).with_name("default_feeds.json")


def _localname(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def _first_text(entry: ET.Element, names: tuple[str, ...]) -> str:
    by_local: dict[str, str] = {}
    for child in entry:
        key = _localname(child.tag).lower()
        if key not in by_local:
            by_local[key] = (child.text or "").strip()
    for name in names:
        if by_local.get(name):
            return by_local[name]
    return ""


def _find_link(entry: ET.Element) -> str:
    fallback = ""
    for child in entry:
        if _localname(child.tag) != "link":
            continue
        text = (child.text or "").strip()
        if text:
            return text
        rel = child.get("rel") or "alternate"
        href = child.get("href") or ""
        if href and rel == "alternate":
            return href
        fallback = fallback or href
    return fallback


def parse_feed(raw: bytes) -> list[ParsedArticle]:
    """Parse RSS 2.0 or Atom feed bytes into articles (real parser, stdlib only)."""
    try:
        root = ET.fromstring(raw)
    except ET.ParseError as exc:
        raise FetchError(f"malformed feed: {exc}") from exc

    articles: list[ParsedArticle] = []
    for entry in root.iter():
        if _localname(entry.tag) not in {"item", "entry"}:
            continue
        url = _find_link(entry)
        if not url:
            continue
        body = _first_text(entry, ("encoded", "content", "description", "summary"))
        views_raw = _first_text(entry, ("views", "viewcount"))
        try:
            view_count = int(views_raw) if views_raw else 0
        except ValueError:
            view_count = 0
        articles.append(
            ParsedArticle(
                title=_first_text(entry, ("title",)) or "(제목 없음)",
                url=url,
                body=body,
                body_available=bool(body),
                view_count=view_count,
            )
        )
    return articles


def _cdata(value: object) -> str:
    """Unwrap the search API's ``{"cdata!": text}`` string wrapper (plain strings pass)."""
    if isinstance(value, dict):
        value = value.get("cdata!", "")
    return value.strip() if isinstance(value, str) else ""


def parse_worldbank_news(raw: bytes) -> list[ParsedArticle]:
    """Parse a World Bank search API (``/api/v2/news?format=json``) response into articles.

    ``documents`` also carries a non-record ``facets`` key. The API exposes no view
    count, so the result order (``srt``/``order`` in the URL) stands in for ranking.
    """
    try:
        documents = json.loads(raw)["documents"]
    except (ValueError, KeyError, TypeError) as exc:
        raise FetchError(f"malformed worldbank-json response: {exc!r}") from exc
    if not isinstance(documents, dict):
        raise FetchError("malformed worldbank-json response: 'documents' is not an object")

    articles: list[ParsedArticle] = []
    for doc in documents.values():
        if not isinstance(doc, dict):
            continue
        url = _cdata(doc.get("url"))
        if not url:
            continue
        body = _cdata(doc.get("content")) or _cdata(doc.get("descr"))
        articles.append(
            ParsedArticle(
                title=_cdata(doc.get("title")) or "(제목 없음)",
                url=url,
                body=body,
                body_available=bool(body),
                view_count=0,
            )
        )
    return articles


_PARSERS = {"rss": parse_feed, "worldbank-json": parse_worldbank_news}


def _record_id(source_id: str, url: str, cycle: str) -> str:
    digest = hashlib.sha1(f"{source_id}|{url}|{cycle}".encode())
    return digest.hexdigest()[:12]


def _fetch_with_retry(config: FeedConfig, fetcher: Fetcher, retries: int) -> bytes:
    last: Exception | None = None
    for _ in range(max(1, retries + 1)):
        try:
            return fetcher(config.feed_url)
        except Exception as exc:  # transport-defined failure: retry, then isolate
            last = exc
    raise FetchError(f"source {config.source_id!r} failed after retries: {last}") from last


def collect_feed(
    config: FeedConfig,
    fetcher: Fetcher,
    cycle: str,
    collected_at: str,
    *,
    retries: int = 2,
) -> Iterator[tuple[NewsItem, str | None]]:
    """Fetch + parse one feed into ranked, top-N-capped ``(NewsItem, body)`` pairs."""
    raw = _fetch_with_retry(config, fetcher, retries)
    # Stable sort: equal (e.g. all-zero) view counts keep the feed's own order.
    ranked = sorted(_PARSERS[config.format](raw), key=lambda a: a.view_count, reverse=True)[
        : config.limit
    ]
    for rank, article in enumerate(ranked, start=1):
        body = article.body if article.body_available else None
        item = NewsItem(
            record_id=_record_id(config.source_id, article.url, cycle),
            source_id=config.source_id,
            axis=config.axis,
            rank=rank,
            view_count=article.view_count,
            title=article.title,
            source_url=article.url,
            body_hash=body_hash(body) if body is not None else "",
            body_available=article.body_available,
            collected_at=collected_at,
            collection_cycle=cycle,
        )
        yield item, body


def run_feed_ingestion(
    configs: list[FeedConfig],
    cycle: str,
    collected_at: str,
    fetcher: Fetcher,
    *,
    retries: int = 2,
) -> tuple[list[dict], list[dict], IngestStats]:
    """Collect across configured feeds, de-duplicating by URL and isolating failures.

    Mirrors :func:`econ_ingestion.sources.run_ingestion` (same return shape) so the
    two paths stay interchangeable. Bodies dedupe by hash only within the run;
    cross-run dedup and edited-body versioning happen at the store via ``put_object``.
    """
    seen: set[str] = set()
    items: list[dict] = []
    bodies: dict[str, dict] = {}
    stats = IngestStats()
    for config in configs:
        try:
            produced = list(collect_feed(config, fetcher, cycle, collected_at, retries=retries))
        except FetchError as exc:
            stats.failed_sources.append(config.source_id)
            stats.failure_reasons[config.source_id] = str(exc)
            continue
        for item, body in produced:
            if item.source_url in seen:
                stats.duplicates += 1
                continue
            seen.add(item.source_url)
            items.append(asdict(item))
            stats.collected += 1
            if body is not None and item.body_hash not in bodies:
                bodies[item.body_hash] = asdict(
                    NewsBody(
                        body_hash=item.body_hash,
                        raw_text=body,
                        first_seen_at=collected_at,
                        first_seen_cycle=cycle,
                    )
                )
    return items, list(bodies.values()), stats
