# SEO / GEO 关键词台账

> 维护约定：本文件是「查词 → 找主场页 → 改哪份配置」的索引，**不是** keywords 真源。  
> 真源仍在各 config / frontmatter；改词后跑 `npm run verify`（含 `check:seo` / `check:geo`）。  
> 基建脚本见 [`seo_geo_infrastructure.md`](./seo_geo_infrastructure.md)。  
> 完整优化方案（调研、开源、P0–P2）见 [`seo_geo_optimization_plan.md`](./seo_geo_optimization_plan.md)。  
> 页面主场规则见 `site/docs/content_structure.md`。

最后梳理：2026-11-13（P0 已落地：营销页 tags、定价 FAQ/胶囊、llms 引用场景、guide 后缀）

---

## 1. 怎么注入（一眼看懂）

| 层级 | 注入方式 | 真源 | 覆盖谁 |
|---|---|---|---|
| 全站全局 keywords | `site/.vitepress/config.mts` → `head` 里 `meta keywords` | 写死在 config.mts（已瘦身） | 无 per-page tags 的页（FAQ、联系、关于…） |
| 首页 / 定价 / 模型 | `transformHead` 按路由覆盖 | `config/seo_pages.ts`（`homeTags` / `pricingTags` / `modelsTags`） | `/`、`/pricing`、`/models` |
| 教程 per-page | `transformHead` 按路由覆盖 | `config/guide.ts` 的 `tags` | `/guide`、`/guide/*` |
| 知识库 per-page | 同上 | `config/knowledge.ts` 的 `tags` | `/knowledge/<slug>` |
| 管理后台 | 同上 | `config/console.ts` → `consoleTags` | `/console` |
| 代理招商 | 同上 | `config/agency.ts` → `agencyTags` | `/agency` |
| GEO（AI 引用） | 一句话答案 + FAQ JSON-LD + `llms.txt` / `llms-full.txt` | 知识库 frontmatter 引用块、`guide.ts` 的 `answer`、`faq.ts`、`gen_llms.ts` | 被 AI 检索优先读的段落 |
| 客服口语别名 | 不进 SEO meta | `config/faq.ts` + `config/kefu_bot.ts` 的 `keywords` | 站内助手匹配，**不算搜索关键词台账主表** |

硬规则（与内容结构一致）：

- **一词一主场**：同一搜索意图只允许一个页面当主场；其它页最多一行链接。
- **别名可进 keywords / FAQ，不进 H1 / 导航**：例如「rsxermu666 代理」只挂 `/agency` 的 tags，页面名仍是「Token 代理」。
- **裸词 `rsxermu666` / `rsxermu666.cn` 只归 `/console`**。

---

## 2. 现状：核心业务词 × 承载页

### 2.1 全站全局词（无 per-page 页共用）

来源：`config.mts` 全局 meta keywords：

`claude 无限额度` · `claude api 无限` · `claude 无限卡` · `claude无限续杯` · `claude 无限续杯` · `claude code 国内` · `claude api 中转`

| 搜索意图（用户怎么搜） | 建议主场 | 现状 | 缺口 |
|---|---|---|---|
| Claude 无限卡 / 官网是什么 | `/` + `/knowledge/what-is-claude-unlimited` | 首页 `homeTags` + 定义文 tags（含 opus/fable 别名） | — |
| Claude 无限额度 / 不按 token | `/pricing` + 定义文 | `pricingTags` + 答案胶囊 + FAQ | — |
| Claude API 中转 / 国内 | `/` + `/guide` | 全局词有；教程偏客户端配置 | 「中转」「国内」缺独立落地说明（边界在 about/定义文） |
| Claude Code 国内怎么用 | `/guide/cc` `/guide/cli` + 桌面版知识库 | 教程 tags 强；桌面版国内文 tags 强 | 与「无限卡」转化链可再互链 |

### 2.2 已有独立 per-page keywords 的页面

