from dataclasses import asdict
from pathlib import Path

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
    v1 = {"body_hash": "h1", "raw_text": "본문 v1"}
    assert store.merge_records("bronze", "news_body", "body_hash", [v1]) == 1
    # Unchanged body (same key) is never re-stored — within or across runs (AC1.7).
    assert store.merge_records("bronze", "news_body", "body_hash", [v1, v1]) == 0
    # An edited body (new key) appends as a new version; the prior one stays (AC1.7).
    v2 = {"body_hash": "h2", "raw_text": "본문 v2 (수정)"}
    assert store.merge_records("bronze", "news_body", "body_hash", [v1, v2]) == 1
    assert store.read_records("bronze", "news_body") == [v1, v2]


def test_partitions_are_hive_style_and_read_oldest_first(tmp_path: Path) -> None:
    store = LocalFsStore(tmp_path)
    p15 = domain.cycle_partition("2026-06-23T15:00")
    p14 = domain.cycle_partition("2026-06-23T14:00")
    assert p14 == "date=2026-06-23/hour=14"
    store.merge_partition("bronze", "news_item", p15, "record_id", [{"record_id": "b"}])
    store.merge_partition("bronze", "news_item", p14, "record_id", [{"record_id": "a"}])
    assert (
        tmp_path / "bronze" / "news_item" / "date=2026-06-23" / "hour=14" / "data.jsonl"
    ).exists()
    assert store.partitions("bronze", "news_item") == [p14, p15]
    assert store.read_records("bronze", "news_item") == [{"record_id": "a"}, {"record_id": "b"}]
    # Re-merging a key the partition already holds appends nothing.
    assert store.merge_partition("bronze", "news_item", p14, "record_id", [{"record_id": "a"}]) == 0


def test_an_emptied_partition_is_removed(tmp_path: Path) -> None:
    store = LocalFsStore(tmp_path)
    store.write_partition("silver", "analysis", "date=2026-06-23/hour=14", [{"a": 1}])
    store.write_partition("silver", "analysis", "date=2026-06-23/hour=14", [])
    assert store.partitions("silver", "analysis") == []


def test_partition_flat_moves_legacy_records_once(tmp_path: Path) -> None:
    store = LocalFsStore(tmp_path)
    legacy = [
        {"record_id": "a", "collection_cycle": "2026-06-23T14:00"},
        {"record_id": "b", "collection_cycle": "2026-06-23T15:00"},
    ]
    store.write_records("bronze", "news_item", legacy)

    def by_cycle(item: dict) -> str:
        return domain.cycle_partition(item["collection_cycle"])

    assert store.partition_flat("bronze", "news_item", by_cycle) == (2, 0)
    assert not store.path("bronze", "news_item").exists()
    assert store.read_records("bronze", "news_item") == legacy
    # An interrupted move re-run (the file came back) does not duplicate anything.
    store.write_records("bronze", "news_item", legacy)
    store.partition_flat("bronze", "news_item", by_cycle)
    assert store.read_records("bronze", "news_item") == legacy


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
