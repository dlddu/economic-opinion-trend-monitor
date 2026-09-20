"""``econ-analysis`` CLI — enrich Bronze into the Silver layer.

Two analyzers share the identical Silver output path (``analysis``): the real ``llm``
analyzer (the operational default) that sends each item to a chat-completions model,
with endpoint/model/key read from the ``ECON_LLM_*`` environment, and the deterministic
``fake`` keyword stand-in (``--analyzer fake``) that keeps the cross-language smoke and
offline tests network-free. The default was cut over to the real model once the
analyzer had landed and been exercised, mirroring the ingestion feed cutover.

The real analyzer never lets an operator error masquerade as analysis output, because
``write_records`` *replaces* the Silver dataset and ``unanalyzed`` is a data-quality
signal downstream aggregation separates on (AC2.5, AC3.4). Two guards, two exit codes:
an incomplete ``ECON_LLM_*`` environment aborts before Bronze is even read
(:data:`EXIT_CONFIG`), and a run whose every model call failed refuses to write at all
(:data:`EXIT_ALL_CALLS_FAILED`), leaving the previous Silver intact.
"""

from __future__ import annotations

import argparse
import sys
from dataclasses import asdict
from pathlib import Path

from econ_core import domain, open_store

from econ_analysis import fake_llm, llm

#: ``--analyzer llm`` selected but its environment is incomplete; nothing was read.
EXIT_CONFIG = 2
#: Every model call failed; Silver was left untouched rather than wiped.
EXIT_ALL_CALLS_FAILED = 3


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="econ-analysis",
        description="Enrich Bronze news into the Silver layer (fake or real LLM).",
    )
    parser.add_argument(
        "--data",
        type=Path,
        default=domain.default_data_root(),
        help="Data-lake root (default: repo data/ or $ECON_DATA_ROOT).",
    )
    parser.add_argument(
        "--analyzer",
        choices=("fake", "llm"),
        default="llm",
        help="Analysis engine: the real 'llm' model (default; endpoint/model/key from "
        "ECON_LLM_* env) or the deterministic 'fake' keyword stand-in used offline.",
    )
    parser.add_argument(
        "--analyzer-version",
        default=None,
        help="Analyzer version stamped on each record; bump to reprocess (AC2.6). "
        "Defaults to the chosen analyzer's version.",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    args = _build_parser().parse_args(argv)

    completer: llm.Completer | None = None
    if args.analyzer == "llm":
        version = args.analyzer_version or llm.ANALYZER_VERSION
        try:
            # Build the transport first: a missing key is an operator error, not an
            # analysis outcome, so fail before touching the lake.
            completer = llm.http_completer()
        except llm.ConfigError as exc:
            print(f"analysis[llm]: {exc}", file=sys.stderr)
            return EXIT_CONFIG
    else:
        version = args.analyzer_version or fake_llm.ANALYZER_VERSION

    store = open_store(args.data)
    bronze = store.read_records(domain.BRONZE, domain.DS_NEWS_ITEM)
    # Bodies live once in the content-addressed store; observations resolve by hash (AC1.4, AC1.7).
    body_records = store.read_records(domain.BRONZE, domain.DS_NEWS_BODY)
    bodies = {b["body_hash"]: b["raw_text"] for b in body_records}

    stats: llm.AnalysisStats | None = None
    if completer is not None:
        analyses, stats = llm.run_llm_analysis(bronze, bodies, completer, version)
        if stats.attempted and stats.attempted == stats.failed:
            # Nobody answered: writing now would replace good Silver with an
            # all-unanalyzed batch and blur the AC2.5 signal. Keep what is there.
            print(
                f"analysis[llm]: all {stats.attempted} model calls failed; Silver left unchanged",
                file=sys.stderr,
            )
            print(f"  last error: {stats.last_error}", file=sys.stderr)
            return EXIT_ALL_CALLS_FAILED
    else:
        analyses = [
            asdict(fake_llm.analyze(item, bodies.get(item.get("body_hash") or ""), version))
            for item in bronze
        ]

    written = store.write_records(domain.SILVER, domain.DS_ANALYSIS, analyses)

    unanalyzed = sum(1 for a in analyses if a["analysis_status"] == "unanalyzed")
    low = sum(1 for a in analyses if a["analysis_status"] == "low_confidence")
    target = store.path(domain.SILVER, domain.DS_ANALYSIS)
    print(
        f"analysis[{args.analyzer}]: read {len(bronze)} bronze, "
        f"wrote {written} silver records -> {target}"
    )
    print(f"  analyzer={version} low_confidence={low} unanalyzed={unanalyzed}")
    if stats is not None:
        print(f"  model calls: attempted={stats.attempted} failed={stats.failed}")
        if stats.failed:
            print(f"  last error: {stats.last_error}")
    return 0
