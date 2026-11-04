#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
评测题集判分器。

全部自动判定，不用 LLM 评委——这里要评的是「网关路由到了哪个权重」，
混入评委模型自身的偏差会让结论不可信。

用法：
    python scripts/eval/grade_benchmark.py --items temp/eval/benchmark_v1.jsonl \
        --results site/temp/eval/runs/20261021/l4_benchmark.jsonl \
        --out site/temp/eval/runs/20261021/l4_graded.jsonl
    python scripts/eval/grade_benchmark.py --summary site/temp/eval/runs/20261021/l4_graded.jsonl
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

# 中文数字转阿拉伯数字，用于 exact 判分时放宽书写差异
CN_DIGITS = {"零": 0, "一": 1, "二": 2, "两": 2, "三": 3, "四": 4,
             "五": 5, "六": 6, "七": 7, "八": 8, "九": 9}
CN_UNITS = {"十": 10, "百": 100, "千": 1000}

REFUSAL_MARKERS = [
    "不知道", "不了解", "未查到", "没有", "无法", "不存在", "查不到", "未能",
    "抱歉", "没有找到", "似乎没有", "不确定", "无法确定", "无从", "没有提到",
    "未提及", "找不到", "不能", "不可以", "不提供", "拒绝",
]


def normalize(text: str) -> str:
    """全角转半角、去空白、去常见前缀与 markdown 强调。"""
    if not text:
        return ""
    out = []
    for ch in text:
        code = ord(ch)
        if code == 0x3000:
            out.append(" ")
        elif 0xFF01 <= code <= 0xFF5E:
            out.append(chr(code - 0xFEE0))
        else:
            out.append(ch)
    result = "".join(out)
    result = re.sub(r"```[a-zA-Z]*\n?", " ", result)
    result = re.sub(r"```", " ", result)
    result = result.replace("**", "").replace("##", " ").replace("#", " ")
    result = re.sub(r"^\s*(答案|回答|结果|Answer|answer)\s*[:：]\s*", "", result.strip())
    return result.strip()


def cn_to_int(text: str):
    """把简单中文数字转成整数，失败返回 None。"""
    if not text:
        return None
    if "十" not in text and not any(c in CN_DIGITS for c in text):
        return None
    if not all(c in CN_DIGITS or c in CN_UNITS for c in text):
        return None
    total = 0
    section = 0
    number = 0
    for ch in text:
        if ch in CN_DIGITS:
            number = CN_DIGITS[ch]
        elif ch in CN_UNITS:
            unit = CN_UNITS[ch]
            if number == 0:
                number = 1
            section += number * unit
            number = 0
    return section + number


def extract_answer(text: str) -> str:
    """从回答里抽最终答案：优先 #### 之后，其次最后一行。"""
    normalized = normalize(text)
    if "####" in normalized:
        normalized = normalized.split("####")[-1].strip()
    lines = [line.strip() for line in normalized.splitlines() if line.strip()]
    if not lines:
        return ""
    return lines[-1]


def extract_numbers(text: str) -> list:
    normalized = normalize(text).replace(",", "")
    found = re.findall(r"-?\d+(?:\.\d+)?", normalized)
    return [float(f) for f in found]


def extract_code(text: str) -> str:
    blocks = re.findall(r"```(?:python|py)?\s*\n(.*?)```", text, re.S)
    if blocks:
        return blocks[0]
    # 没有代码块标记时，整段尝试
    return text if "def " in text else ""


def judge_code(item: dict, text: str) -> dict:
    """抽出代码在子进程里跑测试用例。只出纯函数无 IO 题，避免沙箱风险。"""
    code = extract_code(text)
    if not code.strip():
        return {"correct": False, "detail": "未抽出可执行代码"}

    judge = item["judge"]
    harness = [judge.get("setup", "")]
    harness.append(code)
    harness.append("")
    harness.append("_cases = %r" % (judge.get("tests", []),))
    harness.append(
        "for _c in _cases:\n"
        "    _got = eval(_c['call'])\n"
        "    _exp = eval(_c['expect'])\n"
        "    if _got != _exp:\n"
        "        print('FAIL', _c['call'], 'got', repr(_got), 'want', repr(_exp))\n"
        "        raise SystemExit(1)\n"
        "print('ALLPASS')\n"
    )
    source = "\n".join(harness)

    with tempfile.TemporaryDirectory() as tmp:
        path = Path(tmp) / "candidate.py"
        path.write_text(source, encoding="utf-8")
        try:
            proc = subprocess.run(
                [sys.executable, str(path)],
                capture_output=True, text=True, timeout=15, cwd=tmp,
            )
        except subprocess.TimeoutExpired:
            return {"correct": False, "detail": "执行超时（15 秒）"}
    output = (proc.stdout or "") + (proc.stderr or "")
    if "ALLPASS" in output:
        return {"correct": True, "detail": "全部测试用例通过"}
    return {"correct": False, "detail": output.strip()[:400] or "无输出但未通过"}


