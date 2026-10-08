"""Normalize/aggregate Silver into Gold.

A subject's first bucket has nothing to compare against, so it reports
``delta = 0.0`` and a single-point spark — the degenerate case is the honest
answer, not a placeholder to synthesize over.

``normalized_share`` is deliberately *not* summed across the finer buckets: it
is a share of its own bucket, so adding hourly shares stops being a
distribution. The wider bucket recomputes the normalization instead.
"""

from __future__ import annotations

import sys
from collections import defaultdict
from collections.abc import Iterable, Iterator
from dataclasses import asdict
from datetime import date
from typing import NamedTuple

from econ_core.models import AxisSentiment, SentimentDistribution, SubjectTrend
from econ_core.silver import grouping_keys

DEFAULT_BUCKET_UNIT = "hour"
BUCKET_UNITS = ("hour", "day", "week")

SPARK_WINDOW = 6


def _bucket(collected_at: str, unit: str = DEFAULT_BUCKET_UNIT) -> str:
    """Cut a collection timestamp down to its bucket label in ``unit`` (AC3.3).

    Every label is zero-padded, so lexical order is chronological order *within*
    a unit — the assumption both the serving layer and the delta/spark history
    below are built on. Across units it does not hold (``2026-W26`` sorts above
    ``2026-06-23T14``), which is why consumers settle on one unit before they
    compare buckets.
    """
    if unit == "hour":
        return collected_at[:13]
    if unit == "day":
        return collected_at[:10]
    if unit == "week":
        iso = date.fromisoformat(collected_at[:10]).isocalendar()
        # ISO week-numbering year, which is not always the calendar year in the
        # days around New Year — the point of using it here.
        return f"{iso[0]}-W{iso[1]:02d}"
    raise ValueError(f"unknown bucket unit {unit!r} — expected one of {BUCKET_UNITS}")


def article_key(item: dict) -> str:
    """The article an observation is of: its link, or the record itself when it has none."""
    return item.get("source_url") or item["record_id"]


class Pick(NamedTuple):
    """What the Gold builders read of one picked observation — nothing more is kept."""

    collected_at: str
    record_id: str
    source_id: str
    keys: tuple[str, ...]
    sentiment: str


def _pick_of(item: dict, analysis: dict) -> Pick:
    unanalyzed = analysis["analysis_status"] == "unanalyzed" or analysis["sentiment"] is None
    return Pick(
        collected_at=sys.intern(item["collected_at"]),
        record_id=item["record_id"],
        source_id=sys.intern(item["source_id"]),
        keys=tuple(sys.intern(k) for k in dict.fromkeys(grouping_keys(analysis))),
        sentiment="unanalyzed" if unanalyzed else sys.intern(analysis["sentiment"]),
    )


class ArticlePicks:
    """One :class:`Pick` per article per bucket, fed one joined observation at a time.

    The latest observation of an article in a bucket wins. The serving contributions
    list (Go ``contributions``) mirrors this pick.
    """

    def __init__(self, units: tuple[str, ...] = BUCKET_UNITS) -> None:
        self._latest: dict[str, dict[tuple[str, str, str], Pick]] = {u: {} for u in units}

    def add(self, item: dict, analysis: dict) -> None:
        pick: Pick | None = None
        order = (item["collected_at"], item["record_id"])
        article = sys.intern(article_key(item))
        axis = sys.intern(item["axis"])
        for unit, latest in self._latest.items():
            key = (axis, sys.intern(_bucket(item["collected_at"], unit)), article)
            seen = latest.get(key)
            if seen is None or order > (seen.collected_at, seen.record_id):
                pick = pick or _pick_of(item, analysis)
                latest[key] = pick

    def join(self, bronze: Iterable[dict], silver: Iterable[dict]) -> None:
        """Add every Silver row whose observation ``bronze`` holds, in Silver order."""
        by_id = {b["record_id"]: b for b in bronze}
        for analysis in silver:
            item = by_id.get(analysis["record_id"])
            if item is not None:
                self.add(item, analysis)

    def articles(self, unit: str) -> Iterator[tuple[str, str, Pick]]:
        for (axis, bucket, _), pick in self._latest[unit].items():
            yield axis, bucket, pick


def bucket_articles(
    bronze: list[dict], silver: list[dict], unit: str = DEFAULT_BUCKET_UNIT
) -> list[tuple[str, str, Pick]]:
    """One ``(axis, bucket, pick)`` per article per bucket (:class:`ArticlePicks`)."""
    picks = ArticlePicks((unit,))
    picks.join(bronze, silver)
    return list(picks.articles(unit))


Counts = dict[str, dict[str, dict[str, dict[str, int]]]]


def count_articles(articles: Iterable[tuple[str, str, Pick]]) -> Counts:
    # counts[axis][bucket][source][subject] -> n
    counts: Counts = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: defaultdict(int))))
    for axis, bucket, pick in articles:
        for subject in pick.keys:
            counts[axis][bucket][pick.source_id][subject] += 1
    return counts


