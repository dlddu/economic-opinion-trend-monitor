"""Aggregation CLI — the serving-version choice and the publish/rollback log."""

import json
from pathlib import Path

import pytest
from econ_aggregation import cli
from econ_core import domain, open_store


def _seed(root: Path) -> None:
    store = open_store(root)
    store.write_records(
        domain.BRONZE,
        domain.DS_NEWS_ITEM,
        [
            {
                "record_id": "r1",
                "source_id": "s",
                "axis": "KR",
                "collected_at": "2026-06-23T14:00:00+00:00",
            }
        ],
    )
    store.write_records(
        domain.SILVER,
        domain.DS_ANALYSIS,
        [
            _row("v1", "2026-06-23T14:05:00+00:00", ["구주제"]),
            _row("v2", "2026-06-23T15:05:00+00:00", ["신주제"]),
        ],
    )


def _row(version: str, analyzed_at: str, subjects: list[str]) -> dict:
    return {
        "record_id": "r1",
        "narrative_subjects": subjects,
        "sentiment": "neutral",
        "analysis_status": "analyzed",
        "analyzed_at": analyzed_at,
        "analyzer_version": version,
    }


def _gold_subjects(root: Path) -> set[str]:
    path = root / "gold" / "subject_trend.jsonl"
    return {json.loads(line)["subject"] for line in path.read_text().splitlines()}


def test_gold_takes_one_row_per_record_and_follows_the_decision(tmp_path: Path) -> None:
    _seed(tmp_path)
    # No decision yet: the newest version of the record serves — and only one of them.
    assert cli.main(["--data", str(tmp_path)]) == 0
    assert _gold_subjects(tmp_path) == {"신주제"}
    # A rollback to v1 moves the pointer; the v2 rows stay in Silver untouched.
    assert (
        cli.main(
            [
                "--data",
                str(tmp_path),
                "--decision",
                "rollback",
                "--version",
                "v1",
                "--memo",
                "설명 안 됨",
            ]
        )
        == 0
    )
    assert _gold_subjects(tmp_path) == {"구주제"}
    assert cli.main(["--data", str(tmp_path)]) == 0
    assert _gold_subjects(tmp_path) == {"구주제"}
    assert (
        cli.main(
            [
                "--data",
                str(tmp_path),
                "--decision",
                "publish",
                "--version",
                "v2",
                "--memo",
                "의도한 개선",
            ]
        )
        == 0
    )
    assert _gold_subjects(tmp_path) == {"신주제"}
    log = open_store(tmp_path).read_records(domain.SILVER, domain.DS_REPROCESS_DECISION)
    assert [(d["decision"], d["analyzer_version"]) for d in log] == [
        ("rollback", "v1"),
        ("publish", "v2"),
    ]


def test_decision_without_memo_is_refused_and_gold_untouched(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    _seed(tmp_path)
    assert cli.main(["--data", str(tmp_path), "--decision", "publish", "--version", "v2"]) == 2
    assert "not recorded" in capsys.readouterr().err
    assert not (tmp_path / "gold").exists()
