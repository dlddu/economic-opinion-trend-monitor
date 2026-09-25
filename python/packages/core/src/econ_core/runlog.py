"""Batch run and stage records — the lake-side execution log (PRD pipeline-ops, AC4.1).

One :class:`~econ_core.models.PipelineRun` per execution, stored under its ``run_id``
in the ``silver/pipeline_run`` object dataset, carrying one nested ``RunStage`` per
stage the run reached.

**Why the lake and not the scheduler.** The hourly pipeline's three stages are three
Argo steps, i.e. three Pods; the scheduler keeps only the last few runs
(``successfulJobsHistoryLimit``) and Pod logs age out with the node. AC4.1 asks for a
record that outlives both, so each stage folds its own report into the run record on
the shared data volume.

**Why read-modify-write and not append-only rows.** The stages of one run are strictly
sequential — ``ingest -> analyze -> aggregate`` steps of the ``pipeline`` template — so
the only writer of a given run record at a given moment is the stage that is running.
Re-running a stage (Argo ``retryStrategy``) replaces that stage's record rather than
doubling it, which is what keeps the counts readable. Records of *different* runs never
share a file, because the ``run_id`` is the object key.

**The counts are an invariant, not a convention.** AC4.1 requires the per-outcome counts
of a stage to sum to its input count, so :func:`run_stage` enforces it instead of leaving
it to a test: a succeeded stage whose buckets do not add up raises, and a failed stage
that stopped part-way gets the remainder booked as ``not_reached`` so the sum still holds
and the record says plainly how far it got.
"""

from __future__ import annotations

import os
import secrets
import time
from collections.abc import Iterator
from contextlib import contextmanager
from dataclasses import dataclass, field
from datetime import UTC, datetime

from econ_core import domain
from econ_core.storage import LakeStore

#: Environment carrying the run id across the stages of one execution. The batch
#: WorkflowTemplate sets it to ``{{workflow.name}}`` on every step, so the three Pods
#: of one pipeline agree without talking to each other.
ENV_RUN_ID = "ECON_RUN_ID"

#: Outcome booked for the input a failed stage never got to classify.
NOT_REACHED = "not_reached"

RUNNING = "running"
SUCCEEDED = "succeeded"
FAILED = "failed"

SCHEDULED = "scheduled"
REPROCESS = "reprocess"

#: Stage names, in pipeline order.
INGESTION = "ingestion"
ANALYSIS = "analysis"
AGGREGATION = "aggregation"


def _now() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat()


def resolve_run_id(explicit: str | None = None) -> str:
    """The run this process belongs to: ``--run-id`` > ``$ECON_RUN_ID`` > a fresh id.

    A stage run outside any pipeline (a one-off CLI invocation) still gets a record —
    it is its own single-stage run rather than an execution nobody wrote down.
    """
    for candidate in (explicit, os.environ.get(ENV_RUN_ID)):
        if candidate and candidate.strip():
            return candidate.strip()
    return f"run-{datetime.now(UTC).strftime('%Y%m%dT%H%M%S')}Z-{secrets.token_hex(3)}"


@dataclass
class StageReport:
    """What a stage tells the run record about itself.

    ``outcomes`` buckets must be disjoint — every input unit falls into exactly one —
    because AC4.1 reads their sum against ``input_count``.
    """

    input_count: int = 0
    output_count: int = 0
    outcomes: dict[str, int] = field(default_factory=dict)
    source_failures: list[dict[str, str]] = field(default_factory=list)
    failure_reason: str | None = None

    def count(self, outcome: str, n: int = 1) -> None:
        self.outcomes[outcome] = self.outcomes.get(outcome, 0) + n

    def source_failed(self, source_id: str, reason: str) -> None:
        self.source_failures.append({"source_id": source_id, "source_failure_reason": reason})

    def fail(self, reason: str) -> None:
        """Mark the stage failed without raising — the CLI still returns its exit code."""
        self.failure_reason = reason


