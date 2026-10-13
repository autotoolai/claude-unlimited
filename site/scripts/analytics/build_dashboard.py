#!/usr/bin/env python3
"""把 fetch_data.py 落盘的原始数据渲染成一个自包含的 dashboard.html（零依赖、零服务，双击就能看）。

设计约束（来自 dataviz 方法论，全部是「做错就返工」的那几条）：
- 形式先于颜色：概览用 stat tile（不是单柱图），趋势用折线，排名用横条（名次一望而知），构成用一张堆叠条 + 图例；
- 永远单一 Y 轴：Cloudflare 请求量与 Umami 访问量口径不同、量级差一个数量级，绝不叠在一张图上，各画各的；
- 颜色跟着实体走：Cloudflare = 橙（slot 2）、Umami = 蓝（slot 1）、转化 = 青（slot 3），顺序固定、不随排序变；
  三色已用 validate_palette.js 对深浅底色跑过（all-pairs：浅底最差 ΔE 24.0 / 深底 20.9，均过 15 的地板线）；
  浅底下青色对比度 2.67:1 低于 3:1 → 按「relief」规则，所有图表都配表格视图 + 直接数值；
- 标记克制：2px 线、≥8px 端点、1px 实线网格（不用虚线）、不给每个点标数字，只标端点；
- 悬停层必须有：折线走十字准线 + 汇总读数（数值为主、系列名为辅），条形逐条 tooltip；键盘可聚焦，行为与悬停一致；
- 表格视图是每张图的双胞胎（<details> 折叠），不靠颜色或悬停才能读数；
- 深色是「另选一套」，不是自动反相：按 prefers-color-scheme 与页面右上角的手动开关各自给值（同 00_base.css 的做法）。

数据缺口如实标注：某个源没拉到就显示缺口卡片；Cloudflare 上期无数据（新站）就写「无上期数据」，不写 0%。
"""
from __future__ import annotations

import argparse
import html
import json
import sys
from datetime import datetime
from pathlib import Path

BASE = Path(__file__).resolve().parent
DATA_DIR = BASE / "data"
OUT = BASE / "dashboard.html"

# 计量单位按「人」而不是「次」计的 Cloudflare 字段，用来做爬虫/真人粗判
HTML_TYPES = {"html"}


def load_latest(prefix: str) -> dict | None:
    files = sorted(DATA_DIR.glob(f"{prefix}_*.json"))
    return json.loads(files[-1].read_text(encoding="utf-8")) if files else None


def num(x) -> float:
    try:
        return float(x or 0)
    except (TypeError, ValueError):
        return 0.0


def fmt(x: float | None, digits: int = 0) -> str:
    """大数自动紧凑：1,284 / 12.9K / 1.2M；英雄数字用等宽以外的默认字形（即不用 tabular）"""
    if x is None:
        return "—"
    x = float(x)
    for limit, suffix in ((1_000_000_000, "B"), (1_000_000, "M"), (10_000, "K")):
        if abs(x) >= limit:
            v = x / limit
            return f"{v:.1f}{suffix}".replace(".0", "")
    if digits:
        return f"{x:,.{digits}f}"
    return f"{x:,.0f}"


def pct_delta(cur: float, prev: float | None) -> tuple[str, str] | None:
    """环比。prev 为 None 或 0 表示上期无数据 —— 返回 None 让调用方写「无上期数据」而不是 +∞%"""
    if prev is None or prev == 0:
        return None
    return (f"{(cur - prev) / prev * 100:+.1f}%", "up" if cur >= prev else "down")


# ---------------- Cloudflare 归一化 ----------------


def cf_normalize(rows: list[dict]) -> dict:
    daily = sorted(
        [
            {
                "date": r.get("dimensions", {}).get("date", ""),
                "requests": num((r.get("sum") or {}).get("requests")),
                "page_views": num((r.get("sum") or {}).get("pageViews")),
                "uniques": num((r.get("uniq") or {}).get("uniques")),
                "html_requests": sum(num(c.get("requests")) for c in ((r.get("sum") or {}).get("contentTypeMap") or []) if c.get("edgeResponseContentTypeName") in HTML_TYPES),
            }
            for r in rows
        ],
        key=lambda r: r["date"],
    )
    totals = {
        "requests": sum(r["requests"] for r in daily),
        "page_views": sum(r["page_views"] for r in daily),
        "uniques": sum(r["uniques"] for r in daily),
        "html_requests": sum(r["html_requests"] for r in daily),
        "days": len(daily),
    }
    # 构成切分：各 map 逐日累加（日期维度与 map 正交，不能只看最后一天）
    def agg(map_key: str, key: str) -> dict[str, float]:
        out: dict[str, float] = {}
        for r in rows:
            for item in ((r.get("sum") or {}).get(map_key) or []):
                k = item.get(key) or "未知"
                out[k] = out.get(k, 0.0) + num(item.get("requests") or item.get("pageViews"))
        return out

    return {
        "daily": daily,
        "totals": totals,
        "country": agg("countryMap", "clientCountryName"),
        "browser": agg("browserMap", "uaBrowserFamily"),
        "content": agg("contentTypeMap", "edgeResponseContentTypeName"),
    }


