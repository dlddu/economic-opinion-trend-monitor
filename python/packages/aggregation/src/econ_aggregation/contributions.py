"""Decompose a Gold value into the collection sources that made it (AC3.9).

The decomposition is not a second calculation. ``build_subject_trends`` folds the
per-source terms away at one point — ``(n / source_total) / n_sources`` summed
over sources — and this module takes the same ``fold_bucket`` terms *before* that
sum is discarded. A source breakdown computed a second way would quietly
disagree with the number it claims to explain, which is the failure the two sum
identities in AC3.9 exist to catch.
"""

from __future__ import annotations

from dataclasses import asdict

from econ_core.models import SubjectSourceContribution

from econ_aggregation.aggregate import (
    BUCKET_UNITS,
    DEFAULT_BUCKET_UNIT,
    count_by_source,
    fold_bucket,
)

GRID = 10**4


def _on_grid(terms: dict[str, tuple[float, int]], denom: float, share: float) -> dict[str, int]:
    """Split ``share`` across sources on the 1/GRID grid, exactly.

    Ties break on source id so the same lake decomposes the same way twice.
    """
    total = round(share * GRID)
    exact = {source: (term / denom) * GRID for source, (term, _) in terms.items()}
    units = {source: int(value) for source, value in exact.items()}
    left = total - sum(units.values())
    order = sorted(exact, key=lambda source: (-(exact[source] - units[source]), source))
    for source in order[: max(left, 0)]:
        units[source] += 1
    return units


def build_subject_source_contributions(
    bronze: list[dict], silver: list[dict], unit: str = DEFAULT_BUCKET_UNIT
) -> list[dict]:
    counts = count_by_source(bronze, silver, unit)

    rows: list[dict] = []
    for axis, buckets in counts.items():
        for bucket, sources in buckets.items():
            folded, terms, denom = fold_bucket(sources)
            for subject, (share, raw_count) in folded.items():
                units = _on_grid(terms[subject], denom, share)
                ordered = sorted(terms[subject].items(), key=lambda kv: (-kv[1][1], kv[0]))
                for source, (_, n) in ordered:
                    rows.append(
                        asdict(
                            SubjectSourceContribution(
                                subject=subject,
                                axis=axis,
                                bucket_unit=unit,
                                time_bucket=bucket,
                                source_id=source,
                                raw_count=n,
                                raw_share=round(n / (raw_count or 1), 4),
                                normalized_contribution=units[source] / GRID,
                            )
                        )
                    )
    return rows


def build_subject_source_contributions_all_units(
    bronze: list[dict], silver: list[dict], units: tuple[str, ...] = BUCKET_UNITS
) -> list[dict]:
    return [
        row for unit in units for row in build_subject_source_contributions(bronze, silver, unit)
    ]
