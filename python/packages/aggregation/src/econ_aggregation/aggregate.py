"""Normalize/aggregate Silver into Gold.

A subject's first bucket has nothing to compare against, so it reports
``delta = 0.0`` and a single-point spark — the degenerate case is the honest
answer, not a placeholder to synthesize over.

``normalized_share`` is deliberately *not* summed across the finer buckets: it
is a share of its own bucket, so adding hourly shares stops being a
distribution. The wider bucket recomputes the normalization instead.
"""

from __future__ import annotations

from collections import defaultdict
from dataclasses import asdict
from datetime import date

from econ_core.models import AxisSentiment, SentimentDistribution, SubjectTrend

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


def bucket_articles(
    bronze: list[dict], silver: list[dict], unit: str = DEFAULT_BUCKET_UNIT
) -> list[tuple[str, str, dict, dict]]:
    """One ``(axis, bucket, item, analysis)`` per article per bucket.

    Ingestion re-collects the top-N every hour, so an article that stays on a feed
    for a day is ~24 observations of one article (PRD ingestion, 저장 구조). Counting
    observations would weigh a subject by how long its articles stayed listed rather
    than by how many articles told it, so a bucket counts each article once, through
    its latest observation in that bucket — the article as it last read. An hour
    bucket holds one observation per article already, so only the day/week rollups
    change. The serving contributions list (Go ``contributions``) mirrors this pick.
    """
    by_id = {b["record_id"]: b for b in bronze}
    latest: dict[tuple[str, str, str], tuple[dict, dict]] = {}
    for analysis in silver:
        item = by_id.get(analysis["record_id"])
        if item is None:
            continue
        key = (item["axis"], _bucket(item["collected_at"], unit), article_key(item))
        seen = latest.get(key)
        if seen is None or (item["collected_at"], item["record_id"]) > (
            seen[0]["collected_at"],
            seen[0]["record_id"],
        ):
            latest[key] = (item, analysis)
    return [
        (axis, bucket, item, analysis) for (axis, bucket, _), (item, analysis) in latest.items()
    ]


def count_by_source(
    bronze: list[dict], silver: list[dict], unit: str = DEFAULT_BUCKET_UNIT
) -> dict[str, dict[str, dict[str, dict[str, int]]]]:
    # counts[axis][bucket][source][subject] -> n
    counts: dict[str, dict[str, dict[str, dict[str, int]]]] = defaultdict(
        lambda: defaultdict(lambda: defaultdict(lambda: defaultdict(int)))
    )
    for axis, bucket, item, analysis in bucket_articles(bronze, silver, unit):
        # A subject is counted once per article even if the analysis repeats it.
        for subject in dict.fromkeys(analysis["narrative_subjects"]):
            counts[axis][bucket][item["source_id"]][subject] += 1
    return counts


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
    counts = count_by_source(bronze, silver, unit)

    # shares[axis][bucket][subject] -> (normalized_share, raw_count). Built in
    # full before any row is emitted: delta/spark need the neighbouring buckets.
    shares: dict[str, dict[str, dict[str, tuple[float, int]]]] = defaultdict(dict)
    for axis, buckets in counts.items():
        for bucket, sources in buckets.items():
            shares[axis][bucket] = fold_bucket(sources)[0]

    trends: list[dict] = []
    for axis, buckets in shares.items():
        # Bucket keys are zero-padded ISO prefixes, so lexical order is
        # chronological order within a unit — the same assumption the serving
        # layer's latest-bucket pick makes.
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
                trends.append(
                    asdict(
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
                )
    return trends


def build_axis_sentiment(
    bronze: list[dict], silver: list[dict], unit: str = DEFAULT_BUCKET_UNIT
) -> list[dict]:
    # tally[axis][bucket][key] -> n, where key is a sentiment, "unanalyzed", or "_total"
    tally: dict[str, dict[str, dict[str, int]]] = defaultdict(
        lambda: defaultdict(lambda: defaultdict(int))
    )
    for axis, bucket, _, analysis in bucket_articles(bronze, silver, unit):
        if analysis["analysis_status"] == "unanalyzed" or analysis["sentiment"] is None:
            tally[axis][bucket]["unanalyzed"] += 1
        else:
            tally[axis][bucket][analysis["sentiment"]] += 1
        tally[axis][bucket]["_total"] += 1

    rows: list[dict] = []
    for axis, buckets in tally.items():
        for bucket, c in buckets.items():
            total = c["_total"] or 1
            analyzed = total - c["unanalyzed"]
            analyzed_denom = analyzed or 1
            # Sentiment ratios are over analyzed items; unanalyzed kept separate (AC3.4).
            distribution = SentimentDistribution(
                positive=round(c["positive"] / analyzed_denom, 4),
                neutral=round(c["neutral"] / analyzed_denom, 4),
                negative=round(c["negative"] / analyzed_denom, 4),
                mixed=round(c["mixed"] / analyzed_denom, 4),
                unanalyzed=round(c["unanalyzed"] / total, 4),
            )
            rows.append(
                asdict(
                    AxisSentiment(
                        axis=axis,
                        bucket_unit=unit,
                        time_bucket=bucket,
                        distribution=distribution,
                        analyzed_total=analyzed,
                    )
                )
            )
    return rows


def build_subject_trends_all_units(
    bronze: list[dict], silver: list[dict], units: tuple[str, ...] = BUCKET_UNITS
) -> list[dict]:
    return [row for unit in units for row in build_subject_trends(bronze, silver, unit)]


def build_axis_sentiment_all_units(
    bronze: list[dict], silver: list[dict], units: tuple[str, ...] = BUCKET_UNITS
) -> list[dict]:
    return [row for unit in units for row in build_axis_sentiment(bronze, silver, unit)]
