#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
L3 上下文窗口实测。

核心原理：服务端在客户端停止读响应之前已经完成 tokenize，所以即使请求被拒绝，
它算出的真实 token 数依然准确回传，报错 message 里同时给出「实际送了多少」和
「上限是多少」——一次越界请求就同时定出上限与字符→token 的换算率。

★ 不信任 count_tokens 端点
实测网关的 POST /v1/messages/count_tokens 对同一份文本报 1913 token，
而真实 usage.input_tokens 是 3157，低估约 40%。所以密度校准一律走
「发一次超限请求，从报错里读服务端自己的 token 数」。

★ 决定性实验：带不带 context-1m beta 头
竞品网关 aiprimetech.io 的公开资料写明真 1M 需要显式带该头；历史探测脚本
预留了 --beta 参数却从未真正发送过，所以历史 256K 结论是在「不带 beta」的
前提下得出的。两者必须 A/B 对照。

用法：
    python scripts/eval/probe_context_limit.py --key sk-xxx --mode all
    python scripts/eval/probe_context_limit.py --key sk-xxx --mode beta \
        --only "claude-sonnet-4-6 (1M),claude-opus-5-5"
    python scripts/eval/probe_context_limit.py --key sk-xxx --mode truncation
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

SCRIPTS_DIR = Path(__file__).resolve().parent.parent
CONFIG_DIR = SCRIPTS_DIR.parent / "config"
SNAPSHOT_PATH = CONFIG_DIR / "models_upstream.json"

# 首次探测的目标 token 数。绝大多数模型上限在 256K 上下，
# 这个量级必定超限，一次请求就能拿到「实际 token 数 + 上限」。
FIRST_PROBE_TOKENS = 400_000
# 校准后如果发现上限远超 400K，再按这个量级补一次
BIG_PROBE_TOKENS = 1_200_000
# 校准密度的初始猜测，误差无所谓，后面会用服务端返回值纠正
ROUGH_TOKENS_PER_CHAR = 0.6


def load_declared_models() -> dict:
    if not SNAPSHOT_PATH.exists():
        return {}
    snapshot = json.loads(SNAPSHOT_PATH.read_text(encoding="utf-8"))
    return {m["id"]: m for m in snapshot.get("models", [])}


def long_call(client: GatewayClient, model: str, text: str, beta: bool, timeout: int) -> dict:
    """发一次长输入请求。beta=True 时用带 context-1m 头的客户端。"""
    c = GatewayClient(
        client.key,
        base=client.base,
        timeout=timeout,
        context_1m_beta=beta,
    )
    result = c.call(
        model,
        {"max_tokens": 8, "messages": [{"role": "user", "content": text}]},
        protocol="messages",
        timeout=timeout,
    )
    limit_info = parse_context_limit(result.get("error")) if not result.get("ok") else {
        "sent_tokens": None, "limit": None, "method": "ok"
    }
    return {
        "ok": bool(result.get("ok")),
        "http": result.get("http"),
        "latency_s": result.get("latency_s"),
        "usage": result.get("usage") or {},
        "text": (result.get("text") or "")[:200],
        "error": (result.get("error") or "")[:400],
        "error_class": classify_error(result.get("error"), result.get("http") or 0),
        "sent_tokens": limit_info.get("sent_tokens"),
        "limit": limit_info.get("limit"),
        "parse_method": limit_info.get("method"),
        "chars": len(text),
        "beta": beta,
    }


