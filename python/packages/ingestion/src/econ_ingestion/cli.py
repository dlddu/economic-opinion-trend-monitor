"""``econ-ingestion`` CLI — collect news into the Bronze layer.

A cycle must stay idempotent: the schedule reruns late or missed ticks into the same
cycle, and only replacing that cycle's partition keeps the rerun from double-counting.
"""

from __future__ import annotations

import argparse
from datetime import UTC, datetime
from pathlib import Path

from econ_core import domain, open_store, runlog

from econ_ingestion.feeds import (
    default_feeds_path,
    http_fetcher,
    load_feed_configs,
    run_feed_ingestion,
)
from econ_ingestion.sources import run_ingestion


def _cycle(value: str) -> str:
    try:
        domain.parse_cycle(value)
    except ValueError as exc:
        raise argparse.ArgumentTypeError(str(exc)) from exc
    return value


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="econ-ingestion",
        description="Collect top-viewed news into the Bronze layer.",
    )
    parser.add_argument(
        "--data",
        type=Path,
        default=domain.default_data_root(),
        help="Data-lake root (default: repo data/ or $ECON_DATA_ROOT).",
    )
    parser.add_argument(
        "--cycle",
        type=_cycle,
        default=None,
        help="Collection cycle id, e.g. 2026-06-23T14:00 (default: current UTC hour).",
    )
    parser.add_argument(
        "--source",
        choices=("feed", "fake"),
        default="feed",
        help="Collection source: real RSS/Atom 'feed' (default) or the deterministic "
        "'fake' catalog used by the offline smoke/tests.",
    )
    parser.add_argument(
        "--feeds",
        type=Path,
        default=None,
        help="Feed source config JSON for --source feed "
        "(default: packaged default_feeds.json): [{source_id, axis, feed_url, limit, format}].",
    )
    parser.add_argument(
        "--fetch-timeout",
        type=float,
        default=15.0,
        help="Per-feed HTTP fetch timeout in seconds (--source feed).",
    )
    parser.add_argument(
        "--run-id",
        default=None,
        help="Batch run this collection belongs to (AC4.1); defaults to $ECON_RUN_ID, "
        "or a fresh id when this CLI runs outside a pipeline.",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = _build_parser()
    args = parser.parse_args(argv)

    now = datetime.now(UTC)
    cycle = args.cycle or now.strftime("%Y-%m-%dT%H:00")
    collected_at = now.replace(microsecond=0).isoformat()
    run_id = runlog.resolve_run_id(args.run_id)

    with runlog.run_stage(open_store(args.data), run_id, runlog.INGESTION) as stage:
        return _collect(args, cycle, collected_at, run_id, stage)


def _collect(
    args: argparse.Namespace,
    cycle: str,
    collected_at: str,
    run_id: str,
    stage: runlog.StageReport,
) -> int:
    if args.source == "feed":
        feeds_path = args.feeds or default_feeds_path()
        configs = load_feed_configs(feeds_path)
        items, bodies, stats = run_feed_ingestion(
            configs, cycle, collected_at, http_fetcher(args.fetch_timeout)
        )
    else:
        items, bodies, stats = run_ingestion(cycle, collected_at)

    store = open_store(args.data)
    migrated_items = store.migrate_records_to_partitions(
        domain.BRONZE,
        domain.DS_NEWS_ITEM,
        lambda item: domain.cycle_partition(item["collection_cycle"]),
    )
    if migrated_items:
        print(f"ingestion: migrated {migrated_items} legacy observations into cycle partitions")
    migrated = store.migrate_records_to_objects(domain.BRONZE, domain.DS_NEWS_BODY, "body_hash")
    if migrated:
        print(f"ingestion: migrated {migrated} legacy bodies into the object layout")

    partition = domain.cycle_partition(cycle)
    written = store.write_partition(domain.BRONZE, domain.DS_NEWS_ITEM, partition, items)
    new_bodies = sum(
        store.put_object(domain.BRONZE, domain.DS_NEWS_BODY, "body_hash", body) for body in bodies
    )

    target = store.partition_path(domain.BRONZE, domain.DS_NEWS_ITEM, partition)
    body_target = store.dataset_dir(domain.BRONZE, domain.DS_NEWS_BODY)
    print(f"ingestion[{args.source}]: wrote {written} bronze records -> {target}")
    print(f"  bodies: {new_bodies} new / {len(bodies) - new_bodies} deduplicated -> {body_target}")
    print(
        f"  cycle={cycle} duplicates_skipped={stats.duplicates} "
        f"failed_sources={stats.failed_sources or '[]'}"
    )
    for source_id, reason in stats.failure_reasons.items():
        print(f"  failed_source {source_id}: {reason}")

    stage.input_count = len(items) + stats.duplicates
    stage.output_count = written
    stage.count("collected", len(items))
    stage.count("duplicate_skipped", stats.duplicates)
    for source_id, reason in stats.failure_reasons.items():
        stage.source_failed(source_id, reason)
    print(f"  run={run_id} stage=ingestion")
    return 0
