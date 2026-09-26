"""Per-article model call records — the lake-side judgement log (PRD pipeline-ops, AC4.2)."""

from __future__ import annotations

import hashlib
import secrets
from datetime import UTC, datetime

from econ_core import domain
from econ_core.storage import LakeStore


def new_call_id() -> str:
    """A fresh call identity: the call's UTC second plus random bytes.

    Random rather than derived from the prompt, because two calls with the *same*
    prompt (a retry next cycle, a reprocess at a new analyzer version) must land as two
    records — a content-derived id would collide and ``put_object`` would reject the
    second, silently losing the very history AC4.2 asks for.
    """
    return f"call-{datetime.now(UTC).strftime('%Y%m%dT%H%M%S')}Z-{secrets.token_hex(6)}"


def prompt_digest(system: str, user: str) -> str:
    """SHA-256 over the exact prompt bytes that went out, system then user.

    The separator is NUL, which neither prompt can contain, so no pair of prompts can
    be rearranged into the same digest input.
    """
    material = system.encode("utf-8") + b"\0" + user.encode("utf-8")
    return hashlib.sha256(material).hexdigest()


def record_call(store: LakeStore, record: dict) -> bool:
    """Append one call record. False means this ``call_id`` was already written."""
    return store.put_object(domain.SILVER, domain.DS_LLM_CALL, "call_id", record)


def read_calls(store: LakeStore) -> list[dict]:
    """Every call record in the lake — the read side of the log."""
    return store.read_objects(domain.SILVER, domain.DS_LLM_CALL)


def read_call(store: LakeStore, call_id: str) -> dict | None:
    """The call record a Silver row's ``call_id`` names, or None (AC4.3, forward)."""
    return store.get_object(domain.SILVER, domain.DS_LLM_CALL, "call_id", call_id)


def calls_of_run(store: LakeStore, run_id: str) -> list[dict]:
    """Call records made by one run — the reverse of a call's ``run_id`` (AC4.3).

    Derived by scan for the same reason :func:`econ_core.silver.records_of_run` is:
    ``run_id`` on the call record is the single stored fact, read from either end.
    """
    return [call for call in read_calls(store) if call.get("run_id") == run_id]
