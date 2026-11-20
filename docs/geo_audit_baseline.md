# GEO 审计基线

> 两把尺子并列：**自研** `npm run audit:geo`（产物齐全度，确定性门禁，进 build 链）与
> **第三方** `geo-optimizer-skill`（外部视角，同一把尺子看月度趋势，不进 build 链）。
> 两者评分模型不同，分数不可相减，只各自看趋势。

| 口径 | 分数 | 说明 |
|---|---|---|
| 自研 audit_geo | 100/100 | 产物齐全度与内容质量，43 页在线审计 |
| 第三方 geo-optimizer | 79.47/100 | 平均分，等级 good；成功 43 页 / 失败 0 页 |

审计时间：2026-11-20T17:33:15.539039+00:00｜对象：https://claude-unlimited.aiautotools.com/sitemap.xml

## 第三方评分明细（平均分拆解）

| 维度 | 得分 |
|---|---|
| ai_discovery | 0 |
| brand_entity | 4.23 |
| content | 12.33 |
| google_ai | 19.21 |
| llms | 6 |
| meta | 10.91 |
| negative_penalty | -0.4 |
| robots | 14 |
| schema | 8.88 |
| signals | 4.3 |

## 分级分布

| 等级 | 页数 |
|---|---|
| good | 42 |
| foundation | 1 |

## 最低分页面

| 分数 | 等级 | 页面 |
|---|---|---|
| 67 | foundation | /changelog |
| 72 | good | /faq |
| 73 | good | /agency |
| 73 | good | /knowledge |
| 74 | good | /contact |
| 75 | good | /models |
| 76 | good | /guide |
| 76 | good | /guide/cc |
| 76 | good | /guide/codex |
| 76 | good | /guide/workbuddy |

## 怎么跑

```bash
uv tool install geo-optimizer-skill
npm run audit:geo:external
```

> 线上访问不稳定时（Cloudflare anycast 选路，见记忆 `cf-pages-cn-edge-routing`），
> 可设 `HTTPS_PROXY` 走稳定出口再跑，否则成功页数会掉到 0。
