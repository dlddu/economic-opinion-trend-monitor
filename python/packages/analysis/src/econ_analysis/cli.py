"""``econ-analysis`` CLI — enrich Bronze into the Silver layer.

Two analyzers share the identical Silver output path (``analysis``): the real ``llm``
analyzer (the operational default) that sends each item to a chat-completions model,
with endpoint/model/key read from the ``ECON_LLM_*`` environment, and the deterministic
``fake`` keyword stand-in (``--analyzer fake``) that keeps the cross-language smoke and
offline tests network-free. The default was cut over to the real model once the
analyzer had landed and been exercised, mirroring the ingestion feed cutover.

Silver keeps one row per ``(record_id, analyzer_version)`` (:mod:`econ_core.silver`).
A whole-lake run — no scope arguments, the hourly pipeline — analyzes every Bronze
record not yet settled at the target version and *updates* Silver in place (AC2.6: the
re-analysed batch carries the new version, tracking keys intact), retiring the versions
it supersedes except the one a recorded publish decision serves. Bronze keeps every
cycle, so "settled" is what keeps the hourly run proportional to the new cycle rather
than to the whole history: every row at the target version is settled — including an
``unanalyzed`` one, since no body or a declining model is the verdict — except the rows
a failed model call left behind (:func:`econ_core.silver.pending_retries`), which are
retried next run. Re-analysing history is therefore a version bump, never a prompt or
model change alone.

A *scoped* run (``--since``/``--axis``/``--source``/``--sample``) is the reprocess
path of JRN-logic-backfill: it analyzes only the selected Bronze, lands its rows
*beside* the existing versions (that coexistence is what the console compares and
what a rollback returns to), skips records already at the target version, and writes
after every ``--batch-size`` records, so an interrupted run resumes from its
checkpoint instead of starting over.

The real analyzer never lets an operator error masquerade as analysis output, because
``unanalyzed`` is a data-quality signal downstream aggregation separates on (AC2.5,
AC3.4). Two guards, two exit codes: an incomplete ``ECON_LLM_*`` environment aborts
before Bronze is even read (:data:`EXIT_CONFIG`), and a batch whose every model call
failed is not written and stops the run (:data:`EXIT_ALL_CALLS_FAILED`), leaving the
Silver written so far intact.
"""

from __future__ import annotations

import argparse
import random
import sys
from dataclasses import asdict
from datetime import datetime
from pathlib import Path

from econ_core import LakeStore, calllog, domain, open_store, runlog, silver

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
    scope = parser.add_argument_group("reprocess scope (JRN-logic-backfill)")
    scope.add_argument(
        "--since",
        default=None,
        help="Only Bronze collected at or after this RFC 3339 instant.",
    )
    scope.add_argument("--axis", default=None, help="Only Bronze of this axis (KR/US/GLOBAL).")
    scope.add_argument("--source", default=None, help="Only Bronze from this source_id.")
    scope.add_argument(
        "--sample",
        type=int,
        default=0,
        help="Analyze at most this many of the selected records (0 = all): the dry run "
        "before a full reprocess.",
    )
    scope.add_argument(
        "--sample-mode",
        choices=("random", "recent"),
        default="random",
        help="Which records a --sample takes: a seeded random draw, or the most "
        "recently collected first.",
    )
    scope.add_argument(
        "--batch-size",
        type=int,
        default=100,
        help="Records analyzed between two Silver checkpoints.",
    )
    parser.add_argument(
        "--run-id",
        default=None,
        help="Batch run this analysis belongs to (AC4.1); defaults to $ECON_RUN_ID, "
        "or a fresh id when this CLI runs outside a pipeline.",
    )
    return parser


def _scoped(args: argparse.Namespace) -> bool:
    return any((args.since, args.axis, args.source, args.sample))