def is_bot(name: str) -> bool:
    """UA 家族名里的爬虫关键词（BingBot/GoogleBot/…）；真实浏览器名不会命中这些子串"""
    low = name.lower()
    return any(k in low for k in ("bot", "crawler", "spider", "slurp", "baiduspider", "bytespider", "applebot", "petalbot", "gptbot", "claudebot", "ccbot", "curl", "wget", "python-requests"))


# ---------------- Umami 归一化 ----------------


def umami_normalize(doc: dict) -> dict:
    """Umami Cloud 的响应形状：/stats 返回 pageviews/visitors/visits/bounces/totaltime，
    /metrics 返回 {url:{pageviews,visitors,…}}，/events 返回 {事件名:{count,…}}（字段名以实际响应为准，读不到就留空）。"""
    s = doc.get("summary") or {}

    def stat(*keys: str) -> float | None:
        for k in keys:
            if k in s:
                return num(s[k])
        return None

    def metric_rows(doc_part: dict | None) -> list[dict]:
        data = (doc_part or {}).get("data")
        if isinstance(data, dict):
            return [{"key": k, "pageviews": num(v.get("pageviews")), "visitors": num(v.get("visitors"))} for k, v in data.items()]
        if isinstance(data, list):
            return [{"key": str(r.get("url") or r.get("name") or r.get("value") or ""), "pageviews": num(r.get("pageviews")), "visitors": num(r.get("visitors"))} for r in data]
        return []

    def event_rows(doc_part: dict | None) -> list[dict]:
        data = (doc_part or {}).get("data")
        if isinstance(data, dict):
            return [{"key": k, "count": num(v.get("count") if isinstance(v, dict) else v)} for k, v in data.items()]
        if isinstance(data, list):
            return [{"key": str(r.get("name") or r.get("event") or ""), "count": num(r.get("count"))} for r in data]
        return []

    # 日序列：charts 返回 [{date, …}]，缺失就空
    series = []
    chart = doc.get("series") or {}
    chart_data = chart.get("data")
    if isinstance(chart_data, list):
        for r in chart_data:
            if isinstance(r, dict):
                series.append({"date": str(r.get("date", ""))[:10], "pageviews": num(r.get("pageviews") or r.get("visitors")), "visitors": num(r.get("visitors"))})
    series.sort(key=lambda r: r["date"])
    return {
        "daily": series,
        "totals": {
            "pageviews": stat("pageviews"),
            "visitors": stat("visitors", "uniqueVisitors"),
            "visits": stat("visits"),
            "bounces": stat("bounces"),
            "totaltime": stat("totaltime", "totalTime"),
        },
        "by_url": sorted(metric_rows(doc.get("metrics_by_url")), key=lambda r: r["visitors"], reverse=True)[:15],
        "by_referrer": sorted(metric_rows(doc.get("metrics_by_referrer")), key=lambda r: r["visitors"], reverse=True)[:10],
        "by_country": sorted(metric_rows(doc.get("metrics_by_country")), key=lambda r: r["visitors"], reverse=True)[:10],
        "by_device": sorted(metric_rows(doc.get("metrics_by_device")), key=lambda r: r["visitors"], reverse=True)[:6],
        "events": sorted(event_rows(doc.get("events")), key=lambda r: r["count"], reverse=True)[:15],
    }


# ---------------- HTML 渲染件 ----------------


# Cloudflare 折线的系列定义：[取数 key, 图例名, 颜色]。两条线同一量纲（都是请求数），单一 Y 轴成立；
# 颜色用 CSS 变量，JS 侧读数用 defs_json 里的同名字面量（CSS 变量在 SVG 属性里可用，但 tooltip 里不便引用）。
CF_LINE_DEFS = [("html_requests", "HTML 文档请求", "var(--cf)"), ("requests", "全部请求（含爬虫/资源）", "var(--ink2)")]

# 堆叠条的色槽：validate_palette.js 已验证的 8 槽顺序（浅底三色 below 3:1 的槽一律配表格视图 = relief 规则）
STACK_COLORS = ["var(--cf)", "var(--um)", "var(--cv)", "#eda100", "#4a3aa7", "#008300", "#e87ba4", "var(--axis)"]


def e(s) -> str:
    return html.escape(str(s))


def sparkline(daily: list[dict], key: str, color: str, w: int = 96, h: int = 28) -> str:
    vals = [d[key] for d in daily]
    if len(vals) < 2:
        return ""
    mx, mn = max(vals), min(vals)
    rng = mx - mn or 1
    pts = " ".join(f"{i / (len(vals) - 1) * (w - 2) + 1:.1f},{h - 1 - (v - mn) / rng * (h - 2):.1f}" for i, v in enumerate(vals))
    return f'<svg class="spark" width="{w}" height="{h}" viewBox="0 0 {w} {h}" aria-hidden="true"><polyline points="{pts}" fill="none" stroke="{color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>'


