#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Token 密度校准与长文本构造。

设计要点：密度靠「每个模型回读自己的 usage」得到，不同 tokenizer 天然隔离，
不需要维护「模型 × 语料」的手工对照表——这是用回读法而非手工表的关键理由。

不引入 tiktoken：Claude API 官方不用它，低估 15~20%，代码与中文误差更大，
而且本项目要求零第三方依赖。
"""

from __future__ import annotations

# 填充语料。中文句带序号，避免服务端对重复内容做去重或压缩，
# 那会让「看着超了其实没超」，误判上下文上限。
FILLER_CN = "第{n}条：这是一段用于填充上下文窗口的测试文本，包含各种常见的中文字符与标点符号。"
FILLER_EN = "Record {n}: the quick brown fox jumps over the lazy dog near the river bank. "

TAIL = "\n请只回复一个字符：1"


def _cn_unit(index: int) -> str:
    return FILLER_CN.format(n=index)


def _en_unit(index: int) -> str:
    return FILLER_EN.format(n=index)


def build_filler(target_tokens: int, tokens_per_char: float, cn_ratio: float = 0.6) -> str:
    """按目标 token 数构造填充文本。

    cn_ratio 决定中英比例，不同比例的 token 密度不同，必须分别校准。
    """
    if tokens_per_char <= 0:
        raise ValueError("tokens_per_char 必须为正")
    target_chars = int(target_tokens / tokens_per_char)
    cn_chars = int(target_chars * cn_ratio)
    en_chars = target_chars - cn_chars

    # 先估一条单元的平均字符数，再决定重复多少条
    probe = _cn_unit(1) + _en_unit(1)
    unit_chars = len(probe)
    repeats = max(1, target_chars // max(1, unit_chars))

    parts: list[str] = []
    chars = 0
    index = 0
    while chars < target_chars and index < repeats * 4:
        index += 1
        piece = (_cn_unit(index) if (index % 10) < int(cn_ratio * 10) else _en_unit(index))
        parts.append(piece)
        chars += len(piece)
    return "".join(parts) + TAIL


def build_needle_filler(
    target_tokens: int,
    tokens_per_char: float,
    needle: str,
    position: str = "middle",
    cn_ratio: float = 0.6,
) -> str:
    """构造带检索针的长文本，用于检测「静默截断」。

    position 取 head / middle / tail，决定针埋在哪一段。
    """
    if tokens_per_char <= 0:
        raise ValueError("tokens_per_char 必须为正")
    needle_block = "\n【重要】本段文档的唯一标识是 %s。请在回答末尾原样输出该标识。\n\n" % needle
    question = "\n\n问题：上面文档中的唯一标识是什么？只输出标识本身。"

    body = build_filler(target_tokens, tokens_per_char, cn_ratio)
    needle_chars = len(needle_block)
    body_chars = max(0, len(body) - len(TAIL) - needle_chars)

    if position == "head":
        return needle_block + body[:body_chars] + TAIL + question
    if position == "tail":
        return body[:body_chars] + needle_block + TAIL + question
    half = body_chars // 2
    return body[:half] + needle_block + body[half:body_chars] + TAIL + question


def calibrate_density(client, model: str, target_tokens: int = 2000, cn_ratio: float = 0.6) -> dict:
    """用一个中等请求回读 usage.input_tokens，得到字符到 token 的换算率。

    优先走 count_tokens 端点（精确、免费）；该端点不存在时退回普通调用回读 usage。
    """
    probe = build_filler(target_tokens, 0.5, cn_ratio)

    counted = client.count_tokens(model, probe)
    if counted.get("ok") and isinstance(counted.get("body"), dict):
        tokens = counted["body"].get("input_tokens")
        if isinstance(tokens, int) and tokens > 0:
            return {
                "chars": len(probe),
                "tokens": tokens,
                "tokens_per_char": tokens / len(probe),
                "method": "count_tokens",
            }

    result = client.call(
        model,
        {"max_tokens": 8, "messages": [{"role": "user", "content": probe}]},
        protocol="messages",
    )
    if not result.get("ok"):
        return {
            "chars": len(probe),
            "tokens": None,
            "tokens_per_char": None,
            "method": "failed",
            "error": result.get("error"),
        }
    tokens = result.get("usage", {}).get("input_tokens")
    if not tokens:
        return {
            "chars": len(probe),
            "tokens": None,
            "tokens_per_char": None,
            "method": "no_usage",
        }
    return {
        "chars": len(probe),
        "tokens": tokens,
        "tokens_per_char": tokens / len(probe),
        "method": "usage_readback",
    }


def estimate_tokens(text: str, tokens_per_char: float) -> int:
    return int(len(text) * tokens_per_char)
