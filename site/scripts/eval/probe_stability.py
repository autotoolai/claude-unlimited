#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
L5 性能与稳定性：重复请求的延迟分布、限流行为、模型名一致性。

串行执行。每项都记 X-RateLimit-Remaining，用它观察限流窗口的消耗速度。

用法：
    python scripts/eval/probe_stability.py --key sk-xxx --model claude-opus-5-5
    python scripts/eval/probe_stability.py --key sk-xxx --repeat 20 --session-turns 20
"""

from __future__ import annotations

import argparse
import json
import statistics
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "utils"))

import eval_logger as logger  # noqa: E402
from context_parser import classify_error  # noqa: E402
from gateway_client import GatewayClient  # noqa: E402

PROMPT = "用三句话介绍杭州的西湖，不要提到具体票价。"


def percentile(values: list, ratio: float):
    if not values:
        return None
    ordered = sorted(values)
    index = min(len(ordered) - 1, int(round((len(ordered) - 1) * ratio)))
    return round(ordered[index], 3)


def run_repeat(client: GatewayClient, model: str, count: int, timeout: int) -> list:
    """同一请求重复 count 次，看延迟分布与成功率。"""
    rows = []
    for index in range(count):
        result = client.call(
            model,
            {"max_tokens": 400, "messages": [{"role": "user", "content": PROMPT}]},
            protocol="messages",
            timeout=timeout,
        )
        body = result.get("body") or {}
        row = {
            "kind": "repeat",
            "index": index,
            "ok": bool(result.get("ok")),
            "http": result.get("http"),
            "latency_s": result.get("latency_s"),
            "error_class": classify_error(result.get("error"), result.get("http") or 0),
            "echo_model": body.get("model") if isinstance(body, dict) else None,
            "usage": result.get("usage") or {},
            "ratelimit_remaining": result.get("ratelimit_remaining"),
            "trace_id": result.get("trace_id"),
        }
        rows.append(row)
        logger.append_ledger({**row, "ts": logger.now_iso(), "run_id": "", "layer": "l5", "model": model})
        print("  重复 %2d/%2d http=%-4s %6.2fs %s"
              % (index + 1, count, row["http"], row["latency_s"] or 0, row["error_class"]), flush=True)
        time.sleep(0.5)
    return rows


def run_session(client: GatewayClient, model: str, turns: int, timeout: int) -> list:
    """长会话：观察多轮之后是否掉质量、是否中途换模型。"""
    rows = []
    messages = []
    for turn in range(turns):
        messages.append({"role": "user", "content": "第 %d 轮：请用一句话说明你能做什么。" % (turn + 1)})
        result = client.call(
            model,
            {"max_tokens": 300, "messages": list(messages)},
            protocol="messages",
            timeout=timeout,
        )
        body = result.get("body") or {}
        row = {
            "kind": "session",
            "turn": turn,
            "ok": bool(result.get("ok")),
            "http": result.get("http"),
            "latency_s": result.get("latency_s"),
            "error_class": classify_error(result.get("error"), result.get("http") or 0),
            "echo_model": body.get("model") if isinstance(body, dict) else None,
            "usage": result.get("usage") or {},
            "ratelimit_remaining": result.get("ratelimit_remaining"),
        }
        rows.append(row)
        if result.get("ok"):
            messages.append({"role": "assistant", "content": result.get("text") or ""})
        print("  会话 %2d/%2d http=%-4s %6.2fs in_tok=%s"
              % (turn + 1, turns, row["http"], row["latency_s"] or 0,
                 (row["usage"] or {}).get("input_tokens")), flush=True)
        time.sleep(0.5)
    return rows


def summarize(rows: list) -> dict:
    latencies = [r["latency_s"] for r in rows if r.get("ok") and r.get("latency_s")]
    models_seen = sorted({r["echo_model"] for r in rows if r.get("echo_model")})
    errors: dict = {}
    for row in rows:
        if not row.get("ok"):
            errors[row["error_class"]] = errors.get(row["error_class"], 0) + 1
    remaining = [r["ratelimit_remaining"] for r in rows if r.get("ratelimit_remaining")]
    return {
        "total": len(rows),
        "ok": sum(1 for r in rows if r.get("ok")),
        "success_rate": round(sum(1 for r in rows if r.get("ok")) / len(rows), 4) if rows else None,
        "latency_p50": statistics.median(latencies) if latencies else None,
        "latency_p95": percentile(latencies, 0.95),
        "latency_min": round(min(latencies), 3) if latencies else None,
        "latency_max": round(max(latencies), 3) if latencies else None,
        "distinct_models_echoed": models_seen,
        "error_distribution": errors,
        "ratelimit_remaining_first": remaining[0] if remaining else None,
        "ratelimit_remaining_last": remaining[-1] if remaining else None,
        "ratelimit_consumed": (remaining[0] - remaining[-1]) if len(remaining) > 1 else None,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="L5 性能与稳定性")
    parser.add_argument("--key", required=True, help="上游 API Key（不会写入文件）")
    parser.add_argument("--base", default="https://rsxermu666.cn")
    parser.add_argument("--run-id", default="run")
    parser.add_argument("--model", required=True)
    parser.add_argument("--repeat", type=int, default=5)
    parser.add_argument("--session-turns", type=int, default=20)
    parser.add_argument("--timeout", type=int, default=180)
    parser.add_argument("--jobs", type=int, default=1, help="只接受 1：串行是硬要求")
    args = parser.parse_args()

    if args.jobs != 1:
        print("--jobs 只能为 1：本次评估要求串行执行", file=sys.stderr)
        return 2

    client = GatewayClient(args.key, base=args.base, timeout=args.timeout)

    print("== 重复请求 ==")
    rows = run_repeat(client, args.model, args.repeat, args.timeout)

    print("== 长会话 ==")
    rows += run_session(client, args.model, args.session_turns, args.timeout)

    report = {"model": args.model, "summary": summarize(rows), "rows": rows}
    path = logger.run_dir(args.run_id) / "l5_stability.json"
    logger.save_json(path, report)

    summary = report["summary"]
    print("\nL5 完成 -> %s" % path)
    print("  成功率 %.1f%%" % (summary["success_rate"] * 100))
    print("  延迟 p50=%.2fs p95=%s" % (summary["latency_p50"], summary["latency_p95"]))
    print("  回显的模型名：%s" % summary["distinct_models_echoed"])
    print("  限流余量：%s -> %s（消耗 %s）"
          % (summary["ratelimit_remaining_first"], summary["ratelimit_remaining_last"],
             summary["ratelimit_consumed"]))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
