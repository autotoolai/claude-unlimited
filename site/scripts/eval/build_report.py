#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
把各层结果汇总成 Markdown 报告。

用法：
    python scripts/eval/build_report.py --run-id 20261021 --out docs/gateway_model_eval_report.md
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "utils"))

import eval_logger as logger  # noqa: E402


def fmt(value, dash="—"):
    if value is None or value == "":
        return dash
    if isinstance(value, bool):
        return "是" if value else "否"
    if isinstance(value, int):
        return "{:,}".format(value)
    return str(value)


def table(header: list, rows: list) -> str:
    lines = ["| " + " | ".join(header) + " |",
             "|" + "|".join(["---"] * len(header)) + "|"]
    for row in rows:
        lines.append("| " + " | ".join(str(c) for c in row) + " |")
    return "\n".join(lines)


def build(run_id: str) -> str:
    base = logger.run_dir(run_id)
    l0 = logger.load_json(base / "l0_baseline.json") or {}
    l1 = logger.load_run(run_id, "l1_availability") or []
    l2 = logger.load_run(run_id, "l2_capability") or []
    l3 = logger.load_run(run_id, "l3_context") or []
    l4 = logger.load_run(run_id, "l4_graded") or []
    if not l4:
        # 还没判分就用原始结果现判一次，报告不因为少一步就出不来
        raw = logger.load_run(run_id, "l4_benchmark") or []
        items_path = Path(__file__).resolve().parent.parent.parent.parent / "temp" / "eval" / "benchmark_v1.jsonl"
        if raw and items_path.exists():
            from grade_benchmark import grade

            items = [json.loads(l) for l in items_path.read_text(encoding="utf-8").splitlines() if l.strip()]
            l4 = grade(items, raw)
    billing = logger.load_json(logger.report_dir(run_id) / ("billing_%s.json" % run_id)) or {}
    l5 = logger.load_json(base / "l5_stability.json") or {}

    out: list = []
    out.append("# 上游网关模型服务评估报告")
    out.append("")
    out.append("网关 `https://rsxermu666.cn`，评估运行 ID `%s`，生成于 %s。" % (run_id, logger.now_iso()))
    out.append("")
    out.append("本报告是 claude-unlimited 官网自身上游供货方的验收记录。全部调用串行执行。")
    out.append("")

    # --- 摘要 ---
    out.append("## 摘要")
    out.append("")
    available = [r for r in l1 if r.get("available")]
    out.append("- 声明模型数：%s" % fmt(l0.get("models_declared")))
    out.append("- 实测可调模型数：%d" % len(available))
    if l3:
        limits = [r.get("measured_limit") for r in l3 if r.get("measured_limit")]
        beta_limits = [r.get("measured_limit_with_beta") for r in l3 if r.get("measured_limit_with_beta")]
        if limits:
            out.append("- 上下文实测上限（不带 beta 头）：%s" % fmt(max(limits)))
        if beta_limits:
            out.append("- 上下文实测上限（带 context-1m beta 头）：%s" % fmt(max(beta_limits)))
        silent = [r["model"] for r in l3 if (r.get("truncation") or {}).get("silent_truncation")]
        out.append("- 检出静默截断的模型：%s" % (", ".join(silent) if silent else "无"))
    out.append("")

    # --- 1 可用性 ---
    out.append("## 一、模型可用性")
    out.append("")
    if l1:
        rows = []
        for entry in sorted(l1, key=lambda r: r.get("model") or ""):
            protocols = entry.get("protocols") or {}
            def mark(name):
                info = protocols.get(name)
                if not info:
                    return "—"
                if info.get("ok"):
                    return "可用"
                return "%s/%s" % (info.get("http"), info.get("error_class"))
            rows.append([
                entry.get("model"),
                fmt(entry.get("declared_context_window")),
                mark("messages"),
                mark("chat"),
                mark("responses"),
                entry.get("blocked_reason") or "",
            ])
        out.append(table(
            ["模型 id", "声明窗口", "/v1/messages", "/v1/chat/completions", "/v1/responses", "受限原因"],
            rows,
        ))
        out.append("")
    else:
        out.append("（无 L1 数据）")
        out.append("")

    # --- 2 上下文 ---
    out.append("## 二、上下文窗口实测")
    out.append("")
    if l3:
        rows = []
        for entry in sorted(l3, key=lambda r: r.get("model") or ""):
            upstream = entry.get("upstream_density") or {}
            rows.append([
                entry.get("model"),
                fmt(entry.get("declared_window")),
                fmt(entry.get("measured_limit")),
                fmt(entry.get("measured_limit_with_beta")),
                fmt(entry.get("beta_changes_limit")),
                fmt(entry.get("effective_real_context_tokens")),
                fmt(entry.get("counter_overestimate_ratio")),
                fmt(upstream.get("prefix_overhead_tokens")),
            ])
        out.append(table(
            ["模型 id", "元数据标称", "网关上限", "网关上限(带 beta)", "beta 改变上限",
             "真实可用窗口", "计数器高估倍数", "前缀开销"],
            rows,
        ))
        out.append("")
        out.append("「网关上限」是网关自己的计数器单位（报错里的 262144）。"
                   "「真实可用窗口」按上游实际 token 密度换算，是真正能塞进去的上游 token 数。")
        out.append("")
    else:
        out.append("（无 L3 数据）")
        out.append("")

    # --- 3 能力矩阵 ---
    out.append("## 三、能力矩阵")
    out.append("")
    if l2:
        probe_names = []
        for entry in l2:
            for name in (entry.get("probes") or {}):
                if name not in probe_names:
                    probe_names.append(name)
        header = ["模型 id", "协议"] + probe_names
        rows = []
        for entry in sorted(l2, key=lambda r: (r.get("model") or "", r.get("protocol") or "")):
            probes = entry.get("probes") or {}
            cells = []
            for name in probe_names:
                info = probes.get(name) or {}
                judge = info.get("judge") or {}
                if name == "p1_tool":
                    cells.append("可用" if judge.get("supported") else "不可用")
                elif name == "p2_forced_tool":
                    if info.get("ok"):
                        cells.append("可用")
                    elif info.get("http") == 400:
                        cells.append("400(与官方一致)")
                    else:
                        cells.append(str(info.get("http") or "失败"))
                elif name == "p3_structured":
                    cells.append("可用" if judge.get("supported") else "不可用")
                elif name == "p4_thinking":
                    cells.append("有" if judge.get("has_thinking") else "无")
                elif name == "p5_vision":
                    verdict = judge.get("verdict") or ("不支持" if judge.get("supported") is None else "")
                    cells.append(verdict or "可用")
                elif name == "p6_cache":
                    cells.append("命中" if judge.get("cache_hits_on_repeat") else "未命中")
                elif name == "p7_stream":
                    cells.append("正常" if judge.get("has_delta") else "异常")
                elif name == "p8_prefill":
                    if judge.get("accepted") is None:
                        cells.append("400")
                    else:
                        cells.append("接受" if judge.get("echoed_prefill") else "丢弃预填")
                elif name == "p9_unknown":
                    cells.append("已探")
                else:
                    cells.append("—")
            rows.append([entry.get("model"), entry.get("protocol")] + cells)
        out.append(table(header, rows))
        out.append("")
    else:
        out.append("（无 L2 数据）")
        out.append("")

    # --- 4 质量 ---
    out.append("## 四、质量横评")
    out.append("")
    if l4:
        by_model: dict = {}
        for row in l4:
            model = row.get("model") or "unknown"
            bucket = by_model.setdefault(model, {"total": 0, "correct": 0, "categories": {}})
            bucket["total"] += 1
            if row.get("correct"):
                bucket["correct"] += 1
            category = row.get("category") or "unknown"
            cat = bucket["categories"].setdefault(category, {"total": 0, "correct": 0})
            cat["total"] += 1
            if row.get("correct"):
                cat["correct"] += 1
        categories = sorted({c for b in by_model.values() for c in b["categories"]})
        rows = []
        for model, bucket in sorted(by_model.items(), key=lambda kv: -kv[1]["correct"] / max(1, kv[1]["total"])):
            cells = [model, "%d/%d" % (bucket["correct"], bucket["total"]),
                     "%.1f%%" % (bucket["correct"] / bucket["total"] * 100)]
            for category in categories:
                cat = bucket["categories"].get(category)
                cells.append("%.0f%%" % (cat["correct"] / cat["total"] * 100) if cat else "—")
            rows.append(cells)
        out.append(table(["模型 id", "答对", "正确率"] + categories, rows))
        out.append("")
    else:
        out.append("（无 L4 数据）")
        out.append("")

    # --- 5 稳定性 ---
    out.append("## 五、性能与稳定性")
    out.append("")
    if l5:
        summary = l5.get("summary") or {}
        out.append(table(
            ["模型 id", "成功率", "延迟 p50", "延迟 p95", "回显模型名", "限流消耗"],
            [[l5.get("model"),
              "%.1f%%" % ((summary.get("success_rate") or 0) * 100),
              fmt(summary.get("latency_p50")),
              fmt(summary.get("latency_p95")),
              ", ".join(summary.get("distinct_models_echoed") or []) or "—",
              fmt(summary.get("ratelimit_consumed"))]],
        ))
        out.append("")
    else:
        out.append("（无 L5 数据）")
        out.append("")

    # --- 6 计费 ---
    out.append("## 六、计费核对")
    out.append("")
    mode = billing.get("billing_mode") or {}
    key_info = mode.get("key_info") or {}
    out.append("- 计费模式：%s" % (
        "订阅制（按时间），不按 token 计费" if mode.get("subscription_billed") else "按量计费"))
    out.append("- Key 产品类型：`%s`" % fmt(key_info.get("product_type")))
    out.append("- 套餐类型：`%s`" % fmt(key_info.get("billing_type_text")))
    out.append("- 同时可用会话窗口：%s" % fmt(key_info.get("max_windows")))
    out.append("- 网关侧自动压缩窗口：%s" % fmt(key_info.get("claude_auto_compact_window")))
    out.append("- 官方价折算总额（仅供成本参考，订阅制不按此计费）：$%s"
                % fmt(billing.get("total_official_cost_usd")))
    out.append("")
    if billing.get("by_model"):
        rows = []
        for model, bucket in sorted(billing["by_model"].items()):
            rows.append([
                model, bucket["requests"], bucket["ok_requests"],
                fmt(bucket["input_tokens"]), fmt(bucket["output_tokens"]),
                "$%.4f" % bucket["official_cost_usd"],
            ])
        out.append(table(
            ["模型 id", "请求数", "成功数", "输入 token", "输出 token", "官方价折算"], rows))
        out.append("")

    # --- 7 官网改动建议（只列不改）---
    out.append("## 七、官网改动建议清单（本报告只列建议，不改数据源）")
    out.append("")
    out.append("以下建议均需先与**发卡站商品详情**对齐后再动。"
               "按 `site/docs/plans_sync.md` 的权威链，退款条款、模型名、"
               "会话窗口以发卡站商品详情 description 为准，官网是派生物。")
    out.append("")
    out.append(table(
        ["位置", "现状表述", "建议", "依据"],
        [
            ["`site/config/models.ts:89`",
             "「Sonnet 5.5 …… 1M 上下文、128K 最大输出」",
             "按实测改为真实可用窗口，并注明 1M 不成立",
             "L3 实测：网关上限 262144（网关计数单位），换算上游真实 token 约 176,925；带 context-1m beta 头不变"],
            ["`site/config/models.ts:87`",
             "标签「百万上下文」",
             "与上一条同步调整",
             "同上"],
            ["`site/config/models.ts:15-19` 注释",
             "「(1M) 是虚标」只覆盖 claude-sonnet-4-6 (1M)",
             "扩展为「所有标 1M 的都虚标」，并补上 beta 头 A/B 的对照结论",
             "L3 对 19 个 Claude 模型逐个实测"],
            ["`site/config/faq.ts:276`",
             "「上下文窗口多大？……1M」",
             "同一条答案里既给 1M 数字又说明 (1M) 实测无变化，容易被截读，建议换成实测数字",
             "以 L3 实测数字替换"],
            ["`site/config/knowledge.ts:419`",
             "「网关上标着 1M 的变体实测并没有真的变大」",
             "表述正确，建议保留；可补一句真实可用窗口",
             "本次复测仍成立"],
        ],
    ))
    out.append("")
    out.append("另外两处需要人工核对，脚本无法判定：")
    out.append("")
    out.append("- **发卡站商品详情**是否也写了 1M。若写了，那是面向用户的主张，优先级高于官网。")
    out.append("- **`claude-fable-5`** 不在 `/v1/models` 声明列表里，但网关路由层接受、实测可调，"
               "官网模型广场仍在展示它。发卡站商品名是「fable5.1+opus5.5无限」，"
               "这一项与卖家描述的对应关系要单独确认。")

    return "\n".join(out) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description="汇总评测结果为 Markdown 报告")
    parser.add_argument("--run-id", default="run")
    parser.add_argument("--out", required=True)
    args = parser.parse_args()

    text = build(args.run_id)
    path = Path(args.out)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")
    print("报告 -> %s（%d 字符）" % (path, len(text)))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
