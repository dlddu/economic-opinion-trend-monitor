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
DS_ANALYSIS_CACHE = "analysis_cache"  # silver  -> model replies keyed by prompt (not a contract)
DS_REPROCESS_DECISION = "reprocess_decision"  # silver -> publish/rollback log (not a contract)
DS_SUBJECT_TREND = "subject_trend"  # gold    -> models.SubjectTrend
DS_AXIS_SENTIMENT = "axis_sentiment"  # gold    -> models.AxisSentiment

#: Collection cycle id format; the default cycle is the current UTC hour.
CYCLE_FORMAT = "%Y-%m-%dT%H:%M"

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

    Exactness matters because the cycle names its Bronze partition: two spellings
    of one instant (``T9:00`` / ``T09:00``) would land as two parts of one cycle.
    """
    at = datetime.strptime(cycle, CYCLE_FORMAT)
    if at.strftime(CYCLE_FORMAT) != cycle:
        raise ValueError(f"cycle {cycle!r} is not in {CYCLE_FORMAT} form")
    return at


def news_item_partition(cycle: str) -> tuple[dict[str, str], str]:
    """``(partition, part)`` holding one collection cycle's ``news_item`` observations.

    One part per cycle under a ``collection_date`` partition: re-running a cycle
    replaces exactly its own part (idempotent per cycle, AC1.1), and every earlier
    cycle stays readable for reprocessing and lineage (AC2.6).
    """
    at = parse_cycle(cycle)
    return {"collection_date": at.strftime("%Y-%m-%d")}, at.strftime("%Y-%m-%dT%H%M")
