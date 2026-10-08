"""``econ-analysis`` CLI — enrich Bronze into the Silver layer.

Silver keeps one row per ``(record_id, analyzer_version)`` (:mod:`econ_core.silver`).
A whole-lake run — no scope arguments, the hourly pipeline — analyzes every Bronze
record not yet settled at the target version and *updates* Silver in place (AC2.6: the
re-analysed batch carries the new version, tracking keys intact), retiring the versions
it supersedes except the one a recorded publish decision serves. Bronze keeps every
cycle, so "settled" is what keeps the hourly run proportional to the new cycle rather
than to the whole history: every row at the target version is settled — including an
``unanalyzed`` one, since no body or a declining model is the verdict — except the rows
a failed model call left behind (:func:`econ_core.silver.pending_retries`), which are
retried next run, and the rows written before AC4.3 that name no ``run_id``, which are
analyzed again so they gain their run and call links — through the reply cache, so while
the prompt is unchanged this replays the stored reply rather than calling the model.
Re-analysing history is therefore a version bump, never a prompt or
model change alone.

A *scoped* run (``--since``/``--axis``/``--source``/``--sample``) lands its rows
*beside* the existing versions instead of updating them — that coexistence is what
the reprocess console compares and what a rollback returns to.

The real analyzer never lets an operator error masquerade as analysis output, because
``unanalyzed`` is a data-quality signal downstream aggregation separates on (AC2.5,
AC3.4).
"""

from __future__ import annotations

import argparse
import random
import sys
from dataclasses import asdict, dataclass, field
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


@dataclass
class _Tally:
    """What a run did, summed over the cycles it visited or found settled."""

    bronze: int = 0
    selected: int = 0
    skipped: int = 0
    not_sampled: int = 0
    written: int = 0
    low: int = 0
    unanalyzed: int = 0
    relinked: int = 0
    silver_rows: int = 0
    pruned: int = 0


@dataclass
class _Replies:
    """The reply cache, read from the lake only once a cycle actually needs the model."""

    cache: dict[str, str] = field(default_factory=dict)
    origins: dict[str, str] = field(default_factory=dict)
    loaded: bool = False

    def load(self, store: LakeStore) -> None:
        if self.loaded:
            return
        for row in store.iter_records(domain.SILVER, domain.DS_ANALYSIS_CACHE):
            self.cache[row["cache_key"]] = row["reply"]
            if row.get("call_id"):
                self.origins[row["cache_key"]] = row["call_id"]
        self.loaded = True


def _sample_ids(
    store: LakeStore, args: argparse.Namespace, version: str, retry: set[str]
) -> set[str]:
    """The records a ``--sample`` run analyzes, drawn over the whole selection.

    Candidates are listed in the order a whole-lake read would have produced them, so
    the seeded draw picks the same records it did before runs went cycle by cycle.
    """
    candidates: list[tuple[str, str]] = []
    for partition in store.partitions(domain.BRONZE, domain.DS_NEWS_ITEM):
        at_version = [
            r
            for r in store.read_partition(domain.SILVER, domain.DS_ANALYSIS, partition)
            if r["analyzer_version"] == version
        ]
        unlinked = {r["record_id"] for r in at_version if not r.get("run_id")}
        done = {r["record_id"] for r in at_version} - retry - unlinked
        bronze = store.read_partition(domain.BRONZE, domain.DS_NEWS_ITEM, partition)
        candidates.extend(
            (item["record_id"], item["collected_at"])
            for item in _select_scope(bronze, args)
            if item["record_id"] not in done
        )
    picked = _take_sample(
        [{"record_id": rid, "collected_at": at} for rid, at in candidates],
        args.sample,
        args.sample_mode,
        f"{version}|{args.since}",
    )
    return {item["record_id"] for item in picked}


@dataclass
class _Cycle:
    """A visited cycle whose records may still be waiting in a batch."""

    partition: dict[str, str]
    cycle: str
    present: set[str]
    bronze_count: int
    unlinked: set[str]
    waiting: int
    failed: bool = False