def measure_upstream_density(client: GatewayClient, model: str, timeout: int) -> dict:
    """量上游真实 token 密度，与网关自己的计数器分开。

    为什么要分开：网关用一个自己的计数器判超限（报错里的 262144 是它的单位），
    但这个计数器比上游真实的 token 数高约 1.57 倍。所以「262144」不等于
    「能塞进 262144 个真实 token」。这里用几档小请求量出上游真实密度，
    两者一比就知道真实可用窗口有多大。

    顺带量出网关注入的系统前缀开销（L1 观察到 10 字符的提示词报 1590 token）。
    """
    ladder = []
    for target in (500, 4_000, 16_000, 32_000):
        text = build_filler(target, 0.6, 0.6)
        result = client.call(
            model,
            {"max_tokens": 4, "messages": [{"role": "user", "content": text}]},
            protocol="messages",
            timeout=timeout,
        )
        tokens = (result.get("usage") or {}).get("input_tokens")
        if tokens:
            ladder.append({"target": target, "chars": len(text), "tokens": tokens})
        time.sleep(0.2)

    if not ladder:
        return {"ok": False, "reason": "usage.input_tokens 读不到"}

    # 用最大的一档估密度，用最小的一档估前缀开销
    biggest = max(ladder, key=lambda r: r["chars"])
    smallest = min(ladder, key=lambda r: r["chars"])
    density = biggest["tokens"] / biggest["chars"]
    overhead = smallest["tokens"] - smallest["chars"] * density
    return {
        "ok": True,
        "ladder": ladder,
        "upstream_tokens_per_char": density,
        "prefix_overhead_tokens": round(overhead),
        "note": "upstream_tokens_per_char 是上游真实密度；prefix_overhead 是网关注入的前缀",
    }


def probe_once(client: GatewayClient, model: str, target_tokens: int, beta: bool,
               timeout: int, density: float | None = None) -> dict:
    """发一次超限探针，同时拿到上限与密度。

    density 已知就用它构造输入；未知就用粗略猜测，之后从返回值纠正。
    """
    dpc = density or ROUGH_TOKENS_PER_CHAR
    text = build_filler(target_tokens, dpc, 0.6)
    result = long_call(client, model, text, beta, timeout)
    result["target_tokens"] = target_tokens
    if result.get("sent_tokens") and result.get("chars"):
        result["measured_density"] = result["sent_tokens"] / result["chars"]
    elif result.get("ok"):
        used = (result.get("usage") or {}).get("input_tokens")
        if used and result.get("chars"):
            result["measured_density"] = used / result["chars"]
    return result


def calibrate_and_limit(client: GatewayClient, model: str, beta: bool, timeout: int) -> dict:
    """一次请求定出上限与密度。

    流程：先按粗略密度构造 40 万 token 的输入发出去。
      - 被拒且报错带上限 -> 上限已知；报错的 sent_tokens 与字符数之比就是密度
      - 通过了           -> 说明上限更高，用回读的 usage.input_tokens 算密度，
                            再发一次 120 万 token 的输入拿真上限
    """
    first = probe_once(client, model, FIRST_PROBE_TOKENS, beta, timeout)
    if first.get("limit"):
        return {
            "measured_limit": first["limit"],
            "density": first.get("measured_density"),
            "probe": first,
            "used_overflow": False,
        }

    if first.get("ok"):
        # 上限高于 40 万，用密度再发一次更大的
        density = first.get("measured_density") or ROUGH_TOKENS_PER_CHAR
        second = probe_once(client, model, BIG_PROBE_TOKENS, beta, timeout, density=density)
        if second.get("limit"):
            return {
                "measured_limit": second["limit"],
                "density": second.get("measured_density") or density,
                "probe": second,
                "used_overflow": True,
            }
        return {
            "measured_limit": None,
            "density": density,
            "probe": second,
            "used_overflow": True,
            "first_probe": first,
        }

    # 被拒但报错没带上限数字，兜底再发一次更大的
    density = first.get("measured_density") or ROUGH_TOKENS_PER_CHAR
    second = probe_once(client, model, BIG_PROBE_TOKENS, beta, timeout, density=density)
    return {
        "measured_limit": second.get("limit"),
        "density": second.get("measured_density") or density,
        "probe": second,
        "used_overflow": True,
        "first_probe": first,
    }


