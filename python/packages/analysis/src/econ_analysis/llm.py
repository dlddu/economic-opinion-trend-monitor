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

**Operator error is not an analysis outcome.** ``unanalyzed`` is a data-quality signal
AC2.5 defines and AC3.4 consumes ("미분석 분리"), so this module refuses to spend it on
misconfiguration or an unreachable endpoint: :func:`http_completer` raises
:class:`ConfigError` at construction when the environment is incomplete (the caller can
then abort before reading Bronze), and :func:`analyze_llm` *raises*
:class:`CompletionError` rather than degrading when the model cannot be reached or
replies unusably. :func:`run_llm_analysis` applies the batch policy — degrade that one
record and count it — so the CLI can tell "the model judged nothing here" apart from
"nobody ever answered".
"""

from __future__ import annotations

import hashlib
import json
import os
import time
import urllib.error
import urllib.request
from dataclasses import asdict, dataclass, field
from datetime import UTC, datetime
from typing import Protocol

from econ_core import calllog
from econ_core.models import SENTIMENT_VALUES, Analysis, LlmCallRecord

from econ_analysis.fake_llm import ALIASES, KNOWN_SUBJECTS

ANALYZER_VERSION = "llm-v1"

#: AC4.3 no-call reason: the body was never captured, so there was nothing to send.
NO_CALL_BODY_UNAVAILABLE = "body_unavailable"

# Shared with the fake analyzer: below this the label is kept but marked low-confidence.
_LOW_CONFIDENCE = 0.6

_SYSTEM_PROMPT = (
    "You analyze one economic news article and reply with ONLY a JSON object, no prose. "
    "Extract, from the article's meaning (not its source): "
    "target_countries (array of country names the article is economically about; "
    'use ["GLOBAL"] for issues not tied to a specific country; may hold several), '
    "narrative_subjects (array of the core subjects — people, firms, institutions, "
    "policies, goods, issues — as normalized canonical names so surface variants unify; "
    "write every subject in Korean as Korean financial press names it, whatever the "
    "article's language, e.g. 연준 not Federal Reserve, 엔비디아 not Nvidia, 삼성전자 not "
    "Samsung Electronics; keep Latin letters only where Korean press does, e.g. S&P 500, AI), "
    "sentiment (exactly one of positive/neutral/negative/mixed; use mixed when opposing "
    "tones coexist and neutral when no tone shows), analyzable (false when the body is too "
    "thin or the judgement is genuinely uncertain), and confidence (0.0-1.0). "
    'Reply shape: {"target_countries":[],"narrative_subjects":[],'
    '"sentiment":"neutral","analyzable":true,"confidence":0.0}'
)


#: Korean names for the known catalog's non-Korean keys; the fake catalog stays as-is.
_KOREAN_NAMES = {
    "Federal Reserve": "연준",
    "Nvidia": "엔비디아",
    "US CPI": "미국 소비자물가지수",
    "AI 반도체 capex": "AI 반도체 설비투자",
}

_EXTRA_ALIASES = {
    "the fed": "연준",
    "미 연준": "연준",
    "미국 연준": "연준",
    "연방준비제도": "연준",
    "미국 연방준비제도": "연준",
    "미국 cpi": "미국 소비자물가지수",
    "미국 소비자물가": "미국 소비자물가지수",
}


def _fold(text: str) -> str:
    return " ".join(text.split()).casefold()


def _build_canonical() -> dict[str, str]:
    table: dict[str, str] = {}
    for subject in KNOWN_SUBJECTS:
        korean = _KOREAN_NAMES.get(subject, subject)
        table[_fold(subject)] = korean
        table[_fold(korean)] = korean
    for alias, subject in ALIASES.items():
        table[_fold(alias)] = _KOREAN_NAMES.get(subject, subject)
    for alias, korean in _EXTRA_ALIASES.items():
        table[_fold(alias)] = korean
    return table


_CANONICAL = _build_canonical()


def canonical_subject(text: str) -> str:
    """Fold a model-supplied subject onto its catalog key when it *is* a known variant.

    Whole-name match only: a substring match would fold 미국 기준금리 into 한국은행
    기준금리 or 삼성SDI into 삼성전자. Unknown subjects are returned unchanged (AC2.2).
    """
    return _CANONICAL.get(_fold(text), text)


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
    being counted here. ``failed_ids`` names the records behind ``failed``: their
    unanalyzed row is an outage, not the model's judgement, so they are retried.
    ``reused_ids`` names the records behind ``reused``, so the run record can book each
    record under exactly one outcome (AC4.1).
    """

    attempted: int = 0
    failed: int = 0
    reused: int = 0
    last_error: str | None = None
    failed_ids: list[str] = field(default_factory=list)
    reused_ids: list[str] = field(default_factory=list)


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
    _complete.temperature = temperature  # type: ignore[attr-defined]  # named by the call record
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