def _select_scope(bronze: list[dict], args: argparse.Namespace) -> list[dict]:
    since = datetime.fromisoformat(args.since) if args.since else None
    selected = []
    for item in bronze:
        if args.axis and item["axis"] != args.axis:
            continue
        if args.source and item["source_id"] != args.source:
            continue
        if since is not None and datetime.fromisoformat(item["collected_at"]) < since:
            continue
        selected.append(item)
    return selected


def _take_sample(items: list[dict], size: int, mode: str, seed: str) -> list[dict]:
    if size <= 0 or size >= len(items):
        return items
    if mode == "recent":
        return sorted(items, key=lambda i: i["collected_at"], reverse=True)[:size]
    # Seeded by the run's own identity so a resumed sample draws the same records.
    return random.Random(seed).sample(items, size)


def _batches(items: list[dict], size: int) -> list[list[dict]]:
    size = max(1, size)
    return [items[i : i + size] for i in range(0, len(items), size)]


def _book_outcomes(
    stage: runlog.StageReport, rows: list[dict], failed_ids: list[str], reused_ids: list[str]
) -> None:
    """Book each analyzed record under exactly one AC4.1 outcome.

    The buckets have to partition the input, so the order matters: a failed model call
    leaves an ``unanalyzed`` row that is an outage rather than a judgement, and a reused
    reply produces a real label without a call. Checking failure first, then reuse, then
    the row's own status keeps one record in one bucket.
    """
    failed = set(failed_ids)
    reused = set(reused_ids)
    for row in rows:
        if row["record_id"] in failed:
            stage.count("call_failed")
        elif row["record_id"] in reused:
            stage.count("reused")
        else:
            stage.count(row["analysis_status"])


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
    run_id = runlog.resolve_run_id(args.run_id)
    trigger = runlog.REPROCESS if _scoped(args) else runlog.SCHEDULED
    with runlog.run_stage(store, run_id, runlog.ANALYSIS, trigger=trigger) as stage:
        return _analyze(args, store, version, completer, run_id, stage)


