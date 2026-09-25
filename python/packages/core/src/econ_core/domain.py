"""Shared domain constants and data-lake path helpers.

Layer names and dataset (file) names live here so producers and consumers agree
on where records land. Field-level types come from the generated
``econ_core.models`` package (single source: ``contracts/``).
"""

from __future__ import annotations

import hashlib
import os
from datetime import datetime
from pathlib import Path

# Medallion layers.
BRONZE = "bronze"
SILVER = "silver"
GOLD = "gold"

# Dataset (file) names within each layer — one dataset per generated record type.
DS_NEWS_ITEM = "news_item"  # bronze  -> models.NewsItem
DS_NEWS_BODY = "news_body"  # bronze  -> models.NewsBody (content-addressed bodies)
DS_ANALYSIS = "analysis"  # silver  -> models.Analysis
DS_ANALYSIS_CACHE = "analysis_cache"  # silver  -> reply index sparing a re-call (not a contract)
DS_ANALYSIS_RETRY = "analysis_retry"  # silver  -> records whose model call failed (not a contract)
DS_REPROCESS_DECISION = "reprocess_decision"  # silver -> publish/rollback log (not a contract)
DS_PIPELINE_RUN = "pipeline_run"  # silver  -> models.PipelineRun (batch run log, AC4.1)
DS_LLM_CALL = "llm_call"  # silver  -> models.LlmCallRecord (per-article model call, AC4.2)
DS_SUBJECT_TREND = "subject_trend"  # gold    -> models.SubjectTrend
DS_AXIS_SENTIMENT = "axis_sentiment"  # gold    -> models.AxisSentiment

#: Collection cycle id format — one cycle per UTC hour.
CYCLE_FORMAT = "%Y-%m-%dT%H:00"

# Environment override for the local lake root.
ENV_DATA_ROOT = "ECON_DATA_ROOT"


def body_hash(raw_text: str) -> str:
    """Content address of a captured body: SHA-256 hex over its exact UTF-8 bytes.

    Bronze stores bodies unprocessed, so no normalization happens here (that is
    Silver's job). Identical bodies — across cycles or across sources — collapse
    to one key; any edit yields a new key, so edited bodies land as separate,
    append-only versions (AC1.7). ``news_item.body_hash`` resolves into the
    ``news_body`` dataset through this function's output.
    """
    return hashlib.sha256(raw_text.encode("utf-8")).hexdigest()


def default_data_root() -> Path:
    """Resolve the local data-lake root.

    Honors ``$ECON_DATA_ROOT``; otherwise walks up from the current directory to
    the repo root (the directory containing both ``Makefile`` and ``data/``) so
    the batch CLIs write to the same lake regardless of where they are invoked.
    """
    env = os.environ.get(ENV_DATA_ROOT)
    if env:
        return Path(env)
    cur = Path.cwd().resolve()
    for d in (cur, *cur.parents):
        if (d / "Makefile").exists() and (d / "data").is_dir():
            return d / "data"
    return cur / "data"


def parse_cycle(cycle: str) -> datetime:
    """Parse a collection cycle id, rejecting anything that is not exactly ``CYCLE_FORMAT``.

    Exactness matters because the cycle names its partition: two spellings of one
    hour (``T9:00`` / ``T09:00``) would otherwise land as two partitions of one cycle.
    """
    at = datetime.strptime(cycle, CYCLE_FORMAT)
    if at.strftime(CYCLE_FORMAT) != cycle:
        raise ValueError(f"cycle {cycle!r} is not in {CYCLE_FORMAT} form")
    return at


def cycle_partition(cycle: str) -> dict[str, str]:
    """The ``year=/month=/day=/hour=`` partition holding one collection cycle.

    Bronze ``news_item`` and Silver ``analysis`` share it — a Silver row lives in the
    partition of the observation it analyzes, not of the hour it was analyzed in, so
    a cycle's Bronze and Silver sit side by side and re-analysing history rewrites
    history's partitions rather than piling into the current hour.
    """
    at = parse_cycle(cycle)
    return {
        "year": at.strftime("%Y"),
        "month": at.strftime("%m"),
        "day": at.strftime("%d"),
        "hour": at.strftime("%H"),
    }
