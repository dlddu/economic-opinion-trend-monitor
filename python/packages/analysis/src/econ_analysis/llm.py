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
(AC2.4). When the body is missing or the model itself declines to judge, the result is
flagged unanalyzed instead of being forced, and a label the model is unsure of is kept
but marked low-confidence (AC2.5). Every record keeps the Bronze tracking key
(``record_id`` / ``source_url``) so Silver stays re-traceable and re-analyzable (AC2.6).

**Operator error is not an analysis outcome.** ``unanalyzed`` is a data-quality signal
AC2.5 defines and AC3.4 consumes ("미분석 분리"), so this module refuses to spend it on
misconfiguration or an unreachable endpoint: :func:`http_completer` raises
:class:`ConfigError` at construction when the environment is incomplete (the caller can
then abort before reading Bronze), and :func:`analyze_llm` *raises*
:class:`CompletionError` rather than degrading when the model cannot be reached or
replies unusably. :func:`run_llm_analysis` applies the batch policy — degrade that one
record and count it — so the CLI can tell "the model judged nothing here" apart from
"nobody ever answered".

This analyzer is the operational default (``econ-analysis`` with no flag), mirroring the
ingestion feed cutover; the fake analyzer stays reachable as ``--analyzer fake`` so the
cross-language smoke and offline tests remain deterministic and network-free. Because
the default now needs ``ECON_LLM_API_KEY``, an unconfigured run stops at
:func:`http_completer` before reading Bronze rather than writing anything.
"""

from __future__ import annotations

import hashlib
import json
import os
import urllib.error
import urllib.request
from dataclasses import asdict, dataclass
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


class ConfigError(RuntimeError):
    """Raised when the real analyzer is selected but its environment is incomplete."""


@dataclass
class AnalysisStats:
    """Per-run model-call bookkeeping (mirrors ingestion's ``IngestStats``).

    ``attempted`` counts items that actually reached the model; ``failed`` counts those
    attempts that came back unusable; ``reused`` counts items answered from the reply
    cache instead (same prompt already judged under the same model and analyzer
    version). Items with no body never reach the model, so they are unanalyzed without
    being counted here.
    """

    attempted: int = 0
    failed: int = 0
    reused: int = 0
    last_error: str | None = None


def _temperature(raw: str | None) -> float | None:
    """Resolve ``ECON_LLM_TEMPERATURE``: unset -> 0, empty/``default`` -> omit the field."""
    if raw is None:
        return 0.0
    raw = raw.strip()
    if raw == "" or raw.lower() == "default":
        return None
    try:
        return float(raw)
    except ValueError as exc:
        raise ConfigError(
            f"ECON_LLM_TEMPERATURE must be a number or 'default', got {raw!r}"
        ) from exc


def _error_detail(exc: urllib.error.HTTPError) -> str:
    """The API's own error message, so a rejected request says *why* (never the key)."""
    try:
        message = json.loads(exc.read()).get("error", {}).get("message")
    except Exception:
        return ""
    return f" ({message})" if message else ""


def http_completer(
    *, base_url: str | None = None, model: str | None = None, timeout: float = 30.0
) -> Completer:
    """Return a real chat-completions transport (stdlib ``urllib``) for production runs.

    Talks to any OpenAI-compatible ``/chat/completions`` endpoint. Endpoint, model and
    key come from the environment so no secret is checked in: ``ECON_LLM_BASE_URL``
    (default ``https://api.openai.com/v1``), ``ECON_LLM_MODEL`` (default ``gpt-4o-mini``)
    and ``ECON_LLM_API_KEY``. ``ECON_LLM_TEMPERATURE`` defaults to ``0``; set it to an
    empty string or ``default`` to omit the field — newer models (e.g. the GPT-5.x
    family) reject any temperature other than their own default with a 400. The key is
    required *here*, not at the first call, so a misconfigured run fails before it reads
    Bronze or writes Silver. Not exercised offline — tests inject a canned completer.
    """
    root = (base_url or os.environ.get("ECON_LLM_BASE_URL") or "https://api.openai.com/v1").rstrip(
        "/"
    )
    name = model or os.environ.get("ECON_LLM_MODEL") or "gpt-4o-mini"
    key = os.environ.get("ECON_LLM_API_KEY")
    temperature = _temperature(os.environ.get("ECON_LLM_TEMPERATURE"))
    if not key:
        raise ConfigError(
            "ECON_LLM_API_KEY is not set; required by the default --analyzer llm "
            "(pass --analyzer fake for an offline run)"
        )

    def _complete(system: str, user: str) -> str:
        body: dict = {
            "model": name,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        }
        if temperature is not None:
            body["temperature"] = temperature
        payload = json.dumps(body).encode("utf-8")
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
        except urllib.error.HTTPError as exc:
            raise CompletionError(f"chat completion failed: {exc}{_error_detail(exc)}") from exc
        except Exception as exc:  # transport / decode failure
            raise CompletionError(f"chat completion failed: {exc}") from exc
        try:
            return envelope["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError) as exc:
            raise CompletionError(f"unexpected completion envelope: {exc}") from exc

    _complete.model = name  # type: ignore[attr-defined]  # part of the reply-cache key
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


def _tracking_key(item: dict, analyzer_version: str) -> dict:
    """The Bronze -> Silver tracking key every record carries (AC2.6)."""
    return {
        "record_id": item["record_id"],
        "source_url": item["source_url"],
        "analyzed_at": item["collected_at"],
        "analyzer_version": analyzer_version,
    }


def _unanalyzed(item: dict, analyzer_version: str) -> Analysis:
    """A record the model did not judge — never a forced label (AC2.5)."""
    return Analysis(
        target_countries=[],
        narrative_subjects=[],
        sentiment=None,
        analysis_status="unanalyzed",
        confidence=0.0,
        **_tracking_key(item, analyzer_version),
    )


def analyze_llm(
    item: dict,
    body: str | None,
    completer: Completer,
    analyzer_version: str = ANALYZER_VERSION,
) -> Analysis:
    """Analyze one Bronze ``NewsItem`` dict into a Silver ``Analysis`` via a real model.

    ``body`` is the raw text resolved from the content-addressed store via
    ``item["body_hash"]`` (AC1.4, AC1.7); ``None`` / empty means the body was never
    captured -> unanalyzed without calling the model (AC2.5). A model that declines
    (``analyzable: false``) also yields unanalyzed rather than a forced label (AC2.5).

    Raises :class:`CompletionError` when the model could not be reached or its reply is
    unusable — that is an operational failure, not a judgement about the article, so the
    batch policy (degrade + count) lives in :func:`run_llm_analysis`, not here.
    """
    body = body or ""
    if not item.get("body_available") or not body:
        return _unanalyzed(item, analyzer_version)

    parsed = parse_response(completer(_SYSTEM_PROMPT, build_prompt(item, body)))
    if parsed.get("analyzable") is False:
        return _unanalyzed(item, analyzer_version)

    sentiment = parsed.get("sentiment")
    if sentiment not in SENTIMENT_VALUES:
        raise CompletionError(f"model reply carried no valid sentiment: {sentiment!r}")

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
        **_tracking_key(item, analyzer_version),
    )


def reply_cache_key(analyzer_version: str, model: str, system: str, user: str) -> str:
    """Key of one model reply: the exact prompt under a given model and analyzer version.

    Hourly cycles re-observe mostly the same articles; their prompt (title + body) is
    byte-identical, so the model's earlier reply can stand in for a new call. A changed
    body or title, a prompt edit, a model switch or an ``analyzer_version`` bump (AC2.6
    reprocessing) each change the key and force a fresh call.
    """
    material = json.dumps([analyzer_version, model, system, user], ensure_ascii=False)
    return hashlib.sha256(material.encode("utf-8")).hexdigest()


def run_llm_analysis(
    items: list[dict],
    bodies: dict[str, str],
    completer: Completer,
    analyzer_version: str = ANALYZER_VERSION,
    reply_cache: dict[str, str] | None = None,
) -> tuple[list[dict], AnalysisStats, list[dict]]:
    """Analyze every Bronze item, isolating per-item model failures.

    Mirrors :func:`econ_ingestion.feeds.run_feed_ingestion` (records + stats return
    shape). A single unreachable or unusable completion degrades that record to
    unanalyzed instead of aborting the batch, but it is *counted*: the caller can then
    tell an endpoint outage (every attempt failed) from a batch the model genuinely had
    nothing to say about, which reads identically in the records alone.

    ``reply_cache`` maps :func:`reply_cache_key` to a raw reply from an earlier run;
    a hit skips the model call and replays that reply through the same parse path.
    Only replies that produced a record are returned as new cache entries, so a
    malformed reply is retried next cycle rather than remembered.
    """
    cache = reply_cache if reply_cache is not None else {}
    model = str(getattr(completer, "model", ""))
    stats = AnalysisStats()
    analyses: list[dict] = []
    new_entries: list[dict] = []
    for item in items:
        body = bodies.get(item.get("body_hash") or "")
        if not (item.get("body_available") and body):
            analyses.append(asdict(analyze_llm(item, body, completer, analyzer_version)))
            continue

        key = reply_cache_key(analyzer_version, model, _SYSTEM_PROMPT, build_prompt(item, body))
        cached = cache.get(key)
        if cached is not None:
            try:
                analyses.append(
                    asdict(analyze_llm(item, body, lambda _s, _u: cached, analyzer_version))
                )
                stats.reused += 1
                continue
            except CompletionError:
                pass  # stored reply no longer parses (parser changed) -> ask the model again

        replies: list[str] = []

        def _live(system: str, user: str, _sink: list[str] = replies) -> str:
            reply = completer(system, user)
            _sink.append(reply)
            return reply

        stats.attempted += 1
        try:
            analysis = analyze_llm(item, body, _live, analyzer_version)
        except CompletionError as exc:
            stats.failed += 1
            stats.last_error = str(exc)
            analysis = _unanalyzed(item, analyzer_version)
        else:
            if cached is None and replies:
                cache[key] = replies[0]
                new_entries.append(
                    {
                        "cache_key": key,
                        "reply": replies[0],
                        "model": model,
                        "analyzer_version": analyzer_version,
                        "first_seen_at": item.get("collected_at"),
                    }
                )
        analyses.append(asdict(analysis))
    return analyses, stats, new_entries
