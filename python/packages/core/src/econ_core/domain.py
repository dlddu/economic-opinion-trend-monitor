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
DS_SUBJECT_SOURCE_CONTRIBUTION = "subject_source_contribution"
DS_AXIS_SENTIMENT = "axis_sentiment"

#: The fixed categories an article's narrative subjects are filed under. Free-form
#: subjects split one day's articles over hundreds of keys, so a share of any one of
#: them says nothing; aggregation groups on these instead. ``기타`` is the catch-all
#: and must stay last. The list is part of the model prompt: a change reaches new
#: cycles on its own, and history only through a reprocess under a new analyzer version.
SUBJECT_CATEGORIES = (
    "통화정책·금리",
    "환율·외환",
    "물가",
    "경기·성장",
    "고용·노동",
    "주식시장",
    "채권·자금시장",
    "은행·금융업",
    "가상자산",
    "부동산·주택",
    "가계·소비",
    "재정·세금",
    "무역·통상",
    "반도체",
    "자동차·배터리",
    "AI·테크",
    "에너지·원자재",
    "산업·제조",
    "기업 경영·실적",
    "중소기업·자영업",
    "규제·금융당국",
    "지역경제",
    "농림·수산·식품",
    "지정학·국제정세",
    "기타",
)
OTHER_CATEGORY = SUBJECT_CATEGORIES[-1]

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
