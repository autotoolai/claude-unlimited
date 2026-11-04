#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
L2 能力矩阵：每个模型 × 每条协议路径 × 每个探针各打一次。

判读要点：网关「如实透传官方约束」与「网关自己出 bug」是两回事。
例如强制工具 tool_choice 在 Claude Opus 5.5 / Fable 5.1 上官方就是 400，
网关回 400 属于正向证据；网关回 200 反而说明它没透传。

用法：
    python scripts/eval/probe_capability.py --key sk-xxx
    python scripts/eval/probe_capability.py --key sk-xxx --only claude-opus-5-5 --probes p1,p4
"""

from __future__ import annotations

import argparse
import base64
import json
import re
import struct
import sys
import time
import zlib
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "utils"))

import eval_logger as logger  # noqa: E402
from context_parser import classify_error  # noqa: E402
from gateway_client import GatewayClient  # noqa: E402

SCRIPTS_DIR = Path(__file__).resolve().parent.parent
CONFIG_DIR = SCRIPTS_DIR.parent / "config"
SNAPSHOT_PATH = CONFIG_DIR / "models_upstream.json"

# 探针清单。顺序即执行顺序，cheap 的在前。
PROBES = ["p1_tool", "p3_structured", "p4_thinking", "p5_vision",
          "p6_cache", "p7_stream", "p8_prefill", "p2_forced_tool", "p9_unknown"]

TOOL_SCHEMA = {
    "type": "object",
    "properties": {"city": {"type": "string", "description": "城市名"}},
    "required": ["city"],
    "additionalProperties": False,
}

JSON_SCHEMA = {
    "type": "object",
    "properties": {
        "name": {"type": "string"},
        "age": {"type": "integer"},
    },
    "required": ["name", "age"],
    "additionalProperties": False,
}


# ---------- 小工具 ----------

def make_png_with_number(number: int, size: int = 96) -> str:
    """生成一张白底黑字的 PNG，把数字画成简单的点阵方块。

    不用第三方库：手写 PNG 编码（IHDR/IDAT/IEND），数字用 5x7 点阵渲染。
    探针问「图里的数字是几」，比问颜色更严格——颜色可能靠巧合答对。
    """
    font = {
        "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
        "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
        "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
        "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
        "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
        "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
        "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
        "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
        "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
        "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
    }
    glyphs = [font[c] for c in str(number)]
    glyph_w = 5
    gap = 2
    text_w = len(glyphs) * (glyph_w + gap) - gap
    scale = max(1, (size - 20) // 7)
    offset_x = (size - text_w * scale) // 2
    offset_y = (size - 7 * scale) // 2

    pixels = [[255] * size for _ in range(size)]
    for gi, glyph in enumerate(glyphs):
        for row, line in enumerate(glyph):
            for col, cell in enumerate(line):
                if cell != "1":
                    continue
                for dy in range(scale):
                    for dx in range(scale):
                        y = offset_y + row * scale + dy
                        x = offset_x + (gi * (glyph_w + gap) + col) * scale + dx
                        if 0 <= y < size and 0 <= x < size:
                            pixels[y][x] = 0

    raw = b""
    for row in pixels:
        raw += b"\x00" + bytes(row)

    def chunk(tag: bytes, data: bytes) -> bytes:
        return (struct.pack(">I", len(data)) + tag + data
                + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF))

    header = struct.pack(">IIBBBBB", size, size, 8, 0, 0, 0, 0)
    png = (b"\x89PNG\r\n\x1a\n"
           + chunk(b"IHDR", header)
           + chunk(b"IDAT", zlib.compress(raw, 9))
           + chunk(b"IEND", b""))
    return base64.b64encode(png).decode("ascii")


def build_body(protocol: str, probe: str) -> dict:
    """按协议生成探针请求体。"""
    if protocol == "messages":
        return _body_messages(probe)
    return _body_chat(probe)


def _body_messages(probe: str) -> dict:
    if probe == "p1_tool":
        return {
            "max_tokens": 1024,
            "tools": [{"name": "get_weather", "description": "查询某个城市的天气",
                       "input_schema": TOOL_SCHEMA}],
            "tool_choice": {"type": "auto"},
            "messages": [{"role": "user", "content": "请用 get_weather 工具查询北京今天的天气。"}],
        }
    if probe == "p2_forced_tool":
        return {
            "max_tokens": 1024,
            "tools": [{"name": "get_weather", "description": "查询天气",
                       "input_schema": TOOL_SCHEMA}],
            "tool_choice": {"type": "tool", "name": "get_weather"},
            "messages": [{"role": "user", "content": "北京天气怎么样？"}],
        }
    if probe == "p3_structured":
        return {
            "max_tokens": 1024,
            "output_config": {"format": {"type": "json_schema", "schema": JSON_SCHEMA}},
            "messages": [{"role": "user", "content": "给出 person.json，姓名张三，年龄 30。"}],
        }
    if probe == "p4_thinking":
        return {
            "max_tokens": 2000,
            "messages": [{"role": "user", "content":
                          "一个正方体棱长 3 米，切成 27 个小正方体。请给出所有小正方体表面积之和（平方米），"
                          "并说明推理过程。"}],
        }
    if probe == "p5_vision":
        return {
            "max_tokens": 512,
            "messages": [{"role": "user", "content": [
                {"type": "image", "source": {"type": "base64", "media_type": "image/png",
                                            "data": make_png_with_number(7)}},
                {"type": "text", "text": "这张图片里的数字是几？只回数字。"},
            ]}],
        }
    if probe == "p6_cache":
        return {
            "max_tokens": 512,
            "system": [{"type": "text", "text": CACHE_SYSTEM_TEXT,
                        "cache_control": {"type": "ephemeral"}}],
            "messages": [{"role": "user", "content": "用一句话说明这个 system 提示词的用途。"}],
        }
    if probe == "p7_stream":
        return {
            "max_tokens": 1024,
            "messages": [{"role": "user", "content": "用三句话介绍杭州。"}],
        }
    if probe == "p8_prefill":
        return {
            "max_tokens": 512,
            "messages": [
                {"role": "user", "content": "用一句话回答：法国的首都是哪里？"},
                {"role": "assistant", "content": "答案是"},
            ],
        }
    if probe == "p9_unknown":
        return {"max_tokens": 16, "messages": [{"role": "user", "content": "hi"}]}
    return {"max_tokens": 16, "messages": [{"role": "user", "content": "回复 OK。"}]}


def _body_chat(probe: str) -> dict:
    if probe == "p1_tool":
        return {
            "max_tokens": 1024,
            "tools": [{"type": "function", "function": {
                "name": "get_weather", "description": "查询某个城市的天气",
                "parameters": TOOL_SCHEMA}}],
            "tool_choice": "auto",
            "messages": [{"role": "user", "content": "请用 get_weather 工具查询北京今天的天气。"}],
        }
    if probe == "p2_forced_tool":
        return {
            "max_tokens": 1024,
            "tools": [{"type": "function", "function": {
                "name": "get_weather", "description": "查询天气", "parameters": TOOL_SCHEMA}}],
            "tool_choice": "required",
            "messages": [{"role": "user", "content": "北京天气怎么样？"}],
        }
    if probe == "p3_structured":
        return {
            "max_tokens": 1024,
            "response_format": {"type": "json_schema",
                                "json_schema": {"name": "person", "schema": JSON_SCHEMA}},
            "messages": [{"role": "user", "content": "给出 person.json，姓名张三，年龄 30。"}],
        }
    if probe == "p4_thinking":
        return {
            "max_tokens": 2000,
            "reasoning_effort": "high",
            "messages": [{"role": "user", "content":
                          "一个正方体棱长 3 米，切成 27 个小正方体。请给出所有小正方体表面积之和（平方米），"
                          "并说明推理过程。"}],
        }
    if probe == "p5_vision":
        return {
            "max_tokens": 512,
            "messages": [{"role": "user", "content": [
                {"type": "image_url", "image_url": {"url":
                    "data:image/png;base64," + make_png_with_number(7)}},
                {"type": "text", "text": "这张图片里的数字是几？只回数字。"},
            ]}],
        }
    if probe == "p6_cache":
        return {
            "max_tokens": 512,
            "messages": [
                {"role": "system", "content": CACHE_SYSTEM_TEXT},
                {"role": "user", "content": "用一句话说明这个 system 提示词的用途。"},
            ],
        }
    if probe == "p7_stream":
        return {"max_tokens": 1024,
                "messages": [{"role": "user", "content": "用三句话介绍杭州。"}]}
    if probe == "p8_prefill":
        return {
            "max_tokens": 512,
            "messages": [
                {"role": "user", "content": "用一句话回答：法国的首都是哪里？"},
                {"role": "assistant", "content": "答案是"},
            ],
        }
    if probe == "p9_unknown":
        return {"max_tokens": 16, "messages": [{"role": "user", "content": "hi"}]}
    return {"max_tokens": 16, "messages": [{"role": "user", "content": "回复 OK。"}]}


CACHE_SYSTEM_TEXT = "".join(
    "你是一个严谨的技术助手，负责回答编程与架构相关的问题。回答时给出可执行的步骤，"
    "并在必要时指出方案的取舍与风险。编号 %d：这是一段稳定不变的上下文文本，"
    "用于验证提示缓存是否被网关透传与命中。" % i
    for i in range(1, 260)
)


# ---------- 判读 ----------

def judge_tool_use(result: dict) -> dict:
    body = result.get("body") or {}
    content = body.get("content")
    if not isinstance(content, list):
        content = []
    calls = [b for b in content if isinstance(b, dict) and b.get("type") == "tool_use"]
    if not calls:
        choices = body.get("choices") or []
        if choices:
            message = choices[0].get("message") or {}
            calls = [t for t in (message.get("tool_calls") or []) if t.get("function")]
    if not calls:
        return {"supported": False, "detail": "未返回工具调用"}
    first = calls[0]
    if "function" in first:
        name = (first.get("function") or {}).get("name")
        args = first.get("function", {}).get("arguments")
        try:
            parsed = json.loads(args) if isinstance(args, str) else args
        except (json.JSONDecodeError, TypeError):
            parsed = None
    else:
        name = first.get("name")
        parsed = first.get("input")
    city = (parsed or {}).get("city") if isinstance(parsed, dict) else None
    return {
        "supported": True,
        "tool_name": name,
        "input": parsed,
        "input_valid_json": isinstance(parsed, dict),
        "city_ok": isinstance(city, str) and len(city) > 0,
        "stop_reason": body.get("stop_reason") or (body.get("choices") or [{}])[0].get("finish_reason"),
    }


def judge_structured(result: dict) -> dict:
    text = result.get("text") or ""
    candidate = text.strip()
    match = re.search(r"\{.*\}", candidate, re.S)
    if match:
        candidate = match.group(0)
    try:
        data = json.loads(candidate)
    except (json.JSONDecodeError, TypeError):
        return {"supported": False, "detail": "输出不是合法 JSON", "raw": text[:200]}
    if not isinstance(data, dict):
        return {"supported": False, "detail": "输出不是 JSON 对象", "raw": text[:200]}
    missing = [k for k in ("name", "age") if k not in data]
    age_ok = isinstance(data.get("age"), int)
    return {
        "supported": not missing and age_ok,
        "parsed": data,
        "missing": missing,
        "age_type_ok": age_ok,
    }


def judge_thinking(result: dict) -> dict:
    body = result.get("body") or {}
    content = body.get("content")
    think_chars = 0
    has_thinking = False
    if isinstance(content, list):
        for block in content:
            if isinstance(block, dict) and block.get("type") == "thinking":
                has_thinking = True
                think_chars += len(block.get("thinking") or "")
    reasoning = body.get("reasoning") or body.get("reasoning_content") or ""
    if isinstance(reasoning, str) and reasoning:
        has_thinking = True
        think_chars += len(reasoning)
    return {
        "has_thinking": has_thinking,
        "think_chars": think_chars,
        "out_tokens": (result.get("usage") or {}).get("output_tokens"),
        "text": (result.get("text") or "")[:200],
    }


def judge_vision(result: dict) -> dict:
    if not result.get("ok"):
        return {"supported": None, "detail": (result.get("error") or "")[:200]}
    text = (result.get("text") or "").strip()
    found = bool(re.search(r"7", text))
    return {
        "supported": True,
        "answer": text[:160],
        "correct": found,
        "verdict": "读出数字" if found else "未读出数字（图片块可能被吞）",
    }


def judge_cache(result: dict) -> dict:
    usage = result.get("usage") or {}
    return {
        "cache_read": usage.get("cache_read_input_tokens", 0),
        "cache_creation": usage.get("cache_creation_input_tokens", 0),
        "input_tokens": usage.get("input_tokens", 0),
        "hit": bool(usage.get("cache_read_input_tokens")),
    }


def judge_stream(result: dict) -> dict:
    events = result.get("events") or []
    types = [e.get("type") for e in events if isinstance(e, dict)]
    has_done = any(t == "done" for t in types)
    return {
        "content_type": result.get("content_type"),
        "event_count": len(events),
        "has_start": "message_start" in types,
        "has_delta": "content_block_delta" in types,
        "has_stop": "message_stop" in types,
        "has_done_marker": has_done,
        "text_len": len(result.get("text") or ""),
        "ttft_s": result.get("ttft_s"),
        "usage": result.get("usage") or {},
    }


def judge_prefill(result: dict) -> dict:
    if not result.get("ok"):
        return {"accepted": None, "detail": (result.get("error") or "")[:200]}
    text = result.get("text") or ""
    return {
        "accepted": True,
        "echoed_prefill": text.strip().startswith("答案是"),
        "text": text[:200],
    }


def run_probes(client: GatewayClient, model: str, protocol: str, probes: list, timeout: int) -> dict:
    """对单个模型跑完所有探针。"""
    out: dict = {}
    for probe in probes:
        if probe == "p7_stream":
            result = client.call_stream(model, build_body(protocol, probe), protocol=protocol, timeout=timeout)
        else:
            result = client.call(model, build_body(protocol, probe), protocol=protocol, timeout=timeout)

        record = {
            "http": result.get("http"),
            "ok": bool(result.get("ok")),
            "latency_s": result.get("latency_s"),
            "error_class": classify_error(result.get("error"), result.get("http") or 0),
            "usage": result.get("usage") or {},
        }
        if not result.get("ok"):
            record["error"] = (result.get("error") or "")[:300]

        if probe == "p1_tool":
            record["judge"] = judge_tool_use(result) if result.get("ok") else {"supported": False}
        elif probe == "p2_forced_tool":
            record["judge"] = judge_tool_use(result) if result.get("ok") else {
                "supported": False,
                "note": "官方对部分模型本就返回 400，若与官方一致则属透传正常",
            }
        elif probe == "p3_structured":
            record["judge"] = judge_structured(result) if result.get("ok") else {"supported": False}
        elif probe == "p4_thinking":
            record["judge"] = judge_thinking(result) if result.get("ok") else {"has_thinking": None}
        elif probe == "p5_vision":
            record["judge"] = judge_vision(result)
        elif probe == "p6_cache":
            record["judge"] = judge_cache(result)
        elif probe == "p7_stream":
            record["judge"] = judge_stream(result)
        elif probe == "p8_prefill":
            record["judge"] = judge_prefill(result)
        elif probe == "p9_unknown":
            record["judge"] = {"error_body": (result.get("error") or "")[:300]}

        out[probe] = record
        time.sleep(0.3)

    # 提示缓存要发两次才能判命中，第二次结果覆盖第一次
    if "p6_cache" in probes:
        first = out["p6_cache"]
        second_result = client.call(model, build_body(protocol, "p6_cache"), protocol=protocol, timeout=timeout)
        second = {
            "http": second_result.get("http"),
            "ok": bool(second_result.get("ok")),
            "usage": second_result.get("usage") or {},
            "judge": judge_cache(second_result),
        }
        first["second_pass"] = second
        first["judge"]["cache_hits_on_repeat"] = bool(second["judge"]["hit"])
        time.sleep(0.3)

    return out


def main() -> int:
    parser = argparse.ArgumentParser(description="L2 能力矩阵")
    parser.add_argument("--key", required=True, help="上游 API Key（不会写入文件）")
    parser.add_argument("--base", default="https://rsxermu666.cn")
    parser.add_argument("--run-id", default="run")
    parser.add_argument("--only", help="逗号分隔的模型 id 白名单")
    parser.add_argument("--probes", help="逗号分隔的探针名，默认全跑")
    parser.add_argument("--protocols", default="messages,chat")
    parser.add_argument("--timeout", type=int, default=120)
    parser.add_argument("--resume", action="store_true")
    parser.add_argument("--jobs", type=int, default=1, help="只接受 1：串行是硬要求")
    args = parser.parse_args()

    if args.jobs != 1:
        print("--jobs 只能为 1：本次评估要求串行执行", file=sys.stderr)
        return 2

    if not SNAPSHOT_PATH.exists():
        print("未找到 %s" % SNAPSHOT_PATH, file=sys.stderr)
        return 1
    snapshot = json.loads(SNAPSHOT_PATH.read_text(encoding="utf-8"))
    models = [m["id"] for m in snapshot.get("models", []) if m["id"].startswith("claude-")]
    if args.only:
        wanted = set(m.strip() for m in args.only.split(","))
        models = [m for m in models if m in wanted]

    probes = [p.strip() for p in args.probes.split(",")] if args.probes else list(PROBES)
    protocols = [p.strip() for p in args.protocols.split(",")]

    layer = "l2_capability"
    rows = logger.load_run(args.run_id, layer) or []
    done = {(r.get("model"), r.get("protocol")) for r in rows} if args.resume else set()

    client = GatewayClient(args.key, base=args.base, timeout=args.timeout)
    total = len(models) * len(protocols)
    index = 0

    for model in models:
        for protocol in protocols:
            index += 1
            if (model, protocol) in done:
                continue
            print("  [%2d/%2d] %-30s %-9s" % (index, total, model, protocol), flush=True)
            result = run_probes(client, model, protocol, probes, args.timeout)
            rows = [r for r in rows if not (r.get("model") == model and r.get("protocol") == protocol)]
            rows.append({"model": model, "protocol": protocol, "probes": result})
            logger.save_run(args.run_id, layer, rows)

    path = logger.run_dir(args.run_id) / (layer + ".json")
    print("L2 完成 -> %s" % path)
    return 0


if __name__ == "__main__":
    sys.exit(main())
