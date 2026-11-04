#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
L0 基线 + L1 全模型探活。

L0：模型清单快照、计费端点、端点存在性、Key 产品类型。
L1：每个模型 id × 协议路径各打一次最小调用，判断是否可调。

串行执行，不并发（用户硬要求）。每条完成即落盘，可断点续跑。

用法：
    python scripts/eval/probe_availability.py --key sk-xxx
    python scripts/eval/probe_availability.py --key sk-xxx --layer l0
    python scripts/eval/probe_availability.py --key sk-xxx --layer l1 --resume
    python scripts/eval/probe_availability.py --key sk-xxx --layer l1 --only claude-opus-5-5,grok-4.5
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
CONFIG_DIR = SCRIPTS_DIR.parent / "config"
SNAPSHOT_PATH = CONFIG_DIR / "models_upstream.json"

# 上一轮探测跑过并返回 200、但不在 /v1/models 声明里的 id。
# 网关的白名单在路由层而不是列表层，这些 id 仍要覆盖——
# 官网模型广场 site/config/models.ts 至今仍在展示 claude-fable-5。
UNDECLARED_MODELS = [
    "claude-fable-5",
    "claude-opus-4-5",
    "claude-sonnet-4-5",
    "claude-sonnet-5",
]

PROBE_PROMPT = "回复 OK 两个字即可。"

# L0 要探的端点。网关只注册 POST，GET 一律 404，
# 所以端点存在性只能用 POST 判定：401/403/400 都说明路由存在，只有 404 才是不存在。
ENDPOINT_PROBES = [
    ("daily_usage", "/v1/user/daily-usage", {}),
    ("key_info", "/api/user/key-info", {}),
    ("count_tokens", "/v1/messages/count_tokens", {
        "model": "claude-opus-5-5",
        "messages": [{"role": "user", "content": "hello"}],
    }),
]


def load_declared_models() -> list:
    """从上游快照读模型清单，不硬编码。"""
    if not SNAPSHOT_PATH.exists():
        return []
    snapshot = json.loads(SNAPSHOT_PATH.read_text(encoding="utf-8"))
    return snapshot.get("models", [])


def build_body(protocol: str) -> dict:
    if protocol == "messages":
        return {
            "max_tokens": 16,
            "messages": [{"role": "user", "content": PROBE_PROMPT}],
        }
    if protocol == "chat":
        return {
            "max_tokens": 16,
            "messages": [{"role": "user", "content": PROBE_PROMPT}],
        }
    # responses 协议
    return {"max_output_tokens": 16, "input": PROBE_PROMPT}


def summarize(result: dict) -> dict:
    """从一次调用结果里抽判读所需的字段。"""
    body = result.get("body") or {}
    return {
        "http": result.get("http"),
        "ok": bool(result.get("ok")),
        "latency_s": result.get("latency_s"),
        "echo_model": body.get("model") if isinstance(body, dict) else None,
        "usage": result.get("usage") or {},
        "text_len": len(result.get("text") or ""),
        "error_class": classify_error(result.get("error"), result.get("http") or 0),
        "error": (result.get("error") or "")[:300],
        "trace_id": result.get("trace_id"),
    }


def run_l0(client: GatewayClient, run_id: str) -> dict:
    """基线：模型清单、计费数据、端点存在性。"""
    out: dict = {"run_id": run_id, "collected_at": logger.now_iso()}

    models = client.list_models()
    if models.get("ok"):
        data = models["body"].get("data", [])
        out["models_declared"] = len(data)
        out["models"] = [
            {
                "id": item.get("id"),
                "context_window": item.get("context_window"),
                "owned_by": item.get("owned_by"),
                "source": item.get("source"),
            }
            for item in data
        ]
        snapshot = load_declared_models()
        snapshot_ids = {m["id"] for m in snapshot}
        live_ids = {item.get("id") for item in data}
        out["diff_vs_snapshot"] = {
            "added": sorted(live_ids - snapshot_ids),
            "removed": sorted(snapshot_ids - live_ids),
            "context_changed": [
                {"id": m["id"], "snapshot": m.get("context_window"), "live": item.get("context_window")}
                for m, item in ((m, next((x for x in data if x.get("id") == m["id"]), {})) for m in snapshot)
                if m.get("context_window") != item.get("context_window")
            ],
        }
    else:
        out["models_error"] = (models.get("error") or "")[:300]

    endpoints = {}
    for name, path, body in ENDPOINT_PROBES:
        result = client.post_json(path, body)
        exists = result.get("http") != 404
        endpoints[name] = {
            "path": path,
            "http": result.get("http"),
            "exists": exists,
            "body": result.get("body") if result.get("ok") else None,
            "error": (result.get("error") or "")[:300],
        }
        time.sleep(0.3)
    out["endpoints"] = endpoints

    # Key 产品类型决定哪些模型可调，必须显式记下来
    key_info = endpoints.get("key_info", {})
    if key_info.get("body"):
        out["key_info"] = key_info["body"]
    daily = endpoints.get("daily_usage", {})
    if daily.get("body"):
        out["daily_usage"] = daily["body"]

    path = logger.run_dir(run_id) / "l0_baseline.json"
    logger.save_json(path, out)
    print("L0 完成 -> %s" % path)
    print("  声明模型数：%s" % out.get("models_declared"))
    for name, info in endpoints.items():
        print("  端点 %-14s %s exists=%s" % (name, info.get("http"), info.get("exists")))
    return out


