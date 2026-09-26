"""Shared domain constants and data-lake path helpers."""

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
DS_NEWS_ITEM = "news_item"
DS_NEWS_BODY = "news_body"
DS_ANALYSIS = "analysis"
DS_ANALYSIS_CACHE = "analysis_cache"  # not a contract
DS_ANALYSIS_RETRY = "analysis_retry"  # not a contract
DS_REPROCESS_DECISION = "reprocess_decision"  # not a contract
DS_PIPELINE_RUN = "pipeline_run"
DS_LLM_CALL = "llm_call"
DS_SUBJECT_TREND = "subject_trend"
DS_AXIS_SENTIMENT = "axis_sentiment"

#: Collection cycle id format — one cycle per UTC hour.
CYCLE_FORMAT = "%Y-%m-%dT%H:00"

# Environment override for the local lake root.
ENV_DATA_ROOT = "ECON_DATA_ROOT"


def body_hash(raw_text: str) -> str:
    """Content address of a captured body: SHA-256 hex over its exact UTF-8 bytes.

    Bronze stores bodies unprocessed, so no normalization happens here (that is
    Silver's job).
    """
    return hashlib.sha256(raw_text.encode("utf-8")).hexdigest()


def default_data_root() -> Path:
    """Resolve the local data-lake root."""
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
    """The ``year=/month=/day=/hour=`` partition holding one collection cycle."""
    at = parse_cycle(cycle)
    return {
        "year": at.strftime("%Y"),
        "month": at.strftime("%m"),
        "day": at.strftime("%d"),
        "hour": at.strftime("%H"),
    }
