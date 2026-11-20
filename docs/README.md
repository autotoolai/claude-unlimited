# 文档索引

仓库里有两个互不依赖的项目，各自的细节都写在各自的文档里：

| 项目 | 位置 | 文档 |
|---|---|---|
| Claude 无限卡（文档站与官网前端） | `site/` | [`site/README.md`](../site/README.md)（现状与命令）· [`site/docs/README.md`](../site/docs/README.md)（文档地图）· [`site/docs/troubleshooting_guide.md`](../site/docs/troubleshooting_guide.md)（故障排除）· [`site/docs/changelog.md`](../site/docs/changelog.md)（变更历史） |

## 仓库级文档

| 文档 | 讲什么 |
|---|---|
| [`seo_geo_infrastructure.md`](seo_geo_infrastructure.md) | 搜索引擎与 AI 检索基建：canonical、JSON-LD、sitemap、llms.txt、主动推送。改 URL 会连带改什么。 |
| [`seo_geo_keywords.md`](seo_geo_keywords.md) | SEO/GEO 关键词台账：现有词与主场页、待补复合词（如 opus/fable 无限卡）。 |
| [`seo_geo_optimization_plan.md`](seo_geo_optimization_plan.md) | SEO/GEO 完整优化方案：业界调研、开源选型、双轨 P0–P2、90 天路线图。 |
| [`geo_audit_baseline.md`](geo_audit_baseline.md) | GEO/llms 本地审计基线（`npm run audit:geo -- --write` 更新）。 |
| [`maintenance_notes.md`](maintenance_notes.md) | 维护者的操作笔记：凭据与 workflow scope、部署前的清盘动作、README 的生成机制。 |
| [`geo_citation_ledger.md`](geo_citation_ledger.md) | GEO 抽检台账：固定问句 × AI 平台的引用情况、URL 正确性、口径是否被改写。 |

## 内部文档（对外不是内容资产）

`docs/` 根目录下这几份是内部工作文档，记录调研过程与评估报告，对访客与爬虫是噪音，
不作为内容页分发，也不需要跟着站点发版更新：

| 文档 | 性质 |
|---|---|
| `aiprimetech_全站页面分析.md` | 兄弟站竞品分析 |
| `claude_code_页面精选清单.html` | 兄弟站页面清单快照 |
| `gateway_model_eval_report.md` | 网关模型能力评测报告 |

它们留在仓库里是为了保留判断依据，不是为了对外发布。

本机另有 `vpns_beer_agent/`（vpns.beer 代理平台登录自动化，与官网无关且明文存凭据，不随公开仓库发布）、
`site/archive/knowledge_source_20261009/`（第三方站点原文副本，仅作事实核对）与竞品站分析文档，
这三处都只在本机保留，不在 GitHub 上。
