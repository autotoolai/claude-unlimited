#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
anthropic-beta 头透传验证：区分「网关不支持 1M 上下文」与「网关把 anthropic-beta 头剥掉了」。

背景：官方 1M 上下文要带 `anthropic-beta: context-1m-2025-08-07`。
历史实测的 256K 上限是在「不带 beta 头」的前提下得出的，而旧脚本的 --beta
参数从未真正实现过，那条结论一直缺一个对照。

两个独立实验：

实验 A（小输入，测头的透传与校验）
    输入小到不会触发上下文检查，于是只有 beta 头是变量。
        合法 1M beta   context-1m-2025-08-07
        非法 beta      definitely-not-a-real-beta-xyz
        官方 thinking  interleaved-thinking-2025-05-14
    判读：
        非法 beta 被 400 拒绝且错误提到 beta  -> 网关校验并透传该头，
            那么合法 beta 仍被拒就是上游真的不支持 1M
        非法 beta 照样 200                     -> 网关把 anthropic-beta 整个吃掉，
            1M 结论无法据此成立

实验 B（大输入，测 1M 档上限）
    同一份超长输入，带与不带合法 1M beta 各发一次，比较上报的上限。

用法：
    python scripts/eval/probe_beta_header.py --key sk-xxx --model claude-sonnet-4-6
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "utils"))

import eval_logger as logger  # noqa: E402
from context_parser import classify_error  # noqa: E402
from gateway_client import ANTHROPIC_VERSION, CONTEXT_1M_BETA  # noqa: E402
from token_estimator import build_filler  # noqa: E402

# 报错里的真实 token 数与上限
TOO_LONG = re.compile(
    r"prompt is too long:\s*([\d,]+)\s*tokens\s*(?:>|\\u003[eE])\s*([\d,]+)\s*tokens"
)

SMALL_BETAS = [
    ("无 beta 头", None),
    ("合法 1M beta", CONTEXT_1M_BETA),
    ("非法 beta", "definitely-not-a-real-beta-xyz"),
    ("官方 thinking beta", "interleaved-thinking-2025-05-14"),
]


