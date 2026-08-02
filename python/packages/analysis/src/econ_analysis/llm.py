"""Real LLM-based analysis of Bronze news into the Silver layer.

Unlike the deterministic keyword stand-in in :mod:`econ_analysis.fake_llm`, this
module implements the *real* analysis mechanism the analysis PRD calls for: each
Bronze observation's title + resolved body is turned into an instruction prompt,
sent to a chat-completions model over a pluggable transport, and the model's
structured JSON reply is parsed into a schema-conformant Silver
:class:`~econ_core.models.Analysis`.

The transport is injected (:class:`Completer`), exactly like the ingestion feed
:class:`~econ_ingestion.feeds.Fetcher`: production wires a real HTTP client
(:func:`http_completer`) while tests drive the identical prompt-build / response-parse
path against a canned completer — the analysis logic is genuinely real, yet fully
deterministic offline.

AC coverage (PRD analysis): the model extracts content-based target countries,
single / multi / GLOBAL (AC2.1); normalized narrative subjects with surface-variant
unification (AC2.2); a 4-way sentiment label, positive / neutral / negative / mixed
(AC2.3); results store to the same normalized Silver schema, multi-values preserved
(AC2.4). When the body is missing or the model is not confident enough, the result is
flagged low-confidence / unanalyzed instead of being forced (AC2.5). Every record
keeps the Bronze tracking key (``record_id`` / ``source_url``) so Silver stays
re-traceable and re-analyzable (AC2.6).

This analyzer is opt-in (``econ-analysis --analyzer llm``); the fake analyzer stays
the default so the cross-language smoke and offline tests remain deterministic and
network-free. Cutting the operational default over to the real model (mirroring the
ingestion feed cutover) is a follow-up slice.
"""

from __future__ import annotations

import json
import os
import urllib.request
from typing import Protocol

from econ_core.models import SENTIMENT_VALUES, Analysis

from econ_analysis.fake_llm import normalize_subject

ANALYZER_VERSION = "llm-v1"

# Shared with the fake analyzer: below this the label is kept but marked low-confidence.
_LOW_CONFIDENCE = 0.6

_SYSTEM_PROMPT = (
    "You analyze one economic news article and reply with ONLY a JSON object, no prose. "
    "Extract, from the article's meaning (not its source): "
    "target_countries (array of country names the article is economically about; "
    'use ["GLOBAL"] for issues not tied to a specific country; may hold several), '
    "narrative_subjects (array of the core subjects — people, firms, institutions, "
    "policies, goods, issues — as normalized canonical names so surface variants unify), "
    "sentiment (exactly one of positive/neutral/negative/mixed; use mixed when opposing "
    "tones coexist and neutral when no tone shows), analyzable (false when the body is too "
    "thin or the judgement is genuinely uncertain), and confidence (0.0-1.0). "
    'Reply shape: {"target_countries":[],"narrative_subjects":[],'
    '"sentiment":"neutral","analyzable":true,"confidence":0.0}'
)


class Completer(Protocol):
    """Transport returning the model's raw reply text for a prompt (or raising)."""

    def __call__(self, system: str, user: str) -> str: ...


class CompletionError(RuntimeError):
    """Raised when the model cannot be reached or returns an unusable reply."""