def _stage_record(
    stage: str, report: StageReport, started_at: str, started_mono: float, failed: bool
) -> dict:
    total = sum(report.outcomes.values())
    outcomes = dict(report.outcomes)
    if total > report.input_count:
        raise ValueError(
            f"stage {stage!r} outcome counts ({total}) exceed input_count "
            f"({report.input_count}); the buckets are not disjoint"
        )
    if total < report.input_count:
        if not failed:
            raise ValueError(
                f"stage {stage!r} outcome counts ({total}) do not add up to input_count "
                f"({report.input_count}) — AC4.1 requires the buckets to partition the input"
            )
        outcomes[NOT_REACHED] = report.input_count - total
    ended_at = _now()
    return {
        "stage_name": stage,
        "stage_status": FAILED if failed else SUCCEEDED,
        "stage_started_at": started_at,
        "stage_ended_at": ended_at,
        "duration_ms": int((time.monotonic() - started_mono) * 1000),
        "input_count": report.input_count,
        "output_count": report.output_count,
        "outcomes": [{"outcome_name": k, "outcome_count": v} for k, v in outcomes.items()],
        "failure_reason": report.failure_reason,
        "source_failures": list(report.source_failures),
    }


def _merge_stage(run: dict, stage: dict) -> dict:
    """Put ``stage`` into ``run``, replacing the same stage's earlier record (a retry)."""
    stages = [s for s in run.get("stages", []) if s["stage_name"] != stage["stage_name"]]
    stages.append(stage)
    run["stages"] = stages
    run["run_status"] = FAILED if any(s["stage_status"] == FAILED for s in stages) else SUCCEEDED
    run["run_ended_at"] = max(s["stage_ended_at"] for s in stages)
    return run


def open_run(store: LakeStore, run_id: str, trigger: str = SCHEDULED) -> dict:
    """Return the run record for ``run_id``, creating it (``running``) if it is new.

    The trigger is set by whichever stage opens the run and never rewritten: for the
    hourly pipeline that is ingestion (``scheduled``), for an operator reprocess the
    analysis or aggregation CLI that starts it (``reprocess``).
    """
    stored = store.get_object(domain.SILVER, domain.DS_PIPELINE_RUN, "run_id", run_id)
    if stored is not None:
        return stored
    run = {
        "run_id": run_id,
        "run_trigger": trigger,
        "run_started_at": _now(),
        "run_ended_at": None,
        "run_status": RUNNING,
        "stages": [],
    }
    store.write_object(domain.SILVER, domain.DS_PIPELINE_RUN, "run_id", run)
    return run


@contextmanager
def run_stage(
    store: LakeStore, run_id: str, stage: str, *, trigger: str = SCHEDULED
) -> Iterator[StageReport]:
    """Record one stage of ``run_id`` — on the way out, whatever happened.

    Yields a :class:`StageReport` the stage fills as it works. The record is written
    when the block leaves, so a stage that raises, or one that calls
    :meth:`StageReport.fail` before returning its exit code, still lands the counts it
    reached (AC4.1: 「중간에 실패·중단된 실행도 그 시점까지의 단계 기록을 남긴다」).
    """
    open_run(store, run_id, trigger)
    report = StageReport()
    started_at = _now()
    started_mono = time.monotonic()
    failed = False
    try:
        yield report
    except BaseException as exc:
        failed = True
        report.failure_reason = report.failure_reason or f"{type(exc).__name__}: {exc}"
        raise
    finally:
        record = _stage_record(
            stage, report, started_at, started_mono, failed or report.failure_reason is not None
        )
        run = store.get_object(domain.SILVER, domain.DS_PIPELINE_RUN, "run_id", run_id) or open_run(
            store, run_id, trigger
        )
        store.write_object(
            domain.SILVER, domain.DS_PIPELINE_RUN, "run_id", _merge_stage(run, record)
        )


def read_run(store: LakeStore, run_id: str) -> dict | None:
    """The run record stored under ``run_id``, or None."""
    return store.get_object(domain.SILVER, domain.DS_PIPELINE_RUN, "run_id", run_id)


def read_runs(store: LakeStore) -> list[dict]:
    """Every run record, ordered by run id."""
    return store.read_objects(domain.SILVER, domain.DS_PIPELINE_RUN)
