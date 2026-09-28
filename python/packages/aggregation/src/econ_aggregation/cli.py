"""``econ-aggregation`` CLI — build the Gold serving datasets from Silver.

``--decision`` records a publish/rollback before aggregating: the decision is a
pointer move, and a rollback is the same move back — neither re-analyzes.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from econ_core import LakeStore, domain, open_store, runlog, silver

from econ_aggregation.aggregate import (
    BUCKET_UNITS,
    build_axis_sentiment_all_units,
    build_subject_trends_all_units,
)
from econ_aggregation.contributions import build_subject_source_contributions_all_units


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
    decide = parser.add_argument_group("serving version (JRN-logic-backfill STP-publish)")
    decide.add_argument(
        "--decision",
        choices=silver.DECISIONS,
        default=None,
        help="Record a publish/rollback decision before aggregating; --version names the "
        "analyzer version Gold serves from now on, --memo the reason.",
    )
    decide.add_argument("--version", default=None, help="Analyzer version the decision serves.")
    decide.add_argument("--memo", default="", help="Why this decision is right (required).")
    decide.add_argument(
        "--notify-consumer",
        choices=("true", "false"),
        default="true",
        help="Whether consumer screens may annotate the publish time and version.",
    )
    parser.add_argument(
        "--run-id",
        default=None,
        help="Batch run this aggregation belongs to (AC4.1); defaults to $ECON_RUN_ID, "
        "or a fresh id when this CLI runs outside a pipeline.",
    )
    args = parser.parse_args(argv)

    store = open_store(args.data)
    run_id = runlog.resolve_run_id(args.run_id)
    trigger = runlog.REPROCESS if args.decision else runlog.SCHEDULED
    with runlog.run_stage(store, run_id, runlog.AGGREGATION, trigger=trigger) as stage:
        return _aggregate(args, store, run_id, stage)


def _aggregate(
    args: argparse.Namespace, store: LakeStore, run_id: str, stage: runlog.StageReport
) -> int:
    if args.decision:
        try:
            decision = silver.record_decision(
                store, args.decision, args.version or "", args.memo, args.notify_consumer == "true"
            )
        except ValueError as exc:
            print(f"aggregation: decision not recorded — {exc}", file=sys.stderr)
            stage.fail(f"decision not recorded: {exc}")
            return 2
        log_path = store.path(domain.SILVER, domain.DS_REPROCESS_DECISION)
        print(
            f"aggregation: recorded {decision['decision']} of {decision['analyzer_version']} "
            f"at {decision['decided_at']} -> {log_path}"
        )

    bronze = store.read_partitions(domain.BRONZE, domain.DS_NEWS_ITEM)
    silver.migrate_legacy(store, silver.cycles_of(bronze))
    all_silver = silver.read_analyses(store)
    serving = silver.serving_version(store)
    chosen = silver.select_serving(all_silver, serving)

    # Every run emits all three bucket units (AC5.2). They share one dataset
    # because ``bucket_unit`` is what the contract gives readers to tell them
    # apart; readers that draw one chart settle on a single unit first.
    trends = build_subject_trends_all_units(bronze, chosen)
    sentiment = build_axis_sentiment_all_units(bronze, chosen)
    contributions = build_subject_source_contributions_all_units(bronze, chosen)
    n_trend = store.write_records(domain.GOLD, domain.DS_SUBJECT_TREND, trends)
    n_sent = store.write_records(domain.GOLD, domain.DS_AXIS_SENTIMENT, sentiment)
    n_contrib = store.write_records(
        domain.GOLD, domain.DS_SUBJECT_SOURCE_CONTRIBUTION, contributions
    )

    print(
        f"aggregation: read {len(chosen)} silver (joined to {len(bronze)} bronze), "
        f"wrote {n_trend} subject_trend + {n_sent} axis_sentiment "
        f"+ {n_contrib} subject_source_contribution gold records "
        f"across {len(BUCKET_UNITS)} bucket units ({', '.join(BUCKET_UNITS)})"
    )
    print(
        f"  serving version: {serving or 'newest per record (no decision recorded)'}; "
        f"silver rows total {len(all_silver)}"
    )
    print(f"  -> {store.path(domain.GOLD, domain.DS_SUBJECT_TREND)}")
    print(f"  -> {store.path(domain.GOLD, domain.DS_AXIS_SENTIMENT)}")
    print(f"  -> {store.path(domain.GOLD, domain.DS_SUBJECT_SOURCE_CONTRIBUTION)}")

    stage.input_count = len(all_silver)
    stage.output_count = n_trend + n_sent + n_contrib
    stage.count("served", len(chosen))
    stage.count("superseded", len(all_silver) - len(chosen))
    print(f"  run={run_id} stage=aggregation")
    return 0