| 路由 | 主攻词（tags 摘要） | 真源 |
|---|---|---|
| `/console` | rsxermu666、rsxermu666.cn、claude 无限卡管理后台、卡密兑换、api key 提取 | `config/console.ts` |
| `/agency` | Token 代理、Claude 无限卡代理、rsxermu666 代理、无限卡渠道合作、Claude API 卡密代理 | `config/agency.ts` |
| `/guide` | claude 无限卡 使用教程 / 教程、各客户端教程名 | `guideIndex.tags` |
| `/guide/cc` | claude code 插件、vscode/cursor 插件… | `guide.ts` 场景 tags |
| `/guide/cli` | claude code cli 安装、环境变量、base url… | 同上 |
| `/guide/desktop` | claude 桌面版教程、cc switch 供应商… | 同上 |
| `/guide/codex` | codex 教程、接入 claude api… | 同上 |
| `/guide/workbuddy` | workbuddy 自定义模型… | 同上 |
| `/guide/cursor` | cursor 配置 claude api、cline、openai 兼容端点… | 同上 |
| `/knowledge/*` | 每篇 ≥3 个长尾 tags（见下表精选） | `config/knowledge.ts` |

### 2.3 营销页 per-page 现状

| 路由 | keywords 真源 | 说明 |
|---|---|---|
| `/` | `homeTags` | **已上线** |
| `/pricing` | `pricingTags` | **已上线**（购买复合词主场） |
| `/models` | `modelsTags` | **已上线**（型号 / ID；购买仍指定价） |
| `/faq` | 全局兜底 | 不扩 keywords 堆砌；靠 FAQ JSON-LD + 问句命中 |
| `/contact` | 全局兜底 | 弱意图，不必加厚 |
| `/about` | 全局兜底 | 信任词，弱 |
| `/knowledge`（索引） | 全局兜底 | 可弱挂「claude code 知识库」（P2） |

### 2.4 知识库：已覆盖的长尾簇（精选）

完整 tags 以 `config/knowledge.ts` 为准。按业务价值分组：

| 簇 | 代表词 | 主场 slug |
|---|---|---|
| 产品定义 | Claude 无限卡、官网、rsxermu666、不按 token 计费 | `what-is-claude-unlimited` |
| 官方计费对比 | claude api 价格、token 计费、成本估算 | `claude-api-pricing-explained` |
| 模型选型 | opus sonnet haiku、模型路由 | `choose-claude-model` |
| 用法 / Agent | claude code 教程、mcp、子代理、技能、计划模式… | 多篇 `claude-code-*` |
| 国内桌面 | claude 桌面版 国内、注册、登录 | `claude-desktop-china-usage` |
| 报错 | 429 / 401 / 403 / 529 / prompt too long / connection lost | 对应排查文 |
| 视频热点 | opus 5.5 视频、remotion、代码做视频 | `claude-code-make-video`、`code-video-skills-guide` |

---

## 3. 应增加的关键词（业务设计）

原则：**只做我们卖得了、讲得清、能落到单一主场的词**；不抢官方品牌纯信息词（如「Anthropic 官网」）；竞品名谨慎（可作对比 FAQ，不堆 title）。

### 3.1 P0 — 模型 × 产品复合词（你点名的方向）

用户搜「opus 无限卡」时，意图是：**用 Opus 且要无限/订阅制通道**，不是查官方 Opus 文档。

| 关键词 | 意图 | 主场 | 落地方式 | 状态 |
|---|---|---|---|---|
| opus 无限卡 | 购买 / 产品 | `/pricing` | `pricingTags` + FAQ `cat-product-opus-fable-card` + 答案胶囊 | **已上线** |
| opus无限卡 | 同上（无空格） | `/pricing` | keywords 别名 | **已上线** |
| claude opus 无限卡 | 同上 | `/pricing` | keywords | **已上线** |
| opus 5.5 无限卡 | 型号精确 | `/pricing`（购买）+ `/models`（ID） | 定价主、模型辅 | **已上线** |
| fable 无限卡 | 购买 / 产品 | `/pricing` | 同 opus | **已上线** |
| fable无限卡 | 同上 | `/pricing` | 别名 | **已上线** |
| claude fable 无限卡 | 同上 | `/pricing` | keywords | **已上线** |
| fable 5.1 无限卡 | 型号精确 | `/pricing` + `/models` | 同上 | **已上线** |
| sonnet 无限卡 | 次主推 | `/pricing` | keywords（弱于 opus/fable） | **已上线** |

正文口径（避免误导）：

- 无限卡是**订阅制网关**，有效期内 Fable / Opus 等承诺模型**不限次数、不按 token**；不是「单独卖一张只含 Opus 的卡」。
- title / H1 仍以「Claude 无限卡」为主品牌；模型名进 keywords、FAQ、定价卖点句，**不要**把页面改成「Opus 无限卡官网」造成多品牌分裂。

