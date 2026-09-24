"""``econ-ingestion`` CLI — collect news into the Bronze layer.

This is the scheduler trigger point: a real deployment invokes this on a
cron/interval (AC1.1), passing the cycle window in via ``--cycle``; the CLI runs
one cycle on demand and is idempotent per cycle. The schedule itself is wired in
``deploy/batch/cronworkflow-ingestion.yaml`` as an Argo Workflows CronWorkflow
(hourly by default, per-environment override via a kustomize patch on
``/spec/schedule``), which runs this CLI with no arguments so the cycle falls
out of the current UTC hour.

Two collection sources share the identical Bronze output path (``news_item`` +
content-addressed ``news_body``): the real ``feed`` source that fetches the
configured RSS/Atom endpoints (the operational default; uses the checked-in
``default_feeds.json`` when ``--feeds`` is omitted) and the deterministic
``fake`` catalog (``--source fake``) that keeps the cross-language smoke and
offline tests pinned.
"""

from __future__ import annotations

import argparse
from datetime import UTC, datetime
from pathlib import Path

from econ_core import domain, open_store

from econ_ingestion.feeds import (
    default_feeds_path,
    http_fetcher,
    load_feed_configs,
    run_feed_ingestion,
)
from econ_ingestion.sources import run_ingestion


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
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = _build_parser()
    args = parser.parse_args(argv)

    now = datetime.now(UTC)
    cycle = args.cycle or now.strftime("%Y-%m-%dT%H:00")
    collected_at = now.replace(microsecond=0).isoformat()

    if args.source == "feed":
        feeds_path = args.feeds or default_feeds_path()
        configs = load_feed_configs(feeds_path)
        items, bodies, stats = run_feed_ingestion(
            configs, cycle, collected_at, http_fetcher(args.fetch_timeout)
        )
    else:
        items, bodies, stats = run_ingestion(cycle, collected_at)

    store = open_store(args.data)
    written = store.write_records(domain.BRONZE, domain.DS_NEWS_ITEM, items)
    migrated = store.migrate_records_to_objects(domain.BRONZE, domain.DS_NEWS_BODY, "body_hash")
    if migrated:
        print(f"ingestion: migrated {migrated} legacy bodies into the object layout")
    new_bodies = sum(
        store.put_object(domain.BRONZE, domain.DS_NEWS_BODY, "body_hash", body) for body in bodies
    )

    target = store.path(domain.BRONZE, domain.DS_NEWS_ITEM)
    body_target = store.object_dir(domain.BRONZE, domain.DS_NEWS_BODY)
    print(f"ingestion[{args.source}]: wrote {written} bronze records -> {target}")
    print(f"  bodies: {new_bodies} new / {len(bodies) - new_bodies} deduplicated -> {body_target}")
    print(
        f"  cycle={cycle} duplicates_skipped={stats.duplicates} "
        f"failed_sources={stats.failed_sources or '[]'}"
    )
    for source_id, reason in stats.failure_reasons.items():
        print(f"  failed_source {source_id}: {reason}")
    return 0