def _analyze(
    args: argparse.Namespace,
    store: LakeStore,
    version: str,
    completer: llm.Completer | None,
    run_id: str,
    stage: runlog.StageReport,
) -> int:
    bronze = store.read_partitions(domain.BRONZE, domain.DS_NEWS_ITEM)
    cycles = silver.cycles_of(bronze)
    migrated = silver.migrate_legacy(store, cycles)
    if migrated:
        print(f"analysis: migrated {migrated} legacy silver rows into cycle partitions")

    scoped = _scoped(args)
    retry = silver.pending_retries(store, version)
    done = {
        row["record_id"]
        for row in silver.read_analyses(store)
        if row["analyzer_version"] == version and row["record_id"] not in retry
    }
    todo = _select_scope(bronze, args) if scoped else list(bronze)
    selected = len(todo)
    todo = [item for item in todo if item["record_id"] not in done]
    skipped = selected - len(todo)
    if scoped:
        before_sample = len(todo)
        todo = _take_sample(todo, args.sample, args.sample_mode, f"{version}|{args.since}")
        stage.count("skipped_not_sampled", before_sample - len(todo))
    stage.input_count = selected
    stage.count("skipped_settled", skipped)

    bodies: dict[str, str] = {}
    for item in todo:
        key = item["body_hash"]
        if key and key not in bodies:
            body = store.get_object(domain.BRONZE, domain.DS_NEWS_BODY, "body_hash", key)
            if body is not None:
                bodies[key] = body["raw_text"]

    stats = llm.AnalysisStats() if completer is not None else None
    reply_cache: dict[str, str] = {}
    reply_origins: dict[str, str] = {}
    if completer is not None:
        cached_replies = store.read_records(domain.SILVER, domain.DS_ANALYSIS_CACHE)
        reply_cache = {r["cache_key"]: r["reply"] for r in cached_replies}
        reply_origins = {r["cache_key"]: r["call_id"] for r in cached_replies if r.get("call_id")}

    keep_versions = () if scoped else tuple(v for v in (silver.serving_version(store),) if v)
    analyses: list[dict] = []
    written = pruned = 0
    for batch in _batches(todo, args.batch_size):
        failed_ids: list[str] = []
        if completer is not None:
            batch_calls: list[dict] = []
            rows, batch_stats, new_replies = llm.run_llm_analysis(
                batch,
                bodies,
                completer,
                version,
                reply_cache,
                calls=batch_calls,
                reply_origins=reply_origins,
                run_id=run_id,
            )
            # Keep what the model did answer even if the batch as a whole fails below.
            store.merge_records(domain.SILVER, domain.DS_ANALYSIS_CACHE, "cache_key", new_replies)
            # Must stay ahead of the all-calls-failed exit below (AC4.2).
            for call in batch_calls:
                calllog.record_call(store, call)
            reply_origins.update(
                {r["cache_key"]: r["call_id"] for r in new_replies if r.get("call_id")}
            )
            assert stats is not None
            stats.attempted += batch_stats.attempted
            stats.failed += batch_stats.failed
            stats.reused += batch_stats.reused
            stats.last_error = batch_stats.last_error or stats.last_error
            failed_ids = batch_stats.failed_ids
            _book_outcomes(stage, rows, failed_ids, batch_stats.reused_ids)
            if batch_stats.attempted and batch_stats.attempted == batch_stats.failed:
                # Nobody answered: writing now would stamp an all-unanalyzed batch and
                # blur the AC2.5 signal. Keep the checkpoint and stop here.
                print(
                    f"analysis[llm]: all {batch_stats.attempted} model calls failed; "
                    f"stopped after {len(analyses)} records, Silver checkpoint kept",
                    file=sys.stderr,
                )
                print(f"  last error: {batch_stats.last_error}", file=sys.stderr)
                stage.output_count = len(analyses)
                stage.fail(
                    f"all {batch_stats.attempted} model calls failed; "
                    f"last error: {batch_stats.last_error}"
                )
                return EXIT_ALL_CALLS_FAILED
        else:
            rows = [
                asdict(fake_llm.analyze(item, bodies.get(item.get("body_hash") or ""), version))
                for item in batch
            ]
            _book_outcomes(stage, rows, [], [])
        _, dropped = silver.store_analyses(
            store, cycles, rows, coexist=scoped, keep_versions=keep_versions
        )
        silver.record_retries(store, cycles, version, [r["record_id"] for r in rows], failed_ids)
        pruned += dropped
        analyses.extend(rows)
    written, orphaned = silver.prune_orphans(store, cycles)
    pruned += orphaned

    unanalyzed = sum(1 for a in analyses if a["analysis_status"] == "unanalyzed")
    low = sum(1 for a in analyses if a["analysis_status"] == "low_confidence")
    target = store.dataset_dir(domain.SILVER, domain.DS_ANALYSIS)
    print(
        f"analysis[{args.analyzer}]: read {len(bronze)} bronze, "
        f"wrote {len(analyses)} silver records -> {target}"
    )
    print(f"  analyzer={version} low_confidence={low} unanalyzed={unanalyzed}")
    print(
        f"  silver now {written} rows ({'coexisting' if scoped else 'in place'}, pruned={pruned})"
    )
    if not scoped:
        print(f"  settled_already_at_version={skipped}")
    if scoped:
        print(
            f"  scope: since={args.since or '-'} axis={args.axis or '-'} "
            f"source={args.source or '-'} sample={args.sample or 0}/{args.sample_mode} "
            f"skipped_already_at_version={skipped}"
        )
    if stats is not None:
        print(
            f"  model calls: attempted={stats.attempted} failed={stats.failed} "
            f"reused={stats.reused}"
        )
        if stats.failed:
            print(f"  last error: {stats.last_error}")
    stage.output_count = len(analyses)
    print(f"  run={run_id} stage=analysis")
    return 0