def stat_tile(label: str, value: str, delta: tuple[str, str] | None, spark: str, note: str = "") -> str:
    delta_html = ""
    if delta:
        cls, text = delta
        arrow = "▲" if cls == "up" else "▼"
        delta_html = f'<span class="delta {cls}">{arrow} {e(text)}</span>'
    elif delta is None and note:
        delta_html = f'<span class="delta none">{e(note)}</span>'
    return (
        f'<div class="tile"><div class="tile__label">{e(label)}</div>'
        f'<div class="tile__value">{e(value)}</div>'
        f'<div class="tile__foot">{delta_html}{spark}</div></div>'
    )


def line_chart(daily: list[dict], series_defs: list[tuple[str, str, str]], width: int = 900, height: int = 260) -> str:
    """series_defs: [(取数 key, 图例名, 颜色)]。单一 Y 轴；无数据时返回空串让调用方跳过卡片。"""
    if len(daily) < 2 or not any(any(d.get(k) for k, _, _ in series_defs) for d in daily):
        return ""
    pad_l, pad_r, pad_t, pad_b = 56, 70, 16, 28
    vals = [d[k] for d in daily for k, _, _ in series_defs if k in d]
    mx = max(vals) or 1
    # Y 轴刻度取整到干净数字
    step = 10 ** (len(str(int(mx))) - 1)
    ymax = ((mx / step) + 1) * step
    n = len(daily)
    x = lambda i: pad_l + (i / (n - 1)) * (width - pad_l - pad_r)
    y = lambda v: pad_t + (1 - v / ymax) * (height - pad_t - pad_b)
    grid = "".join(f'<line x1="{pad_l}" x2="{width - pad_r}" y1="{y(t):.1f}" y2="{y(t):.1f}" class="grid"/><text x="{pad_l - 8}" y="{y(t) + 4:.1f}" class="axis" text-anchor="end">{fmt(t)}</text>' for t in [0, ymax / 4, ymax / 2, ymax * 3 / 4, ymax])
    paths, ends = "", ""
    for key, name, color in series_defs:
        pts = " ".join(f"{x(i):.1f},{y(d.get(key, 0)):.1f}" for i, d in enumerate(daily))
        paths += f'<polyline points="{pts}" fill="none" stroke="{color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>'
        last = daily[-1]
        ends += (
            f'<circle cx="{x(n - 1):.1f}" cy="{y(last.get(key, 0)):.1f}" r="4" fill="{color}" stroke="var(--surface)" stroke-width="2"/>'
            f'<text x="{x(n - 1) + 8:.1f}" y="{y(last.get(key, 0)) + 4:.1f}" class="endlabel">{e(fmt(last.get(key, 0)))}</text>'
        )
    xlabels = "".join(
        f'<text x="{x(i):.1f}" y="{height - 8}" class="axis" text-anchor="middle">{e(d["date"][5:])}</text>'
        for i, d in enumerate(daily)
        if i % max(1, n // 8) == 0 or i == n - 1
    )
    legend = "".join(f'<span class="lg"><i style="background:{c}"></i>{e(nm)}</span>' for _, nm, c in series_defs)
    ticks = "".join(f'<rect x="{x(i):.1f}" y="{pad_t}" width="{(n - 1) and (width - pad_l - pad_r) / (n - 1) or 4:.1f}" height="{height - pad_t - pad_b}" fill="transparent" data-i="{i}"/>' for i in range(n))
    return f"""<figure class="chart" data-chart="line" role="img" aria-label="趋势折线图，数值见下方表格">
<svg viewBox="0 0 {width} {height}" width="100%" height="{height}">{grid}{paths}{ends}{xlabels}{ticks}</svg>
<div class="legend">{legend}</div><div class="crosshair" hidden></div><div class="tip" hidden></div></figure>"""


def bar_rows(rows: list[tuple[str, float]], color: str, unit: str = "", limit: int = 10) -> str:
    """横条排名：一个系列一种颜色（不做「越大越深」的值阶——那是把长度重复编码到色相上）。"""
    if not rows:
        return '<p class="muted">无数据</p>'
    rows = rows[:limit]
    mx = max(v for _, v in rows) or 1
    out = []
    for i, (label, v) in enumerate(rows):
        out.append(
            f'<div class="bar" tabindex="0" data-tip="{e(label)} · {e(fmt(v))}{e(unit)}">'
            f'<span class="bar__name" title="{e(label)}">{e(label)}</span>'
            f'<span class="bar__track"><span class="bar__fill" style="width:{max(v / mx * 100, 0.8):.1f}%;background:{color}"></span></span>'
            f'<span class="bar__val">{e(fmt(v))}</span></div>'
        )
    return '<div class="bars">' + "".join(out) + "</div>"


def stack_bar(parts: list[tuple[str, float]], colors: list[str]) -> str:
    """单条堆叠构成 + 图例；段与段之间留 2px 底色缝（不是描边）"""
    total = sum(v for _, v in parts) or 1
    segs, legend = "", ""
    for i, ((name, v), c) in enumerate(zip(parts, colors)):
        pct = v / total * 100
        if pct <= 0:
            continue
        segs += f'<span class="seg" style="width:{pct:.2f}%;background:{c}" tabindex="0" data-tip="{e(name)} · {e(fmt(v))} ({pct:.1f}%)"></span>'
        legend += f'<span class="lg"><i style="background:{c}"></i>{e(name)} {pct:.0f}%</span>'
    return f'<div class="stack">{segs}</div><div class="legend">{legend}</div>'


def table(headers: list[str], rows: list[list[str]]) -> str:
    th = "".join(f"<th>{e(h)}</th>" for h in headers)
    tr = "".join("<tr>" + "".join(f"<td>{c}</td>" for c in r) + "</tr>" for r in rows)
    return f"<table><thead><tr>{th}</tr></thead><tbody>{tr}</tbody></table>"


def details(summary: str, inner: str) -> str:
    return f"<details><summary>{e(summary)}</summary>{inner}</details>"


def card(title: str, sub: str, body: str, chart_kind: str = "") -> str:
    return f'<section class="card" data-kind="{chart_kind}"><h2>{e(title)}</h2><p class="sub">{e(sub)}</p>{body}</section>'


def top_or_other(mapping: dict[str, float], top: int = 7) -> list[tuple[str, float]]:
    """Top N + 合并「其它」：色阶只有 8 槽，超过 7 类就必须折叠，不能生成新色相"""
    items = sorted(mapping.items(), key=lambda kv: -kv[1])
    if len(items) <= top:
        return items
    return items[:top] + [("其它", sum(v for _, v in items[top:]))]


def gap_card(name: str, reason: str) -> str:
    return f'<section class="card gap"><h2>{e(name)}</h2><p class="sub">数据缺口</p><p>{e(reason)}</p></section>'


# ---------------- 页面组装 ----------------

CSS = """
*{box-sizing:border-box}
:root{color-scheme:light;--bg:#f2f0e9;--surface:#faf9f5;--ink:#141413;--ink2:#3d3d3a;--muted:#6f6d66;--grid:#e3e0d6;--axis:#c3c2b7;
--cf:#eb6834;--um:#2a78d6;--cv:#1baf7a;--ring:rgba(20,20,19,.10);--delta-up:#006300;--delta-down:#b4341f}
@media (prefers-color-scheme:dark){:root:where(:not([data-theme=light])){color-scheme:dark;--bg:#0d0d0d;--surface:#1a1a19;--ink:#f3f0e8;--ink2:#d8d4c9;--muted:#a29d90;--grid:#2c2c2a;--axis:#383835;
--cf:#d95926;--um:#3987e5;--cv:#199e70;--ring:rgba(255,255,255,.10);--delta-up:#0ca30c;--delta-down:#e66767}}
:root[data-theme=dark]{color-scheme:dark;--bg:#0d0d0d;--surface:#1a1a19;--ink:#f3f0e8;--ink2:#d8d4c9;--muted:#a29d90;--grid:#2c2c2a;--axis:#383835;
--cf:#d95926;--um:#3987e5;--cv:#199e70;--ring:rgba(255,255,255,.10);--delta-up:#0ca30c;--delta-down:#e66767}
body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.55 system-ui,-apple-system,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif}
.wrap{max-width:1180px;margin:0 auto;padding:24px 20px 64px}
header{display:flex;flex-wrap:wrap;align-items:baseline;gap:12px 20px;margin-bottom:4px}
h1{font-size:20px;margin:0}
.meta,.sub,.muted{color:var(--muted);font-size:12.5px}
.theme-btn{margin-left:auto;background:var(--surface);color:var(--ink2);border:1px solid var(--ring);border-radius:8px;padding:6px 12px;cursor:pointer}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px;margin:16px 0 24px}
.tile{background:var(--surface);border:1px solid var(--ring);border-radius:12px;padding:14px 16px}
.tile__label{color:var(--muted);font-size:12.5px}
.tile__value{font-size:30px;font-weight:600;line-height:1.2;margin:2px 0 4px}
.tile__foot{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:28px}
.delta{font-size:12.5px}.delta.up{color:var(--delta-up)}.delta.down{color:var(--delta-down)}.delta.none{color:var(--muted)}
.spark{display:block}
.grid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(460px,1fr));gap:14px}
.card{background:var(--surface);border:1px solid var(--ring);border-radius:14px;padding:16px 18px;margin:0 0 14px}
.card h2{font-size:15px;margin:0 0 2px}
.card.gap{border-style:dashed;color:var(--muted)}
.chart{margin:10px 0 0;position:relative}
.chart svg{display:block;overflow:visible}
.grid{stroke:var(--grid);stroke-width:1}.axis{fill:var(--muted);font-size:11px;font-variant-numeric:tabular-nums}.endlabel{fill:var(--ink2);font-size:11px}
.legend{display:flex;flex-wrap:wrap;gap:6px 16px;margin-top:8px;font-size:12.5px;color:var(--ink2)}
.lg{display:inline-flex;align-items:center;gap:6px}.lg i{width:14px;height:3px;border-radius:2px;display:inline-block}
.tip{position:absolute;pointer-events:none;background:var(--surface);border:1px solid var(--ring);border-radius:8px;padding:6px 9px;font-size:12.5px;color:var(--ink2);box-shadow:0 8px 20px -12px rgba(0,0,0,.4);white-space:nowrap;z-index:5}
.tip b{color:var(--ink);font-size:14px}.tip .row{display:flex;gap:8px;align-items:center}
.tip .row i{width:12px;height:3px;border-radius:2px}
.crosshair{position:absolute;top:16px;bottom:28px;width:1px;background:var(--axis)}
.bars{display:flex;flex-direction:column;gap:6px;margin-top:10px}
.bar{display:grid;grid-template-columns:minmax(90px,26%) 1fr auto;gap:10px;align-items:center;outline:none}
.bar__name{color:var(--ink2);font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bar__track{height:10px;background:var(--grid);border-radius:5px;overflow:hidden}
.bar__fill{display:block;height:100%;border-radius:0 4px 4px 0}
.bar__val{font-variant-numeric:tabular-nums;color:var(--ink2);font-size:12.5px}
.bar:hover .bar__fill,.bar:focus-visible .bar__fill{filter:brightness(1.12)}
.bar:focus-visible{outline:2px solid var(--um);outline-offset:2px;border-radius:4px}
.stack{display:flex;height:14px;border-radius:7px;overflow:hidden;margin-top:12px;background:var(--surface);gap:2px}
.seg{min-width:2px;outline:none}.seg:focus-visible{outline:2px solid var(--ink);outline-offset:1px}
details{margin-top:12px;border-top:1px solid var(--grid);padding-top:8px}
summary{cursor:pointer;color:var(--ink2);font-size:12.5px}
table{width:100%;border-collapse:collapse;margin-top:8px;font-size:12.5px}
th,td{text-align:left;padding:5px 8px;border-bottom:1px solid var(--grid);color:var(--ink2)}
th{color:var(--muted);font-weight:500}td:not(:first-child),th:not(:first-child){font-variant-numeric:tabular-nums}
footer{margin-top:28px;color:var(--muted);font-size:12px}
@media (max-width:640px){.wrap{padding:16px 12px 48px}.tile__value{font-size:26px}}
@media print{body{background:#fff}.card{break-inside:avoid}}
"""

JS = r"""
// 主题开关：写 data-theme 到 <html>，与官网 shell_extra.css 的做法一致；初始跟随系统
(function(){var b=document.getElementById('theme-btn');if(!b)return;
 var set=function(m){document.documentElement.setAttribute('data-theme',m);b.textContent=m==='dark'?'浅色':'深色'};
 var cur=document.documentElement.getAttribute('data-theme');
 b.addEventListener('click',function(){var n=cur==='dark'?'light':'dark';cur=n;set(n);try{localStorage.setItem('cu-dash-theme',n)}catch(e){}});
 try{var s=localStorage.getItem('cu-dash-theme');if(s){cur=s;set(s)}}catch(e){}
})();

// 折线图：十字准线 + 一次读出全部系列（数值为主，系列名为辅）；键盘左右键移动准线
(function(){
 var chart=document.querySelector('.chart[data-chart=line]');if(!chart)return;
 var svg=chart.querySelector('svg'),tip=chart.querySelector('.tip'),hair=chart.querySelector('.crosshair');
 var data=JSON.parse(document.getElementById('series-data').textContent),dates=JSON.parse(document.getElementById('series-dates').textContent),defs=JSON.parse(document.getElementById('series-defs').textContent);
 var ticks=[].slice.call(svg.querySelectorAll('rect[data-i]'));
 function idxAt(clientX){var r=svg.getBoundingClientRect();var vb=svg.viewBox.baseVal;var x=(clientX-r.left)/r.width*vb.width;var best=0,bd=1e9;
  ticks.forEach(function(t,i){var d=Math.abs(parseFloat(t.getAttribute('x'))+parseFloat(t.getAttribute('width'))/2-x);if(d<bd){bd=d;best=i}});return best}
 function show(i,cx,cy){var row=defs.map(function(d){return '<div class="row"><i style="background:'+d[2]+'"></i><b>'+fmt(data[i][d[0]]||0)+'</b> '+esc(d[1])+'</div>'}).join('');
  tip.innerHTML='<div>'+esc(dates[i])+'</div>'+row;tip.hidden=false;
  var r=chart.getBoundingClientRect(),tw=tip.offsetWidth;tip.style.left=Math.min(Math.max(4,cx+14),r.width-tw-4)+'px';tip.style.top=Math.max(4,cy-10)+'px';
  var rr=svg.getBoundingClientRect(),vb=svg.viewBox.baseVal;var x=ticks[i].getAttribute('x');hair.style.left=(parseFloat(x)/vb.width*rr.width)+'px';hair.hidden=false}
 function hide(){tip.hidden=true;hair.hidden=true}
 function esc(s){return String(s).replace(/[&<>]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;'}[c]})}
 function fmt(v){v=Number(v)||0;if(Math.abs(v)>=1e6)return (v/1e6).toFixed(1).replace(/\.0$/,'')+'M';if(Math.abs(v)>=1e4)return (v/1e3).toFixed(1).replace(/\.0$/,'')+'K';return v.toLocaleString('en-US')}
 svg.addEventListener('pointermove',function(ev){var i=idxAt(ev.clientX);show(i,ev.clientX-chart.getBoundingClientRect().left,ev.clientY-chart.getBoundingClientRect().top)});
 svg.addEventListener('pointerleave',hide);
 chart.tabIndex=0;var ki=dates.length-1;
 chart.addEventListener('keydown',function(ev){if(ev.key!=='ArrowLeft'&&ev.key!=='ArrowRight')return;ev.preventDefault();ki=Math.min(dates.length-1,Math.max(0,ki+(ev.key==='ArrowLeft'?-1:1)));
  var x=ticks[ki].getAttribute('x'),r=svg.getBoundingClientRect(),vb=svg.viewBox.baseVal;show(ki,x/vb.width*r.width,30)});
})();

// 条形/堆叠段：标记本身是命中区（>=10px 高/宽，堆叠段过窄时用整条命中最近的段）
(function(){
 var fmt=function(v){return Number(v||0).toLocaleString('en-US')};
 var all=[].slice.call(document.querySelectorAll('.bar,.seg'));
 var tip=document.createElement('div');tip.className='tip';tip.hidden=true;document.body.appendChild(tip);
 function show(el,ev){var t=el.getAttribute('data-tip');if(!t)return;var p=t.split(' · ');tip.innerHTML='<b>'+(p[1]||'')+'</b> '+p[0];tip.hidden=false;
  var r=el.getBoundingClientRect();tip.style.left=Math.min(r.left+window.scrollX,r.right+window.scrollX-tip.offsetWidth)+'px';tip.style.top=(r.top+window.scrollY-tip.offsetHeight-8)+'px'}
 all.forEach(function(el){el.addEventListener('pointerenter',function(ev){show(el,ev)});el.addEventListener('focus',function(ev){show(el,ev)});el.addEventListener('pointerleave',function(){tip.hidden=true});el.addEventListener('blur',function(){tip.hidden=true})});
})();
"""


def render(cf_doc: dict | None, umami_doc: dict | None, days: int) -> str:
    cf = cf_normalize(cf_doc["current"]) if cf_doc else None
    cf_prev = cf_normalize(cf_doc["previous"]) if cf_doc else None
    um = umami_normalize(umami_doc) if umami_doc else None
    has_prev = bool(cf_prev and cf_prev["totals"]["requests"] > 0)

    period = f"{cf_doc['period']['start']} ~ {cf_doc['period']['end']}" if cf_doc else f"最近 {days} 天"
    fetched = max([d.get("fetched_at", "") for d in (cf_doc, umami_doc) if d], default="")
    fetched_txt = datetime.fromisoformat(fetched).astimezone().strftime("%Y-%m-%d %H:%M") if fetched else "—"

    tiles = []
    if cf:
        t = cf["totals"]
        tiles.append(stat_tile("Cloudflare 请求数（含爬虫/资源）", fmt(t["requests"]), pct_delta(t["requests"], cf_prev["totals"]["requests"] if has_prev else None), sparkline(cf["daily"], "requests", "var(--cf)")))
        tiles.append(stat_tile("HTML 文档请求（≈ 页面访问量）", fmt(t["html_requests"]), pct_delta(t["html_requests"], cf_prev["totals"]["html_requests"] if has_prev else None), sparkline(cf["daily"], "html_requests", "var(--cf)")))
        tiles.append(stat_tile("独立访客（Cloudflare 口径）", fmt(t["uniques"]), pct_delta(t["uniques"], cf_prev["totals"]["uniques"] if has_prev else None), sparkline(cf["daily"], "uniques", "var(--um)")))
    if um and um["totals"]["visitors"] is not None:
        tiles.append(stat_tile("Umami 独立访客（真人，无爬虫）", fmt(um["totals"]["visitors"]), None, "", note="埋点首日起算，暂无上期"))
    if um:
        clicks = sum(r["count"] for r in um["events"])
        visitors = um["totals"]["visitors"] or 0
        rate = f"{clicks / visitors * 100:.1f}%" if visitors else "—"
        tiles.append(stat_tile("CTA 点击 / 访客（转化率）", rate, None, "", note=f"{fmt(clicks)} 次点击 / {fmt(visitors)} 访客"))

    trend_cards = []
    if cf and len(cf["daily"]) >= 2:
        # 两条线同一量纲（都是请求数）：「总量 vs 文档」用橙 + 次级墨色区分，单一 Y 轴成立，不做双轴
        chart = line_chart(cf["daily"], CF_LINE_DEFS)
        trend_cards.append(
            card(
                "Cloudflare 每日请求",
                f"{cf['totals']['days']} 天有流量（1d 数据集对低流量日期不单独成行）；全部请求含爬虫与静态资源，HTML 文档请求更接近真人看页面",
                chart
                + details(
                    "表格视图",
                    table(["日期", "HTML 文档请求", "全部请求", "独立访客"], [[r["date"], fmt(r["html_requests"]), fmt(r["requests"]), fmt(r["uniques"])] for r in cf["daily"]]),
                ),
            )
        )
    if um and len(um["daily"]) >= 2:
        trend_cards.append(
            card(
                "Umami 每日访问",
                "真人访问（无爬虫），数据有几小时延迟；与 Cloudflare 口径不同，不合并",
                line_chart(um["daily"], [("pageviews", "页面浏览", "var(--um)"), ("visitors", "独立访客", "var(--cv)")])
                + details("表格视图", table(["日期", "页面浏览", "独立访客"], [[r["date"], fmt(r["pageviews"]), fmt(r["visitors"])] for r in um["daily"]])),
            )
        )

    rank_cards = []
    if cf:
        browser_all = sorted(cf["browser"].items(), key=lambda kv: -kv[1])
        bot_rows = [(k, v) for k, v in browser_all if is_bot(k)][:6]
        human_rows = [(k, v) for k, v in browser_all if not is_bot(k)][:8]
        rank_cards.append(
            card(
                "Cloudflare 来源地区 · 请求分布",
                "按请求数排序；Top 8 之外合并为「其它」",
                stack_bar(top_or_other(cf["country"]), STACK_COLORS)
                + details("表格视图", table(["地区", "请求数"], [[k, fmt(v)] for k, v in sorted(cf["country"].items(), key=lambda kv: -kv[1])[:20]])),
            )
        )
        rank_cards.append(
            card(
                "Cloudflare 响应类型构成",
                "html ≈ 被请求的页面；js/css/图片/其它为静态资源，可用来粗判爬虫与资源命中",
                stack_bar(top_or_other(cf["content"]), STACK_COLORS)
                + details("表格视图", table(["类型", "请求数"], [[k, fmt(v)] for k, v in sorted(cf["content"].items(), key=lambda kv: -kv[1])])),
            )
        )
        rank_cards.append(
            card(
                "Cloudflare 浏览器家族（≈ 爬虫识别）",
                "名字里带 Bot/Crawler 等关键词的记作爬虫；这是粗判，Umami 才是「真人」的权威口径",
                bar_rows(human_rows, "var(--cf)", limit=8) + ("<hr><p class=sub>疑似爬虫</p>" + bar_rows(bot_rows, "var(--ink2)", limit=6) if bot_rows else "")
                + details("表格视图", table(["家族", "浏览量", "判定"], [[k, fmt(v), "爬虫" if is_bot(k) else "浏览器"] for k, v in browser_all])),
            )
        )
    if um:
        rank_cards.append(
            card(
                "Umami 热门页面 · 独立访客",
                "埋点数据按 [data-cta] 与页面路径聚合",
                bar_rows([(r["key"], r["visitors"]) for r in um["by_url"]], "var(--um)", limit=10)
                + details("表格视图", table(["路径", "访客", "浏览"], [[r["key"], fmt(r["visitors"]), fmt(r["pageviews"])] for r in um["by_url"]])),
            )
        )
        rank_cards.append(
            card(
                "Umami 来源渠道",
                "referrer 维度；直接访问为空",
                bar_rows([(r["key"], r["visitors"]) for r in um["by_referrer"]], "var(--um)", limit=8)
                + details("表格视图", table(["来源", "访客"], [[r["key"], fmt(r["visitors"])] for r in um["by_referrer"]])),
            )
        )
        rank_cards.append(
            card(
                "Umami 设备 · 国家",
                "两条各自 Top 5",
                "<div class=grid2><div><p class=sub>设备</p>" + bar_rows([(r["key"], r["visitors"]) for r in um["by_device"]], "var(--um)", limit=5) + "</div><div><p class=sub>国家</p>" + bar_rows([(r["key"], r["visitors"]) for r in um["by_country"]], "var(--cv)", limit=5) + "</div></div>"
                + details("表格视图", table(["维度", "名称", "访客"], [["设备", r["key"], fmt(r["visitors"])] for r in um["by_device"]] + [["国家", r["key"], fmt(r["visitors"])] for r in um["by_country"]])),
            )
        )
        rank_cards.append(
            card(
                "CTA 点击事件 · 转化",
                "事件名 = 组件上的 data-cta 值（nav / plan_<组>_<档> / kefu_* / copy_* / term_copy）",
                bar_rows([(r["key"], r["count"]) for r in um["events"]], "var(--cv)", " 次", limit=12)
                + details("表格视图", table(["事件", "点击"], [[r["key"], fmt(r["count"])] for r in um["events"]])),
            )
        )

    gaps = []
    if not cf_doc:
        gaps.append(gap_card("Cloudflare", "缺 CLOUDFLARE_API_TOKEN（或 token 看不到该 zone）。填 config/local/analytics_secrets.env 后重跑 npm run analytics。"))
    if not umami_doc:
        gaps.append(gap_card("Umami", "缺 UMAMI_API_KEY / UMAMI_WEBSITE_ID，或网络到 cloud.umami.is 不通。配置见 config/analytics_secrets.example.env。"))

    # 悬停读数用的系列定义必须与折线图里画的完全同一份（同样的 key / 名称 / 颜色），否则 tooltip 对不上线
    series_json = json.dumps(cf["daily"] if cf else [], ensure_ascii=False)
    dates_json = json.dumps([r["date"] for r in (cf["daily"] if cf else [])], ensure_ascii=False)
    defs_json = json.dumps(CF_LINE_DEFS, ensure_ascii=False)

    notes = []
    if cf_doc:
        notes += cf_doc.get("notes", [])
        if not has_prev:
            notes.append("上期（同长度区间）无数据：站点上线不足两个区间，环比统一显示「无上期数据」。")
    if umami_doc:
        notes.append(f"Umami 免费档：每月 10 万事件、保留 6 个月；事件延迟数小时。区间 {umami_doc['period']['start']} ~ {umami_doc['period']['end']}。")
    notes.append("百度统计只在 tongji.baidu.com 后台查看，不进本看板（无公开 API）。")
    notes.append("Cloudflare Web Analytics 已开启（Cloudflare 自动注入 beacon），数据在 Cloudflare 控制台看；本看板的 Cloudflare 一栏来自同一份 GraphQL 流量数据。")

    return f"""<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>官网流量看板 {e(period)}</title><style>{CSS}</style></head>
<body><div class="wrap">
<header><h1>官网流量看板</h1><span class="meta">claude-unlimited.aiautotools.com · 区间 {e(period)}</span>
<span class="meta">更新于 {e(fetched_txt)}（本机时间）</span><button id="theme-btn" class="theme-btn">深色</button></header>
<p class="sub">Cloudflare（橙）＝站点级请求，含爬虫与静态资源；Umami（蓝）＝真人访问与 CTA 点击事件（青）。两者口径不同，各看各的，不合并。没有上期数据时写「无上期数据」而不是 0%。</p>
<section class="tiles">{''.join(tiles)}</section>
<section class="grid2">{''.join(trend_cards)}</section>
<section class="grid2">{''.join(rank_cards)}</section>
{''.join(gaps)}
<footer><p class="sub">口径与限制</p><ul>{''.join(f'<li>{e(n)}</li>' for n in notes)}</ul>
<p class="sub">生成自 scripts/analytics/build_dashboard.py，数据来自同目录 data/*.json；重跑 npm run analytics 刷新。</p></footer>
</div>
<script type="application/json" id="series-data">{series_json}</script><script type="application/json" id="series-dates">{dates_json}</script><script type="application/json" id="series-defs">{defs_json}</script>
<script>{JS}</script></body></html>"""


def main() -> int:
    ap = argparse.ArgumentParser(description="把 data/*.json 渲染成 dashboard.html")
    ap.add_argument("--days", type=int, default=30)
    ap.add_argument("--out", default=str(OUT))
    args = ap.parse_args()
    cf_doc, um_doc = load_latest("cloudflare"), load_latest("umami")
    if not cf_doc and not um_doc:
        print("[dashboard] data/ 里没有数据，先跑 npm run sync:analytics", file=sys.stderr)
        return 1
    html_text = render(cf_doc, um_doc, args.days)
    Path(args.out).write_text(html_text, encoding="utf-8")
    print(f"[dashboard] 已写出 {args.out}")
    # 终端摘要：给不看图的人（也给我）一行结论
    if cf_doc:
        c = cf_normalize(cf_doc["current"])["totals"]
        print(f"[摘要] Cloudflare：{c['days']} 天有流量，请求 {c['requests']:,.0f}，HTML 文档请求 {c['html_requests']:,.0f}，独立访客 {c['uniques']:,.0f}")
    if um_doc:
        u = umami_normalize(um_doc)
        clicks = sum(r["count"] for r in u["events"])
        print(f"[摘要] Umami：访客 {u['totals']['visitors'] or 0:,.0f}，浏览 {u['totals']['pageviews'] or 0:,.0f}，CTA 点击 {clicks:,.0f}")
        for r in u["events"][:5]:
            print(f"        · {r['key']}: {r['count']:,.0f}")
    else:
        print("[摘要] Umami：无数据（未配置或未拉取）")
    return 0


if __name__ == "__main__":
    sys.exit(main())
