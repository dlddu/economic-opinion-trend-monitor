"""Real feed-based news sources (RSS / Atom).

Unlike the deterministic fake catalog in :mod:`econ_ingestion.sources`, this
module implements the *real* collection mechanism the ingestion PRD calls for:
each configured source points at an actual RSS/Atom feed URL, the raw feed bytes
are fetched over a pluggable transport, and a standard-library parser turns the
feed entries into schema-conformant Bronze records.

The transport is injected (:class:`Fetcher`), so production uses real HTTP while
tests drive the exact same parse / normalize path against captured fixture feeds
— the collection logic is genuinely real, yet fully deterministic offline.

Bronze shape (revised design, AC1.4 / AC1.7): the observation record
(:class:`~econ_core.models.NewsItem`) carries only the body's content address
(``body_hash``); the body text itself lives in a separate content-addressed
store (:class:`~econ_core.models.NewsBody`). This module mirrors
:func:`econ_ingestion.sources.run_ingestion` so the real feed path is a drop-in
alternative that produces the identical ``(news_item, news_body, stats)`` output
— unchanged bodies (same hash, across cycles or cross-source reprints) store
once and edited bodies version as new keys.

AC coverage (PRD ingestion): each source declares its axis (AC1.3) and top-N cap
(AC1.2); every observation preserves the original link plus a body-capture flag
and content hash — link always stored, empty hash when the body is not captured
(AC1.4) — with full provenance metadata (AC1.5); runs de-duplicate by URL,
isolate per-source failures, and retry transient fetch errors (AC1.6); bodies are
content-addressed so identical text collapses to one stored version (AC1.7).
Wiring the collection *cadence* (AC1.1) to a scheduler is left to deployment; the
cycle id is threaded through here so scheduled runs land in the right time bucket.
"""

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


@dataclass(frozen=True)
class FeedConfig:
    """One configured feed source.

    ``axis`` tags every item collected from this source (AC1.3); ``limit`` is the
    per-source top-N cap (AC1.2); ``feed_url`` is the real RSS/Atom endpoint.
    """

    source_id: str
    axis: Axis
    feed_url: str
    limit: int = 100

    def __post_init__(self) -> None:
        if self.axis not in AXIS_VALUES:
            raise ValueError(f"unknown axis {self.axis!r} (expected one of {AXIS_VALUES})")
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
    """Load a list of :class:`FeedConfig` from a JSON config file.

    Schema: ``[{"source_id", "axis", "feed_url", "limit"?}, ...]`` — source list,
    per-source axis (AC1.3) and top-N cap (AC1.2) are all configuration, not code.
    """
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    return [
        FeedConfig(
            source_id=entry["source_id"],
            axis=entry["axis"],
            feed_url=entry["feed_url"],
            limit=int(entry.get("limit", 100)),
        )
        for entry in data
    ]


def default_feeds_path() -> Path:
    """Path to the checked-in default feed source list (used when ``--feeds`` is omitted).

    A curated *starter* set of real economic RSS/Atom endpoints across the KR/US/GLOBAL
    axes; operations verify and refine it as the scheduled CronWorkflow (AC1.1) runs on it.
    Unreachable entries degrade gracefully — :func:`run_feed_ingestion` isolates per-source
    failures (AC1.6) rather than aborting the run. Ships inside the package so it resolves
    regardless of the working directory.
    """
    return Path(__file__).with_name("default_feeds.json")


def _localname(tag: str) -> str:
    """Strip any XML namespace, e.g. ``{...}entry`` -> ``entry``."""
    return tag.rsplit("}", 1)[-1]


def _first_text(entry: ET.Element, names: tuple[str, ...]) -> str:
    """Return the first non-empty direct-child text whose local name is in ``names``.

    ``names`` is tried in priority order (e.g. full ``content`` before ``summary``).
    """
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
    """Extract the article URL from an RSS ``<link>`` text or Atom ``<link href>``."""
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
    """Parse RSS 2.0 or Atom feed bytes into articles (real parser, stdlib only).

    Entries without a link are dropped (provenance requires a URL, AC1.4). A
    ``<views>`` element, when present, feeds top-N ranking (AC1.2); otherwise the
    feed's own order is preserved.
    """
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


def _record_id(source_id: str, url: str, cycle: str) -> str:
    digest = hashlib.sha1(f"{source_id}|{url}|{cycle}".encode())
    return digest.hexdigest()[:12]


def _fetch_with_retry(config: FeedConfig, fetcher: Fetcher, retries: int) -> bytes:
    """Fetch a feed, retrying transient transport failures before giving up (AC1.6)."""
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
    """Fetch + parse one feed into ranked, top-N-capped ``(NewsItem, body)`` pairs.

    Ranks by view count when the feed carries it, else preserves feed order, then
    keeps the source's top-N (AC1.2). Every observation is axis-tagged (AC1.3) and
    carries the link plus the body's content address — an empty ``body_hash`` when
    the body was not captured (AC1.4) — with full provenance metadata (AC1.5). The
    body text itself is yielded alongside (``None`` when not captured) so the
    caller stores it once, content-addressed (AC1.7).
    """
    raw = _fetch_with_retry(config, fetcher, retries)
    # Stable sort: equal (e.g. all-zero) view counts keep the feed's own order.
    ranked = sorted(parse_feed(raw), key=lambda a: a.view_count, reverse=True)[: config.limit]
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

    Mirrors :func:`econ_ingestion.sources.run_ingestion` (same ``(news_item dicts,
    news_body dicts, stats)`` return shape) so the real feed path is a drop-in
    alternative to the fake catalog. Bodies are unique by content hash within the
    run — identical text reached through different URLs (cross-source reprints)
    stores once (AC1.7); cross-run dedup and edited-body versioning happen at the
    store via ``merge_records``.
    """
    seen: set[str] = set()
    items: list[dict] = []
    bodies: dict[str, dict] = {}
    stats = IngestStats()
    for config in configs:
        try:
            produced = list(collect_feed(config, fetcher, cycle, collected_at, retries=retries))
        except FetchError:
            stats.failed_sources.append(config.source_id)
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
