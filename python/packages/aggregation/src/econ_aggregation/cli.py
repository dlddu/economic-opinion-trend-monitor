"""``econ-aggregation`` CLI — build the Gold serving datasets from Silver."""

from __future__ import annotations

import argparse
from pathlib import Path

from econ_core import domain, open_store

from econ_aggregation.aggregate import (
    BUCKET_UNITS,
    build_axis_sentiment_all_units,
    build_subject_trends_all_units,
)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="econ-aggregation",
        description="Normalize/aggregate Silver into the Gold layer (hour/day/week buckets).",
    )
    parser.add_argument(
        "--data",
        type=Path,
        default=domain.default_data_root(),
        help="Data-lake root (default: repo data/ or $ECON_DATA_ROOT).",
    )
    args = parser.parse_args(argv)

    store = open_store(args.data)
    bronze = store.read_records(domain.BRONZE, domain.DS_NEWS_ITEM)
    silver = store.read_records(domain.SILVER, domain.DS_ANALYSIS)

    # Every run emits all three bucket units (AC3.3). They share one dataset
    # because ``bucket_unit`` is what the contract gives readers to tell them
    # apart; readers that draw one chart settle on a single unit first.
    trends = build_subject_trends_all_units(bronze, silver)
    sentiment = build_axis_sentiment_all_units(bronze, silver)
    n_trend = store.write_records(domain.GOLD, domain.DS_SUBJECT_TREND, trends)
    n_sent = store.write_records(domain.GOLD, domain.DS_AXIS_SENTIMENT, sentiment)

    print(
        f"aggregation: read {len(silver)} silver (joined to {len(bronze)} bronze), "
        f"wrote {n_trend} subject_trend + {n_sent} axis_sentiment gold records "
        f"across {len(BUCKET_UNITS)} bucket units ({', '.join(BUCKET_UNITS)})"
    )
    print(f"  -> {store.path(domain.GOLD, domain.DS_SUBJECT_TREND)}")
    print(f"  -> {store.path(domain.GOLD, domain.DS_AXIS_SENTIMENT)}")
    return 0
