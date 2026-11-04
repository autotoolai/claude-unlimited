#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
评测产物落盘与用量台账。

约定（沿用 temp/ 下既有脚本的风格）：
    - 每完成一条即整体重写落盘，中断不丢进度
    - JSON 用 ensure_ascii=False, indent=2
    - 台账是 append-only JSONL，一行一次请求
    - key 不落盘，只记 sha256 前 8 位
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

TEMP_ROOT = Path(__file__).resolve().parent.parent.parent / "temp" / "eval"


def run_dir(run_id: str) -> Path:
    path = TEMP_ROOT / "runs" / run_id
    path.mkdir(parents=True, exist_ok=True)
    return path


def report_dir(run_id: str) -> Path:
    path = TEMP_ROOT / "reports" / run_id
    path.mkdir(parents=True, exist_ok=True)
    return path


def ledger_path() -> Path:
    path = TEMP_ROOT / "ledger" / "ledger.jsonl"
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


def key_fingerprint(key: str) -> str:
    """只留 key 的指纹，不留明文。"""
    return hashlib.sha256(key.encode("utf-8")).hexdigest()[:8]


def save_json(path: Path, rows) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(rows, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def load_json(path: Path):
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return None


def save_run(run_id: str, layer: str, rows) -> Path:
    path = run_dir(run_id) / ("%s.json" % layer)
    save_json(path, rows)
    return path


def load_run(run_id: str, layer: str):
    return load_json(run_dir(run_id) / ("%s.json" % layer))


def done_keys(run_id: str, layer: str, fields: tuple[str, ...]) -> set:
    """读已有结果，取已完成的条目键，用于断点续跑。"""
    rows = load_run(run_id, layer) or []
    keys = set()
    for row in rows:
        keys.add(tuple(str(row.get(f)) for f in fields))
    return keys


def append_ledger(row: dict) -> None:
    with ledger_path().open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(row, ensure_ascii=False) + "\n")


def load_ledger(run_id: str | None = None) -> list:
    path = ledger_path()
    if not path.exists():
        return []
    rows = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            row = json.loads(line)
        except json.JSONDecodeError:
            continue
        if run_id is None or row.get("run_id") == run_id:
            rows.append(row)
    return rows


def now_iso() -> str:
    from datetime import datetime, timezone

    return datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")
