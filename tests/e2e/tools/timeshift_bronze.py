"""다중 시간 버킷 코퍼스를 만드는 하네스 스텝 — 수집 시각만 고정 달력 위로 다시 찍는다.

`…-test-aggregation-viz.md#시나리오 3`(시간대 버킷과 롤업 일관성)의 사전 조건은 "여러
시간대에 걸친 수집 데이터"인데, 수집 CLI 는 `collected_at` 을 **실행 시각**으로 찍으므로
(`econ_ingestion/cli.py` — `--cycle` 과 무관하다) 한 수집 Job 이 만든 레코드는 전부 같은
시간 버킷에 떨어진다. 즉 e2e 한 주기에서 시간대 차원은 값이 하나라, "일 버킷 = 시간
버킷들의 합"이 버킷 **하나**의 합이 돼 시나리오의 기대 결과를 시험하지 못한다.

그래서 집계 코퍼스가 이미 만들어 둔 Bronze·Silver 를 **파이프라인이 쓴 그대로** 읽어,
`collected_at` **한 필드만** 아래 고정 달력으로 다시 찍어 별도 루트에 심는다. 그 루트에
실 `econ-aggregation` 이 한 번 더 돌면 세 단위가 모두 버킷을 여럿 갖는 Gold 가 나온다.

**무엇을 건드리지 않는가**가 이 스텝의 요점이다:

  · 피검체는 집계 CLI 그대로다 — 이 스크립트는 Gold 를 만들지 않고 입력만 다시 심는다.
  · Silver 는 바이트 그대로 이식한다. `record_id` 조인(V5/AC2.6)이 끊기면 집계가 아무것도
    산출하지 않아 spec 이 "집계가 틀렸다"로 읽히는데, 실제로는 이 스텝이 깨진 것이다.
  · Bronze 도 `collected_at` 외의 모든 필드를 보존한다. 축·소스는 정규화(AC3.1)의 입력이라
    함께 흔들면 롤업이 아니라 다른 것을 재게 된다.
  · 커밋된 픽스처가 배치 산출물을 대신하지 않고, 상류 더블을 새로 끼우지도 않는다 —
    모킹 지점이 아니다(`docs/econ-opinion-monitor-e2e-mocking-policy.md` 「모킹으로 세는 것」).

달력은 상수다. 벽시계를 쓰면 실행 시점에 따라 주 경계가 달라져 같은 커밋이 어제는 통과하고
오늘은 실패한다. ISO 주 번호까지 결정적이어야 `bucket_unit="week"` 단정이 성립한다.

``tests/e2e/specs/`` 밖에 있다 — 매칭 단위는 spec 파일뿐이고(doc-tracker 「e2e 매핑 ›
매칭 규약」), 하네스가 그 집합에 섞이면 `check_scenario_mapping.py` 가 선언 없는 매칭
단위로 읽는다.
"""

from __future__ import annotations

import argparse
from collections import defaultdict
from datetime import date
from pathlib import Path

from econ_core import domain, open_store, silver

# 수집 시각을 다시 찍을 슬롯. 2026-06-22·23 은 ISO 주 2026-W26, 06-29·30 은 2026-W27 이다.
# 세 단위가 전부 버킷을 여럿 갖도록 고른 최소 달력이다:
#   · 시간 — 6개 (한 날 안에 둘 이상이 있어야 "일 = 시간들의 합"이 합다운 합이 된다)
#   · 일   — 4개 (한 주 안에 둘 이상)
#   · 주   — 2개
# 오프셋을 `+00:00` 으로 고정한다. 집계의 버킷은 문자열 접두사라 지역 오프셋이 섞이면
# 같은 순간이 다른 버킷으로 갈린다.
CALENDAR = (
    "2026-06-22T09",
    "2026-06-22T14",
    "2026-06-23T10",
    "2026-06-29T09",
    "2026-06-29T11",
    "2026-06-30T16",
)


def shifted_at(slot: str, position: int) -> str:
    """슬롯 안의 서로 다른 순간. 분만 벌리고 시각(버킷)은 슬롯이 정한다."""
    return f"{slot}:{position * 7 % 60:02d}:00+00:00"


