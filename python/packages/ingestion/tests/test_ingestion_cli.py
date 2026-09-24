from pathlib import Path

import pytest
from econ_core import LocalFsStore
from econ_ingestion import cli


def _run(root: Path, cycle: str) -> None:
    assert cli.main(["--source", "fake", "--data", str(root), "--cycle", cycle]) == 0


def test_bodies_land_as_hive_partitioned_objects(tmp_path: Path, capsys) -> None:
    _run(tmp_path, "2026-06-23T14:00")
    store = LocalFsStore(tmp_path)
    items = store.read_partitions("bronze", "news_item")
    hashes = {item["body_hash"] for item in items if item["body_hash"]}
    assert hashes

    for key in hashes:
        target = tmp_path / "bronze" / "news_body" / f"body_hash_prefix={key[0]}" / f"{key}.json"
        assert target.is_file()
    assert not (tmp_path / "bronze" / "news_body.jsonl").exists()

    capsys.readouterr()
    _run(tmp_path, "2026-06-23T15:00")
    assert f"bodies: 0 new / {len(hashes)} deduplicated" in capsys.readouterr().out


def test_legacy_body_file_is_migrated_before_the_cycle_writes(tmp_path: Path, capsys) -> None:
    store = LocalFsStore(tmp_path)
    legacy = {
        "body_hash": "0" * 64,
        "raw_text": "이전 레이아웃의 본문",
        "first_seen_at": "2026-06-22T00:00:00+00:00",
        "first_seen_cycle": "2026-06-22T00:00",
    }
    store.write_records("bronze", "news_body", [legacy])

    _run(tmp_path, "2026-06-23T14:00")

    assert "migrated 1 legacy bodies" in capsys.readouterr().out
    assert store.get_object("bronze", "news_body", "body_hash", legacy["body_hash"]) == legacy
    assert (tmp_path / "bronze" / "news_body.jsonl.migrated").exists()


def test_each_cycle_lands_in_its_own_partition_and_reruns_replace_it(tmp_path: Path) -> None:
    _run(tmp_path, "2026-06-23T23:00")
    _run(tmp_path, "2026-06-24T00:00")
    _run(tmp_path, "2026-06-24T00:00")

    root = tmp_path / "bronze" / "news_item"
    assert sorted(p.relative_to(root).as_posix() for p in root.rglob("*.jsonl")) == [
        "collection_date=2026-06-23/2026-06-23T2300.jsonl",
        "collection_date=2026-06-24/2026-06-24T0000.jsonl",
    ]
    items = LocalFsStore(tmp_path).read_partitions("bronze", "news_item")
    per_cycle = {
        c: sum(i["collection_cycle"] == c for i in items)
        for c in ("2026-06-23T23:00", "2026-06-24T00:00")
    }
    assert per_cycle["2026-06-23T23:00"] == per_cycle["2026-06-24T00:00"] > 0
    assert len({i["record_id"] for i in items}) == len(items)


def test_legacy_observation_file_is_migrated_into_its_cycle(tmp_path: Path) -> None:
    store = LocalFsStore(tmp_path)
    legacy = {"record_id": "old-1", "collection_cycle": "2026-06-22T05:00"}
    store.write_records("bronze", "news_item", [legacy])

    _run(tmp_path, "2026-06-23T14:00")

    part = (
        tmp_path / "bronze" / "news_item" / "collection_date=2026-06-22" / "2026-06-22T0500.jsonl"
    )
    assert part.is_file()
    assert legacy in store.read_partitions("bronze", "news_item")
    assert (tmp_path / "bronze" / "news_item.jsonl.migrated").exists()


@pytest.mark.parametrize("cycle", ["2026-06-23T14", "2026-06-23T9:00", "2026-06-23 14:00"])
def test_cycle_outside_the_partition_format_is_rejected(tmp_path: Path, cycle: str) -> None:
    with pytest.raises(SystemExit):
        cli.main(["--source", "fake", "--data", str(tmp_path), "--cycle", cycle])
    assert not (tmp_path / "bronze").exists()
