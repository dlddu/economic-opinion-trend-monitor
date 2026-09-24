import json
from dataclasses import asdict
from pathlib import Path

import pytest
from econ_core import LocalFsStore, domain
from econ_core.models import NewsBody, NewsItem, SubjectTrend


def test_localfs_roundtrip(tmp_path: Path) -> None:
    store = LocalFsStore(tmp_path)
    records = [{"a": 1, "ko": "한국"}, {"a": 2}]
    assert store.write_records("bronze", "x", records) == 2
    assert store.read_records("bronze", "x") == records
    # Missing dataset reads as empty, not an error.
    assert store.read_records("bronze", "missing") == []


def test_localfs_merge_is_idempotent_by_key(tmp_path: Path) -> None:
    store = LocalFsStore(tmp_path)
    r1 = {"cache_key": "k1", "reply": "a"}
    assert store.merge_records("silver", "cache", "cache_key", [r1]) == 1
    assert store.merge_records("silver", "cache", "cache_key", [r1, r1]) == 0
    r2 = {"cache_key": "k2", "reply": "b"}
    assert store.merge_records("silver", "cache", "cache_key", [r1, r2]) == 1
    assert store.read_records("silver", "cache") == [r1, r2]


def _body(key: str, text: str, cycle: str = "2026-06-23T14:00") -> dict:
    return {"body_hash": key, "raw_text": text, "first_seen_cycle": cycle}


def test_object_lands_in_hive_partition_of_its_key(tmp_path: Path) -> None:
    store = LocalFsStore(tmp_path)
    assert store.put_object("bronze", "news_body", "body_hash", _body("ab12", "본문"))
    target = tmp_path / "bronze" / "news_body" / "body_hash_prefix=a" / "ab12.json"
    expected = json.dumps(_body("ab12", "본문"), ensure_ascii=False) + "\n"
    assert target.read_text(encoding="utf-8") == expected
    assert not list(target.parent.glob(".*"))


def test_object_is_stored_once_and_never_replaced(tmp_path: Path) -> None:
    store = LocalFsStore(tmp_path)
    v1 = _body("h1", "본문 v1", cycle="c1")
    assert store.put_object("bronze", "news_body", "body_hash", v1)
    # Same key again — even with a later first-seen stamp — keeps the first record (AC1.7).
    later = _body("h1", "본문 v1", cycle="c2")
    assert not store.put_object("bronze", "news_body", "body_hash", later)
    # An edited body is a new key: a new version beside the old one (AC1.7).
    v2 = _body("h2", "본문 v2 (수정)", cycle="c3")
    assert store.put_object("bronze", "news_body", "body_hash", v2)

    assert store.get_object("bronze", "news_body", "body_hash", "h1") == v1
    assert store.get_object("bronze", "news_body", "body_hash", "zz") is None
    assert store.read_objects("bronze", "news_body") == [v1, v2]
    assert store.read_objects("bronze", "missing") == []


def test_object_key_must_be_a_plain_file_name(tmp_path: Path) -> None:
    store = LocalFsStore(tmp_path)
    for bad in ("", ".hidden", "a/b", "..\\x"):
        with pytest.raises(ValueError):
            store.put_object("bronze", "news_body", "body_hash", _body(bad, "t"))


def test_legacy_jsonl_migrates_into_objects_once(tmp_path: Path) -> None:
    store = LocalFsStore(tmp_path)
    legacy = [_body("aa", "첫 본문"), _body("bb", "둘째 본문")]
    store.write_records("bronze", "news_body", legacy)
    # A key already moved by an interrupted earlier run is skipped, not duplicated.
    store.put_object("bronze", "news_body", "body_hash", legacy[0])

    assert store.migrate_records_to_objects("bronze", "news_body", "body_hash") == 1
    assert store.read_objects("bronze", "news_body") == legacy
    assert not (tmp_path / "bronze" / "news_body.jsonl").exists()
    assert (tmp_path / "bronze" / "news_body.jsonl.migrated").exists()
    assert store.migrate_records_to_objects("bronze", "news_body", "body_hash") == 0


def test_generated_model_roundtrip() -> None:
    item = NewsItem(
        record_id="r",
        source_id="s",
        axis="KR",
        rank=1,
        view_count=10,
        title="t",
        source_url="u",
        body_hash="h",
        body_available=True,
        collected_at="2026-06-23T14:00:00+00:00",
        collection_cycle="2026-06-23T14:00",
    )
    assert NewsItem.from_dict(asdict(item)) == item

    body = NewsBody(
        body_hash="h",
        raw_text="b",
        first_seen_at="2026-06-23T14:00:00+00:00",
        first_seen_cycle="2026-06-23T14:00",
    )
    assert NewsBody.from_dict(asdict(body)) == body

    trend = SubjectTrend(
        subject="x",
        axis="KR",
        bucket_unit="hour",
        time_bucket="2026-06-23T14",
        raw_count=3,
        normalized_share=0.5,
        delta=0.0,
        spark=[0.1, 0.2],
    )
    assert SubjectTrend.from_dict(asdict(trend)) == trend


def test_partition_part_is_replaced_alone_and_read_in_path_order(tmp_path: Path) -> None:
    store = LocalFsStore(tmp_path)
    day1, day2 = {"collection_date": "2026-06-23"}, {"collection_date": "2026-06-24"}
    store.write_partition("bronze", "news_item", day2, "0100", [{"id": "c"}])
    store.write_partition("bronze", "news_item", day1, "2300", [{"id": "a"}, {"id": "b"}])
    store.write_partition("bronze", "news_item", day1, "2300", [{"id": "b2"}])

    assert (tmp_path / "bronze/news_item/collection_date=2026-06-23/2300.jsonl").is_file()
    assert store.read_partitions("bronze", "news_item") == [{"id": "b2"}, {"id": "c"}]
    assert store.read_partitions("bronze", "missing") == []
    assert not list((tmp_path / "bronze/news_item").rglob(".*"))


def test_partition_values_must_be_plain_path_segments(tmp_path: Path) -> None:
    store = LocalFsStore(tmp_path)
    for partition, part in (({"d": "a/b"}, "p"), ({"d": "x=y"}, "p"), ({"d": "ok"}, "../p")):
        with pytest.raises(ValueError):
            store.write_partition("bronze", "news_item", partition, part, [])


def test_domain_cycle_partition_is_exact() -> None:
    assert domain.news_item_partition("2026-06-23T14:00") == (
        {"collection_date": "2026-06-23"},
        "2026-06-23T1400",
    )
    for bad in ("2026-06-23T14", "2026-6-23T14:00", "2026-06-23T14:00:00"):
        with pytest.raises(ValueError):
            domain.news_item_partition(bad)
