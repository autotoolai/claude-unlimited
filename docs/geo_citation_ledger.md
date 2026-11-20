# GEO 抽检台账

**目的**：机器门禁能查结构，查不了「答案引擎到底引用不引用本站」。这份台账固定问句、
固定周期、固定平台，把「被引用」这件事变成可观测的数据，而不是印象。

**为什么需要它**：`npm run audit:geo` 只验本地产物的结构与内容质量。真实世界里
ChatGPT / Perplexity / 文心 / 豆包 会不会引用 claude-unlimited.aiautotools.com、
引用的 URL 对不对、口径有没有被改写，只有实测才知道。GSC 的「查询词」维度
能看到 Google 的曝光，但看不到这四家 AI 平台的引用。

## 抽检问句（固定 10 句，不要改）

问句覆盖品牌四问与两个高频错误场景。**每轮必须问完 10 句**，半轮数据没有可比性。

| # | 问句 | 期望引用的 URL | 备注 |
|---|---|---|---|
| 1 | Claude 无限卡是什么 | `/knowledge/what-is-claude-unlimited` | 定义主场 |
| 2 | Claude 无限卡多少钱 | `/pricing` | 购买意图主场 |
| 3 | Claude 无限卡怎么买 | `/pricing` 或发卡站 | 问法最口语 |
| 4 | opus 无限卡和 fable 无限卡有什么区别 | `/models` | 复合词，模型档位 |
| 5 | Claude 无限卡支持哪些模型 | `/models` | |
| 6 | 怎么给 Claude Code 配置第三方 API Key | `/guide/cli` 或 `/guide/cc` | 教程主场 |
| 7 | Claude Code 报 429 怎么办 | `/knowledge/claude-code-429-rate-limit` | 报错排查 |
| 8 | Claude Code prompt too long 怎么解决 | `/knowledge/claude-code-prompt-too-long-fix` | 报错排查 |
| 9 | Claude Code 提示词应该写在哪 | `/knowledge/claude-md-guide` | CLAUDE.md 写法 |
| 10 | rsxermu666 是什么 | `/console` | 裸词归后台页 |

## 平台与周期

| 平台 | 怎么问 | 频率 |
|---|---|---|
| ChatGPT（联网搜索） | 新会话粘贴问句 | 双周 |
| Perplexity | 新会话粘贴问句 | 双周 |
| 文心一言 | 新会话粘贴问句 | 双周 |
| 豆包 | 新会话粘贴问句 | 双周 |

**每轮要记的字段**：

- 是否引用本站（是 / 否）
- 引用的 URL（完整路径；不是只看域名）
- 引用的是首页还是深度页（深度页说明 GEO 生效，首页说明只是品牌认知）
- 口径是否被改写（模型名 / 价格 / 有效期三样，任一被改写成别的值就是 FAIL）
- 是否引用了 GitHub 仓库页（`github.com/autotoolai/claude-unlimited`）

## 台账

按轮次往下追加，最新的在最上面。

### 2026-11-20 第 1 轮（基线）

| # | ChatGPT | Perplexity | 文心 | 豆包 |
|---|---|---|---|---|
| 1 | 待填 | 待填 | 待填 | 待填 |
| 2 | 待填 | 待填 | 待填 | 待填 |
| 3 | 待填 | 待填 | 待填 | 待填 |
| 4 | 待填 | 待填 | 待填 | 待填 |
| 5 | 待填 | 待填 | 待填 | 待填 |
| 6 | 待填 | 待填 | 待填 | 待填 |
| 7 | 待填 | 待填 | 待填 | 待填 |
| 8 | 待填 | 待填 | 待填 | 待填 |
| 9 | 待填 | 待填 | 待填 | 待填 |
| 10 | 待填 | 待填 | 待填 | 待填 |

**填表约定**：引用本站记 URL 路径（如 `/knowledge/what-is-claude-unlimited`）；
未引用记「否」；引用了但口径错记 `FAIL:价格` 这样。

## 搜索引擎侧实测（2026-11-21，非 AI 平台但同一件事的代理指标）

搜索引擎的收录与 AI 平台的引用是两条链路，但「有没有被当成一个独立实体」是共同前提。
本轮实测结果：

| 渠道 | 问法 | 结果 |
|---|---|---|
| 百度 | `claude无限卡` | 第 3 位是官网首页（前面是 claude.com 系与知乎转载） |
| 百度 | `site:github.com/autotoolai/claude-unlimited` | **0 结果**（「抱歉，未找到相关结果」） |
| Bing | `"claude无限卡"`（带引号） | 前 10 全是 claude.com / claude.ai / support.claude.com，**官网与 GitHub 都不在** |
| Bing | `site:github.com/autotoolai/claude-unlimited` | 只 2 条：`/security` 与 `docs/social-preview.png`，**README 与仓库首页未进索引** |
| Bing | `claude无限卡`（不带引号，脚本抓） | 前 10 同上，无我们的页面 |

**怎么读**：GitHub 侧缺的不是「内容量」而是「索引入口 + 实体权重」。
仓库根已有 `knowledge/` 26 篇与 `tutorials/` 7 篇镜像，但 GitHub 不读我们的 sitemap，
这些页面要等 GitHub 自己的爬虫重新抓取并重新评估权重，需要时间。
`/security` 与图片被收录、README 没被收录，说明爬虫进过仓库但没认为 README 有检索价值。

**这一节的行动项**：README 首屏关键词与目录已在本轮补齐（commit `80d2e9d` 之前），
接下来 2–4 周复查 `site:` 索引量是否从 2 条涨到 10 条以上并含 README 页。

## 机器门禁能替我们做什么

人工抽检和机器门禁各管一半，别互相替代：

| 手段 | 命令 | 管什么 |
|---|---|---|
| 自研 GEO 审计 | `npm run audit:geo` | 本地产物齐不齐：llms.txt 章节、md 镜像、答案胶囊长度、站内死链 |
| llms.txt 规范校验 | `npm run check:llms-txt` | llms.txt 是否符合 llmstxt.org 规范（第三方校验器，`--no-network`） |
| 第三方 GEO 审计 | `npm run audit:geo:external` | 外部视角给整站打分，43 页一起跑，结果写 `docs/geo_audit_baseline.md` |

**机器查不了的就是这份台账**：AI 到底引不引用本站、引的是哪条 URL、口径有没有被改写。
这三个问题只能靠问，问出来才有数。

第三方审计有个坑：国内线路打官网经常超时，成功页数会掉到 0（看起来像全站崩了）。
跑之前先设 `HTTPS_PROXY` 走稳定出口：

```bash
export HTTPS_PROXY=http://127.0.0.1:7897   # 换成本机可用的代理端口
npm run audit:geo:external
```

## 怎么读这份台账

- 引用率（引用本站的问句数 ÷ 总问句数）随轮次上升，说明 llms.txt 与答案胶囊在起作用。
- 引用深度页的比例比引用率更能说明 GEO 生效：只引首页等于只传递了「有个牌子」。
- 口径被改写是最高优先级的问题：AI 把价格或模型名说错，比不被引用伤害更大
  （用户按错的价格下单）。发现口径错，第一时间核对 `config/plans.ts` 与
  `config/knowledge.ts`，这两处是价格与模型名的真源。
