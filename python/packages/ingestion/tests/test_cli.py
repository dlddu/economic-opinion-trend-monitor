from pathlib import Path

from econ_core import LocalFsStore
from econ_ingestion import cli


def _run(root: Path, cycle: str) -> None:
    assert cli.main(["--source", "fake", "--data", str(root), "--cycle", cycle]) == 0


def test_bodies_land_as_hive_partitioned_objects(tmp_path: Path, capsys) -> None:
    _run(tmp_path, "2026-06-23T14:00")
    store = LocalFsStore(tmp_path)
    items = store.read_records("bronze", "news_item")
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