def run_l1(client: GatewayClient, run_id: str, models: list, only: list | None, resume: bool,
            with_responses: bool = False) -> list:
    """每个模型 id × 协议路径各打一次最小调用，串行。"""
    layer = "l1_availability"
    rows = logger.load_run(run_id, layer) or []
    # rows 是「每模型一条、协议放在 protocols 字典里」的结构，
    # 所以 done 要从 protocols 里展开成 (模型, 协议) 对。
    # 只跳过成功过的，失败项允许重试（网络抖动导致的假失败必须能补测）。
    done = set()
    if resume:
        for row in rows:
            for protocol, info in (row.get("protocols") or {}).items():
                if info.get("ok"):
                    done.add((row.get("model"), protocol))

    targets = [m["id"] for m in models] + UNDECLARED_MODELS
    if only:
        wanted = set(only)
        targets = [m for m in targets if m in wanted]

    protocols = ["messages", "chat", "responses"]
    # responses 路径网关一律 403，且常常要等到超时才返回，代价高收益低。
    # 首个模型验证过之后默认跳过，只在 --with-responses 时才全量探。
    if not with_responses and rows:
        protocols = [p for p in protocols if p != "responses"]
    total = len(targets) * len(protocols)
    index = 0

    for model_id in targets:
        model_row = next((m for m in models if m["id"] == model_id), None)
        entry = {
            "model": model_id,
            "declared": bool(model_row),
            "declared_context_window": model_row.get("context_window") if model_row else None,
            "owned_by": model_row.get("brand") if model_row else None,
            "source": model_row.get("source") if model_row else None,
            "protocols": {},
        }
        for protocol in protocols:
            index += 1
            if (model_id, protocol) in done:
                continue
            result = client.call(model_id, build_body(protocol), protocol=protocol, timeout=60)
            summary = summarize(result)
            entry["protocols"][protocol] = summary

            logger.append_ledger({
                "ts": logger.now_iso(),
                "run_id": run_id,
                "layer": "l1",
                "model": model_id,
                "protocol": protocol,
                "http": summary["http"],
                "ok": summary["ok"],
                "latency_s": summary["latency_s"],
                "usage": summary["usage"],
                "trace_id": summary["trace_id"],
                "key_fp": logger.key_fingerprint(client.key),
            })

            print(
                "  [%3d/%3d] %-30s %-9s http=%-4s %-10s %.1fs"
                % (index, total, model_id, protocol, summary["http"],
                   summary["error_class"], summary["latency_s"] or 0),
                flush=True,
            )
            time.sleep(0.3)

        # 判读：任一协议成功即视为模型可调
        ok_protocols = [p for p, s in entry["protocols"].items() if s["ok"] and s["text_len"] > 0]
        entry["available"] = bool(ok_protocols)
        entry["ok_protocols"] = ok_protocols
        if not ok_protocols:
            errors = [s["error_class"] for s in entry["protocols"].values()]
            entry["blocked_reason"] = errors[0] if errors else "unknown"

        rows = [r for r in rows if r.get("model") != model_id]
        rows.append(entry)
        logger.save_run(run_id, layer, rows)

    path = logger.run_dir(run_id) / (layer + ".json")
    available = [r["model"] for r in rows if r.get("available")]
    print("L1 完成 -> %s" % path)
    print("  可调模型 %d / %d" % (len(available), len(rows)))
    return rows


def main() -> int:
    parser = argparse.ArgumentParser(description="L0 基线 + L1 全模型探活")
    parser.add_argument("--key", required=True, help="上游 API Key（不会写入文件）")
    parser.add_argument("--base", default="https://rsxermu666.cn")
    parser.add_argument("--run-id", default="run")
    parser.add_argument("--layer", default="all", choices=["l0", "l1", "all"])
    parser.add_argument("--only", help="逗号分隔的模型 id 白名单")
    parser.add_argument("--resume", action="store_true", help="跳过已完成条目")
    parser.add_argument("--with-responses", action="store_true",
                        help="连 /v1/responses 路径一起探（该路径网关基本一律 403 且常超时）")
    parser.add_argument("--jobs", type=int, default=1, help="只接受 1：串行是硬要求")
    args = parser.parse_args()

    if args.jobs != 1:
        print("--jobs 只能为 1：本次评估要求串行执行", file=sys.stderr)
        return 2

    client = GatewayClient(args.key, base=args.base, timeout=60)
    models = load_declared_models()
    if not models:
        print("未找到 %s，先跑 scripts/fetch_upstream_models.py" % SNAPSHOT_PATH, file=sys.stderr)
        return 1

    only = [m.strip() for m in args.only.split(",")] if args.only else None

    if args.layer in ("l0", "all"):
        print("== L0 基线 ==")
        run_l0(client, args.run_id)

    if args.layer in ("l1", "all"):
        print("== L1 探活（串行） ==")
        run_l1(client, args.run_id, models, only, args.resume, args.with_responses)

    return 0


if __name__ == "__main__":
    sys.exit(main())
