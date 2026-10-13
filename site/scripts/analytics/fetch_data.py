#!/usr/bin/env python3
"""拉取官网流量数据（Umami + Cloudflare）并落盘，供 build_dashboard.py 渲染看板。

两个通道各答一个问题，口径不同、不能合并：
- Umami：真人访问与自定义事件（购买按钮点击、客服面板打开等），本站 data-cta 属性的值就是事件名；
- Cloudflare：站点级 HTTP 请求量，含爬虫与静态资源，用来看「有没有人访问、爬虫来不来、哪个页面被抓」。

Cloudflare 没有 REST 分析接口，只有 GraphQL（https://api.cloudflare.com/client/v4/graphql），
数据集挂在 viewer.zones 下、按 zoneTag 过滤。两个数据集的参数名不一样，别混用（都实测过）：
- httpRequests1dGroups 按天粒度，过滤字段是 date_geq / date_lt（不是 datetime_*），只有一个 date 维度，
  sum 里才有 requests / pageViews / uniq.uniques，orderBy 为空只能靠 limit 拿全部；
- httpRequestsAdaptiveGroups 是自适应采样，datetime_geq 必须带 Z 的 ISO8601，维度最全（含 clientRequestPath、
  clientRefererHost、clientCountryName、userAgentBrowser），但 requests 在 uniq 里，sum 只有 visits 等。
所以日序列用 1d，维度下钻用 adaptive。

缺 key 不报错：该源跳过并在 stderr 说明，看板照出并标注缺口（与 gen_sources.py --check 同一套风格）。
密钥读取顺序：环境变量 > config/local/analytics_secrets.env。
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

BASE = Path(__file__).resolve().parent
DATA_DIR = BASE / "data"
# 密钥文件在仓库根的 config/local/ 下（已 gitignore），仓库里有 example 模板
SECRETS = BASE.parents[2] / "config" / "local" / "analytics_secrets.env"
# 站点侧的 website id 内联在 .vitepress/analytics_snippets.ts（要进 HTML，必须内联兜底）；
# 拉数脚本默认从同一处读，避免「脚本里的 id」与「产物里的 id」各填一次、悄悄对不上。
SNIPPETS = BASE.parents[1] / ".vitepress" / "analytics_snippets.ts"

CF_ZONE_NAME = "claude-unlimited.aiautotools.com"
UMAMI_DEFAULT_BASE = "https://cloud.umami.is"


def log(msg: str) -> None:
    print(f"[analytics] {msg}", file=sys.stderr)


def load_secrets() -> dict[str, str]:
    """环境变量优先，其次读 config/local/analytics_secrets.env（KEY=VALUE，# 开头为注释）"""
    env: dict[str, str] = {}
    if SECRETS.is_file():
        for raw in SECRETS.read_text(encoding="utf-8").splitlines():
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, _, v = line.partition("=")
            env[k.strip()] = v.strip().strip('"').strip("'")
    for k in ("UMAMI_API_KEY", "UMAMI_WEBSITE_ID", "UMAMI_BASE_URL", "CLOUDFLARE_API_TOKEN"):
        os_env = os.environ.get(k, "").strip()
        if os_env:
            env[k] = os_env
    if not env.get("UMAMI_WEBSITE_ID") and SNIPPETS.is_file():
        m = re.search(r"umamiWebsiteId\s*=\s*process\.env\.UMAMI_WEBSITE_ID\s*\|\|\s*'([^']*)'", SNIPPETS.read_text(encoding="utf-8"))
        if m:
            env["UMAMI_WEBSITE_ID"] = m.group(1)
    return env


def http_json(url: str, *, headers: dict[str, str] | None = None, payload: dict | None = None, timeout: int = 60) -> dict:
    if payload is None:
        req = urllib.request.Request(url, headers=headers or {})
    else:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json", **(headers or {})},
        )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def qs(params: dict[str, str]) -> str:
    return urllib.parse.urlencode({k: v for k, v in params.items() if v not in (None, "")})


# ---------------- Umami ----------------