def raw_call(base: str, key: str, model: str, text: str, beta: str | None, timeout: int) -> dict:
    """绕过 GatewayClient 的固定头，直接控制 anthropic-beta 头。"""
    headers = {
        "Authorization": "Bearer " + key,
        "content-type": "application/json",
        "anthropic-version": ANTHROPIC_VERSION,
    }
    if beta:
        headers["anthropic-beta"] = beta
    body = {
        "model": model,
        "max_tokens": 8,
        "messages": [{"role": "user", "content": text}],
    }
    request = urllib.request.Request(
        base.rstrip("/") + "/v1/messages",
        data=json.dumps(body, ensure_ascii=False).encode("utf-8"),
        headers=headers,
        method="POST",
    )
    started = time.time()
    try:
        with urllib.request.urlopen(request, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8", "replace")
        parsed = json.loads(raw) if raw.strip() else {}
        return {
            "ok": True, "http": 200, "body": parsed, "error": None,
            "usage": parsed.get("usage") or {},
            "latency_s": round(time.time() - started, 2),
        }
    except urllib.error.HTTPError as exc:
        return {
            "ok": False, "http": exc.code, "body": None,
            "error": exc.read().decode("utf-8", "replace"),
            "usage": {}, "latency_s": round(time.time() - started, 2),
        }
    except Exception as exc:
        return {
            "ok": False, "http": 0, "body": None,
            "error": "%s: %s" % (type(exc).__name__, exc),
            "usage": {}, "latency_s": round(time.time() - started, 2),
        }


def limit_of(error_text: str):
    match = TOO_LONG.search(error_text or "")
    if not match:
        return None, None
    return int(match.group(1).replace(",", "")), int(match.group(2).replace(",", ""))


def experiment_a(base: str, key: str, model: str, timeout: int) -> list:
    """小输入：只看 beta 头这一个变量。"""
    text = "请只回复一个字符：1"
    rows = []
    for label, beta in SMALL_BETAS:
        result = raw_call(base, key, model, text, beta, timeout)
        error_text = (result.get("error") or "")[:400]
        row = {
            "label": label,
            "beta_header": beta,
            "ok": result["ok"],
            "http": result["http"],
            "latency_s": result["latency_s"],
            "error_class": classify_error(result.get("error"), result["http"]),
            "error": error_text,
            "mentions_beta": "beta" in error_text.lower(),
        }
        rows.append(row)
        print("[A] %-22s http=%-4s %s" % (label, row["http"], row["error_class"]), flush=True)
        if not result["ok"]:
            print("     %s" % error_text[:180], flush=True)
        time.sleep(0.5)
    return rows


def experiment_b(base: str, key: str, model: str, text: str, timeout: int) -> list:
    """大输入：比较带与不带 1M beta 的上报上限。"""
    rows = []
    for label, beta in (("无 beta 头", None), ("合法 1M beta", CONTEXT_1M_BETA)):
        result = raw_call(base, key, model, text, beta, timeout)
        error_text = (result.get("error") or "")[:400]
        sent, limit = limit_of(error_text)
        row = {
            "label": label,
            "beta_header": beta,
            "ok": result["ok"],
            "http": result["http"],
            "latency_s": result["latency_s"],
            "error_class": classify_error(result.get("error"), result["http"]),
            "error": error_text,
            "sent_tokens": sent,
            "reported_limit": limit,
            "usage": result.get("usage") or {},
        }
        rows.append(row)
        print("[B] %-22s http=%-4s 上限=%s" % (label, row["http"], fmt_limit(limit)), flush=True)
        time.sleep(0.5)
    return rows


def fmt_limit(value):
    return "{:,}".format(value) if value else "—"


def main() -> int:
    parser = argparse.ArgumentParser(description="anthropic-beta 头透传验证")
    parser.add_argument("--key", required=True, help="上游 API Key（不会写入文件）")
    parser.add_argument("--base", default="https://rsxermu666.cn")
    parser.add_argument("--run-id", default="run")
    parser.add_argument("--model", default="claude-sonnet-4-6")
    parser.add_argument("--target-tokens", type=int, default=900_000)
    parser.add_argument("--timeout", type=int, default=600)
    args = parser.parse_args()

    # 密度用服务端自己的报错数字自校准，不信任 count_tokens
    # （实测网关的 count_tokens 比真实 usage.input_tokens 低约 40%）
    from gateway_client import GatewayClient  # noqa: E402
    from token_estimator import calibrate_density  # noqa: E402

    client = GatewayClient(args.key, base=args.base, timeout=120)
    density = calibrate_density(client, args.model)
    dpc = density.get("tokens_per_char")
    print("模型 %s，密度 %s token/字符（%s）"
          % (args.model, ("%.4f" % dpc) if dpc else "未知", density.get("method")))
    if not dpc:
        print("密度校准失败，无法构造探针", file=sys.stderr)
        return 1

    rows_a = experiment_a(args.base, args.key, args.model, args.timeout)

    text = build_filler(args.target_tokens, dpc, 0.6)
    print("\n实验 B：探针输入约 %s token\n" % fmt_limit(int(len(text) * dpc)))
    rows_b = experiment_b(args.base, args.key, args.model, text, args.timeout)

    # 判读
    invalid = next((r for r in rows_a if r["label"] == "非法 beta"), None)
    if invalid and not invalid["ok"] and invalid["mentions_beta"]:
        header_verdict = "网关校验并透传 anthropic-beta 头（非法头被拒并指出 beta）"
    elif invalid and invalid["ok"]:
        header_verdict = "网关吞掉了 anthropic-beta 头（非法头照样 200 通过）"
    elif invalid:
        header_verdict = "非法 beta 返回 http=%s，未提到 beta，判读不确定" % invalid["http"]
    else:
        header_verdict = "非法 beta 组缺失"

    limits = {r["label"]: r["reported_limit"] for r in rows_b}
    if limits.get("无 beta 头") and limits.get("合法 1M beta"):
        if limits["合法 1M beta"] > limits["无 beta 头"]:
            limit_verdict = "带 1M beta 头上限从 %s 升到 %s，1M 档确实靠 beta 头解锁" % (
                fmt_limit(limits["无 beta 头"]), fmt_limit(limits["合法 1M beta"]))
        else:
            limit_verdict = "带 1M beta 头上限未变（%s），1M 档不成立" % fmt_limit(limits["无 beta 头"])
    else:
        limit_verdict = "实验 B 未取到两个上限，无法比较"

    out = {
        "model": args.model,
        "target_tokens": args.target_tokens,
        "density": density,
        "experiment_a_header_passthrough": rows_a,
        "experiment_b_context_limit": rows_b,
        "header_verdict": header_verdict,
        "limit_verdict": limit_verdict,
    }
    path = logger.run_dir(args.run_id) / "l3_beta_header.json"
    logger.save_json(path, out)
    print("\n头透传判读：%s" % header_verdict)
    print("上限判读  ：%s" % limit_verdict)
    print("结果 -> %s" % path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