### 3.2 P0 — 转化与比价词

| 关键词 | 主场 | 说明 |
|---|---|---|
| claude 无限卡 价格 / 多少钱 | `/pricing` | description 已有套餐语义，补 keywords |
| claude 无限卡 月卡 / 周卡 / 天卡 | `/pricing` | 与 `plans.ts` 档位一致 |
| claude 不按 token 计费 | `/pricing` + 定义文 | GEO 高引用潜力 |
| claude api 订阅 / 包月 | `/pricing` | 与官方 Pro 区分的对比句放 FAQ |
| claude 无限续杯 | `/` / FAQ（已有口语） | 全局 keywords 已有；保持别名即可 |

### 3.3 P1 — 场景 × 接入词（教程主场已较强，补转化后缀）

| 关键词 | 主场 | 说明 |
|---|---|---|
| cursor 无限卡 / cursor 接 claude 无限 | `/guide/cursor` | 在现有「配置 api」tags 上加产品后缀 |
| claude code 无限卡 | `/guide/cc` 或 `/guide/cli` | 插件 vs CLI 二选一主场，另一页只链接 |
| workbuddy 无限卡 | `/guide/workbuddy` | 同上 |
| codex 接 claude / codex 无限卡 | `/guide/codex` | 已有接入词，补产品后缀 |
| cc switch 无限卡 | `/guide` 或 FAQ | 工具名 + 产品；避免和新开页 |

### 3.4 P1 — 品牌与后台

| 关键词 | 主场 | 说明 |
|---|---|---|
| rsxermu666 / rsxermu666.cn | `/console` | **已覆盖** |
| claude 无限卡 管理后台 / 卡密兑换 | `/console` | **已覆盖** |
| Token 代理 / Claude 无限卡代理 | `/agency` | **已覆盖**；勿把代理词塞进 `/console` |

### 3.5 P2 — 可选题（有搜索再开文，禁止先堆 keywords）

| 关键词方向 | 建议动作 | 不建议 |
|---|---|---|
| claude 中转站 / api 中转 推荐 | 定义文或 FAQ 对比小节 | 单独建「中转站大全」薄页 |
| 对比官方 Pro / Max 费用 | 知识库短文或定价 FAQ | title 写「代替官方」违规暗示 |
| 竞品名 + 无限卡 | 仅 FAQ「和 XX 有什么区别」 | keywords 堆竞品名 |
| haiku 无限卡 | 若网关长期不主推 Haiku则不挂 | 空承诺 |

### 3.6 词表优先级总览（执行看板）

| 优先级 | 簇 | 主场 | 下一步 |
|---|---|---|---|
| P0 | opus/fable/sonnet × 无限卡 | `/pricing`（+ `/models` 型号） | **已上线**（`seo_pages.ts` + FAQ + 胶囊） |
| P0 | 价格 / 月卡 / 不按 token | `/pricing` | **已上线** |
| P0 | 全局词补模型复合词 | 首页/定价 per-page；全局已瘦身 | **已上线** |
| P1 | 客户端 × 无限卡 | 各 `/guide/*` | **已上线**（各场景 +1 产品后缀） |
| P1 | 定义文强化购买意图 | `what-is-claude-unlimited` | **已上线**（tags + 正文一句 + FAQ） |
| P2 | 比价 / 中转 / 竞品 | FAQ 或新知识库 | 有真实搜索再写 |

---

## 4. 整体优化方案

### 4.1 SEO（搜索引擎）

1. **补齐营销页 per-page keywords**  
   优先 `/pricing`、`/`、`/models`：在 config 增加类似 `pricingTags` / `homeTags` / `modelsTags`，`transformHead` 按 path 注入（照抄 console/agency 模式）。不要继续把所有转化词塞进全局那一串。

2. **一词一主场写进本表**  
   - 购买意图 → `/pricing`  
   - 型号 / 复制 ID → `/models`  
   - 定义与边界 → `/knowledge/what-is-claude-unlimited`  
   - 配置 → `/guide/*`  
   - 后台品牌 → `/console`  
   - 招商 → `/agency`

