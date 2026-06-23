"""``econ-aggregation`` CLI — build the Gold serving datasets from Silver."""

from __future__ import annotations

import argparse
from pathlib import Path

from econ_core import domain, open_store

from econ_aggregation.aggregate import build_axis_sentiment, build_subject_trends


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="econ-aggregation",
        description="Normalize/aggregate Silver into the Gold layer (stub).",
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

    trends = build_subject_trends(bronze, silver)
    sentiment = build_axis_sentiment(bronze, silver)
    n_trend = store.write_records(domain.GOLD, domain.DS_SUBJECT_TREND, trends)
    n_sent = store.write_records(domain.GOLD, domain.DS_AXIS_SENTIMENT, sentiment)

    print(
        f"aggregation: read {len(silver)} silver (joined to {len(bronze)} bronze), "
        f"wrote {n_trend} subject_trend + {n_sent} axis_sentiment gold records"
    )
    print(f"  -> {store.path(domain.GOLD, domain.DS_SUBJECT_TREND)}")
    print(f"  -> {store.path(domain.GOLD, domain.DS_AXIS_SENTIMENT)}")
    return 0