def probe_truncation(client: GatewayClient, model: str, density: float, limit: int,
                     timeout: int) -> dict:
    """静默截断检测：针埋在不同位置，看模型是否真的读到了。

    判定铁证是 usage.input_tokens —— 它是服务端实际 tokenize 的长度。
    如果送出的字符数乘密度远大于回读的 input_tokens，且针答错，
    说明网关在服务端把输入截断了，而且没有报错。
    """
    if not limit:
        return {"skipped": "未知上限，无法构造针题"}

    target = int(limit * 0.95)
    results = {}
    for position in ("head", "middle", "tail"):
        needle = "NEEDLE-%s-%s" % (model.replace("/", "_")[-12:].replace(" ", "_"), position.upper())
        text = build_needle_filler(target, density, needle, position, 0.6)
        result = long_call(client, model, text, False, timeout)
        echoed = needle in (result.get("text") or "")
        actual_in = (result.get("usage") or {}).get("input_tokens") or 0
        expected = int(len(text) * density)
        results[position] = {
            "ok": result["ok"],
            "http": result["http"],
            "needle": needle,
            "needle_found": echoed,
            "actual_input_tokens": actual_in,
            "expected_input_tokens": expected,
            "truncated_ratio": round(actual_in / expected, 4) if expected else None,
            "answer": result.get("text", "")[:160],
            "error_class": result["error_class"],
        }
        time.sleep(0.3)

    answered = [v for v in results.values() if v.get("ok")]
    silent = False
    for value in answered:
        ratio = value.get("truncated_ratio")
        if ratio is not None and ratio < 0.9 and not value.get("needle_found"):
            silent = True
    return {
        "target_tokens": target,
        "positions": results,
        "silent_truncation": silent,
        "needle_hit_rate": round(
            sum(1 for v in answered if v.get("needle_found")) / len(answered), 3
        ) if answered else None,
    }


def run_models(
    client: GatewayClient,
    run_id: str,
    models: list,
    only: list | None,
    modes: set,
    timeout: int,
    resume: bool,
) -> list:
    layer = "l3_context"
    rows = logger.load_run(run_id, layer) or []
    done = {r.get("model") for r in rows} if resume else set()
    declared = load_declared_models()

    targets = list(models)
    if only:
        wanted = set(only)
        targets = [m for m in targets if m in wanted]
    if not targets:
        raise SystemExit("没有匹配的模型，检查 --only")

    for index, model in enumerate(targets, 1):
        if model in done:
            print("  [%2d/%2d] %-30s 跳过（已完成）" % (index, len(targets), model), flush=True)
            continue

        entry = {
            "model": model,
            "declared_window": declared.get(model, {}).get("context_window"),
            "measured_limit": None,
            "measured_limit_with_beta": None,
            "beta_changes_limit": None,
            "density": None,
            "truncation": None,
            "checked_at": logger.now_iso(),
        }

        print("  [%2d/%2d] %-30s 探测中" % (index, len(targets), model), flush=True)

        upstream = measure_upstream_density(client, model, timeout)
        entry["upstream_density"] = upstream
        if upstream.get("ok"):
            print("      上游密度 %.4f token/字符，网关前缀开销 %s token"
                  % (upstream["upstream_tokens_per_char"],
                     upstream["prefix_overhead_tokens"]), flush=True)
        time.sleep(0.3)

        if "tiered" in modes or "beta" in modes or "all" in modes:
            no_beta = calibrate_and_limit(client, model, False, timeout)
            entry["measured_limit"] = no_beta["measured_limit"]
            entry["density"] = no_beta["density"]
            entry["probe_no_beta"] = no_beta["probe"]
            print("      不带 beta：上限 %s，密度 %s"
                  % (entry["measured_limit"], fmt_density(entry["density"])), flush=True)
            time.sleep(0.5)

        if "beta" in modes or "all" in modes:
            with_beta = calibrate_and_limit(client, model, True, timeout)
            entry["measured_limit_with_beta"] = with_beta["measured_limit"]
            entry["probe_with_beta"] = with_beta["probe"]
            print("      带 beta  ：上限 %s" % entry["measured_limit_with_beta"], flush=True)
            time.sleep(0.5)

        if entry["measured_limit"] is not None and entry["measured_limit_with_beta"] is not None:
            entry["beta_changes_limit"] = entry["measured_limit_with_beta"] != entry["measured_limit"]

        # 换算真实可用窗口：网关计数器卡 262144，但它的计数比上游真实 token 高，
        # 所以能塞进上游的真实 token 数要小得多。
        gateway_density = entry.get("density")
        upstream_density = (upstream or {}).get("upstream_tokens_per_char")
        limit = entry.get("measured_limit") or entry.get("measured_limit_with_beta")
        if gateway_density and upstream_density and limit:
            max_chars = limit / gateway_density
            real = int(max_chars * upstream_density + (upstream or {}).get("prefix_overhead_tokens", 0))
            entry["effective_real_context_tokens"] = real
            entry["counter_overestimate_ratio"] = round(gateway_density / upstream_density, 4)
            print("      真实可用窗口约 %s token（网关计数器高估 %.2f 倍）"
                  % ("{:,}".format(real), entry["counter_overestimate_ratio"]), flush=True)

        if "truncation" in modes or "all" in modes:
            # 静默截断检测改用 scripts/eval/probe_input_truncation.py。
            # 旧探针有两个致命缺陷：max_tokens=8 会被思考块吃光导致回答全空
            # （看起来像没读到针），且没有小尺寸对照组，无法区分「网关截断」
            # 与「模型不跟随指令」。新探针有对照组与尺寸扫描。
            entry["truncation"] = {
                "deferred_to": "scripts/eval/probe_input_truncation.py",
                "reason": "旧探针缺对照组且 max_tokens 过小，结论不可信",
            }

        rows = [r for r in rows if r.get("model") != model]
        rows.append(entry)
        logger.save_run(run_id, layer, rows)

    return rows


