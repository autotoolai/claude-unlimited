#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
抓取上游网关的模型列表，存成版本化快照供模型广场使用。

用法：
    python scripts/fetch_upstream_models.py --key sk-xxx            # 拉取并存快照
    python scripts/fetch_upstream_models.py --key sk-xxx --dry-run  # 只打印不落盘

输出：
    site/config/models_upstream.json   最新快照（直接被 models.ts 引用）
    site/config/models_upstream.<日期>.json  归档快照

接口：GET {base}/v1/models，鉴权头 Authorization: Bearer <key>。
key 只从命令行传入，不写入任何文件，也不从环境变量以外的途径读取。
"""

from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

DEFAULT_BASE = "https://rsxermu666.cn"
CONFIG_DIR = Path(__file__).resolve().parent.parent / "config"
SNAPSHOT_PATH = CONFIG_DIR / "models_upstream.json"


def fetch(base: str, key: str, timeout: int = 30, retries: int = 3) -> dict:
    """拉取 /v1/models，失败时按指数退避重试。"""
    url = base.rstrip("/") + "/v1/models"
    request = urllib.request.Request(url, headers={"Authorization": "Bearer " + key})

    last_error: Exception | None = None
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(request, timeout=timeout) as response:
                return json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8", "replace")[:300]
            # 4xx 是确定性错误，重试没有意义
            if exc.code < 500:
                raise SystemExit(f"HTTP {exc.code}：{body}") from exc
            last_error = exc
        except Exception as exc:  # 超时、连接抖动等
            last_error = exc
        if attempt < retries - 1:
            import time

            time.sleep(2**attempt)

    raise SystemExit(f"请求失败（已重试 {retries} 次）：{last_error}")


def format_context(context: int) -> str:
    """上下文窗口转展示文本：0 是图像模型无上下文，≥100万用 M，其余用 K。"""
    if context == 0:
        return "—"
    if context >= 1_000_000:
        return f"{context / 1_000_000:g}M"
    return f"{context // 1000}K"


def build_snapshot(base: str, payload: dict) -> dict:
    """把上游返回整形成稳定结构，补上派生字段。"""
    models = []
    for item in payload.get("data", []):
        model_id = item.get("id", "")
        context = int(item.get("context_window") or 0)
        models.append(
            {
                "id": model_id,
                "brand": item.get("owned_by", ""),
                "context_window": context,
                "context_display": format_context(context),
                "source": item.get("source", ""),
                # 派生：thinking 变体、1M 长上下文档
                "is_thinking": "thinking" in model_id.lower(),
                "is_long_context": context >= 1_000_000,
            }
        )

    models.sort(key=lambda m: (m["brand"], -m["context_window"], m["id"]))

    brands: dict[str, int] = {}
    for model in models:
        brands[model["brand"]] = brands.get(model["brand"], 0) + 1

    return {
        "fetched_at": datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds"),
        "source": base.rstrip("/") + "/v1/models",
        "total": len(models),
        "brands": brands,
        "models": models,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="抓取上游模型列表并存快照")
    parser.add_argument("--key", required=True, help="上游 API Key（不会写入文件）")
    parser.add_argument("--base", default=DEFAULT_BASE, help=f"上游地址，默认 {DEFAULT_BASE}")
    parser.add_argument("--dry-run", action="store_true", help="只打印结果，不写文件")
    args = parser.parse_args()

    snapshot = build_snapshot(args.base, fetch(args.base, args.key))

    text = json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n"

    if args.dry_run:
        print(text)
        return 0

    SNAPSHOT_PATH.write_text(text, encoding="utf-8")
    stamp = snapshot["fetched_at"][:10]
    archive = CONFIG_DIR / f"models_upstream.{stamp}.json"
    archive.write_text(text, encoding="utf-8")

    print(f"共 {snapshot['total']} 个模型")
    for brand, count in snapshot["brands"].items():
        print(f"  {brand or '未标注'}：{count}")
    print(f"已写入 {SNAPSHOT_PATH}")
    print(f"已归档 {archive}")
    return 0


if __name__ == "__main__":
    sys.exit(main())