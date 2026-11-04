#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
L6 计费核对：把用量台账与官方单价对齐，产出缩水清单与折扣系数。

三个口径必须分列：
    A 官方应计费   = 官方单价 × usage 字段
    B 网关自报用量 = POST /v1/user/daily-usage 的 daily_used
    C 网关自报 token = POST /api/user/key-info 的 total_tokens

注意：本次这把 key 是订阅制（billing_type_text = 按时间），
所以 daily_used 恒为 0，计费口径 B 不适用。脚本会自动识别并降级为
「只做 A 口径 + 声明窗口 vs 实测窗口的缩水表」。

用法：
    python scripts/eval/reconcile_billing.py --key sk-xxx --run-id 20261021
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "utils"))

import eval_logger as logger  # noqa: E402
from gateway_client import GatewayClient  # noqa: E402

SCRIPTS_DIR = Path(__file__).resolve().parent.parent
PRICING_PATH = SCRIPTS_DIR.parent / "config" / "eval" / "pricing.json"
SNAPSHOT_PATH = SCRIPTS_DIR.parent / "config" / "models_upstream.json"


def load_pricing() -> dict:
    if not PRICING_PATH.exists():
        return {}
    return json.loads(PRICING_PATH.read_text(encoding="utf-8"))


def official_cost(model: str, usage: dict, pricing: dict) -> float | None:
    price = pricing.get(model)
    if not price or price.get("input") is None:
        return None
    return (
        (usage.get("input_tokens") or 0) / 1e6 * price["input"]
        + (usage.get("output_tokens") or 0) / 1e6 * price["output"]
        + (usage.get("cache_read_input_tokens") or 0) / 1e6 * price.get("cache_read", price["input"] * 0.1)
        + (usage.get("cache_creation_input_tokens") or 0) / 1e6 * price.get("cache_write", price["input"] * 1.25)
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="L6 计费核对")
    parser.add_argument("--key", required=True, help="上游 API Key（不会写入文件）")
    parser.add_argument("--base", default="https://rsxermu666.cn")
    parser.add_argument("--run-id", default="run")
    args = parser.parse_args()

    pricing = load_pricing()
    client = GatewayClient(args.key, base=args.base, timeout=60)

    daily = client.daily_usage()
    key_info = client.key_info()
    daily_body = daily.get("body") or {}
    key_body = (key_info.get("body") or {}).get("data") or {}

    ledger = logger.load_ledger(args.run_id)
    l3 = logger.load_run(args.run_id, "l3_context") or []
    declared = {}
    if SNAPSHOT_PATH.exists():
        snapshot = json.loads(SNAPSHOT_PATH.read_text(encoding="utf-8"))
        declared = {m["id"]: m.get("context_window") for m in snapshot.get("models", [])}

    # 按模型汇总 token 与官方成本
    by_model: dict = {}
    for row in ledger:
        model = row.get("model")
        if not model:
            continue
        bucket = by_model.setdefault(model, {
            "requests": 0, "ok_requests": 0,
            "input_tokens": 0, "output_tokens": 0,
            "cache_read_input_tokens": 0, "cache_creation_input_tokens": 0,
            "official_cost_usd": 0.0, "priced": False,
        })
        bucket["requests"] += 1
        if row.get("ok"):
            bucket["ok_requests"] += 1
        usage = row.get("usage") or {}
        for key in ("input_tokens", "output_tokens", "cache_read_input_tokens", "cache_creation_input_tokens"):
            bucket[key] += usage.get(key) or 0
        cost = official_cost(model, usage, pricing)
        if cost is not None:
            bucket["official_cost_usd"] += cost
            bucket["priced"] = True

    for bucket in by_model.values():
        bucket["official_cost_usd"] = round(bucket["official_cost_usd"], 6)

    # 上下文缩水表：声明值 vs 实测值
    shrink = []
    for row in l3:
        declared_window = row.get("declared_window")
        measured = row.get("measured_limit")
        measured_beta = row.get("measured_limit_with_beta")
        entry = {
            "model": row.get("model"),
            "declared_window": declared_window,
            "measured_limit": measured,
            "measured_limit_with_beta": measured_beta,
            "beta_changes_limit": row.get("beta_changes_limit"),
        }
        if declared_window and measured:
            entry["shrink_ratio"] = round(declared_window / measured, 3)
            entry["verdict"] = "元数据虚标" if declared_window > measured else "元数据偏保守"
        shrink.append(entry)

    # 失败请求是否计费：从台账里找非 200 的请求
    failed = [r for r in ledger if not r.get("ok")]
    failed_cost = 0.0
    failed_priced = 0
    for row in failed:
        cost = official_cost(row.get("model"), row.get("usage") or {}, pricing)
        if cost is not None:
            failed_cost += cost
            failed_priced += 1

    report = {
        "run_id": args.run_id,
        "generated_at": logger.now_iso(),
        "billing_mode": {
            "daily_usage_endpoint": {"http": daily.get("http"), "body": daily_body},
            "key_info": {
                "http": key_info.get("http"),
                "product_type": key_body.get("product_type"),
                "billing_type": key_body.get("billing_type"),
                "billing_type_text": key_body.get("billing_type_text"),
                "max_windows": key_body.get("max_windows"),
                "total_quota_usd": key_body.get("total_quota_usd"),
                "used_quota_usd": key_body.get("used_quota_usd"),
                "request_count": key_body.get("request_count"),
                "total_tokens": key_body.get("total_tokens"),
                "claude_auto_compact_window": key_body.get("claude_auto_compact_window"),
                "expire_at": key_body.get("expire_at"),
            },
            "subscription_billed": daily_body.get("daily_usd_limit") in (0, None)
            and not daily_body.get("daily_used"),
        },
        "by_model": by_model,
        "context_shrink_table": shrink,
        "failed_requests": {
            "count": len(failed),
            "with_priced_usage": failed_priced,
            "official_cost_usd_if_billed": round(failed_cost, 6),
            "note": "订阅制 Key 不按 token 计费，失败请求不计费；按量计费的 Key 需另行核实",
        },
        "total_official_cost_usd": round(
            sum(b["official_cost_usd"] for b in by_model.values()), 6
        ),
    }

    out_dir = logger.report_dir(args.run_id)
    out_path = out_dir / "billing_%s.json" % args.run_id
    logger.save_json(out_path, report)
    print("计费核对 -> %s" % out_path)
    print("  计费模式：%s" % (
        "订阅制（按时间），无按量计费，daily_used 恒为 0"
        if report["billing_mode"]["subscription_billed"] else "按量计费"
    ))
    print("  台账请求数：%d，其中失败 %d" % (len(ledger), len(failed)))
    print("  官方价折算总额：$%.4f" % report["total_official_cost_usd"])
    if shrink:
        print("  上下文缩水表：")
        for entry in shrink:
            print("    %-30s 声明 %-9s 实测 %-9s %s"
                  % (entry["model"], entry.get("declared_window"),
                     entry.get("measured_limit"), entry.get("verdict", "")))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