def http_completer(
    *, base_url: str | None = None, model: str | None = None, timeout: float = 30.0
) -> Completer:
    """Return a real chat-completions transport (stdlib ``urllib``) for production runs.

    Talks to any OpenAI-compatible ``/chat/completions`` endpoint. Endpoint, model and
    key come from the environment so no secret is checked in: ``ECON_LLM_BASE_URL``
    (default ``https://api.openai.com/v1``), ``ECON_LLM_MODEL`` (default ``gpt-4o-mini``)
    and ``ECON_LLM_API_KEY``. Not exercised offline — tests inject a canned completer.
    """
    root = (base_url or os.environ.get("ECON_LLM_BASE_URL") or "https://api.openai.com/v1").rstrip(
        "/"
    )
    name = model or os.environ.get("ECON_LLM_MODEL") or "gpt-4o-mini"

    def _complete(system: str, user: str) -> str:
        key = os.environ.get("ECON_LLM_API_KEY")
        if not key:
            raise CompletionError("ECON_LLM_API_KEY is not set for --analyzer llm")
        payload = json.dumps(
            {
                "model": name,
                "temperature": 0,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
            }
        ).encode("utf-8")
        req = urllib.request.Request(
            f"{root}/chat/completions",
            data=payload,
            headers={
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json",
                "User-Agent": "econ-opinion-monitor/analysis",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                envelope = json.loads(resp.read())
        except Exception as exc:  # transport / decode failure
            raise CompletionError(f"chat completion failed: {exc}") from exc
        try:
            return envelope["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError) as exc:
            raise CompletionError(f"unexpected completion envelope: {exc}") from exc

    return _complete


def build_prompt(item: dict, body: str) -> str:
    """Render the user prompt for one Bronze item — the model sees only title + body."""
    return f"TITLE: {item['title']}\n\nBODY:\n{body}"


def parse_response(text: str) -> dict:
    """Parse the model's reply into a plain dict, tolerating code fences / stray prose.

    Extracts the outermost ``{...}`` span so a fenced or chattily-wrapped reply still
    decodes. Raises :class:`CompletionError` when no JSON object can be recovered.
    """
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end <= start:
        raise CompletionError("model reply carried no JSON object")
    try:
        parsed = json.loads(text[start : end + 1])
    except json.JSONDecodeError as exc:
        raise CompletionError(f"model reply was not valid JSON: {exc}") from exc
    if not isinstance(parsed, dict):
        raise CompletionError("model reply was not a JSON object")
    return parsed


def _clean_list(value: object) -> list[str]:
    """Coerce a model-supplied field into a list of non-empty trimmed strings."""
    if not isinstance(value, list):
        return []
    return [s.strip() for s in value if isinstance(s, str) and s.strip()]


def analyze_llm(
    item: dict,
    body: str | None,
    completer: Completer,
    analyzer_version: str = ANALYZER_VERSION,
) -> Analysis:
    """Analyze one Bronze ``NewsItem`` dict into a Silver ``Analysis`` via a real model.

    Mirrors :func:`econ_analysis.fake_llm.analyze` (same signature and output contract)
    so it is a drop-in analyzer. ``body`` is the raw text resolved from the
    content-addressed store via ``item["body_hash"]`` (AC1.4, AC1.7); ``None`` / empty
    means the body was never captured -> unanalyzed without calling the model (AC2.5).
    A transport failure or an unusable reply also degrades to unanalyzed rather than
    forcing a result (AC2.5), never aborting the batch.
    """
    base = {
        "record_id": item["record_id"],
        "source_url": item["source_url"],
        "analyzed_at": item["collected_at"],
        "analyzer_version": analyzer_version,
    }

    def _unanalyzed() -> Analysis:
        return Analysis(
            target_countries=[],
            narrative_subjects=[],
            sentiment=None,
            analysis_status="unanalyzed",
            confidence=0.0,
            **base,
        )

    body = body or ""
    if not item.get("body_available") or not body:
        # No body -> cannot judge; flag unanalyzed (AC2.5).
        return _unanalyzed()

    try:
        parsed = parse_response(completer(_SYSTEM_PROMPT, build_prompt(item, body)))
    except CompletionError:
        return _unanalyzed()

    sentiment = parsed.get("sentiment")
    if parsed.get("analyzable") is False or sentiment not in SENTIMENT_VALUES:
        # Model declined or gave no usable label -> don't force it (AC2.5).
        return _unanalyzed()

    try:
        confidence = float(parsed.get("confidence", 0.0))
    except (TypeError, ValueError):
        confidence = 0.0
    confidence = min(1.0, max(0.0, confidence))

    # Unify surface variants against the known catalog, keep novel subjects as-is (AC2.2).
    subjects = [normalize_subject(s) or s for s in _clean_list(parsed.get("narrative_subjects"))]
    status = "analyzed" if confidence >= _LOW_CONFIDENCE else "low_confidence"
    return Analysis(
        target_countries=_clean_list(parsed.get("target_countries")),  # AC2.1, multi (AC2.4)
        narrative_subjects=subjects,
        sentiment=sentiment,  # AC2.3
        analysis_status=status,
        confidence=confidence,
        **base,
    )
