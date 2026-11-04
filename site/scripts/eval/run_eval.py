#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
总编排：按层跑评测，全程串行。

层定义：
    l0  基线：模型清单、计费端点、Key 产品类型
    l1  探活：每个模型 id × 协议路径各一次最小调用
    l2  能力矩阵：工具调用、结构化输出、thinking、视觉、缓存、流式、预填、强制工具
    l3  上下文：分档探针 + context-1m beta 头 A/B + 针题检测静默截断
    l4  质量：题集横评
    l5  稳定性：重复请求与长会话
    l6  计费：与官方单价对账

用法：
    python scripts/eval/run_eval.py --key sk-xxx --run-id 20261021 --layer l0
    python scripts/eval/run_eval.py --key sk-xxx --run-id 20261021 --layer l1 --resume
    python scripts/eval/run_eval.py --key sk-xxx --run-id 20261021 --layer l3 --only claude-opus-5-5
    python scripts/eval/run_eval.py --key sk-xxx --run-id 20261021 --layer l4 --all-claude
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

SCRIPTS_DIR = Path(__file__).resolve().parent
EVAL_DIR = SCRIPTS_DIR
SITE_DIR = SCRIPTS_DIR.parent
REPO_DIR = SITE_DIR.parent

sys.path.insert(0, str(SCRIPTS_DIR.parent / "utils"))

import eval_logger as logger  # noqa: E402


def run_script(name: str, extra: list) -> int:
    """调起同目录下的一个层脚本。"""
    command = [sys.executable, str(EVAL_DIR / name)] + extra
    print("$ " + " ".join(command))
    return subprocess.call(command)


def main() -> int:
    parser = argparse.ArgumentParser(description="网关模型服务评估总编排")
    parser.add_argument("--key", required=True, help="上游 API Key（不会写入文件）")
    parser.add_argument("--base", default="https://rsxermu666.cn")
    parser.add_argument("--run-id", default="run")
    parser.add_argument("--layer", default="all",
                        help="l0/l1/l2/l3/l4/l5/l6 或 all")
    parser.add_argument("--only", help="逗号分隔的模型 id 白名单")
    parser.add_argument("--items", default=str(REPO_DIR / "temp" / "eval" / "benchmark_v1.jsonl"))
    parser.add_argument("--resume", action="store_true")
    parser.add_argument("--stability-model", default="claude-opus-5-5",
                        help="L5 稳定性测试用的模型 id")
    parser.add_argument("--jobs", type=int, default=1, help="只接受 1：串行是硬要求")
    args = parser.parse_args()

    if args.jobs != 1:
        print("--jobs 只能为 1：本次评估要求串行执行", file=sys.stderr)
        return 2

    common = ["--key", args.key, "--base", args.base, "--run-id", args.run_id]
    if args.only:
        common += ["--only", args.only]
    if args.resume:
        common += ["--resume"]

    layers = {
        "l0": ["probe_availability.py", common + ["--layer", "l0"]],
        "l1": ["probe_availability.py", common + ["--layer", "l1"]],
        "l2": ["probe_capability.py", common],
        "l3": ["probe_context_limit.py", common],
        "l4": ["run_benchmark.py", common + ["--items", args.items]],
        "l5": ["probe_stability.py", common + ["--model", args.stability_model]],
        "l6": ["reconcile_billing.py", common],
    }

    wanted = list(layers.keys()) if args.layer == "all" else [args.layer]
    for layer in wanted:
        if layer not in layers:
            print("未知层：%s" % layer, file=sys.stderr)
            return 2
        print("\n" + "=" * 60)
        print("== %s ==" % layer)
        print("=" * 60)
        script, extra = layers[layer]
        code = run_script(script, extra)
        if code != 0:
            print("层 %s 退出码 %d，停止后续层" % (layer, code), file=sys.stderr)
            return code

    print("\n全部完成。产物在 %s" % (logger.TEMP_ROOT / "runs" / args.run_id))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
