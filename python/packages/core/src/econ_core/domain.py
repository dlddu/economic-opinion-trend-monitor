"""Shared domain constants and data-lake path helpers.

Layer names and dataset (file) names live here so producers and consumers agree
on where records land. Field-level types come from the generated
``econ_core.models`` package (single source: ``contracts/``).
"""

from __future__ import annotations

import os
from pathlib import Path

# Medallion layers.
BRONZE = "bronze"
SILVER = "silver"
GOLD = "gold"

# Dataset (file) names within each layer — one dataset per generated record type.
DS_NEWS_ITEM = "news_item"  # bronze  -> models.NewsItem
DS_ANALYSIS = "analysis"  # silver  -> models.Analysis
DS_SUBJECT_TREND = "subject_trend"  # gold    -> models.SubjectTrend
DS_AXIS_SENTIMENT = "axis_sentiment"  # gold    -> models.AxisSentiment

# Environment override for the local lake root.
ENV_DATA_ROOT = "ECON_DATA_ROOT"


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
