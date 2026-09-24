"""CLI tests — Bronze observations accumulate across cycles (PRD ingestion 「보유 기간」)."""

import json
from pathlib import Path

from econ_ingestion import cli


def _items(root: Path) -> list[dict]:
    path = root / "bronze" / "news_item.jsonl"
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines()]


def _run(root: Path, cycle: str) -> int:
    return cli.main(["--data", str(root), "--source", "fake", "--cycle", cycle])


def test_a_later_cycle_keeps_the_earlier_cycles_observations(tmp_path: Path) -> None:
    assert _run(tmp_path, "2026-06-23T14:00") == 0
    first = _items(tmp_path)
    assert first

    assert _run(tmp_path, "2026-06-23T15:00") == 0
    both = _items(tmp_path)
    assert both[: len(first)] == first
    assert {i["collection_cycle"] for i in both} == {"2026-06-23T14:00", "2026-06-23T15:00"}


def test_rerunning_a_cycle_appends_nothing_twice(tmp_path: Path) -> None:
    assert _run(tmp_path, "2026-06-23T14:00") == 0
    once = _items(tmp_path)

    assert _run(tmp_path, "2026-06-23T14:00") == 0
    assert _items(tmp_path) == once