def fmt_density(value):
    return ("%.4f" % value) if value else "—"


def main() -> int:
    parser = argparse.ArgumentParser(description="L3 上下文窗口实测")
    parser.add_argument("--key", required=True, help="上游 API Key（不会写入文件）")
    parser.add_argument("--base", default="https://rsxermu666.cn")
    parser.add_argument("--run-id", default="run")
    parser.add_argument("--mode", default="all",
                        choices=["tiered", "beta", "truncation", "all"],
                        help="tiered=测上限；beta=带/不带 context-1m 头 A/B；truncation=针题检测静默截断")
    parser.add_argument("--only", help="逗号分隔的模型 id 白名单")
    parser.add_argument("--timeout", type=int, default=600)
    parser.add_argument("--resume", action="store_true")
    parser.add_argument("--jobs", type=int, default=1, help="只接受 1：串行是硬要求")
    args = parser.parse_args()

    if args.jobs != 1:
        print("--jobs 只能为 1：本次评估要求串行执行", file=sys.stderr)
        return 2

    declared = load_declared_models()
    if not declared:
        print("未找到 %s" % SNAPSHOT_PATH, file=sys.stderr)
        return 1

    models = [m for m in declared.keys() if m.startswith("claude-")]
    only = [m.strip() for m in args.only.split(",")] if args.only else None
    if only:
        models = [m for m in models if m in only]
        if not models:
            print("没有匹配的模型，检查 --only", file=sys.stderr)
            return 2

    modes = {"tiered", "beta", "truncation"} if args.mode == "all" else {args.mode}
    client = GatewayClient(args.key, base=args.base, timeout=args.timeout)
    rows = run_models(client, args.run_id, models, only, modes, args.timeout, args.resume)

    path = logger.run_dir(args.run_id) / "l3_context.json"
    print("L3 完成 -> %s" % path)
    for row in rows:
        print("  %-30s 声明 %-9s 实测 %-9s 带beta %-9s 静默截断 %s"
              % (row["model"], row.get("declared_window"), row.get("measured_limit"),
                 row.get("measured_limit_with_beta"),
                 (row.get("truncation") or {}).get("silent_truncation")))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
