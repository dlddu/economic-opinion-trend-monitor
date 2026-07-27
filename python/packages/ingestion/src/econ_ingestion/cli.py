"""``econ-ingestion`` CLI — collect news into the Bronze layer.

This is the scheduler trigger point: a real deployment would invoke this on a
cron/interval (AC1.1). The skeleton just runs one cycle on demand.

Two collection sources share the identical Bronze output path (``news_item`` +
content-addressed ``news_body``): the deterministic ``fake`` catalog (default,
keeps the cross-language smoke pinned) and the real ``feed`` source that fetches
configured RSS/Atom endpoints (``--source feed``).
"""

from __future__ import annotations

import argparse
from datetime import UTC, datetime
from pathlib import Path

from econ_core import domain, open_store

from econ_ingestion.feeds import http_fetcher, load_feed_configs, run_feed_ingestion
from econ_ingestion.sources import run_ingestion


def main(argv: list[str] | None = None) -> int:
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
        choices=("fake", "feed"),
        default="fake",
        help="Collection source: deterministic 'fake' catalog (default) or real RSS/Atom 'feed'.",
    )
    parser.add_argument(
        "--feeds",
        type=Path,
        default=None,
        help="Feed source config JSON (required with --source feed): "
        "[{source_id, axis, feed_url, limit}].",
    )
    parser.add_argument(
        "--fetch-timeout",
        type=float,
        default=15.0,
        help="Per-feed HTTP fetch timeout in seconds (--source feed).",
    )
    args = parser.parse_args(argv)

    now = datetime.now(UTC)
    cycle = args.cycle or now.strftime("%Y-%m-%dT%H:00")
    collected_at = now.replace(microsecond=0).isoformat()

    if args.source == "feed":
        if args.feeds is None:
            parser.error("--source feed requires --feeds <config.json>")
        configs = load_feed_configs(args.feeds)
        items, bodies, stats = run_feed_ingestion(
            configs, cycle, collected_at, http_fetcher(args.fetch_timeout)
        )
    else:
        items, bodies, stats = run_ingestion(cycle, collected_at)

    store = open_store(args.data)
    written = store.write_records(domain.BRONZE, domain.DS_NEWS_ITEM, items)
    # Content-addressed merge: unchanged bodies are skipped, edited bodies
    # append as new versions without touching prior ones (AC1.7).
    new_bodies = store.merge_records(domain.BRONZE, domain.DS_NEWS_BODY, "body_hash", bodies)

    target = store.path(domain.BRONZE, domain.DS_NEWS_ITEM)
    body_target = store.path(domain.BRONZE, domain.DS_NEWS_BODY)
    print(f"ingestion[{args.source}]: wrote {written} bronze records -> {target}")
    print(f"  bodies: {new_bodies} new / {len(bodies) - new_bodies} deduplicated -> {body_target}")
    print(
        f"  cycle={cycle} duplicates_skipped={stats.duplicates} "
        f"failed_sources={stats.failed_sources or '[]'}"
    )
    return 0
