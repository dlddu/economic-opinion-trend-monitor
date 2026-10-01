#!/usr/bin/env python3
"""e2e 피드 더블 — 정적 픽스처 서빙 + 고장 주입.

기본 정적 서빙(이 디렉터리, `feed-fixtures` ConfigMap)이 바이트 동일해야 이미 착지한
ingestion 2·3·4·5 의 입력이 흔들리지 않는다.

그 위에 `…-test-ingestion.md#시나리오 6` 이 요구하는 상류 행위를 경로 접두사로 얹는다.

  /__fail__/<무엇이든>        항상 503. 재시도를 다 쓰고도 못 가져오는 소스(격리 대상).
  /__flaky__/<n>/<파일>       같은 경로의 처음 n 번 요청만 503, 그 뒤 200. 재시도가 실제로
                              성공으로 이어지는지 관측하는 자리.
  /__slow__/<초>/<파일>       초만큼 지연한 뒤 응답. 수집 CLI 의 `--fetch-timeout` 보다 길게
                              주면 타임아웃 경로를 탄다.

`__flaky__` 카운터는 **서버 프로세스 수명 동안** 경로별로 누적된다(레플리카 1). Job 이 재시도로
다시 돌면 소진된 경로는 첫 시도에 성공한다 — 단정은 그대로 성립하고 재시도 경로를 덜 밟을 뿐이다.

표준 라이브러리만 쓴다 — 사이드로드된 배치 이미지의 python 으로 돌아야 하고, 더블이 제품 코드를
흉내내기 시작하면 같은 착각을 상류·하류 양쪽에서 반복하게 된다.
"""

from __future__ import annotations

import os
import sys
import time
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

# 환경변수는 클러스터 밖에서 손으로 돌려 볼 때의 통로다 — 더블 Pod 는 ConfigMap 마운트 지점(기본값)을 쓴다.
FEED_DIR = os.environ.get("E2E_FEED_DIR", "/feeds")
FAIL_PREFIX = "/__fail__/"
FLAKY_PREFIX = "/__flaky__/"
SLOW_PREFIX = "/__slow__/"
FAIL_STATUS = 503

_hits: dict[str, int] = {}


class DoubleHandler(SimpleHTTPRequestHandler):
    """정적 서빙 핸들러에 고장 주입 경로만 얹는다."""

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
        # 상태 줄(message)은 ASCII 만 — latin-1 로 인코딩되므로 한글을 넣으면 연결이 그냥 끊겨
        # 클라이언트는 503 이 아니라 전송 실패를 본다. 한글 설명은 본문(explain)으로 내린다.
        self.send_error(FAIL_STATUS, "e2e feed double: injected failure", why)

    def _flaky(self) -> None:
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
        rest = self.path[len(SLOW_PREFIX) :]
        head, _, tail = rest.partition("/")
        if not tail or not head.isdigit():
            self.send_error(400, "e2e feed double: bad __slow__ path", "/__slow__/<초>/<파일> 형태여야 한다")
            return
        time.sleep(int(head))
        self._serve(tail)

    def _serve(self, name: str) -> None:
        # 파일명 하나로 좁힌다 — 접두사 뒤의 값이 디렉터리를 거슬러 올라가지 못하게.
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