def count_by_source(
    bronze: list[dict], silver: list[dict], unit: str = DEFAULT_BUCKET_UNIT
) -> Counts:
    return count_articles(bucket_articles(bronze, silver, unit))


def fold_bucket(
    sources: dict[str, dict[str, int]],
) -> tuple[dict[str, tuple[float, int]], dict[str, dict[str, tuple[float, int]]], float]:
    averaged: dict[str, float] = defaultdict(float)
    raw_total: dict[str, int] = defaultdict(int)
    terms: dict[str, dict[str, tuple[float, int]]] = defaultdict(dict)
    n_sources = len(sources)
    for source, subject_counts in sources.items():
        source_total = sum(subject_counts.values()) or 1
        for subject, n in subject_counts.items():
            term = (n / source_total) / n_sources
            averaged[subject] += term
            raw_total[subject] += n
            terms[subject][source] = (term, n)
    denom = sum(averaged.values()) or 1.0
    folded = {
        subject: (round(share / denom, 4), raw_total[subject])
        for subject, share in averaged.items()
    }
    return folded, terms, denom


def build_subject_trends(
    bronze: list[dict], silver: list[dict], unit: str = DEFAULT_BUCKET_UNIT
) -> list[dict]:
    return list(subject_trends(count_by_source(bronze, silver, unit), unit))


def subject_trends(counts: Counts, unit: str) -> Iterator[dict]:
    # shares[axis][bucket][subject] -> (normalized_share, raw_count). Built in
    # full before any row is emitted: delta/spark need the neighbouring buckets.
    shares: dict[str, dict[str, dict[str, tuple[float, int]]]] = defaultdict(dict)
    for axis, buckets in counts.items():
        for bucket, sources in buckets.items():
            shares[axis][bucket] = fold_bucket(sources)[0]

    for axis, buckets in shares.items():
        ordered = sorted(buckets)
        # history[subject] -> shares so far, oldest first (only buckets the
        # subject actually appears in; an absent bucket is not a zero reading).
        history: dict[str, list[float]] = defaultdict(list)
        for bucket in ordered:
            rows = buckets[bucket]
            for subject, (normalized, raw) in sorted(
                rows.items(), key=lambda kv: kv[1][0], reverse=True
            ):
                past = history[subject]
                delta = round((normalized - past[-1]) * 100, 4) if past else 0.0
                spark = [*past, normalized][-SPARK_WINDOW:]
                past.append(normalized)
                yield asdict(
                    SubjectTrend(
                        subject=subject,
                        axis=axis,
                        bucket_unit=unit,
                        time_bucket=bucket,
                        raw_count=raw,
                        normalized_share=normalized,
                        delta=delta,
                        spark=spark,
                    )
                )


def build_axis_sentiment(
    bronze: list[dict], silver: list[dict], unit: str = DEFAULT_BUCKET_UNIT
) -> list[dict]:
    return list(axis_sentiment(bucket_articles(bronze, silver, unit), unit))


def axis_sentiment(articles: Iterable[tuple[str, str, Pick]], unit: str) -> Iterator[dict]:
    # tally[axis][bucket][key] -> n, where key is a sentiment, "unanalyzed", or "_total"
    tally: dict[str, dict[str, dict[str, int]]] = defaultdict(
        lambda: defaultdict(lambda: defaultdict(int))
    )
    for axis, bucket, pick in articles:
        tally[axis][bucket][pick.sentiment] += 1
        tally[axis][bucket]["_total"] += 1

    for axis, buckets in tally.items():
        for bucket, c in buckets.items():
            total = c["_total"] or 1
            analyzed = total - c["unanalyzed"]
            analyzed_denom = analyzed or 1
            distribution = SentimentDistribution(
                positive=round(c["positive"] / analyzed_denom, 4),
                neutral=round(c["neutral"] / analyzed_denom, 4),
                negative=round(c["negative"] / analyzed_denom, 4),
                mixed=round(c["mixed"] / analyzed_denom, 4),
                unanalyzed=round(c["unanalyzed"] / total, 4),
            )
            yield asdict(
                AxisSentiment(
                    axis=axis,
                    bucket_unit=unit,
                    time_bucket=bucket,
                    distribution=distribution,
                    analyzed_total=analyzed,
                )
            )


def build_subject_trends_all_units(
    bronze: list[dict], silver: list[dict], units: tuple[str, ...] = BUCKET_UNITS
) -> list[dict]:
    return [row for unit in units for row in build_subject_trends(bronze, silver, unit)]


def build_axis_sentiment_all_units(
    bronze: list[dict], silver: list[dict], units: tuple[str, ...] = BUCKET_UNITS
) -> list[dict]:
    return [row for unit in units for row in build_axis_sentiment(bronze, silver, unit)]
