from dataclasses import asdict
from pathlib import Path

from econ_core import LocalFsStore
from econ_core.models import NewsItem, SubjectTrend


def test_localfs_roundtrip(tmp_path: Path) -> None:
    store = LocalFsStore(tmp_path)
    records = [{"a": 1, "ko": "한국"}, {"a": 2}]
    assert store.write_records("bronze", "x", records) == 2
    assert store.read_records("bronze", "x") == records
    # Missing dataset reads as empty, not an error.
    assert store.read_records("bronze", "missing") == []


def test_generated_model_roundtrip() -> None:
    item = NewsItem(
        record_id="r",
        source_id="s",
        axis="KR",
        rank=1,
        view_count=10,
        title="t",
        source_url="u",
        raw_text="b",
        body_available=True,
        collected_at="2026-06-23T14:00:00+00:00",
        collection_cycle="2026-06-23T14:00",
    )
    assert NewsItem.from_dict(asdict(item)) == item

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
