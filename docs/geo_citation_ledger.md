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

## 怎么读这份台账

- 引用率（引用本站的问句数 ÷ 总问句数）随轮次上升，说明 llms.txt 与答案胶囊在起作用。
- 引用深度页的比例比引用率更能说明 GEO 生效：只引首页等于只传递了「有个牌子」。
- 口径被改写是最高优先级的问题：AI 把价格或模型名说错，比不被引用伤害更大
  （用户按错的价格下单）。发现口径错，第一时间核对 `config/plans.ts` 与
  `config/knowledge.ts`，这两处是价格与模型名的真源。
