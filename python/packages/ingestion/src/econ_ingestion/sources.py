"""Fake news sources."""

from __future__ import annotations

import hashlib
from collections.abc import Iterator
from dataclasses import asdict, dataclass, field

from econ_core.domain import body_hash
from econ_core.models import NewsBody, NewsItem


@dataclass(frozen=True)
class FakeArticle:
    subject: str
    tone: str
    countries: list[str]
    base_views: int
    body_available: bool = True


@dataclass(frozen=True)
class FakeSource:
    source_id: str
    axis: str
    limit: int
    available: int  # how many it can actually provide (<= or > limit)
    broken: bool = False
    articles: list[FakeArticle] = field(default_factory=list)


CATALOG: list[FakeSource] = [
    FakeSource(
        source_id="kr-wire",
        axis="KR",
        limit=100,
        available=6,
        articles=[
            FakeArticle("한국은행 기준금리", "negative", ["KR"], 48210),
            FakeArticle("삼성전자", "neutral", ["KR", "US"], 41880),
            FakeArticle("원/달러 환율", "negative", ["KR", "US"], 33240),
            FakeArticle("코스피", "positive", ["KR"], 28110),
            FakeArticle("전기요금", "mixed", ["KR"], 19940),
            FakeArticle("가계부채", "negative", ["KR"], 15020, body_available=False),
        ],
    ),
    FakeSource(
        source_id="kr-biz",
        axis="KR",
        limit=50,
        available=3,
        articles=[
            FakeArticle("삼성전자", "positive", ["KR"], 30110),
            FakeArticle("SK하이닉스", "positive", ["KR"], 22400),
            FakeArticle("원/달러 환율", "negative", ["KR", "US"], 33240),
        ],
    ),
    FakeSource(
        source_id="us-markets",
        axis="US",
        limit=100,
        available=4,
        articles=[
            FakeArticle("Federal Reserve", "neutral", ["US"], 51200),
            FakeArticle("Nvidia", "positive", ["US", "GLOBAL"], 47700),
            FakeArticle("US CPI", "negative", ["US"], 30900),
            FakeArticle("S&P 500", "positive", ["US"], 26050),
        ],
    ),
    FakeSource(
        source_id="global-desk",
        axis="GLOBAL",
        limit=100,
        available=3,
        articles=[
            FakeArticle("AI 반도체 capex", "positive", ["GLOBAL", "US", "KR"], 38800),
            FakeArticle("원유 가격", "mixed", ["GLOBAL"], 21450),
            FakeArticle("글로벌 공급망", "neutral", ["GLOBAL"], 16700, body_available=False),
        ],
    ),
    FakeSource(source_id="kr-flaky", axis="KR", limit=20, available=5, broken=True),
]


class SourceError(RuntimeError):
    """Raised by a broken source to simulate an API/timeout failure."""


def _record_id(source_id: str, url: str, cycle: str) -> str:
    digest = hashlib.sha1(f"{source_id}|{url}|{cycle}".encode())
    return digest.hexdigest()[:12]


def _url(subject: str) -> str:
    slug = hashlib.sha1(subject.encode()).hexdigest()[:8]
    return f"https://news.example/econ/{slug}"


def _title(article: FakeArticle) -> str:
    return f"[{article.subject}] 관련 보도 — {article.tone} 신호"


def _body(article: FakeArticle) -> str:
    # tone/countries markers are embedded so the fake LLM extracts them deterministically.
    countries = ",".join(article.countries)
    return f"{article.subject}. tone={article.tone}. 대상국={countries}."


def collect_source(
    source: FakeSource, cycle: str, collected_at: str
) -> Iterator[tuple[NewsItem, str | None]]:
    """Yield ranked ``(NewsItem, body)`` pairs for one source, honoring its top-N cap (AC1.2)."""
    if source.broken:
        raise SourceError(f"source '{source.source_id}' failed to respond")
    take = min(source.limit, source.available, len(source.articles))
    ranked = sorted(source.articles, key=lambda a: a.base_views, reverse=True)[:take]
    for rank, article in enumerate(ranked, start=1):
        url = _url(article.subject)
        body = _body(article) if article.body_available else None
        item = NewsItem(
            record_id=_record_id(source.source_id, url, cycle),
            source_id=source.source_id,
            axis=source.axis,
            rank=rank,
            view_count=article.base_views,
            title=_title(article),
            source_url=url,
            body_hash=body_hash(body) if body is not None else "",
            body_available=article.body_available,
            collected_at=collected_at,
            collection_cycle=cycle,
        )
        yield item, body


@dataclass
class IngestStats:
    collected: int = 0
    duplicates: int = 0
    failed_sources: list[str] = field(default_factory=list)
    failure_reasons: dict[str, str] = field(default_factory=dict)


def run_ingestion(
    cycle: str,
    collected_at: str,
    sources: list[FakeSource] | None = None,
) -> tuple[list[dict], list[dict], IngestStats]:
    """Collect across all sources, de-duplicating by URL and isolating failures.

    Mirrored by :func:`econ_ingestion.feeds.run_feed_ingestion` — keep the two in step.
    """
    sources = CATALOG if sources is None else sources
    seen: set[str] = set()
    items: list[dict] = []
    bodies: dict[str, dict] = {}
    stats = IngestStats()
    for source in sources:
        try:
            produced = list(collect_source(source, cycle, collected_at))
        except SourceError as exc:
            stats.failed_sources.append(source.source_id)
            stats.failure_reasons[source.source_id] = str(exc)
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
