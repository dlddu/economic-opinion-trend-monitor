#!/usr/bin/env python3
"""e2e 피드 더블 — 정적 픽스처 서빙 + 고장 주입.

수집 배치가 상류로 삼는 HTTP 엔드포인트를 대신한다. 기본 동작은 이 디렉터리(`/feeds`,
`feed-fixtures` ConfigMap)를 그대로 서빙하는 것이라 기존 피드 URL 은 이전과 **바이트 동일**하게
응답한다 — 이미 착지한 ingestion 2·3·4·5 의 입력을 건드리지 않기 위해서다.

그 위에 `…-test-ingestion.md#시나리오 6`(실패·중복·부분 장애 격리)이 요구하는 세 가지 상류
행위를 경로 접두사로 얹는다. 시나리오 7(본문 중복 제거·수정 버전 보존)은 주기마다 **다른 정적
파일**을 가리키는 것으로 충분해 여기에 상태가 없다 — 서버에 주기 개념을 넣지 않은 이유다.

  /__fail__/<무엇이든>        항상 503. 재시도를 다 쓰고도 못 가져오는 소스(격리 대상).
  /__flaky__/<n>/<파일>       같은 경로의 처음 n 번 요청만 503, 그 뒤 200. 재시도가 실제로
                              성공으로 이어지는지 관측하는 자리.
  /__slow__/<초>/<파일>       초만큼 지연한 뒤 응답. 수집 CLI 의 `--fetch-timeout` 보다 길게
                              주면 타임아웃 경로를 탄다.

`__flaky__` 카운터는 **서버 프로세스 수명 동안** 경로별로 누적된다(레플리카 1). 한 번 소진되면
같은 경로의 다음 수집은 첫 시도에서 바로 성공한다 — Job 이 재시도(backoffLimit)로 다시 도는
경우가 그렇다. 그때도 「flaky 소스는 격리되지 않는다」는 단정은 그대로 성립하므로 spec 이 거짓
초록이 되지는 않고, 다만 그 실행에서는 재시도 경로를 덜 밟는다.

표준 라이브러리만 쓴다 — 배치 이미지에 이미 있는 python 으로 돌아야 하고(새 이미지를 끌어오지
않는다), 더블이 제품 코드를 흉내내기 시작하면 같은 착각을 상류·하류 양쪽에서 반복하게 된다.
"""

from __future__ import annotations

import os
import sys
import time
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

# 더블 Pod 에서는 ConfigMap 마운트 지점이 그대로 기본값이다. 환경변수는 이 파일을 클러스터
# 밖에서(손으로) 한 번 돌려 보기 위한 통로이지 배선의 일부가 아니다.
FEED_DIR = os.environ.get("E2E_FEED_DIR", "/feeds")
FAIL_PREFIX = "/__fail__/"
FLAKY_PREFIX = "/__flaky__/"
SLOW_PREFIX = "/__slow__/"
FAIL_STATUS = 503

# 경로별 요청 횟수. `__flaky__` 가 "몇 번째 요청인가"를 판단하는 유일한 상태다.
_hits: dict[str, int] = {}


class DoubleHandler(SimpleHTTPRequestHandler):
    """정적 서빙 핸들러에 고장 주입 경로만 얹는다."""

    # 메서드 이름은 BaseHTTPRequestHandler 의 디스패치 규약(do_<METHOD>)이 정한다.
    def do_GET(self) -> None:
        if self.path.startswith(FAIL_PREFIX):
            self._fail("영구 실패 경로 — 재시도를 다 써도 못 가져온다")
            return
        if self.path.startswith(FLAKY_PREFIX):
            self._flaky()
            return
        if self.path.startswith(SLOW_PREFIX):
            self._slow()
            return
        super().do_GET()

    def do_HEAD(self) -> None:
        # 고장 경로에 HEAD 가 오면 GET 과 같은 판정을 받아야 한다(카운터도 같이 움직인다).
        if self.path.startswith((FAIL_PREFIX, FLAKY_PREFIX, SLOW_PREFIX)):
            self.do_GET()
            return
        super().do_HEAD()

    def _fail(self, why: str) -> None:
        # 상태 줄(message)은 ASCII 만 쓴다 — HTTP 상태 줄은 latin-1 로 인코딩되므로 한글을 넣으면
        # 응답을 쓰다 예외가 나고 연결이 그냥 끊긴다(클라이언트는 503 이 아니라 전송 실패를 본다).
        # 한글 설명은 본문(explain)으로 내린다.
        self.send_error(FAIL_STATUS, "e2e feed double: injected failure", why)

    def _flaky(self) -> None:
        """`/__flaky__/<n>/<파일>` — 처음 n 번은 503, 그 뒤 파일."""
        rest = self.path[len(FLAKY_PREFIX) :]
        head, _, tail = rest.partition("/")
        if not tail or not head.isdigit():
            self.send_error(
                400, "e2e feed double: bad __flaky__ path", "/__flaky__/<n>/<파일> 형태여야 한다"
            )
            return
        seen = _hits.get(self.path, 0) + 1
        _hits[self.path] = seen
        if seen <= int(head):
            self._fail(f"flaky {seen}/{head}회차 — 재시도를 유발한다")
            return
        self._serve(tail)

    def _slow(self) -> None:
        """`/__slow__/<초>/<파일>` — 지연 뒤 파일. 수집 쪽 타임아웃이 먼저 끊는 것이 기대 동작이다."""
        rest = self.path[len(SLOW_PREFIX) :]
        head, _, tail = rest.partition("/")
        if not tail or not head.isdigit():
            self.send_error(400, "e2e feed double: bad __slow__ path", "/__slow__/<초>/<파일> 형태여야 한다")
            return
        time.sleep(int(head))
        self._serve(tail)

    def _serve(self, name: str) -> None:
        """고장 경로가 끝내 돌려주는 실제 픽스처.

        경로 조각은 파일명 하나로 좁힌다 — 접두사 뒤에 온 값이 디렉터리를 거슬러 올라가지
        못하게 하기 위해서다.
        """
        target = Path(FEED_DIR) / Path(name).name
        if not target.is_file():
            self.send_error(404, "e2e feed double: fixture not found", f"{target.name} 픽스처가 없다")
            return
        body = target.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", "application/xml; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt: str, *args) -> None:
        # 기본 구현은 stderr 로 간다. Job 로그와 섞이지 않게 같은 스트림을 쓰되 접두사를 단다.
        sys.stderr.write("[feed-double] " + (fmt % args) + "\n")


def main() -> int:
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    handler = partial(DoubleHandler, directory=FEED_DIR)
    # 지연 경로가 다른 소스의 요청을 막지 않도록 스레딩 서버를 쓴다 — 단일 스레드였다면
    # `__slow__` 하나가 수집 전체를 직렬로 세워 타임아웃 관측이 다른 소스로 번진다.
    with ThreadingHTTPServer(("", port), handler) as httpd:
        sys.stderr.write(f"[feed-double] serving {FEED_DIR} on :{port}\n")
        httpd.serve_forever()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
