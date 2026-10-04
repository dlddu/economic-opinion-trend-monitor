"""A deterministic stand-in for the LLM analysis step."""

from __future__ import annotations

import re

from econ_core.models import Analysis

ANALYZER_VERSION = "fake-v1"

#: AC4.3 no-call reason for every row this analyzer writes: it judges by keyword and
#: reaches no model, so there is no call record to point at.
NO_CALL_KEYWORD_ANALYZER = "keyword_analyzer"

KNOWN_SUBJECTS = [
    "한국은행 기준금리",
    "삼성전자",
    "원/달러 환율",
    "코스피",
    "전기요금",
    "가계부채",
    "SK하이닉스",
    "부동산 PF",
    "Federal Reserve",
    "Nvidia",
    "US CPI",
    "S&P 500",
    "AI 반도체 capex",
    "원유 가격",
    "글로벌 공급망",
]

ALIASES = {
    "samsung": "삼성전자",
    "삼성": "삼성전자",
    "fed": "Federal Reserve",
    "기준금리": "한국은행 기준금리",
    "환율": "원/달러 환율",
}

_TONE_RE = re.compile(r"tone=(\w+)")
_COUNTRIES_RE = re.compile(r"대상국=([^.]+)")
_VALID_TONES = {"positive", "neutral", "negative", "mixed"}
_LOW_CONFIDENCE = 0.6


def normalize_subject(text: str) -> str | None:
    """Map a surface form to a canonical subject key, or ``None`` if unknown."""
    lowered = text.lower()
    for alias, canonical in ALIASES.items():
        if alias in lowered:
            return canonical
    for subject in KNOWN_SUBJECTS:
        if subject.lower() in lowered:
            return subject
    return None


def extract_subjects(title: str) -> list[str]:
    found: list[str] = []
    subject = normalize_subject(title)
    if subject and subject not in found:
        found.append(subject)
    return found


def _parse_tone(body: str) -> str | None:
    match = _TONE_RE.search(body)
    if match and match.group(1) in _VALID_TONES:
        return match.group(1)
    return None


def _parse_countries(body: str) -> list[str]:
    match = _COUNTRIES_RE.search(body)
    if not match:
        return []
    return [c.strip() for c in match.group(1).split(",") if c.strip()]


def analyze(
    item: dict,
    body: str | None,
    analyzer_version: str = ANALYZER_VERSION,
    run_id: str = "",
) -> Analysis:
    """Analyze one Bronze ``NewsItem`` dict into a Silver ``Analysis``."""
    subjects = extract_subjects(item["title"])
    base = {
        "record_id": item["record_id"],
        "source_url": item["source_url"],
        "narrative_subjects": subjects,
        "analyzed_at": item["collected_at"],
        "analyzer_version": analyzer_version,
        "run_id": run_id,
        "no_call_reason": NO_CALL_KEYWORD_ANALYZER,
    }

    body = body or ""
    if not item.get("body_available") or not body:
        return Analysis(
            target_countries=[],
            sentiment=None,
            analysis_status="unanalyzed",
            confidence=0.0,
            **base,
        )

    tone = _parse_tone(body)
    countries = _parse_countries(body)
    if tone is None:
        return Analysis(
            target_countries=countries,
            sentiment=None,
            analysis_status="unanalyzed",
            confidence=0.0,
            **base,
        )

    confidence = 0.55 if tone == "mixed" else 0.92
    status = "analyzed" if confidence >= _LOW_CONFIDENCE else "low_confidence"
    return Analysis(
        target_countries=countries,
        sentiment=tone,
        analysis_status=status,
        confidence=confidence,
        **base,
    )