def fetch_umami(env: dict[str, str], start: date, end: date) -> dict | None:
    """Umami Cloud 免费档只给 API key 认证（Bearer），username/password 不再支持"""
    key = env.get("UMAMI_API_KEY", "")
    site = env.get("UMAMI_WEBSITE_ID", "")
    base = (env.get("UMAMI_BASE_URL") or UMAMI_DEFAULT_BASE).rstrip("/")
    if not key or not site:
        # 分开说缺哪个：website id 缺才会真的没站点，key 缺只是拉不到数
        missing = [k for k, v in (("UMAMI_API_KEY", key), ("UMAMI_WEBSITE_ID", site)) if not v]
        hint = "（website id 在 .vitepress/analytics_snippets.ts 的 umamiWebsiteId 内联值里）" if "UMAMI_WEBSITE_ID" in missing else ""
        log(f"Umami 跳过：缺 {' / '.join(missing)} {hint}（key 填 config/local/analytics_secrets.env，见 config/analytics_secrets.example.env）")
        return None
    headers = {"Authorization": f"Bearer {key}", "Accept": "application/json"}
    # startAt/endAt 是闭区间；end 传当天 23:59 才能覆盖完整一天
    window = {"startAt": start.isoformat() + "T00:00:00.000Z", "endAt": end.isoformat() + "T23:59:59.999Z"}

    def get(path: str, **extra: str) -> dict | None:
        try:
            return http_json(f"{base}{path}?" + qs({"websiteId": site, **window, **extra}), headers=headers)
        except urllib.error.HTTPError as exc:
            log(f"Umami {path} HTTP {exc.code}")
            return None
        except Exception as exc:  # noqa: BLE001
            log(f"Umami {path} 失败：{exc}")
            return None

    try:
        summary = get("/api/websites/%s/stats" % site)
        if summary is None:
            log("Umami 跳过：stats 接口不可用（API key 无效或 website id 不对？）")
            return None
        return {
            "source": "umami",
            "base_url": base,
            "website_id": site,
            "start": start.isoformat(),
            "end": end.isoformat(),
            "fetched_at": datetime.now(timezone.utc).isoformat(),
            "summary": summary,
            "series": get("/api/websites/%s/charts" % site, type="summary"),
            "metrics_by_url": get("/api/websites/%s/metrics" % site, type="url", limit="50"),
            "metrics_by_referrer": get("/api/websites/%s/metrics" % site, type="referrer", limit="30"),
            "metrics_by_country": get("/api/websites/%s/metrics" % site, type="country", limit="30"),
            "metrics_by_device": get("/api/websites/%s/metrics" % site, type="device", limit="10"),
            "events": get("/api/websites/%s/events" % site, limit="100"),
        }
    except Exception as exc:  # noqa: BLE001
        log(f"Umami 跳过：{exc}")
        return None


# ---------------- Cloudflare ----------------


def cf_zones(token: str) -> list[dict]:
    """zones 接口不带 name 过滤：Pages 自定义域虽走同一个 zone，token 未必对精确名可见，直接列出全部再筛"""
    try:
        d = http_json("https://api.cloudflare.com/client/v4/zones?per_page=50", headers={"Authorization": f"Bearer {token}"})
    except Exception as exc:  # noqa: BLE001
        log(f"Cloudflare 跳过：列 zone 失败 {exc}")
        return []
    if not d.get("success"):
        log(f"Cloudflare 跳过：列 zone 失败 {str(d.get('errors'))[:200]}")
        return []
    return d.get("result") or []


def cf_zone_id(token: str) -> str | None:
    """站点在 Pages 上挂着自定义域 claude-unlimited.aiautotools.com，Cloudflare 里它属于父 zone aiautotools.com；
    用父 zone 的 tag 查询会把同域其它子域流量算进来，对看板来说可接受，但这里只认父域命中这一个 zone。"""
    zones = cf_zones(token)
    for z in zones:
        if z.get("name") in (CF_ZONE_NAME, CF_ZONE_NAME.split(".", 1)[1]):
            return z["id"]
    if not zones:
        log(f"Cloudflare 跳过：token 看不到 {CF_ZONE_NAME}")
    else:
        log(f"Cloudflare 跳过：{CF_ZONE_NAME} 不在 token 可见的 zone 列表（{', '.join(z.get('name', '?') for z in zones)}）")
    return None


def cf_gql(token: str, query: str) -> dict:
    d = http_json(
        "https://api.cloudflare.com/client/v4/graphql",
        headers={"Authorization": f"Bearer {token}"},
        payload={"query": query},
    )
    if d.get("errors"):
        log(f"Cloudflare GraphQL 报错：{str(d['errors'][0].get('message', ''))[:200]}")
        return {}
    return d.get("data") or {}


