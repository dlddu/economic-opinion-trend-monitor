"""``econ-analysis`` CLI — fake LLM enrichment of Bronze into Silver."""

from __future__ import annotations

import argparse
from dataclasses import asdict
from pathlib import Path

from econ_core import domain, open_store

from econ_analysis.fake_llm import ANALYZER_VERSION, analyze


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="econ-analysis",
        description="Enrich Bronze news into the Silver layer (fake LLM).",
    )
    parser.add_argument(
        "--data",
        type=Path,
        default=domain.default_data_root(),
        help="Data-lake root (default: repo data/ or $ECON_DATA_ROOT).",
    )
    parser.add_argument(
        "--analyzer-version",
        default=ANALYZER_VERSION,
        help="Analyzer version stamped on each record; bump to reprocess (AC2.6).",
    )
    args = parser.parse_args(argv)

    store = open_store(args.data)
    bronze = store.read_records(domain.BRONZE, domain.DS_NEWS_ITEM)
    analyses = [asdict(analyze(item, args.analyzer_version)) for item in bronze]
    written = store.write_records(domain.SILVER, domain.DS_ANALYSIS, analyses)

    unanalyzed = sum(1 for a in analyses if a["analysis_status"] == "unanalyzed")
    low = sum(1 for a in analyses if a["analysis_status"] == "low_confidence")
    target = store.path(domain.SILVER, domain.DS_ANALYSIS)
    print(f"analysis: read {len(bronze)} bronze, wrote {written} silver records -> {target}")
    print(f"  analyzer={args.analyzer_version} low_confidence={low} unanalyzed={unanalyzed}")
    return 0