def assign(records: list[dict]) -> list[dict]:
    """`record_id` 정렬 순으로 달력을 라운드로빈 — 입력 순서가 흔들려도 같은 배치가 나온다."""
    ordered = sorted(records, key=lambda record: record["record_id"])
    shifted = []
    for index, record in enumerate(ordered):
        slot = CALENDAR[index % len(CALENDAR)]
        shifted.append({**record, "collected_at": shifted_at(slot, index // len(CALENDAR))})
    return shifted


def week_of(day: str) -> str:
    """`2026-06-29` -> `2026-W27`. 달력이 상수라 이 라벨도 실행 시점과 무관하다."""
    iso = date.fromisoformat(day).isocalendar()
    return f"{iso[0]}-W{iso[1]:02d}"


def census(records: list[dict]) -> dict[str, dict[str, int]]:
    """단위별 (버킷 -> 건수). Job 로그로 찍혀, 무엇이 심겼는지가 실행 기록에 남는다."""
    counts: dict[str, dict[str, int]] = {
        "hour": defaultdict(int),
        "day": defaultdict(int),
        "week": defaultdict(int),
    }
    for record in records:
        day = record["collected_at"][:10]
        counts["hour"][record["collected_at"][:13]] += 1
        counts["day"][day] += 1
        counts["week"][week_of(day)] += 1
    return {unit: dict(sorted(buckets.items())) for unit, buckets in counts.items()}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="timeshift_bronze",
        description="집계 코퍼스의 수집 시각을 고정 달력으로 다시 찍어 별도 루트에 심는다.",
    )
    parser.add_argument(
        "--from", dest="source", type=Path, required=True, help="원본 데이터 레이크 루트"
    )
    parser.add_argument(
        "--to", dest="target", type=Path, required=True, help="다시 심을 데이터 레이크 루트"
    )
    args = parser.parse_args(argv)

    source = open_store(args.source)
    bronze = source.read_partitions(domain.BRONZE, domain.DS_NEWS_ITEM)
    analyses = silver.read_analyses(source)
    if not bronze or not analyses:
        print(
            f"timeshift: FAIL — {args.source} 가 비었다 "
            f"(bronze {len(bronze)} · silver {len(analyses)}). 집계 코퍼스가 먼저 서야 한다."
        )
        return 1

    shifted = assign(bronze)
    counts = census(shifted)

    # 하네스 전제를 여기서 끊는다. 버킷이 단위마다 하나뿐인 Gold 위에서는 롤업 단정이
    # 공허하게 통과한다 — 그러면 시나리오 3 은 초록인데 아무것도 시험하지 않은 것이 된다.
    if len(counts["week"]) < 2 or len(counts["day"]) < 2 or len(counts["hour"]) < 2:
        print(f"timeshift: FAIL — 단위마다 버킷이 둘 이상이어야 한다. census={counts}")
        return 1
    days_per_week: dict[str, set[str]] = defaultdict(set)
    hours_per_day: dict[str, set[str]] = defaultdict(set)
    for hour in counts["hour"]:
        hours_per_day[hour[:10]].add(hour)
    for day in counts["day"]:
        days_per_week[week_of(day)].add(day)
    if max(map(len, hours_per_day.values())) < 2 or max(map(len, days_per_week.values())) < 2:
        print(
            "timeshift: FAIL — 어떤 날도 시간 버킷을 둘 이상 갖지 않거나 어떤 주도 일 버킷을 "
            f"둘 이상 갖지 않는다. 롤업 합산이 항등식이 된다. census={counts}"
        )
        return 1

    target = open_store(args.target)
    by_cycle: dict[str, list[dict]] = defaultdict(list)
    for item in shifted:
        by_cycle[item["collection_cycle"]].append(item)
    n_bronze = sum(
        target.write_partition(
            domain.BRONZE, domain.DS_NEWS_ITEM, domain.cycle_partition(cycle), items
        )
        for cycle, items in by_cycle.items()
    )
    # Silver 는 그대로 — 조인 키(`record_id`)도 라벨도 파이프라인이 쓴 값이다.
    n_silver, _ = silver.store_analyses(target, silver.cycles_of(shifted), analyses)

    print(
        f"timeshift: re-stamped {n_bronze} bronze news_item (+{n_silver} silver analysis carried "
        f"through) {args.source} -> {args.target}"
    )
    for unit in ("hour", "day", "week"):
        buckets = counts[unit]
        print(
            f"  {unit}: {len(buckets)} buckets — "
            + ", ".join(f"{k}={v}" for k, v in buckets.items())
        )
    return 0


if __name__ == "__main__":  # pragma: no cover - 컨테이너 엔트리포인트
    raise SystemExit(main())
