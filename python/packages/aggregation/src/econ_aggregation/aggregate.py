"""Normalize/aggregate Silver into Gold.

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

``delta`` and ``spark`` are read off the subject's *own* bucket history rather
than synthesized: shares are computed for every bucket first, then each row
looks back along the same (axis, subject) series. A subject's first bucket has
nothing to compare against, so it reports ``delta = 0.0`` and a single-point
spark — that degenerate case is the honest answer, not a placeholder.

Rollups (AC3.3): the hour is the default unit, and the longer units are the
*same* aggregation run again over a coarser cut of the same source records —
not a second pass that sums Gold rows. That is what keeps the rollup consistent
by construction: a day's ``raw_count`` is the count of the records that fall in
that day, which is exactly the sum of its hours' counts. ``normalized_share``
is deliberately *not* summed. It is a share of its own bucket, so adding hourly
shares would produce a number that is no longer a distribution; recomputing the
AC3.1 normalization inside the wider bucket keeps every unit's shares summing
to 1 across subjects, which is what makes the units comparable at all.
"""

from __future__ import annotations

from collections import defaultdict
from dataclasses import asdict
from datetime import date

from econ_core.models import AxisSentiment, SentimentDistribution, SubjectTrend

# The unit an aggregation answers in when the caller does not say (AC3.3:
# "기본 단위는 시간"), and the full set a run emits, finest first.
DEFAULT_BUCKET_UNIT = "hour"
BUCKET_UNITS = ("hour", "day", "week")

# How many trailing buckets the sparkline carries, the current one included.
SPARK_WINDOW = 6


def _bucket(collected_at: str, unit: str = DEFAULT_BUCKET_UNIT) -> str:
    """Cut a collection timestamp down to its bucket label in ``unit`` (AC3.3).

    ``2026-06-23T14:00:00+00:00`` -> ``2026-06-23T14`` / ``2026-06-23`` /
    ``2026-W26``. Every label is zero-padded, so lexical order is chronological
    order *within* a unit — the assumption both the serving layer and the
    delta/spark history below are built on. Across units it does not hold
    (``2026-W26`` sorts above ``2026-06-23T14``), which is why consumers settle
    on one unit before they compare buckets.
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


def build_subject_trends(
    bronze: list[dict], silver: list[dict], unit: str = DEFAULT_BUCKET_UNIT
) -> list[dict]:
    by_id = {b["record_id"]: b for b in bronze}
    # counts[axis][bucket][source][subject] -> n
    counts: dict[str, dict[str, dict[str, dict[str, int]]]] = defaultdict(
        lambda: defaultdict(lambda: defaultdict(lambda: defaultdict(int)))
    )
    for analysis in silver:
        item = by_id.get(analysis["record_id"])
        if item is None:
            continue
        axis, source = item["axis"], item["source_id"]
        bucket = _bucket(item["collected_at"], unit)
        for subject in analysis["narrative_subjects"]:
            counts[axis][bucket][source][subject] += 1

    # shares[axis][bucket][subject] -> (normalized_share, raw_count). Built in
    # full before any row is emitted: delta/spark need the neighbouring buckets.
    shares: dict[str, dict[str, dict[str, tuple[float, int]]]] = defaultdict(dict)
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
            shares[axis][bucket] = {
                subject: (round(share / denom, 4), raw_total[subject])
                for subject, share in averaged.items()
            }

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
    by_id = {b["record_id"]: b for b in bronze}
    # tally[axis][bucket][key] -> n, where key is a sentiment, "unanalyzed", or "_total"
    tally: dict[str, dict[str, dict[str, int]]] = defaultdict(
        lambda: defaultdict(lambda: defaultdict(int))
    )
    for analysis in silver:
        item = by_id.get(analysis["record_id"])
        if item is None:
            continue
        axis, bucket = item["axis"], _bucket(item["collected_at"], unit)
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
    """``build_subject_trends`` once per unit, finest first (AC3.3 rollups)."""
    return [row for unit in units for row in build_subject_trends(bronze, silver, unit)]


def build_axis_sentiment_all_units(
    bronze: list[dict], silver: list[dict], units: tuple[str, ...] = BUCKET_UNITS
) -> list[dict]:
    """``build_axis_sentiment`` once per unit, finest first (AC3.3 rollups)."""
    return [row for unit in units for row in build_axis_sentiment(bronze, silver, unit)]
