"""CLI tests — Bronze observations accumulate across cycles (PRD ingestion 「보유 기간」)."""

import json
from pathlib import Path

from econ_core import domain, open_store
from econ_ingestion import cli


def _items(root: Path) -> list[dict]:
    return open_store(root).read_records(domain.BRONZE, domain.DS_NEWS_ITEM)


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


def test_each_cycle_lands_in_its_own_partition(tmp_path: Path) -> None:
    assert _run(tmp_path, "2026-06-23T14:00") == 0
    assert _run(tmp_path, "2026-06-23T15:00") == 0
    store = open_store(tmp_path)
    assert store.partitions(domain.BRONZE, domain.DS_NEWS_ITEM) == [
        "date=2026-06-23/hour=14",
        "date=2026-06-23/hour=15",
    ]
    assert not store.path(domain.BRONZE, domain.DS_NEWS_ITEM).exists()


def test_a_lake_written_before_partitioning_is_moved_into_partitions(tmp_path: Path) -> None:
    legacy = {
        "record_id": "old",
        "source_id": "s",
        "axis": "KR",
        "rank": 1,
        "view_count": 1,
        "title": "t",
        "source_url": "https://ex.test/old",
        "body_hash": "",
        "body_available": False,
        "collected_at": "2026-06-23T13:00:05+00:00",
        "collection_cycle": "2026-06-23T13:00",
    }
    flat = tmp_path / "bronze" / "news_item.jsonl"
    flat.parent.mkdir(parents=True)
    flat.write_text(json.dumps(legacy) + "\n", encoding="utf-8")

    assert _run(tmp_path, "2026-06-23T14:00") == 0
    store = open_store(tmp_path)
    assert not flat.exists()
    assert store.read_partition(domain.BRONZE, domain.DS_NEWS_ITEM, "date=2026-06-23/hour=13") == [
        legacy
    ]
