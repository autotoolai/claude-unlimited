#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
输入尺寸扫描：用一组递进大小的请求，测网关在服务端到底把多少输入交给了上游。

要回答的问题：网关报 262144 的上限，那么送 240K token 进去时，
上游实际收到的是 240K 还是更少？如果更少且不报错，就是「静默截断」。

三个必要设计（前一版针题探针缺了这些，结论不可信）：
  1. 小尺寸对照组  先用 20K token 做一次同样的针题。答不出针说明探针本身无效
                    （模型不跟随指令、或 max_tokens 太小装不下思考块），
                    后面的大尺寸结果就全部作废，必须先修探针。
  2. max_tokens 放大  长输入会触发思考，8 个 token 全被思考块吃光，答案文本为空，
                    看起来就像「没读到针」。这里给 2048。
  3. 尺寸扫描      只看 usage.input_tokens 随请求大小的曲线。
                    它在某个尺寸之后出现平台 = 网关在服务端截断了输入。

用法：
    python scripts/eval/probe_input_truncation.py --key sk-xxx --model claude-opus-5-5
    python scripts/eval/probe_input_truncation.py --key sk-xxx --model claude-opus-5-5 \
        --sizes 20000,60000,120000,180000,240000
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "utils"))

import eval_logger as logger  # noqa: E402
from context_parser import classify_error, parse_context_limit  # noqa: E402
from gateway_client import GatewayClient  # noqa: E402
from token_estimator import build_filler, build_needle_filler  # noqa: E402

# 扫描的输入尺寸（token）
DEFAULT_SIZES = [20_000, 60_000, 120_000, 180_000, 220_000, 250_000]
CONTROL_SIZE = 20_000
# 长输入的输出预算，够装下思考块与答案
ANSWER_MAX_TOKENS = 2048


def needle_for(model: str) -> str:
    return "NEEDLE-%s" % model.replace(" ", "_").replace("/", "_")[-14:]


def ask_with_needle(client: GatewayClient, model: str, text: str, needle: str,
                     timeout: int) -> dict:
    """送带针的长文本，回收答案与用量。"""
    result = client.call(
        model,
        {
            "max_tokens": ANSWER_MAX_TOKENS,
            "messages": [{"role": "user", "content": text}],
        },
        protocol="messages",
        timeout=timeout,
    )
    body = result.get("body") or {}
    content = body.get("content")
    text_out = ""
    think_chars = 0
    if isinstance(content, list):
        for block in content:
            if not isinstance(block, dict):
                continue
            if block.get("type") == "text":
                text_out += block.get("text") or ""
            elif block.get("type") == "thinking":
                think_chars += len(block.get("thinking") or "")
    usage = result.get("usage") or {}
    actual_in = usage.get("input_tokens") or 0
    return {
        "ok": bool(result.get("ok")),
        "http": result.get("http"),
        "latency_s": result.get("latency_s"),
        "error": (result.get("error") or "")[:300],
        "error_class": classify_error(result.get("error"), result.get("http") or 0),
        "text": text_out[:300],
        "think_chars": think_chars,
        "usage": usage,
        "actual_input_tokens": actual_in,
        "needle_found": needle in text_out,
        "needle_in_thinking": needle in json.dumps(content, ensure_ascii=False) if content else False,
        "chars_sent": len(text),
    }


def calibrate(client: GatewayClient, model: str, timeout: int) -> float:
    """用一次超限请求的报错自校准密度。

    不用 count_tokens：实测网关该端点低估约 40%。
    """
    text = build_filler(400_000, 0.6, 0.6)
    result = client.call(
        model,
        {"max_tokens": 8, "messages": [{"role": "user", "content": text}]},
        protocol="messages",
        timeout=timeout,
    )
    info = parse_context_limit(result.get("error"))
    if info.get("sent_tokens") and len(text):
        density = info["sent_tokens"] / len(text)
        print("密度自校准：%s 字符 -> %s token（%.4f token/字符）"
              % ("{:,}".format(len(text)), "{:,}".format(info["sent_tokens"]), density))
        return density
    # 兜底：用 usage 回读
    small = build_filler(20_000, 0.6, 0.6)
    r2 = client.call(
        model,
        {"max_tokens": 8, "messages": [{"role": "user", "content": small}]},
        protocol="messages",
        timeout=timeout,
    )
    tokens = (r2.get("usage") or {}).get("input_tokens")
    if tokens and len(small):
        density = tokens / len(small)
        print("密度回读兜底：%.4f token/字符" % density)
        return density
    return 0.6


