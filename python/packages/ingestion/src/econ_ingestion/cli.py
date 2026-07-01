"""``econ-ingestion`` CLI — fake collection into the Bronze layer.

This is the scheduler trigger point: a real deployment would invoke this on a
cron/interval (AC1.1). The skeleton just runs one cycle on demand.
"""

from __future__ import annotations

import argparse
from datetime import UTC, datetime
from pathlib import Path

from econ_core import domain, open_store

from econ_ingestion.sources import run_ingestion


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="econ-ingestion",
        description="Collect top-viewed news into the Bronze layer (fake source).",
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
    args = parser.parse_args(argv)

    now = datetime.now(UTC)
    cycle = args.cycle or now.strftime("%Y-%m-%dT%H:00")
    collected_at = now.replace(microsecond=0).isoformat()

    items, stats = run_ingestion(cycle, collected_at)
    store = open_store(args.data)
    written = store.write_records(domain.BRONZE, domain.DS_NEWS_ITEM, items)

    target = store.path(domain.BRONZE, domain.DS_NEWS_ITEM)
    print(f"ingestion: wrote {written} bronze records -> {target}")
    print(
        f"  cycle={cycle} duplicates_skipped={stats.duplicates} "
        f"failed_sources={stats.failed_sources or '[]'}"
    )
    return 0
