#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
L4 题集执行：跑完题集，产出原始结果 JSONL，交给 grade_benchmark.py 判分。

所有模型跑同一题集、同一顺序、同一 max_tokens，保证横向可比。

用法：
    python scripts/eval/run_benchmark.py --key sk-xxx --model claude-opus-5-5 \
        --items temp/eval/benchmark_v1.jsonl
    python scripts/eval/run_benchmark.py --key sk-xxx --all-claude \
        --items temp/eval/benchmark_v1.jsonl
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "utils"))

import eval_logger as logger  # noqa: E402
from context_parser import classify_error  # noqa: E402
from gateway_client import GatewayClient  # noqa: E402

SCRIPTS_DIR = Path(__file__).resolve().parent.parent
SNAPSHOT_PATH = SCRIPTS_DIR.parent / "config" / "models_upstream.json"

# 这几类题有随机性，重复跑取多数
MULTI_RUN_CATEGORIES = {"reasoning", "code"}
MULTI_RUN_TIMES = 3


def load_items(path: str) -> list:
    return [json.loads(l) for l in Path(path).read_text(encoding="utf-8").splitlines() if l.strip()]


def run_model(client: GatewayClient, model: str, items: list, run_id: str, timeout: int) -> list:
    rows = []
    total = len(items)
    for index, item in enumerate(items, 1):
        repeats = MULTI_RUN_TIMES if item["category"] in MULTI_RUN_CATEGORIES else 1
        for attempt in range(repeats):
            result = client.call(
                model,
                {
                    "max_tokens": item.get("max_tokens", 400),
                    "messages": [{"role": "user", "content": item["prompt"]}],
                },
                protocol="messages",
                timeout=timeout,
            )
            row = {
                "ts": logger.now_iso(),
                "run_id": run_id,
                "layer": "l4",
                "model": model,
                "id": item["id"],
                "category": item["category"],
                "attempt": attempt,
                "http": result.get("http"),
                "ok": bool(result.get("ok")),
                "latency_s": result.get("latency_s"),
                "usage": result.get("usage") or {},
                "text": result.get("text") or "",
                "error": (result.get("error") or "")[:300],
                "error_class": classify_error(result.get("error"), result.get("http") or 0),
                "trace_id": result.get("trace_id"),
            }
            rows.append(row)
            logger.append_ledger({k: v for k, v in row.items() if k != "text"})
            if not result.get("ok"):
                print("      第%d次失败 http=%s %s" % (attempt + 1, result.get("http"), row["error_class"]),
                      flush=True)
            time.sleep(0.3)
        print("  [%2d/%2d] %-8s %s" % (index, total, item["id"], item["category"]), flush=True)
    return rows


def main() -> int:
    parser = argparse.ArgumentParser(description="L4 题集执行")
    parser.add_argument("--key", required=True, help="上游 API Key（不会写入文件）")
    parser.add_argument("--base", default="https://rsxermu666.cn")
    parser.add_argument("--run-id", default="run")
    parser.add_argument("--model", help="模型 id，多个用逗号分隔")
    parser.add_argument("--all-claude", action="store_true", help="跑全部 Claude 系模型")
    parser.add_argument("--items", required=True, help="题集 JSONL 路径")
    parser.add_argument("--timeout", type=int, default=180)
    parser.add_argument("--jobs", type=int, default=1, help="只接受 1：串行是硬要求")
    args = parser.parse_args()

    if args.jobs != 1:
        print("--jobs 只能为 1：本次评估要求串行执行", file=sys.stderr)
        return 2
    if not args.model and not args.all_claude:
        print("需要 --model 或 --all-claude", file=sys.stderr)
        return 2

    items = load_items(args.items)
    client = GatewayClient(args.key, base=args.base, timeout=args.timeout)

    if args.all_claude:
        snapshot = json.loads(SNAPSHOT_PATH.read_text(encoding="utf-8"))
        models = [m["id"] for m in snapshot.get("models", []) if m["id"].startswith("claude-")]
    else:
        # --model 接受逗号分隔的多个模型
        models = [m.strip() for m in args.model.split(",") if m.strip()]
    if not models:
        print("没有可跑的模型", file=sys.stderr)
        return 2

    layer = "l4_benchmark"
    existing = logger.load_run(args.run_id, layer) or []
    # 只清掉本次要重跑的模型，其余模型的结果要保留
    rows = [r for r in existing if r.get("model") not in models]

    for model in models:
        print("== %s ==" % model, flush=True)
        rows.extend(run_model(client, model, items, args.run_id, args.timeout))
        logger.save_run(args.run_id, layer, rows)

    path = logger.run_dir(args.run_id) / (layer + ".json")
    print("L4 完成 -> %s" % path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