class _Analysis:
    """One run over the lake, a visited cycle at a time.

    Batches still fill to ``--batch-size`` across cycle boundaries, in lake order: a
    batch that ends at a cycle edge can hold nothing but that cycle's known-bad retries,
    and the all-calls-failed guard would read it as an outage.
    """

    def __init__(
        self,
        args: argparse.Namespace,
        store: LakeStore,
        version: str,
        completer: llm.Completer | None,
        run_id: str,
        stage: runlog.StageReport,
    ) -> None:
        self.args = args
        self.store = store
        self.version = version
        self.completer = completer
        self.run_id = run_id
        self.stage = stage
        self.scoped = _scoped(args)
        self.retry = silver.pending_retries(store, version)
        self.keep_versions = (
            () if self.scoped else tuple(v for v in (silver.serving_version(store),) if v)
        )
        self.stats = llm.AnalysisStats() if completer is not None else None
        self.replies = _Replies()
        self.tally = _Tally()
        self.pending: list[tuple[dict, _Cycle]] = []

    def visit(
        self,
        partition: dict[str, str],
        cycle: str,
        stale_retries: bool,
        chosen: set[str] | None,
        *,
        count_only: bool = False,
    ) -> int:
        """Select the cycle's records and queue them; ``count_only`` books the selection
        and leaves the lake untouched (the cycles a stopped run never reached)."""
        store, tally = self.store, self.tally
        bronze = store.read_partition(domain.BRONZE, domain.DS_NEWS_ITEM, partition)
        present = {item["record_id"] for item in bronze}
        tally.bronze += len(bronze)

        rows = store.read_partition(domain.SILVER, domain.DS_ANALYSIS, partition)
        kept = [r for r in rows if r["record_id"] in present]
        if len(kept) != len(rows) and not count_only:
            store.write_partition(domain.SILVER, domain.DS_ANALYSIS, partition, kept)
            tally.pruned += len(rows) - len(kept)
        at_version = [r for r in kept if r["analyzer_version"] == self.version]
        unlinked = {r["record_id"] for r in at_version if not r.get("run_id")}
        done = {r["record_id"] for r in at_version} - self.retry - unlinked
        del rows, kept, at_version

        todo = _select_scope(bronze, self.args) if self.scoped else bronze
        selected = len(todo)
        todo = [item for item in todo if item["record_id"] not in done]
        tally.selected += selected
        tally.skipped += selected - len(todo)
        if chosen is not None:
            before_sample = len(todo)
            todo = [item for item in todo if item["record_id"] in chosen]
            tally.not_sampled += before_sample - len(todo)
        if count_only:
            return 0

        visited = _Cycle(partition, cycle, present, len(bronze), unlinked, len(todo))
        if not todo:
            if stale_retries:
                silver.record_retries(store, cycle, present, self.version, [], [])
            self._settle(visited)
            return 0
        self.pending.extend((item, visited) for item in todo)
        while len(self.pending) >= max(1, self.args.batch_size):
            code = self.flush()
            if code:
                return code
        return 0

    def flush(self) -> int:
        """Analyze and write the next batch of waiting records."""
        store, tally, version = self.store, self.tally, self.version
        size = max(1, self.args.batch_size)
        taken, self.pending = self.pending[:size], self.pending[size:]
        batch = [item for item, _ in taken]

        bodies: dict[str, str] = {}
        for item in batch:
            key = item["body_hash"]
            if key and key not in bodies:
                body = store.get_object(domain.BRONZE, domain.DS_NEWS_BODY, "body_hash", key)
                if body is not None:
                    bodies[key] = body["raw_text"]

        failed_ids: list[str] = []
        if self.completer is not None:
            self.replies.load(store)
            batch_calls: list[dict] = []
            rows, batch_stats, new_replies = llm.run_llm_analysis(
                batch,
                bodies,
                self.completer,
                version,
                self.replies.cache,
                calls=batch_calls,
                reply_origins=self.replies.origins,
                run_id=self.run_id,
            )
            # Keep what the model did answer even if the batch as a whole fails below.
            store.merge_records(domain.SILVER, domain.DS_ANALYSIS_CACHE, "cache_key", new_replies)
            # Must stay ahead of the all-calls-failed exit below (AC4.2).
            for call in batch_calls:
                calllog.record_call(store, call)
            self.replies.origins.update(
                {r["cache_key"]: r["call_id"] for r in new_replies if r.get("call_id")}
            )
            stats = self.stats
            assert stats is not None
            stats.attempted += batch_stats.attempted
            stats.failed += batch_stats.failed
            stats.reused += batch_stats.reused
            stats.last_error = batch_stats.last_error or stats.last_error
            failed_ids = batch_stats.failed_ids
            _book_outcomes(self.stage, rows, failed_ids, batch_stats.reused_ids)
            if batch_stats.attempted and batch_stats.attempted == batch_stats.failed:
                # Nobody answered: writing now would stamp an all-unanalyzed batch and
                # blur the AC2.5 signal. Keep the checkpoint and stop here.
                print(
                    f"analysis[llm]: all {batch_stats.attempted} model calls failed; "
                    f"stopped after {tally.written} records, Silver checkpoint kept",
                    file=sys.stderr,
                )
                print(f"  last error: {batch_stats.last_error}", file=sys.stderr)
                self.stage.output_count = tally.written
                self.stage.fail(
                    f"all {batch_stats.attempted} model calls failed; "
                    f"last error: {batch_stats.last_error}"
                )
                return EXIT_ALL_CALLS_FAILED
        else:
            rows = [
                asdict(
                    fake_llm.analyze(
                        item, bodies.get(item.get("body_hash") or ""), version, self.run_id
                    )
                )
                for item in batch
            ]
            _book_outcomes(self.stage, rows, [], [])

        in_batch = list({id(c): c for _, c in taken}.values())
        cycles = {rid: c.cycle for c in in_batch for rid in c.present}
        _, dropped = silver.store_analyses(
            store, cycles, rows, coexist=self.scoped, keep_versions=self.keep_versions
        )
        tally.pruned += dropped
        tally.written += len(rows)
        tally.low += sum(1 for r in rows if r["analysis_status"] == "low_confidence")
        tally.unanalyzed += sum(1 for r in rows if r["analysis_status"] == "unanalyzed")
        failed = set(failed_ids)
        for visited in in_batch:
            analyzed = [item["record_id"] for item, c in taken if c is visited]
            mine_failed = failed.intersection(analyzed)
            silver.record_retries(
                store, visited.cycle, visited.present, version, analyzed, mine_failed
            )
            tally.relinked += len(visited.unlinked.intersection(analyzed))
            visited.failed = visited.failed or bool(mine_failed)
            visited.waiting -= len(analyzed)
            if visited.waiting == 0:
                self._settle(visited)
        return 0

    def _settle(self, visited: _Cycle) -> None:
        rows = len(self.store.read_partition(domain.SILVER, domain.DS_ANALYSIS, visited.partition))
        self.tally.silver_rows += rows
        if not self.scoped:
            silver.mark_settled(
                self.store,
                self.version,
                visited.cycle,
                settled=not visited.failed,
                bronze_count=visited.bronze_count,
                silver_count=rows,
            )


