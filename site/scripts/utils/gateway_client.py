#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
上游网关 HTTP 客户端 —— 全部评测脚本的唯一 HTTP 层。

只用标准库 urllib，零第三方依赖（与 fetch_upstream_models.py 保持一致）。
支持三条协议路径：
    messages  : POST /v1/messages          Anthropic 原生
    chat      : POST /v1/chat/completions  OpenAI 兼容
    responses : POST /v1/responses         OpenAI Responses

key 只从命令行传入，不写入任何文件。
"""

from __future__ import annotations

import json
import time
import urllib.error
import urllib.request

DEFAULT_BASE = "https://rsxermu666.cn"
ANTHROPIC_VERSION = "2023-06-01"
# 1M 上下文 beta 头。竞品网关 aiprimetech.io 的公开资料写明：真 1M 需要显式带这个头。
CONTEXT_1M_BETA = "context-1m-2025-08-07"


class GatewayClient:
    """一次调用返回统一结构，便于各层脚本共用同一套判读逻辑。"""

    def __init__(
        self,
        key: str,
        base: str = DEFAULT_BASE,
        timeout: int = 120,
        context_1m_beta: bool = False,
        retries: int = 3,
    ) -> None:
        self.key = key
        self.base = base.rstrip("/")
        self.timeout = timeout
        self.context_1m_beta = context_1m_beta
        self.retries = retries

    # ---------- 内部 ----------

    def _headers(self, protocol: str, extra: dict | None = None) -> dict:
        headers = {
            "Authorization": "Bearer " + self.key,
            "content-type": "application/json",
        }
        # 网关两种鉴权头都接受，冗余发一份防路由差异
        headers["x-api-key"] = self.key
        if protocol == "messages":
            headers["anthropic-version"] = ANTHROPIC_VERSION
            if self.context_1m_beta:
                headers["anthropic-beta"] = CONTEXT_1M_BETA
        if extra:
            headers.update(extra)
        return headers

    def _url(self, protocol: str) -> str:
        if protocol == "messages":
            return self.base + "/v1/messages"
        if protocol == "chat":
            return self.base + "/v1/chat/completions"
        if protocol == "responses":
            return self.base + "/v1/responses"
        raise ValueError("未知协议：" + protocol)

    @staticmethod
    def _extract_usage(body: dict) -> dict:
        """三种协议的 usage 字段位置不同，统一摊平成同一组键。"""
        usage = body.get("usage") or {}
        if not isinstance(usage, dict):
            return {}
        out = {
            "input_tokens": usage.get("input_tokens", usage.get("prompt_tokens", 0)),
            "output_tokens": usage.get("output_tokens", usage.get("completion_tokens", 0)),
            "cache_read_input_tokens": usage.get("cache_read_input_tokens", 0),
            "cache_creation_input_tokens": usage.get("cache_creation_input_tokens", 0),
        }
        detail = usage.get("input_tokens_details") or {}
        if isinstance(detail, dict) and detail.get("cached_tokens"):
            out["cache_read_input_tokens"] = detail["cached_tokens"]
        return out

    @staticmethod
    def _extract_text(body: dict) -> str:
        """把三种协议的响应正文抽成纯文本，用于判读。"""
        content = body.get("content")
        if isinstance(content, list):
            parts = []
            for block in content:
                if isinstance(block, dict) and block.get("type") == "text":
                    parts.append(block.get("text") or "")
            return "".join(parts)
        choices = body.get("choices")
        if isinstance(choices, list) and choices:
            message = choices[0].get("message") or {}
            return message.get("content") or ""
        if isinstance(body.get("output_text"), str):
            return body["output_text"]
        return ""

    # ---------- 对外 ----------

    def call(
        self,
        model: str,
        body: dict,
        protocol: str = "messages",
        timeout: int | None = None,
    ) -> dict:
        """发一次非流式请求。返回统一结构，异常不外抛。"""
        payload = dict(body)
        payload["model"] = model
        payload.pop("stream", None)

        request = urllib.request.Request(
            self._url(protocol),
            data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
            headers=self._headers(protocol),
            method="POST",
        )
        started = time.time()
        # 瞬时网络故障（SSL EOF、连接被重置、读超时）不是模型不可用，
        # 必须重试，否则会把客户端抖动误判成「该模型不可调」。
        network_error: Exception | None = None
        for attempt in range(self.retries + 1):
            try:
                with urllib.request.urlopen(request, timeout=timeout or self.timeout) as resp:
                    raw = resp.read().decode("utf-8", "replace")
                    headers = dict(resp.headers.items())
                parsed = json.loads(raw) if raw.strip() else {}
                return self._ok_result(parsed, headers, started)
            except urllib.error.HTTPError as exc:
                raw = exc.read().decode("utf-8", "replace")
                headers = dict(exc.headers.items()) if exc.headers else {}
                return {
                    "ok": False,
                    "http": exc.code,
                    "body": None,
                    "error": raw,
                    "usage": {},
                    "text": "",
                    "latency_s": round(time.time() - started, 2),
                    "headers": headers,
                    "trace_id": headers.get("X-Trace-Id") or headers.get("x-trace-id"),
                    "ratelimit_remaining": headers.get("X-RateLimit-Remaining"),
                }
            except Exception as exc:
                network_error = exc
                if attempt < self.retries:
                    time.sleep(2 ** attempt)
                    continue
        return {
            "ok": False,
            "http": 0,
            "body": None,
            "error": "%s: %s" % (type(network_error).__name__, network_error),
            "usage": {},
            "text": "",
            "latency_s": round(time.time() - started, 2),
            "headers": {},
            "trace_id": None,
            "ratelimit_remaining": None,
            "retried": self.retries,
        }


    def _ok_result(self, parsed: dict, headers: dict, started: float) -> dict:
        return {
            "ok": True,
            "http": 200,
            "body": parsed,
            "error": None,
            "usage": self._extract_usage(parsed),
            "text": self._extract_text(parsed),
            "latency_s": round(time.time() - started, 2),
            "headers": headers,
            "trace_id": headers.get("X-Trace-Id") or headers.get("x-trace-id"),
            "ratelimit_remaining": headers.get("X-RateLimit-Remaining"),
        }

    def call_stream(
        self,
        model: str,
        body: dict,
        protocol: str = "messages",
        timeout: int | None = None,
    ) -> dict:
        """发一次流式请求，返回事件列表与首字节延迟（TTFT）。"""
        payload = dict(body)
        payload["model"] = model
        payload["stream"] = True

        request = urllib.request.Request(
            self._url(protocol),
            data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
            headers=self._headers(protocol),
            method="POST",
        )
        started = time.time()
        events: list[dict] = []
        ttft = None
        chunks: list[str] = []
        try:
            with urllib.request.urlopen(request, timeout=timeout or self.timeout) as resp:
                headers = dict(resp.headers.items())
                content_type = resp.headers.get("Content-Type", "")
                for raw_line in resp:
                    line = raw_line.decode("utf-8", "replace").rstrip("\r\n")
                    if not line:
                        continue
                    if ttft is None:
                        ttft = round(time.time() - started, 3)
                    if not line.startswith("data:"):
                        continue
                    data = line[5:].strip()
                    if data == "[DONE]":
                        events.append({"type": "done"})
                        break
                    try:
                        parsed = json.loads(data)
                    except json.JSONDecodeError:
                        continue
                    events.append(parsed)
                    chunks.append(self._delta_text(parsed))
            return {
                "ok": True,
                "http": 200,
                "content_type": content_type,
                "events": events,
                "text": "".join(chunks),
                "usage": self._stream_usage(events),
                "ttft_s": ttft,
                "latency_s": round(time.time() - started, 2),
                "headers": headers,
                "trace_id": headers.get("X-Trace-Id") or headers.get("x-trace-id"),
                "error": None,
            }
        except urllib.error.HTTPError as exc:
            raw = exc.read().decode("utf-8", "replace")
            return {
                "ok": False,
                "http": exc.code,
                "error": raw,
                "events": [],
                "text": "",
                "usage": {},
                "ttft_s": None,
                "latency_s": round(time.time() - started, 2),
                "headers": dict(exc.headers.items()) if exc.headers else {},
                "trace_id": None,
                "content_type": "",
            }
        except Exception as exc:
            return {
                "ok": False,
                "http": 0,
                "error": "%s: %s" % (type(exc).__name__, exc),
                "events": [],
                "text": "",
                "usage": {},
                "ttft_s": None,
                "latency_s": round(time.time() - started, 2),
                "headers": {},
                "trace_id": None,
                "content_type": "",
            }

    @staticmethod
    def _delta_text(event: dict) -> str:
        """从单个 SSE 事件里抽增量文本。"""
        delta = event.get("delta")
        if isinstance(delta, dict) and isinstance(delta.get("text"), str):
            return delta["text"]
        choices = event.get("choices")
        if isinstance(choices, list) and choices:
            piece = choices[0].get("delta") or {}
            if isinstance(piece.get("content"), str):
                return piece["content"]
        return ""

    @staticmethod
    def _stream_usage(events: list[dict]) -> dict:
        """Anthropic 的 usage 分散在 message_start 与 message_delta 里，这里合并。"""
        usage: dict = {}
        for event in events:
            for candidate in (event.get("usage"), (event.get("message") or {}).get("usage")):
                if isinstance(candidate, dict):
                    usage.update(candidate)
        if not usage:
            return {}
        return {
            "input_tokens": usage.get("input_tokens", 0),
            "output_tokens": usage.get("output_tokens", 0),
            "cache_read_input_tokens": usage.get("cache_read_input_tokens", 0),
            "cache_creation_input_tokens": usage.get("cache_creation_input_tokens", 0),
        }

    # ---------- 非模型端点 ----------

    def list_models(self) -> dict:
        request = urllib.request.Request(
            self.base + "/v1/models",
            headers={"Authorization": "Bearer " + self.key},
            method="GET",
        )
        started = time.time()
        try:
            with urllib.request.urlopen(request, timeout=self.timeout) as resp:
                raw = resp.read().decode("utf-8", "replace")
            return {
                "ok": True,
                "http": 200,
                "body": json.loads(raw),
                "latency_s": round(time.time() - started, 2),
            }
        except urllib.error.HTTPError as exc:
            raw = exc.read().decode("utf-8", "replace")
            return {
                "ok": False,
                "http": exc.code,
                "error": raw,
                "body": None,
                "latency_s": round(time.time() - started, 2),
            }
        except Exception as exc:
            return {
                "ok": False,
                "http": 0,
                "error": "%s: %s" % (type(exc).__name__, exc),
                "body": None,
                "latency_s": round(time.time() - started, 2),
            }

    def post_json(self, path: str, body: dict | None = None) -> dict:
        """POST 一个 JSON 到任意路径，用于探测端点存在性与取计费数据。

        网关只注册 POST，GET 一律 404，所以端点存在性只能用 POST 判定：
        401/403 = 路由存在但鉴权失败，400 = 路由存在参数不对，只有 404 才是不存在。
        """
        request = urllib.request.Request(
            self.base + path,
            data=json.dumps(body or {}, ensure_ascii=False).encode("utf-8"),
            headers=self._headers("messages"),
            method="POST",
        )
        started = time.time()
        try:
            with urllib.request.urlopen(request, timeout=self.timeout) as resp:
                raw = resp.read().decode("utf-8", "replace")
            return {
                "ok": True,
                "http": 200,
                "body": json.loads(raw) if raw.strip() else {},
                "latency_s": round(time.time() - started, 2),
            }
        except urllib.error.HTTPError as exc:
            raw = exc.read().decode("utf-8", "replace")
            return {
                "ok": False,
                "http": exc.code,
                "error": raw,
                "body": None,
                "latency_s": round(time.time() - started, 2),
            }
        except Exception as exc:
            return {
                "ok": False,
                "http": 0,
                "error": "%s: %s" % (type(exc).__name__, exc),
                "body": None,
                "latency_s": round(time.time() - started, 2),
            }

    def daily_usage(self) -> dict:
        return self.post_json("/v1/user/daily-usage", {})

    def key_info(self) -> dict:
        """Key 信息查询。这个端点不吃 Authorization 头，必须把 key 放进 body 的 key 字段。"""
        return self.post_json("/api/user/key-info", {"key": self.key})

    def count_tokens(self, model: str, text: str) -> dict:
        return self.post_json(
            "/v1/messages/count_tokens",
            {"model": model, "messages": [{"role": "user", "content": text}]},
        )
