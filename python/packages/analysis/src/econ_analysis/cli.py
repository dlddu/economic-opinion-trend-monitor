"""``econ-analysis`` CLI — enrich Bronze into the Silver layer.

Two analyzers share the identical Silver output path (``analysis``): the deterministic
``fake`` keyword stand-in (the default — keeps the cross-language smoke and offline
tests pinned and network-free) and the real ``llm`` analyzer (``--analyzer llm``) that
sends each item to a chat-completions model, with endpoint/model/key read from the
``ECON_LLM_*`` environment. Cutting the operational default over to the real model
(mirroring the ingestion feed cutover) remains a follow-up.
"""

from __future__ import annotations

import argparse
from dataclasses import asdict
from functools import partial
from pathlib import Path

from econ_core import domain, open_store

from econ_analysis import fake_llm, llm


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
        default="fake",
        help="Analysis engine: deterministic 'fake' keyword stand-in (default, offline) "
        "or the real 'llm' model (opt-in; endpoint/model/key from ECON_LLM_* env).",
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

    if args.analyzer == "llm":
        version = args.analyzer_version or llm.ANALYZER_VERSION
        analyze = partial(llm.analyze_llm, completer=llm.http_completer(), analyzer_version=version)
    else:
        version = args.analyzer_version or fake_llm.ANALYZER_VERSION
        analyze = partial(fake_llm.analyze, analyzer_version=version)

    store = open_store(args.data)
    bronze = store.read_records(domain.BRONZE, domain.DS_NEWS_ITEM)
    # Bodies live once in the content-addressed store; observations resolve by hash (AC1.4, AC1.7).
    body_records = store.read_records(domain.BRONZE, domain.DS_NEWS_BODY)
    bodies = {b["body_hash"]: b["raw_text"] for b in body_records}
    analyses = [asdict(analyze(item, bodies.get(item.get("body_hash") or ""))) for item in bronze]
    written = store.write_records(domain.SILVER, domain.DS_ANALYSIS, analyses)

    unanalyzed = sum(1 for a in analyses if a["analysis_status"] == "unanalyzed")
    low = sum(1 for a in analyses if a["analysis_status"] == "low_confidence")
    target = store.path(domain.SILVER, domain.DS_ANALYSIS)
    print(
        f"analysis[{args.analyzer}]: read {len(bronze)} bronze, "
        f"wrote {written} silver records -> {target}"
    )
    print(f"  analyzer={version} low_confidence={low} unanalyzed={unanalyzed}")
    return 0