3. **title / description 改法**  
   - 主关键词靠前，≤32 / ≤110（门禁已卡知识库；营销页建议人工对齐同一尺子）。  
   - 定价页 description 已含 Fable/Opus，可再显式加「选 Opus 不另计费」类承诺（与站内文案一致）。  
   - **禁止**多个 URL 抢同一个主词做 H1。

4. **内链**  
   - 首页 / 定义文 / 模型页 → 定价（买）  
   - 定价 → 模型（看 ID）+ 教程（配起来）  
   - 教程 ↔ 对应知识库排错文  
   - 已有 `related[]` / CTA，按本表检查「opus 无限卡」路径是否都能 2 跳到购买。

5. **技术基建（已有，保持）**  
   canonical / sitemap / IndexNow·Bing·百度·GSC / OG：见基建文档。发版继续跑 `seo_notify.ps1`。

### 4.2 GEO（生成式引擎 / AI 检索）

1. **可引用段落优先于 meta keywords**  
   AI 更吃：一句话答案、FAQ、`llms.txt` 事实要点。模型复合词要在这些位置**自然出现完整句**，例如：  
   > Claude 无限卡有效期内可调用 Opus 5.5 与 Fable 5.1，不按 token 计费；不需要单独购买「Opus 卡」。

2. **llms.txt**  
   `gen_llms.ts` 事实要点已列模型与价格；补一句「Opus/Fable 与无限卡关系」后重建。门禁会扫 llms 死链。

3. **JSON-LD**  
   Product / FAQPage 与页内可见 FAQ 一致；代理/后台 WebPage 已有。定价页 FAQ 增加模型复合问句后，JSON-LD 自动跟上（数据同源）。

4. **知识库门禁**  
   新文继续过 `check_geo_lint`（一句话答案自包含）+ `check_seo_meta`（title/description/tags）。

### 4.3 内容生产节奏（建议 2～3 周）

| 周 | 动作 | 产出 |
|---|---|---|
| W1 | 实现定价/首页/模型 per-page tags；全局 keywords 瘦身；定价 FAQ +1 | 代码 + 本表状态列改「已上线」 |
| W1 | 各 guide 场景 tags 加「× 无限卡」后缀 1～2 个 | tags 更新 |
| W2 | 定义文 / 定价正文补「要不要单独买 Opus 卡」小节；重建 llms | 内容 + GEO |
| W2 | GSC / 百度查「opus」「fable」「无限卡」展现与查询 | 用数据决定 P2 是否开文 |
| W3 | 按数据开 0～1 篇比价或场景文；外链与社群锚文本统一「Claude 无限卡」 | 可选 |

### 4.4 监测指标

| 指标 | 工具 | 关注词 |
|---|---|---|
| 查询点击 / 展现 | GSC、百度站长 | opus 无限卡、fable 无限卡、claude 无限卡、价格、续杯 |
| 落地页 | Umami / 百度统计 | `/pricing`、`/models`、`/guide/*`、定义文 |
| AI 引用抽查 | 定期问主流助手「claude 无限卡是什么 / opus 无限卡」 | 是否指向本站口径与 URL |

### 4.5 明确不做

- 不为每个模型词新建独立落地页（避免薄内容与主场分裂）。  
- 不把竞品名、违规「官方正版」写进 title。  
- 不把客服 `kefu_bot` 口语词整表同步进 SEO keywords。  
- 不手改 `llms.txt` 产物；改生成脚本或数据源。

---

## 5. 改词操作清单（复制即用）

1. 在本表 §3 把目标词标「进行中」，写定主场路由。  
2. 改对应真源：`config/seo_pages.ts` / `guide.ts` tags / `knowledge.ts` tags / `consoleTags` / `agencyTags` / 全局 `config.mts`。  
3. 若涉及可见文案：同步 frontmatter title/description、FAQ 问句、一句话答案（GEO）。  
4. `npm run build && npm run verify`（或至少 `check:seo` / `check:geo` / `check:links`）。  
5. 发版后 `seo_notify.ps1`；本表状态改「已上线」并更新日期。

---

## 6. 变更记录

| 日期 | 变更 |
|---|---|
| 2026-11-13 | 首版：盘点现状主场、标出营销页 keywords 缺口、设计 opus/fable 等复合词与整体 SEO/GEO 方案 |
| 2026-11-13 | P0 落地：`config/seo_pages.ts`、定价 FAQ/胶囊、`gen_llms` 引用场景、guide/定义文 tags |