def _tracking_key(item: dict, analyzer_version: str, run_id: str) -> dict:
    """The Bronze -> Silver tracking key every record carries (AC2.6), plus the run that
    wrote it (AC4.3): AC2.6 reaches the article, ``run_id`` reaches the execution."""
    return {
        "record_id": item["record_id"],
        "source_url": item["source_url"],
        "analyzed_at": item["collected_at"],
        "analyzer_version": analyzer_version,
        "run_id": run_id,
    }


def _unanalyzed(
    item: dict, analyzer_version: str, run_id: str, no_call_reason: str | None = None
) -> Analysis:
    """A record the model did not judge — never a forced label (AC2.5).

    ``no_call_reason`` is set only when no request went out at all; a call that came
    back unusable produced a call record, and the row points at *that* instead (AC4.3).
    """
    return Analysis(
        target_countries=[],
        narrative_subjects=[],
        sentiment=None,
        analysis_status="unanalyzed",
        confidence=0.0,
        no_call_reason=no_call_reason,
        **_tracking_key(item, analyzer_version, run_id),
    )


def analyze_llm(
    item: dict,
    body: str | None,
    completer: Completer,
    analyzer_version: str = ANALYZER_VERSION,
    run_id: str = "",
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
        return _unanalyzed(item, analyzer_version, run_id, NO_CALL_BODY_UNAVAILABLE)

    parsed = parse_response(completer(_SYSTEM_PROMPT, build_prompt(item, body)))
    if parsed.get("analyzable") is False:
        return _unanalyzed(item, analyzer_version, run_id)

    sentiment = parsed.get("sentiment")
    if sentiment not in SENTIMENT_VALUES:
        raise CompletionError(f"model reply carried no valid sentiment: {sentiment!r}")

    try:
        confidence = float(parsed.get("confidence", 0.0))
    except (TypeError, ValueError):
        confidence = 0.0
    confidence = min(1.0, max(0.0, confidence))

    subjects = [canonical_subject(s) for s in _clean_list(parsed.get("narrative_subjects"))]
    status = "analyzed" if confidence >= _LOW_CONFIDENCE else "low_confidence"
    return Analysis(
        target_countries=_clean_list(parsed.get("target_countries")),
        narrative_subjects=subjects,
        sentiment=sentiment,
        analysis_status=status,
        confidence=confidence,
        **_tracking_key(item, analyzer_version, run_id),
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


def _call_record(
    *,
    item: dict,
    run_id: str,
    analyzer_version: str,
    model: str,
    temperature: float | None,
    system: str,
    user: str,
    outcome: str,
    response_raw: str | None = None,
    failure_reason: str | None = None,
    attempts: int,
    started: float,
    reused_from: str | None = None,
) -> dict:
    """One :class:`~econ_core.models.LlmCallRecord` for a call that just happened (AC4.2).

    ``system`` / ``user`` are the strings the transport was actually handed, not a
    rebuild of them, so the stored prompt equals the transmitted one by construction.
    """
    return asdict(
        LlmCallRecord(
            call_id=calllog.new_call_id(),
            run_id=run_id,
            record_id=item["record_id"],
            source_url=item["source_url"],
            analyzer_version=analyzer_version,
            call_model=model,
            call_temperature=temperature,
            prompt_system=system,
            prompt_user=user,
            prompt_sha256=calllog.prompt_digest(system, user),
            response_raw=response_raw,
            call_outcome=outcome,
            call_failure_reason=failure_reason,
            call_attempt_count=attempts,
            called_at=datetime.now(UTC).replace(microsecond=0).isoformat(),
            duration_ms=int((time.monotonic() - started) * 1000),
            reused_from_call_id=reused_from,
        )
    )


def run_llm_analysis(
    items: list[dict],
    bodies: dict[str, str],
    completer: Completer,
    analyzer_version: str = ANALYZER_VERSION,
    reply_cache: dict[str, str] | None = None,
    calls: list[dict] | None = None,
    reply_origins: dict[str, str] | None = None,
    run_id: str = "",
) -> tuple[list[dict], AnalysisStats, list[dict]]:
    """Analyze every Bronze item, isolating per-item model failures.

    Mirrors :func:`econ_ingestion.feeds.run_feed_ingestion` (records + stats return
    shape). A single unreachable or unusable completion degrades that record to
    unanalyzed instead of aborting the batch, but it is *counted*: the caller can then
    tell an endpoint outage (every attempt failed) from a batch the model genuinely had
    nothing to say about, which reads identically in the records alone.

    ``reply_cache`` maps :func:`reply_cache_key` to a raw reply from an earlier run;
    a hit skips the model call and replays that reply through the same parse path.
    Only replies that produced a record are returned as new cache entries, so the cache
    stays an index of answers worth replaying rather than a log of what happened.

    ``calls`` is the append sink for the call log (AC4.2): every article that reaches the
    model leaves exactly one record in it — a reply that parsed, a reply that did not, a
    request that never came back, or a cached reply replayed. The log is separate from the
    cache on purpose: the cache exists to avoid a call, so it keeps only useful answers,
    while AC4.2 asks precisely about the failures. It is an in/out parameter for the same
    reason ``reply_cache`` is — the caller owns the batch boundary at which records are
    flushed to the lake, so a run cut short keeps the records it already made.
    ``reply_origins`` maps a cache key to the ``call_id`` that first produced that reply,
    so a reuse names its original; a key missing from it (a cache entry written before
    call records existed) yields a reuse record with a null origin rather than no record.
    """
    cache = reply_cache if reply_cache is not None else {}
    call_log = calls if calls is not None else []
    origins = reply_origins if reply_origins is not None else {}
    model = str(getattr(completer, "model", ""))
    temperature = getattr(completer, "temperature", None)
    stats = AnalysisStats()
    analyses: list[dict] = []
    new_entries: list[dict] = []
    for item in items:
        body = bodies.get(item.get("body_hash") or "")
        if not (item.get("body_available") and body):
            analyses.append(asdict(analyze_llm(item, body, completer, analyzer_version, run_id)))
            continue

        user_prompt = build_prompt(item, body)
        key = reply_cache_key(analyzer_version, model, _SYSTEM_PROMPT, user_prompt)
        cached = cache.get(key)
        if cached is not None:
            started = time.monotonic()
            try:
                row = asdict(
                    analyze_llm(item, body, lambda _s, _u: cached, analyzer_version, run_id)
                )
            except CompletionError:
                pass  # stored reply no longer parses (parser changed) -> ask the model again
            else:
                stats.reused += 1
                stats.reused_ids.append(item["record_id"])
                call = _call_record(
                    item=item,
                    run_id=run_id,
                    analyzer_version=analyzer_version,
                    model=model,
                    temperature=temperature,
                    system=_SYSTEM_PROMPT,
                    user=user_prompt,
                    outcome="reused",
                    response_raw=cached,
                    attempts=0,
                    started=started,
                    reused_from=origins.get(key),
                )
                call_log.append(call)
                # The row names the record *this* run wrote, not the original reply's
                # call: an entry cached before call records existed has no original to
                # name, and `reused_from_call_id` is the hop AC4.3 reads (AC4.2).
                row["call_id"] = call["call_id"]
                analyses.append(row)
                continue

        replies: list[str] = []

        def _live(system: str, user: str, _sink: list[str] = replies) -> str:
            reply = completer(system, user)
            _sink.append((system, user, reply))
            return reply

        stats.attempted += 1
        started = time.monotonic()
        try:
            analysis = analyze_llm(item, body, _live, analyzer_version, run_id)
        except CompletionError as exc:
            stats.failed += 1
            stats.failed_ids.append(item["record_id"])
            stats.last_error = str(exc)
            analysis = _unanalyzed(item, analyzer_version, run_id)
            sent_system, sent_user, sent_reply = (
                replies[0] if replies else (_SYSTEM_PROMPT, user_prompt, None)
            )
            call = _call_record(
                item=item,
                run_id=run_id,
                analyzer_version=analyzer_version,
                model=model,
                temperature=temperature,
                system=sent_system,
                user=sent_user,
                outcome="parse_failed" if replies else "call_failed",
                response_raw=sent_reply,
                failure_reason=str(exc),
                attempts=1,
                started=started,
            )
            call_log.append(call)
        else:
            sent_system, sent_user, sent_reply = (
                replies[0] if replies else (_SYSTEM_PROMPT, user_prompt, None)
            )
            call = _call_record(
                item=item,
                run_id=run_id,
                analyzer_version=analyzer_version,
                model=model,
                temperature=temperature,
                system=sent_system,
                user=sent_user,
                outcome="parsed",
                response_raw=sent_reply,
                attempts=1,
                started=started,
            )
            call_log.append(call)
            if cached is None and replies:
                cache[key] = sent_reply
                new_entries.append(
                    {
                        "cache_key": key,
                        "reply": sent_reply,
                        "model": model,
                        "analyzer_version": analyzer_version,
                        "first_seen_at": item.get("collected_at"),
                        "call_id": call["call_id"],
                    }
                )
        row = asdict(analysis)
        row["call_id"] = call["call_id"]
        analyses.append(row)
    return analyses, stats, new_entries
