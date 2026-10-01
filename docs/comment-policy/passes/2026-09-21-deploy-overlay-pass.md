# deploy-overlay-pass — `deploy/overlays/prod/kustomization.yaml` 이 #92 로 갈아 쓴 8줄 판정

**표적 재판정이다(전수 아님).** 기준 커밋 `3e8eaf4`(#111 착지 tip = main, 감지 시점과 같다 — 2파도 0, 열린 PR 0).
직전 패스([feed-adapter-pass](2026-09-21-feed-adapter-pass.md))가 말미에 「다음 패스의 선은 ⑵ 최대
`deploy/overlays/prod/kustomization.yaml` +3 단독(#92 의 내용 교체분이라 `batch-pvc.yaml` 과 함께 `deploy/` 표적 패스에서 본다)」으로
이름 붙인 그 파일의 **#92 교체분만** 판정한다. 순증은 +3 이지만 blame 으로 가르면 #92(`60a8176`, 서빙 볼륨을 배치 claim 으로 재배선)가
갈아 쓴 주석은 **8줄**(`:2-4` 머리 · `:17-20` 서빙 패치 설명 · `:32` 배치 패치 라벨)이고 옛 줄 15줄(`:1` · `:33-35` · `:48-58`)은
그대로다 — 옛 20 = 15 + 교체 전 5(머리 2 · 서빙 패치 2 · 라벨 1) 이므로 8줄을 판정하면 행의 불변식이 선다(20 + 3 → 20 + 0).
**`batch-pvc.yaml` 은 이 패스에 넣지 않았다** — 「판단이 갈린 자리」 1. 이름은 겨눈 자리(prod **오버레이**)에서 땄다.
추적 task는 `rct_20260921-0018`(reconciler `tbm_econ-opinion-monitor-comment-necessity`).

판정 결과 요약: **판정 표면 8줄 중 제거 3줄 / 유지 5줄** — 그중 문면 정정 2자리(머리 lede 1줄로 줄임 · 서빙 패치 설명 4줄 → 3줄 재배열).
레포 전체 지문은 `2439 → 2436`(파일 `134 → 134`). 매니페스트는 한 바이트도 바뀌지 않았다 — 비주석 줄 필터(`^\s*#` 제외)가 편집 전후
동일하고, `kustomize build deploy/overlays/prod` 산출이 편집 전후 **바이트 동일**(md5 `8b4b55c9`)이며, `check-data-format-change.py`
는 `format_changed=false`(주석 줄은 내용 규칙에서 제외되고 이 파일은 `SENSITIVE_PATHS` 밖).

## 무엇이 들어왔나 — 귀속

| 파일 | 행(남음) | 기준 커밋 히트 | blame |
|---|---:|---:|---|
| `kustomization.yaml` | 20(initial-pass) | 23 | `c4038e2`·`6ef97ca`·`a23c19a` 15 · **`60a8176`(#92) 8** — 옛 줄 15 는 그대로, 5줄은 갈아 씀 |

| 자리(기준 커밋 줄) | 내용 | 지문 줄 | 판정 |
|---|---:|---:|---|
| A `:2-4` | 머리 2~4행 「points both emptyDir seams at the one claim: the scheduled batch writes Bronze -> Silver -> Gold into it and serving reads Gold from it, so what the hourly aggregate writes is what the dashboard shows.」 | 3 | **제거 2 · 정정 1** — lede 「points both emptyDir seams at the one claim in batch-pvc.yaml.」 1줄로 |
| B `:17-18` | 서빙 패치 설명 둘째 문장 「The base mount stays readOnly, so serving can never touch what the batch is writing.」 | 1 | **제거 1** — 남는 두 문장을 3줄로 재배열 |
| C `:17` | 서빙 패치 설명 첫 문장 「Swap the data emptyDir for the shared claim.」 | (1) | 유지 — 1줄 라벨 + 트래커 `∋` 인용 자물쇠 |
| D `:18-20` | 서빙 패치 설명 셋째 문장 「The volume is ReadWriteMany and a batch Pod already mounts it alongside serving, so a rolling update needs no Recreate guard.」 | (3) | 유지 — **판단 분기 2** |
| E `:32` | 배치 패치 라벨 「Give the batch workflow the same claim in place of the emptyDir seam.」(#92 는 `its own` → `the same` 한 단어 교체) | 1 | 유지 — 1줄 라벨(initial-pass 승계) |

합: 8 → 5(제거 3). 지문 `kustomization.yaml` 23 → 20. 트래커가 `∋` 로 인용하는 문자열 `Swap the data emptyDir for the shared claim` 은
편집 후에도 1회 그대로 있다(`grep -c` 1).

## 복원처 — `batch-pvc.yaml` 머리와 base 매니페스트가 주인, README「배포」·트래커·PR #92 가 사본

- **A** — 같은 오버레이의 `batch-pvc.yaml:1-3` 「The one data lake volume: the scheduled batch writes Bronze -> Silver -> Gold into it and
  the serving Pod reads Gold out of it」이 **축자 주인**이고(① — 「다른 파일 주석의 재진술 — 설명의 주인에만 둔다」), 이 파일의 두 패치가
  같은 `claimName: econ-batch-data` 를 적어 「the one claim」 을 값으로 보인다(①). README「배포」`:156-158` 「배치와 서빙은 **한 클레임
  (`econ-batch-data`, RWX)을 공유**한다. 파이프라인이 매시간 Bronze→Silver→Gold를 그 볼륨에 쓰고, 서빙은 같은 볼륨의 Gold를 읽기 전용으로
  읽는다 — … 재시작 없이 다음 집계부터 화면에 반영된다」가 마지막 절 「what the hourly aggregate writes is what the dashboard shows」까지
  적고(②), 문서 트래커 `docs/econ-opinion-monitor-doc-tracker/2026-09.md:161-162` 「파이프라인이 매시간 쓰는 Gold 를 **서빙이 같은 볼륨에서
  읽는다**」가 사본이며(②), PR #92 「Gap」 절이 같은 이야기다(③). initial-pass 가 이 파일에서 걷은 12줄과 같은 유형(README「배포」재진술).
  lede 1줄을 남긴 것은 e2e-runner-pass 가 러너 머리 목차 28줄을 lede 2줄로 줄인 선례 — 오버레이가 무엇을 모으는지 한 줄은 파일의 제목이다.
- **B** — base 매니페스트 `deploy/base/deployment.yaml:55` `readOnly: true` 가 규칙 자체이고 그 머리 `:4-5` 「The `data` emptyDir is the
  overlay seam — prod replaces it with a PVC」가 seam 을 적는다(①). README `:157` 「읽기 전용으로 읽는다」(②), 트래커 `:166` 「서빙의
  `readOnly` 마운트만 받았고」(②), PR #92 「뒤집을 수 있는 결정」 2 「서빙 `readOnly: true` 뿐」(③)이 사본이다. 「batch 가 쓰는 동안 serving 이
  건드릴 수 없다」는 readOnly 의 정의를 되풀이한 것이라 복원 불가능한 지식이 없다.

## 제거 3줄 — 복원 경로별 근거

| 경로 | 줄 | 자리 |
|---|---:|---|
| ① 코드(`batch-pvc.yaml:1-3` 머리 · 두 패치의 같은 `claimName` · `deploy/base/deployment.yaml:4-5`·`:55`) | 3 | A · B — 전부 ① 만으로 복원되고 아래 ②③ 이 겹친다 |
| ② 저장소 문서(README「배포」`:156-158` · 트래커 `2026-09.md:161-166`) | (3) | A 의 「집계가 쓰면 대시보드가 보인다」 · B 의 읽기 전용 |
| ③ PR 본문(#92 「Gap」·「뒤집을 수 있는 결정」 2) | (3) | A · B |

경로 ④(커밋 메시지)는 squash 제목만이라 근거로 쓰지 않았다.

## 유지 5줄

- **C** `Swap the data emptyDir for the shared claim.` — 패치 블록의 1줄 라벨(run.sh 단계 표지·`CMP-*` 앵커와 같은 규약)이고, 문서 트래커
  `2026-09.md:163` 이 「관측 좌표」로 `∋` 인용한다 — 지우면 자매 docs-impl 축의 좌표가 끊긴다(`Fairness.tsx:110-118` 인용 자물쇠와 같은 처분).
- **D** RWX + 배치 Pod 동시 마운트 → `Recreate` 불요 — 판단 분기 2.
- **E** `Give the batch workflow the same claim in place of the emptyDir seam.` — 배치 패치 블록의 1줄 라벨. initial-pass 가 「template-wide
  볼륨」 4줄 블록으로 유지한 것을 #92 가 한 단어만 바꿨다(`its own` → `the same`). C 와 같은 규약이라 같은 처분.

## 판단이 갈린 자리

1. **`batch-pvc.yaml`(행 남음 9 · 실측 7)을 이 패스에 넣지 않은 것** — 직전 두 패스가 「함께 본다」고 적었으나, `scripts/check-data-format-change.py:53`
   `SENSITIVE_PATHS` 의 `deploy/**/*pvc*.yaml` 이 그 파일을 잡아 주석만 고쳐도 `format_changed=true` → `review/manual-approval` 이 붙지 않아
   PR 이 사람 리뷰 뒤로 간다(`main` ruleset 의 필수 status check — sentiment-split-pass 「판단이 갈린 자리」 3 이 `check-data-format-change.py`
   를 사람 몫으로 뺀 것과 같은 근거). 게다가 9 → 7 은 **감소**라 「읽는 법」의 잔여 계수(⑴ 전량 + ⑵ 증가분)에 잡히지 않고, #92 가 새로 쓴
   머리 7줄은 「RWX 인 이유 · efs access point uid/gid 고정 · storageClassName 부재 의도」로 정책의 유지 유형(클러스터·런타임 제약)이라 무인
   패스가 걷을 것이 거의 없다. 사람이 그 PR 에 status 를 붙이거나 직접 패스를 내는 **사람 몫**으로 원장 행 비고에 적는다 — 이 패스는 그 행의
   숫자를 갱신하지 않는다(판정하지 않은 파일의 행은 만들지도 고치지도 않는다).
2. **D 를 유지한 것** — 「RWX 이고 배치 Pod 가 이미 같이 마운트하니 롤링 업데이트에 `Recreate` 가드가 필요 없다」는 PR #92 「뒤집을 수 있는
   결정」 1 이 거의 축자로 적고(③) 트래커 변경 이력 `:738` 「서빙의 `strategy: Recreate` 패치(근거가 RWO 였음)를 걷었다」(②)도 있어 복원은
   된다. 그러나 이 문장은 **이 파일에 없는 op** 의 근거다 — 파일만 읽는 사람에게는 `strategy` 패치가 없다는 사실 자체가 보이지 않아 PR #92 로
   갈 단서가 없고, 정책이 유지 유형으로 든 「RWO 볼륨·`Recreate` 전략 같은 클러스터·런타임 제약」의 뒷면이다. `deploy/base/kustomization.yaml`
   「No `images:` transformer here on purpose」(initial-pass 유지)·`Trend.tsx` 「deliberately *not* here」(trend-rejudge-pass 유지)의 「왜
   없는가」 선례를 승계해 남긴다. 「애매하면 남긴다」.
3. **A 의 lede 를 정정으로 남기고 옛 1행을 건드리지 않은 것** — 옛 1행 「Adds the app namespace, pulls in the scheduled batch (deploy/batch), and」은
   2행으로 이어지는 문장이라 2~4행을 통째 지우면 「and」 로 끝난다. 옛 줄을 고치는 대신 #92 의 2행을 1줄 lede 로 줄여 문장을 닫았다 —
   `batch-pvc.yaml` 을 이름으로 가리키는 것은 「설명의 주인」 포인터(`Trend.tsx:81-82` 포인터 선례)이지 내용의 재진술이 아니다.

## 검증

```
$ git diff --stat 3e8eaf4 -- deploy
 deploy/overlays/prod/kustomization.yaml | 11 ++++-------
 1 file changed, 4 insertions(+), 7 deletions(-)        # 전부 주석 줄
$ diff <(git show 3e8eaf4:<f> | grep -vE '^\s*#') <(grep -vE '^\s*#' <f>)   # 빈 출력
$ kustomize build deploy/overlays/prod | md5sum          # 8b4b55c9 편집 전후 동일 · preview 오버레이도 build 성공
$ python3 tests/e2e/check_scenario_mapping.py | md5sum   # rc=0, 9ad08df7 편집 전후 동일
$ python3 scripts/check-data-format-change.py 3e8eaf4 HEAD   # format_changed=false
$ grep -c 'Swap the data emptyDir for the shared claim' <f>   # 1 (트래커 ∋ 인용 유지)
$ <지문 스크립트>                                        # lines=2436 files=134 (편집 전 2439/134 = 감지값 바이트 동일)
```

파일 단독 계수 `kustomization.yaml` 23 → 20. 원장 재계수: 파일별 원장 138행 ↔ 지문 파일별 계수를 대조해 기준 트리 ⑴ 1파일 10 · ⑵ 4파일 8
== 옛 말미 18, 행 갱신 후 ⑴ 1파일 10 · ⑵ 3파일 5 == 새 말미 15(계수 밖 감소 `batch-pvc.yaml` 9→7 · `pvc.yaml` 소멸 그대로).

## 원장 반영

- 패스 이력 행 `| 2026-09-21 | deploy-overlay-pass | 3e8eaf4 | 2439 | 3 | 2436 | 134 → 134 |`.
- 「패스 이력」 아래 「deploy-overlay-pass도 표적 패스다」 문단.
- 파일 행 `deploy/overlays/prod/kustomization.yaml` 23 / 3 / 20(기준 패스 갱신, 행 신설 없음 — 138 그대로).
- 파일 행 `deploy/overlays/prod/batch-pvc.yaml` 비고에 사람 몫 표시(숫자 무수정).
- 말미 집계 `**deploy-overlay-pass 기준 · 레포 전체** | 2439 | 3 | 2436`, 잔여 18 → **15**(⑴ 10 사람 몫 + ⑵ 3파일 5).

## 범위 밖 (다음 패스로)

- ⑵ web 3파일 5줄: `web/src/screens/Fairness.test.tsx` 2 · `web/src/screens/Reprocess.test.tsx` 2(#102) · `web/src/screens/Compare.tsx` 1 —
  **다음 선은 이 묶음**(⑵ 최대 동률 2·2·1 — 한 web 패스로 묶는다; `Reprocess.test.tsx` 의 #102 분과 `Dashboard.tsx` `BRIEF_KEY` 앞 3줄 +
  `Trend.tsx:81-82` 포인터는 `Dashboard.tsx`·`Trend.tsx` 를 함께 여는 패스에서).
- ⑴ `scripts/check-data-format-change.py` 10줄 · `deploy/overlays/prod/batch-pvc.yaml` 머리 7줄(감소분 · 사람 게이트) — 사람 몫.
- `test_feeds.py` 옛 21줄의 `(AC1.x)` 태그 · `test_llm.py` 옛 8줄 · `test_aggregate.py` 인라인 AC 태그 3줄 — 정책 소유자가 인라인 태그의 처분을
  정할 때 함께.
- `ac3-8` 머리 단언 목록 표식 · 재판정 후보 5 · 원본 누락 좌표 — 직전 패스 말미 그대로.
