"""Normalize/aggregate Silver into Gold (stub logic).

Silver carries only the analysis plus the Bronze tracking key, so this step
joins back to Bronze on ``record_id`` (exercising V5/AC2.6) to recover axis,
source, and collection time. It then emits two Gold datasets:

  - ``SubjectTrend``   per (subject, axis, bucket): raw_count + normalized_share
  - ``AxisSentiment``  per (axis, bucket): sentiment distribution

Normalization (AC3.1): each subject's share is computed *within each source*
first, then averaged across the sources present in an axis, so a high-volume
source cannot dominate; the averaged values are renormalized to sum to 1 across
subjects. This is a deliberately simple placeholder — the real formula is
follow-up work.
"""

from __future__ import annotations

from collections import defaultdict
from dataclasses import asdict

from econ_core.models import AxisSentiment, SentimentDistribution, SubjectTrend

BUCKET_UNIT = "hour"


def _bucket(collected_at: str) -> str:
    """2026-06-23T14:00:00+00:00 -> 2026-06-23T14 (hour bucket, AC3.3)."""
    return collected_at[:13]


def _spark(share: float) -> list[float]:
    """Deterministic faux ramp toward the current share (skeleton placeholder)."""
    return [round(share * f, 4) for f in (0.7, 0.8, 0.85, 0.9, 0.95, 1.0)]


def build_subject_trends(bronze: list[dict], silver: list[dict]) -> list[dict]:
    by_id = {b["record_id"]: b for b in bronze}
    # counts[axis][bucket][source][subject] -> n
    counts: dict[str, dict[str, dict[str, dict[str, int]]]] = defaultdict(
        lambda: defaultdict(lambda: defaultdict(lambda: defaultdict(int)))
    )
    for analysis in silver:
        item = by_id.get(analysis["record_id"])
        if item is None:
            continue
        axis, bucket, source = item["axis"], _bucket(item["collected_at"]), item["source_id"]
        for subject in analysis["narrative_subjects"]:
            counts[axis][bucket][source][subject] += 1

    trends: list[dict] = []
    for axis, buckets in counts.items():
        for bucket, sources in buckets.items():
            averaged: dict[str, float] = defaultdict(float)
            raw_total: dict[str, int] = defaultdict(int)
            n_sources = len(sources)
            for subject_counts in sources.values():
                source_total = sum(subject_counts.values()) or 1
                for subject, n in subject_counts.items():
                    averaged[subject] += (n / source_total) / n_sources
                    raw_total[subject] += n
            denom = sum(averaged.values()) or 1.0
            for subject, share in sorted(averaged.items(), key=lambda kv: kv[1], reverse=True):
                normalized = round(share / denom, 4)
                trends.append(
                    asdict(
                        SubjectTrend(
                            subject=subject,
                            axis=axis,
                            bucket_unit=BUCKET_UNIT,
                            time_bucket=bucket,
                            raw_count=raw_total[subject],
                            normalized_share=normalized,
                            delta=0.0,
                            spark=_spark(normalized),
                        )
                    )
                )
    return trends


def build_axis_sentiment(bronze: list[dict], silver: list[dict]) -> list[dict]:
    by_id = {b["record_id"]: b for b in bronze}
    # tally[axis][bucket][key] -> n, where key is a sentiment, "unanalyzed", or "_total"
    tally: dict[str, dict[str, dict[str, int]]] = defaultdict(
        lambda: defaultdict(lambda: defaultdict(int))
    )
    for analysis in silver:
        item = by_id.get(analysis["record_id"])
        if item is None:
            continue
        axis, bucket = item["axis"], _bucket(item["collected_at"])
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
                        bucket_unit=BUCKET_UNIT,
                        time_bucket=bucket,
                        distribution=distribution,
                        analyzed_total=analyzed,
                    )
                )
            )
    return rows