def main() -> int:
    parser = argparse.ArgumentParser(description="输入尺寸扫描，检测服务端静默截断")
    parser.add_argument("--key", required=True, help="上游 API Key（不会写入文件）")
    parser.add_argument("--base", default="https://rsxermu666.cn")
    parser.add_argument("--run-id", default="run")
    parser.add_argument("--model", default="claude-opus-5-5")
    parser.add_argument("--sizes", help="逗号分隔的输入 token 尺寸")
    parser.add_argument("--timeout", type=int, default=600)
    args = parser.parse_args()

    sizes = ([int(s) for s in args.sizes.split(",")] if args.sizes else DEFAULT_SIZES)
    if CONTROL_SIZE not in sizes:
        sizes = [CONTROL_SIZE] + sizes

    client = GatewayClient(args.key, base=args.base, timeout=args.timeout)
    needle = needle_for(args.model)

    print("模型 %s" % args.model)
    density = calibrate(client, args.model, args.timeout)
    if not density:
        print("密度校准失败", file=sys.stderr)
        return 1
    print()

    rows = []
    for size in sizes:
        text = build_needle_filler(size, density, needle, "middle", 0.6)
        result = ask_with_needle(client, args.model, text, needle, args.timeout)
        expected = int(len(text) * density)
        result["requested_tokens"] = size
        result["expected_input_tokens"] = expected
        ratio = (result["actual_input_tokens"] / expected) if expected else None
        result["ratio"] = round(ratio, 4) if ratio else None
        rows.append(result)

        print("  目标 %-9s 期望 %-9s 实际 %-9s 比例 %-8s 找到针 %-5s 思考 %-6s %s"
              % ("{:,}".format(size), "{:,}".format(expected),
                 "{:,}".format(result["actual_input_tokens"]),
                 result["ratio"], result["needle_found"], result["think_chars"],
                 result["error_class"]), flush=True)
        if not result["ok"]:
            print("     %s" % result["error"][:200], flush=True)
        time.sleep(0.5)

    # 判读
    control = next((r for r in rows if r["requested_tokens"] == CONTROL_SIZE), None)
    verdict_parts = []
    silent = False
    plateau = None

    if control and not control["needle_found"]:
        verdict_parts.append("对照组（%s token）就没找到针，探针无效，结论不成立"
                             % "{:,}".format(CONTROL_SIZE))
    elif control:
        verdict_parts.append("对照组（%s token）能找到针，探针有效"
                             % "{:,}".format(CONTROL_SIZE))

    # 找平台：连续三个尺寸的 actual 差异小于 3%
    actuals = [(r["requested_tokens"], r["actual_input_tokens"]) for r in rows if r["ok"]]
    for i in range(len(actuals) - 2):
        a, b, c = actuals[i][1], actuals[i + 1][1], actuals[i + 2][1]
        if a and abs(b - a) / a < 0.03 and abs(c - b) / b < 0.03:
            plateau = c
            break
    if plateau and actuals and actuals[-1][1] <= plateau * 1.05:
        silent = True
        verdict_parts.append("usage.input_tokens 在 %s token 处出现平台，"
                             "而请求仍在增大，说明网关在服务端截断了输入且未报错"
                             % "{:,}".format(plateau))
    elif not silent:
        verdict_parts.append("未观察到输入被截断的证据")

    out = {
        "model": args.model,
        "needle": needle,
        "density": density,
        "control_size": CONTROL_SIZE,
        "rows": rows,
        "silent_truncation": silent,
        "plateau_input_tokens": plateau,
        "verdict": "；".join(verdict_parts),
    }
    path = logger.run_dir(args.run_id) / ("l3_truncation_%s.json" % args.model.replace(" ", "_").replace("/", "_"))
    logger.save_json(path, out)
    print("\n判读：%s" % out["verdict"])
    print("结果 -> %s" % path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