def _analyze(
    args: argparse.Namespace,
    store: LakeStore,
    version: str,
    completer: llm.Completer | None,
    run_id: str,
    stage: runlog.StageReport,
) -> int:
    """Analyze Bronze one collection cycle at a time.

    Memory is bounded by the cycles a batch spans rather than by the lake. A whole-lake
    run also skips every cycle still settled at ``version`` (:func:`econ_core.silver.
    still_settled`) without reading it, so the hourly run touches the new cycle, the
    cycles with pending retries and any cycle whose partitions were rewritten since.
    """
    migrated = silver.migrate_legacy(store, silver.BronzeCycles(store))
    if migrated:
        print(f"analysis: migrated {migrated} legacy silver rows into cycle partitions")

    run = _Analysis(args, store, version, completer, run_id, stage)
    scoped, tally = run.scoped, run.tally
    settled = {} if scoped else silver.read_settled(store, version)
    retry_cycles = set() if scoped else silver.pending_retry_cycles(store, version)
    chosen = _sample_ids(store, args, version, run.retry) if scoped and args.sample else None
    seen: set[tuple[tuple[str, str], ...]] = set()
    if scoped:
        stage.count("skipped_not_sampled", 0)
    stage.count("skipped_settled", 0)

    code = 0
    for partition in store.partitions(domain.BRONZE, domain.DS_NEWS_ITEM):
        seen.add(tuple(partition.items()))
        cycle = domain.partition_cycle(partition)
        mark = settled.get(cycle)
        if cycle not in retry_cycles and silver.still_settled(store, mark, partition):
            tally.bronze += mark["bronze_count"]
            tally.selected += mark["bronze_count"]
            tally.skipped += mark["bronze_count"]
            tally.silver_rows += mark["silver_count"]
            continue
        if code:
            run.visit(partition, cycle, cycle in retry_cycles, chosen, count_only=True)
        else:
            code = run.visit(partition, cycle, cycle in retry_cycles, chosen)
    while run.pending and not code:
        code = run.flush()
    if scoped:
        stage.count("skipped_not_sampled", tally.not_sampled)
    stage.input_count = tally.selected
    stage.count("skipped_settled", tally.skipped)
    if code:
        return code

    for partition in store.partitions(domain.SILVER, domain.DS_ANALYSIS):
        if tuple(partition.items()) in seen:
            continue
        rows = store.read_partition(domain.SILVER, domain.DS_ANALYSIS, partition)
        if store.partition_signature(domain.BRONZE, domain.DS_NEWS_ITEM, partition) is None:
            if rows:
                store.write_partition(domain.SILVER, domain.DS_ANALYSIS, partition, [])
                tally.pruned += len(rows)
        else:
            tally.silver_rows += len(rows)

    stats = run.stats
    target = store.dataset_dir(domain.SILVER, domain.DS_ANALYSIS)
    print(
        f"analysis[{args.analyzer}]: read {tally.bronze} bronze, "
        f"wrote {tally.written} silver records -> {target}"
    )
    print(f"  analyzer={version} low_confidence={tally.low} unanalyzed={tally.unanalyzed}")
    print(
        f"  silver now {tally.silver_rows} rows "
        f"({'coexisting' if scoped else 'in place'}, pruned={tally.pruned})"
    )
    if not scoped:
        print(f"  settled_already_at_version={tally.skipped}")
    if tally.relinked:
        print(f"  relinked_unlinked_rows={tally.relinked}")
    if scoped:
        print(
            f"  scope: since={args.since or '-'} axis={args.axis or '-'} "
            f"source={args.source or '-'} sample={args.sample or 0}/{args.sample_mode} "
            f"skipped_already_at_version={tally.skipped}"
        )
    if stats is not None:
        print(
            f"  model calls: attempted={stats.attempted} failed={stats.failed} "
            f"reused={stats.reused}"
        )
        if stats.failed:
            print(f"  last error: {stats.last_error}")
    stage.output_count = tally.written
    print(f"  run={run_id} stage=analysis")
    return 0
