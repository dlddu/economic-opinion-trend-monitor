#!/usr/bin/env python3
"""e2e LLM 더블 — chat-completions 상류를 대신한다.

피드 더블(`../feeds/server.py`)과 같은 자리이고, 두 더블이 공유하는 규약은 그 파일이 주인이다.

  POST /v1/chat/completions   요청 본문의 마지막 user 메시지 첫 줄(`TITLE: …`)로 기사를
                              특정하고, `model` 이 고른 응답 묶음에서 그 제목의 응답을
                              JSON 문자열로 감싸 돌려준다.
  GET  /healthz               readinessProbe 용. 픽스처가 로드됐는지까지 본다.

받은 요청마다 stderr 에 `received model=… prompt_sha256=…` 한 줄을 남긴다. 제품이 호출 기록에
적는 `prompt_sha256` 과 **같은 정의**라, spec 이 「기록된 프롬프트 = 실제로 전송된 프롬프트」를
수신 측 값과 대조할 수 있다(`…-test-pipeline-ops.md#시나리오 2`).

응답은 `responses.json` 이 정한다(ConfigMap `llm-fixtures` 로 마운트). 묶음은 모델 이름으로
고르고, `extends` 로 다른 묶음을 물려받을 수 있다 — 재분석(`…-test-analysis.md#시나리오 6`)이
"몇 건만 다시 판정한" 상태를 표현하는 자리다.

**모르는 제목은 404 다.** 기본 응답을 돌려주면 픽스처가 낡아 기사가 응답 표에서 빠져도 spec 이
초록으로 지나간다. 404 는 제품 경로에서 `CompletionError` → 그 레코드만 unanalyzed + `failed`
카운트로 드러나고, run.sh 가 그 카운트를 가드로 잡는다. 즉 픽스처 누락이 **조용한 통과**가 아니라
**시끄러운 실패**가 되게 하는 장치다.
"""

from __future__ import annotations

import hashlib
import json
import os
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

# 더블 Pod 에서는 ConfigMap 마운트 지점이 그대로 기본값이다. 환경변수는 이 파일을 클러스터
# 밖에서(손으로) 한 번 돌려 보기 위한 통로이지 배선의 일부가 아니다.
FIXTURE = Path(os.environ.get("E2E_LLM_FIXTURE", "/llm/responses.json"))
COMPLETIONS_SUFFIX = "/chat/completions"
HEALTH_PATH = "/healthz"
TITLE_PREFIX = "TITLE:"
MAX_BODY = 1 << 20  # 1MiB — 기사 하나의 프롬프트에 충분하고, 무한 읽기를 막는다.


def load_models(path: Path) -> dict[str, dict[str, dict]]:
    """`responses.json` 을 모델 이름 -> {제목: 응답} 으로 펴서 읽는다.

    `extends` 는 한 단계만 따라간다 — 체인을 허용하면 픽스처를 읽는 사람이 어떤 값이 실제로
    나가는지 추적해야 하고, 그 순간 더블이 설명 없이 동작하는 물건이 된다.
    """
    raw = json.loads(path.read_text(encoding="utf-8"))
    models = raw.get("models") or {}
    flat: dict[str, dict[str, dict]] = {}
    for name, spec in models.items():
        merged: dict[str, dict] = {}
        parent = spec.get("extends")
        if parent is not None:
            if parent not in models:
                raise ValueError(f"model {name!r} extends unknown model {parent!r}")
            if models[parent].get("extends") is not None:
                raise ValueError(f"model {name!r} extends {parent!r}, which itself extends")
            merged.update(models[parent].get("responses") or {})
        merged.update(spec.get("responses") or {})
        flat[name] = merged
    if not flat:
        raise ValueError(f"{path} 에 모델 응답 묶음이 없다")
    return flat


MODELS = load_models(FIXTURE)


def extract_title(payload: dict) -> str | None:
    """마지막 user 메시지 첫 줄의 `TITLE: …` 를 읽는다(`llm.build_prompt` 의 형식)."""
    messages = payload.get("messages")
    if not isinstance(messages, list):
        return None
    for message in reversed(messages):
        if not isinstance(message, dict) or message.get("role") != "user":
            continue
        content = message.get("content")
        if not isinstance(content, str):
            return None
        first = content.splitlines()[0].strip() if content.strip() else ""
        if not first.startswith(TITLE_PREFIX):
            return None
        return first[len(TITLE_PREFIX) :].strip()
    return None


