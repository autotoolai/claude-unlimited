#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
从 probe_capability.py 的探针实现导出配置到 site/config/eval/capability_probes.json。

探针的请求体定义集中在这里便于 review 与版本化，Python 侧只写判分逻辑。
本脚本是生成器：改了探针实现后重跑一次即可。

用法：
    python scripts/eval/make_capability_probes_config.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

SCRIPTS_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(SCRIPTS_DIR / "eval"))

import probe_capability as probes  # noqa: E402

OUT_PATH = SCRIPTS_DIR.parent / "config" / "eval" / "capability_probes.json"

DESCRIPTIONS = {
    "p1_tool": {
        "name": "工具调用",
        "question": "模型能否返回结构合法的 tool_use / tool_calls",
        "judge": "存在工具调用块、名字正确、input 是合法 JSON 且含 city",
    },
    "p2_forced_tool": {
        "name": "强制工具",
        "question": "tool_choice 强制指定工具时网关行为",
        "judge": "400 且与官方一致属正常透传；200 说明网关未透传官方约束",
    },
    "p3_structured": {
        "name": "结构化输出",
        "question": "JSON Schema 约束输出",
        "judge": "输出可被 json.loads 解析、required 字段齐全、类型正确",
    },
    "p4_thinking": {
        "name": "思考与预算透传",
        "question": "thinking / reasoning_effort 参数是否被网关透传",
        "judge": "分级：是否有 thinking 块、能否关闭、预算是否影响思考长度",
    },
    "p5_vision": {
        "name": "视觉输入",
        "question": "图片块是否被网关正确转发",
        "judge": "能读出图中数字为可用；答错说明图片块被吞；400 为不支持",
    },
    "p6_cache": {
        "name": "提示缓存",
        "question": "cache_control 是否被透传并命中",
        "judge": "第二次请求 usage.cache_read_input_tokens > 0 为命中",
    },
    "p7_stream": {
        "name": "流式",
        "question": "SSE 事件序列与 usage 是否完整",
        "judge": "含 message_start / content_block_delta / message_stop，且 usage 与非流式一致",
    },
    "p8_prefill": {
        "name": "预填",
        "question": "末轮 assistant 预填是否被接受",
        "judge": "400 与官方一致属正常；200 且内容续写说明网关丢弃了预填",
    },
    "p9_unknown": {
        "name": "未知模型",
        "question": "错误信息是否泄露上游渠道",
        "judge": "记录错误体原文",
    },
}


def main() -> int:
    out = {
        "_comment": "L2 能力探针定义。请求体模板与判据由 scripts/eval/probe_capability.py 实现，本文件供 review 与版本化。",
        "_generated_by": "scripts/eval/make_capability_probes_config.py",
        "protocols": {
            "messages": {
                "endpoint": "/v1/messages",
                "headers": {"anthropic-version": "2023-06-01"},
                "tool_schema_field": "input_schema",
                "tool_choice_variants": {"auto": {"type": "auto"}, "forced": {"type": "tool", "name": "<tool>"}},
                "thinking_field": "thinking",
                "structured_output_field": "output_config.format",
            },
            "chat": {
                "endpoint": "/v1/chat/completions",
                "headers": {},
                "tool_schema_field": "function.parameters",
                "tool_choice_variants": {"auto": "auto", "forced": "required"},
                "thinking_field": "reasoning_effort",
                "structured_output_field": "response_format",
            },
        },
        "probes": {},
    }

    for probe in probes.PROBES:
        description = DESCRIPTIONS.get(probe, {})
        entry = {
            "name": description.get("name", probe),
            "question": description.get("question", ""),
            "judge": description.get("judge", ""),
            "bodies": {},
        }
        for protocol in ("messages", "chat"):
            body = probes.build_body(protocol, probe)
            # 图片数据很长，配置里只留占位说明
            body = json.loads(json.dumps(body, ensure_ascii=False))
            body = _strip_big_blobs(body)
            entry["bodies"][protocol] = body
        out["probes"][probe] = entry

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("已写入 %s（%d 个探针）" % (OUT_PATH, len(out["probes"])))
    return 0


def _strip_big_blobs(node):
    """把 base64 图片换成占位符，配置保持可读。"""
    if isinstance(node, dict):
        result = {}
        for key, value in node.items():
            if key == "data" and isinstance(value, str) and len(value) > 200:
                result[key] = "<base64 png，由 make_png_with_number(7) 运行时生成>"
            elif key == "url" and isinstance(value, str) and value.startswith("data:image"):
                result[key] = "<data url，由 make_png_with_number(7) 运行时生成>"
            else:
                result[key] = _strip_big_blobs(value)
        return result
    if isinstance(node, list):
        return [_strip_big_blobs(item) for item in node]
    return node


if __name__ == "__main__":
    raise SystemExit(main())