def judge_item(item: dict, text: str) -> dict:
    judge = item["judge"]
    kind = judge.get("type")
    normalized = normalize(text)

    if kind == "exact":
        answer = str(judge["answer"])
        candidates = [answer] + [str(a) for a in judge.get("alternatives", [])]
        extracted = extract_answer(text)
        if extracted in candidates:
            return {"correct": True, "detail": extracted}
        if answer in normalized:
            return {"correct": True, "detail": "命中正文"}
        cn = cn_to_int(answer)
        if cn is not None and (str(cn) in extracted or str(cn) in normalized):
            return {"correct": True, "detail": "中文数字等价"}
        return {"correct": False, "detail": extracted[:160] or "(空回答)"}

    if kind == "number":
        numbers = extract_numbers(text)
        if not numbers:
            return {"correct": False, "detail": "未抽到数字"}
        target = float(judge["answer"])
        tolerance = float(judge.get("tolerance", 0))
        for value in numbers:
            if abs(value - target) <= tolerance:
                return {"correct": True, "detail": str(value)}
        return {"correct": False, "detail": "抽到 %s，目标 %s" % (numbers[:5], target)}

    if kind == "multi_choice":
        options = judge.get("options", "ABC")
        answer = judge["answer"]
        extracted = extract_answer(text).upper()
        picked = re.findall(r"[%s]" % options, extracted)
        unique = set(picked)
        if unique == {answer}:
            return {"correct": True, "detail": extracted[:80]}
        return {"correct": False, "detail": "抽到 %s，目标 %s" % (sorted(unique), answer)}

    if kind == "json":
        candidate = normalized
        match = re.search(r"\{.*\}", candidate, re.S)
        if match:
            candidate = match.group(0)
        try:
            data = json.loads(candidate)
        except (json.JSONDecodeError, TypeError):
            return {"correct": False, "detail": "不是合法 JSON：%s" % candidate[:120]}
        expected = judge.get("expect", {})
        problems = []
        for key, want in expected.items():
            got = data.get(key)
            if isinstance(want, int) and not isinstance(want, bool):
                if not isinstance(got, int) or isinstance(got, bool):
                    problems.append("%s 类型应为整数" % key)
            elif got != want:
                problems.append("%s 期望 %r 实得 %r" % (key, want, got))
        if problems:
            return {"correct": False, "detail": "；".join(problems)}
        return {"correct": True, "detail": "字段与类型均正确"}

    if kind == "contains_any":
        markers = judge.get("any", [])
        hit = next((m for m in markers if m in normalized), None)
        if not hit:
            return {"correct": False, "detail": "未命中任一预期表述：%s" % markers[:4]}
        forbidden = judge.get("forbidden", [])
        bad = [f for f in forbidden if f in normalized]
        if bad:
            return {"correct": False, "detail": "命中禁答内容：%s" % bad[:3]}
        return {"correct": True, "detail": "命中「%s」且无臆造内容" % hit}

    if kind == "refusal":
        markers = judge.get("markers", REFUSAL_MARKERS)
        hit = next((m for m in markers if m in normalized), None)
        if not hit:
            return {"correct": False, "detail": "未表现出拒答"}
        forbidden = judge.get("forbidden", [])
        bad = [f for f in forbidden if f in normalized]
        if bad:
            return {"correct": False, "detail": "拒答但编造了内容：%s" % bad[:3]}
        return {"correct": True, "detail": "拒答且无编造"}

    if kind == "constraints":
        required = judge.get("required", [])
        missing = [r for r in required if r not in normalized]
        if missing:
            return {"correct": False, "detail": "缺少必需内容：%s" % missing}
        forbidden = judge.get("forbidden", [])
        bad = [f for f in forbidden if f in normalized]
        if bad:
            return {"correct": False, "detail": "出现禁止内容：%s" % bad[:3]}
        count = judge.get("semicolon_count")
        if count is not None:
            # normalize 会把全角「；」转成半角「;」，两种都要计入
            semicolons = normalized.count("；") + normalized.count(";")
            if semicolons != count:
                return {"correct": False, "detail": "分号数量为 %d，期望 %d" % (semicolons, count)}
        return {"correct": True, "detail": "约束全部满足"}

    if kind == "lines":
        lines = [l.strip() for l in normalized.splitlines() if l.strip()]
        expected = judge.get("count")
        if expected is not None and len(lines) != expected:
            return {"correct": False, "detail": "有效行数 %d，期望 %d" % (len(lines), expected)}
        return {"correct": True, "detail": "%d 行" % len(lines)}

    if kind == "code":
        return judge_code(item, text)

    return {"correct": None, "detail": "未知的判分类型：%s" % kind}