def received_digest(payload: dict) -> str:
    """SHA-256 over the prompt bytes this request actually carried, system then user.

    Same definition as the product's `econ_core.calllog.prompt_digest` (NUL separator), on
    purpose: the call record stores `prompt_sha256` over what it *says* it sent, and a spec
    can only check "the record equals what was transmitted" against a digest taken on the
    receiving side. Logging the digest rather than the prompt keeps article text out of CI
    logs and needs no writable volume — the double's root filesystem is read-only.
    """
    system = ""
    user = ""
    for message in payload.get("messages") or []:
        if not isinstance(message, dict) or not isinstance(message.get("content"), str):
            continue
        if message.get("role") == "system" and not system:
            system = message["content"]
        elif message.get("role") == "user":
            user = message["content"]
    return hashlib.sha256(system.encode("utf-8") + b"\0" + user.encode("utf-8")).hexdigest()


class DoubleHandler(BaseHTTPRequestHandler):
    """chat-completions 한 경로와 헬스 체크만 있는 최소 핸들러."""

    def do_GET(self) -> None:
        if self.path == HEALTH_PATH:
            self._json(200, {"ok": True, "models": sorted(MODELS)})
            return
        self._fail(404, "e2e llm double: no such path", f"{self.path} 는 서빙하지 않는다")

    def do_POST(self) -> None:
        if not self.path.endswith(COMPLETIONS_SUFFIX):
            self._fail(404, "e2e llm double: no such path", f"{self.path} 는 서빙하지 않는다")
            return
        try:
            length = int(self.headers.get("Content-Length") or 0)
        except ValueError:
            self._fail(400, "e2e llm double: bad Content-Length", "숫자여야 한다")
            return
        if length <= 0 or length > MAX_BODY:
            self._fail(400, "e2e llm double: bad body length", f"1..{MAX_BODY} 바이트여야 한다")
            return
        try:
            payload = json.loads(self.rfile.read(length))
        except (json.JSONDecodeError, UnicodeDecodeError) as exc:
            self._fail(400, "e2e llm double: body was not JSON", str(exc))
            return
        if not isinstance(payload, dict):
            self._fail(400, "e2e llm double: body was not a JSON object", "객체여야 한다")
            return

        model = payload.get("model")
        responses = MODELS.get(model) if isinstance(model, str) else None
        if responses is None:
            self._fail(
                404,
                "e2e llm double: unknown model",
                f"model={model!r} 의 응답 묶음이 없다 (있는 것: {sorted(MODELS)})",
            )
            return

        # Logged before the canned lookup: a title the table lacks still *arrived*, and the
        # product records that as call_failed — its prompt must be checkable like any other.
        sys.stderr.write(
            f"[llm-double] received model={model} prompt_sha256={received_digest(payload)}\n"
        )

        title = extract_title(payload)
        if title is None:
            self._fail(
                400,
                "e2e llm double: prompt carried no TITLE line",
                "마지막 user 메시지 첫 줄이 `TITLE: <제목>` 이어야 한다",
            )
            return
        canned = responses.get(title)
        if canned is None:
            # 조용한 기본값 대신 실패. 픽스처에서 빠진 기사는 드러나야 한다.
            self._fail(
                404,
                "e2e llm double: no canned reply",
                f"model={model} 묶음에 제목 {title!r} 의 응답이 없다",
            )
            return

        # 제품 경로가 실제 모델에게서 받는 것과 같은 모양: 봉투 안의 content 는 **문자열**이고
        # 그 문자열이 JSON 이다. 여기서 dict 를 그대로 실으면 `parse_response` 가 하는 일을
        # 더블이 대신해 버려, 파싱 계약이 e2e 에서 한 번도 검증되지 않는다.
        self._json(
            200,
            {
                "id": "e2e-double",
                "object": "chat.completion",
                "model": model,
                "choices": [
                    {
                        "index": 0,
                        "finish_reason": "stop",
                        "message": {
                            "role": "assistant",
                            "content": json.dumps(canned, ensure_ascii=False),
                        },
                    }
                ],
            },
        )

    def _json(self, status: int, body: dict) -> None:
        encoded = json.dumps(body, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def _fail(self, status: int, message: str, why: str) -> None:
        # 상태 줄·본문 규약은 피드 더블(`fixtures/feeds/server.py`)과 같다.
        self.send_error(status, message, why)

    def log_message(self, fmt: str, *args) -> None:
        sys.stderr.write("[llm-double] " + (fmt % args) + "\n")


def main() -> int:
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    # 분석 CLI 는 기사를 순차로 부르지만, 스레딩 서버를 쓰면 readinessProbe 가 진행 중인
    # 요청 뒤에 줄 서지 않는다(프로브 실패로 Pod 가 NotReady 로 떨어지는 것을 막는다).
    with ThreadingHTTPServer(("", port), DoubleHandler) as httpd:
        sys.stderr.write(f"[llm-double] serving {sorted(MODELS)} from {FIXTURE} on :{port}\n")
        httpd.serve_forever()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