def cf_1d(token: str, zone: str, start: date, end: date) -> list[dict]:
    """按天聚合的 httpRequests1dGroups：过滤字段是 date_geq/date_lt（不是 datetime_*），只有一个 date 维度。
    维度下钻全靠 sum 里的 map 字段（countryMap{clientCountryName requests}、browserMap{uaBrowserFamily pageViews}
    等），一次请求就能拿到一整段区间的全部切分。注意：低流量日期不会单独成行（1d 数据集有采样门槛），
    所以「整段区间的合计」比「逐日数组长度 × 日均」更可靠。"""
    q = (
        '{viewer{ zones(filter:{zoneTag:"%s"}){ httpRequests1dGroups('
        'filter:{date_geq:"%s",date_lt:"%s"}, limit:100, orderBy:[date_ASC])'
        "{ dimensions{ date }"
        " sum{ requests pageViews cachedRequests"
        " countryMap{ clientCountryName requests }"
        " browserMap{ uaBrowserFamily pageViews }"
        " contentTypeMap{ edgeResponseContentTypeName requests } }"
        " uniq{ uniques } } } } }"
        % (zone, start.isoformat(), (end + timedelta(days=1)).isoformat())
    )
    rows = cf_gql(token, q).get("viewer", {}).get("zones", [{}])[0].get("httpRequests1dGroups") or []
    return sorted(rows, key=lambda r: r.get("dimensions", {}).get("date", ""))


def fetch_cloudflare(env: dict[str, str], start: date, end: date) -> dict | None:
    """抓「本期」与「上期（紧邻的同长度区间）」两段，用于环比。
    本站 2026-08 中才上线，上期多半是空的 —— 这是正常情况，看板会标成「无上期数据」而不是 0%。"""
    token = env.get("CLOUDFLARE_API_TOKEN", "")
    if not token:
        log("Cloudflare 跳过：缺 CLOUDFLARE_API_TOKEN")
        return None
    zone = cf_zone_id(token)
    if not zone:
        return None
    days = (end - start).days + 1
    prev_end = start - timedelta(days=1)
    prev_start = prev_end - timedelta(days=days - 1)
    zones = cf_zones(token)
    return {
        "source": "cloudflare",
        "zone_tag": zone,
        "queried_zone_name": next((z.get("name") for z in zones if z["id"] == zone), None),
        "site_host": CF_ZONE_NAME,
        "period": {"start": start.isoformat(), "end": end.isoformat()},
        "prev_period": {"start": prev_start.isoformat(), "end": prev_end.isoformat()},
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "current": cf_1d(token, zone, start, end),
        "previous": cf_1d(token, zone, prev_start, prev_end),
        "notes": [
            "requests 含静态资源、爬虫与重定向，是「站点被访问了多少次」；pageViews 更接近「被请求的 HTML 文档数」。",
            "Cloudflare Web Analytics 已开启：站点经 Cloudflare 代理，该通道默认自动注入 static.cloudflareinsights.com 的 beacon（已核对线上各页），不需要改代码；它的数据只在 Cloudflare 控制台看，本看板用同源 GraphQL 数据代替。",
            "1d 数据集对低流量日期不单独成行（采样门槛），所以区间合计 > 数组天数是正常的。",
            "查询用的是 Cloudflare 里父 zone（自定义域归在父 zone 下），会把同域其它子域流量一起算进来。",
        ],
    }


def main() -> int:
    ap = argparse.ArgumentParser(description="拉取 Umami + Cloudflare 流量数据到 data/")
    ap.add_argument("--days", type=int, default=30, help="回看天数（默认 30）")
    ap.add_argument("--out", default=str(DATA_DIR), help="输出目录（默认 scripts/analytics/data）")
    args = ap.parse_args()
    end = date.today() - timedelta(days=1)  # 今天各平台数据都还没结算完，从昨天起算
    start = end - timedelta(days=args.days - 1)
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    env = load_secrets()
    stamp = date.today().isoformat()
    ok = 0
    for name, fetched in (
        ("umami", fetch_umami(env, start, end)),
        ("cloudflare", fetch_cloudflare(env, start, end)),
    ):
        if fetched is None:
            continue
        path = out_dir / f"{name}_{stamp}.json"
        path.write_text(json.dumps(fetched, ensure_ascii=False, indent=2), encoding="utf-8")
        log(f"{name} 已写入 {path.name}")
        ok += 1
    if ok == 0:
        log("两个源都没拉到数据，先配 config/local/analytics_secrets.env（模板见 config/analytics_secrets.example.env）")
        return 0
    log(f"区间 {start} ~ {end}，成功 {ok}/2 个源")
    return 0


if __name__ == "__main__":
    sys.exit(main())