def load_results(path: str) -> list:
    """读原始结果。兼容两种落盘格式：JSON 数组（logger.save_run 写的）与 JSONL。"""
    text = Path(path).read_text(encoding="utf-8")
    stripped = text.strip()
    if stripped.startswith("["):
        return json.loads(stripped)
    rows = []
    for line in stripped.splitlines():
        line = line.strip()
        if line:
            rows.append(json.loads(line))
    return rows


def grade(items: list, results: list) -> list:
    """给一批回答判分。results 每行至少含 model 与 id。

    同一题跑多次时（reasoning 与 code 类别跑 3 次）取多数票，
    否则重复尝试会被当成多道题，正确率被放大。
    """
    by_id = {item["id"]: item for item in items}
    grouped: dict = {}
    for row in results:
        item = by_id.get(row.get("id"))
        if item is None:
            continue
        key = (row.get("model"), row.get("id"))
        grouped.setdefault(key, []).append((row, item))

    graded = []
    for (model, item_id), entries in grouped.items():
        item = entries[0][1]
        verdicts = []
        for row, _ in entries:
            text = row.get("text") or ""
            verdicts.append((row, judge_item(item, text)))

        if len(verdicts) == 1:
            row, verdict = verdicts[0]
            correct = verdict["correct"]
            detail = verdict["detail"]
        else:
            # 多数票：正确数过半数才算对，平票算错
            hits = sum(1 for _, v in verdicts if v["correct"])
            correct = hits * 2 > len(verdicts)
            detail = "多次尝试 %d/%d 正确：%s" % (
                hits, len(verdicts),
                " | ".join(str(v["detail"])[:60] for _, v in verdicts),
            )
        first_row = verdicts[0][0]
        graded.append({
            "model": model,
            "id": item_id,
            "category": item["category"],
            "judge_type": item["judge"].get("type"),
            "attempts": len(verdicts),
            "correct": correct,
            "detail": detail,
            "http": first_row.get("http"),
            "latency_s": first_row.get("latency_s"),
            "usage": first_row.get("usage"),
        })
    return graded


def summarize(graded: list) -> dict:
    """按模型 × 类别汇总正确率。"""
    by_model: dict = {}
    for row in graded:
        model = row.get("model") or "unknown"
        bucket = by_model.setdefault(model, {"total": 0, "correct": 0, "by_category": {}})
        bucket["total"] += 1
        if row.get("correct"):
            bucket["correct"] += 1
        category = row.get("category") or "unknown"
        cat = bucket["by_category"].setdefault(category, {"total": 0, "correct": 0})
        cat["total"] += 1
        if row.get("correct"):
            cat["correct"] += 1

    for bucket in by_model.values():
        bucket["accuracy"] = round(bucket["correct"] / bucket["total"], 4) if bucket["total"] else None
        for cat in bucket["by_category"].values():
            cat["accuracy"] = round(cat["correct"] / cat["total"], 4) if cat["total"] else None

    ranking = sorted(
        [(m, b["accuracy"], b["correct"], b["total"]) for m, b in by_model.items() if b["accuracy"] is not None],
        key=lambda x: (-x[1], x[0]),
    )
    return {
        "models": by_model,
        "ranking": [
            {"model": m, "accuracy": acc, "correct": c, "total": t} for m, acc, c, t in ranking
        ],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="评测题集判分")
    parser.add_argument("--items", required=False, help="题集 JSONL 路径")
    parser.add_argument("--results", help="跑题集产生的原始结果 JSONL")
    parser.add_argument("--out", help="判分结果 JSONL 路径")
    parser.add_argument("--summary", action="store_true", help="对已判分结果做汇总")
    args = parser.parse_args()

    if args.summary:
        if not args.results:
            print("--summary 需要 --results 指定已判分文件", file=sys.stderr)
            return 2
        graded = load_results(args.results)
        report = summarize(graded)
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return 0

    if not args.items or not args.results:
        print("需要 --items 与 --results", file=sys.stderr)
        return 2

    items = [json.loads(l) for l in Path(args.items).read_text(encoding="utf-8").splitlines() if l.strip()]
    results = load_results(args.results)
    graded = grade(items, results)

    if args.out:
        path = Path(args.out)
        path.parent.mkdir(parents=True, exist_ok=True)
        # 用 JSON 数组格式，与 logger.save_run 一致，build_report 能直接 load_run
        path.write_text(json.dumps(graded, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print("判分完成 -> %s" % path)

    report = summarize(graded)
    print("判了 %d 条" % len(graded))
    for entry in report["ranking"]:
        print("  %-30s %6.1f%%  (%d/%d)"
              % (entry["model"], entry["accuracy"] * 100, entry["correct"], entry["total"]))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
