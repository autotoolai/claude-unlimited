#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
网关错误解析：读出真实上下文上限、给错误分类。

修掉的历史 bug：
    temp/ctx_probe2.py 的正则写的是 "tokens > (\\d+) tokens"，
    而网关用 Go 的 json.Marshal 序列化，">" 被 HTML 转义成 "\\u003e"，
    正则匹配不上，导致历史 ctx_limit.json 里 limit 字段全是 null。
    正确做法是先 json.loads 解码，再做纯文本匹配。
"""

from __future__ import annotations

import json
import re

# 报错原文形如：prompt is too long: 661991 tokens > 262144 tokens
TOO_LONG = re.compile(
    r"prompt is too long:\s*([\d,]+)\s*tokens\s*(?:>|\\u003[eE])\s*([\d,]+)\s*tokens"
)
# 兜底：正文里任意位置出现的 "262144 tokens"
ANY_LIMIT = re.compile(r"([\d,]{4,})\s*tokens")

CONTEXT_CODES = ("context_length_exceeded", "too_long", "maximum_context_length", "context_length")
PERMISSION_CODES = ("permission_error", "not_support", "not support")
RATE_CODES = ("rate_limit", "too many requests", "429")


def error_message(raw: str | None) -> str:
    """从原始错误体里取出 error.message 文本。

    网关错误体有两种形态：
        {"error": {"message": "...", "type": "...", "code": ...}, "type": "error"}
        {"message": "..."}
    """
    if not raw:
        return ""
    try:
        payload = json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        return raw
    if not isinstance(payload, dict):
        return raw
    error = payload.get("error")
    if isinstance(error, dict):
        message = error.get("message")
        if isinstance(message, str):
            return message
    message = payload.get("message")
    if isinstance(message, str):
        return message
    return raw


def error_code(raw: str | None) -> str:
    """取网关错误码，比如 context_length_exceeded / permission_error。"""
    if not raw:
        return ""
    try:
        payload = json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        return ""
    if not isinstance(payload, dict):
        return ""
    error = payload.get("error")
    if isinstance(error, dict) and error.get("code") is not None:
        return str(error["code"])
    if payload.get("code") is not None:
        return str(payload["code"])
    return ""


def parse_context_limit(raw_error: str | None) -> dict:
    """从网关错误体里读出真实上下文上限。

    返回 {"sent_tokens", "limit", "method"}：
        limit 为 None 表示这次报错没带上限数字（只知道超了）。
        method 记录判定路径，便于报告里说明依据。
    """
    message = error_message(raw_error)
    code = error_code(raw_error)

    match = TOO_LONG.search(message)
    if match:
        return {
            "sent_tokens": int(match.group(1).replace(",", "")),
            "limit": int(match.group(2).replace(",", "")),
            "method": "error_message",
        }

    if any(c in code.lower() for c in CONTEXT_CODES) or "prompt is too long" in message.lower():
        # 只知道超了，不知道具体上限。全文再兜底找一次 "NNNNNN tokens"
        found = ANY_LIMIT.search(message)
        return {
            "sent_tokens": None,
            "limit": int(found.group(1).replace(",", "")) if found else None,
            "method": "rejected_unknown_limit",
        }

    return {"sent_tokens": None, "limit": None, "method": "not_context_error"}


def classify_error(raw_error: str | None, http: int = 0) -> str:
    """给错误分类，各层脚本据此决定处置方式。

    context     上下文超限 —— 是预期结果，不是故障
    permission  Key 没有该模型的权限 —— 换 Key 才有用
    auth        鉴权失败 —— 检查 key
    rate_limit  触发限流 —— 退避重试
    bad_request 参数不对 —— 检查请求体
    server      上游 5xx —— 可重试
    network     连接层失败 —— 可重试
    unknown     其它
    """
    message = error_message(raw_error).lower()
    code = error_code(raw_error).lower()

    if any(c in code for c in CONTEXT_CODES) or "prompt is too long" in message:
        return "context"
    if http == 429 or any(c in code for c in RATE_CODES) or "rate limit" in message:
        return "rate_limit"
    if http in (401,):
        return "auth"
    if http == 403 or any(c in code for c in PERMISSION_CODES) or "不支持模型" in message:
        return "permission"
    if http == 400 or code == "invalid_request_error":
        return "bad_request"
    if http >= 500:
        return "server"
    if http == 0:
        return "network"
    return "unknown"
