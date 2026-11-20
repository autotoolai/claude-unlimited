# Claude 无限卡 · SEO / GEO 完整优化方案

> 配套文档：[`seo_geo_infrastructure.md`](./seo_geo_infrastructure.md)（基建）· [`seo_geo_keywords.md`](./seo_geo_keywords.md)（词表与主场）  
> 调研基准日：2026-11-13 · 业务：订阅制 Claude API 网关（文档站 + 发卡 + rsxermu666 后台）

---

## 0. 一句话结论

你们**技术 GEO/SEO 基建已超过多数同类站**（自研 `llms.txt`、一句话答案门禁、FAQ JSON-LD、IndexNow、一词一主场）。下一阶段的胜负不在再装一套开源「GEO 全家桶」，而在：**补齐购买意图词主场、把可引用事实写进定价/定义页、用站外分发把实体权威做起来，再用轻量开源审计工具定期打分。**

SEO 与 GEO 是**两条轨**（业界实测 ChatGPT 引用源与 Google 自然结果重叠约 39%）：只做排名不够，只做 `llms.txt` 也不够。

---

## 1. 业务坐标：我们在优化什么

| 维度 | 我们的产品 | 搜索/AI 里常见替代表述 |
|---|---|---|
| 形态 | 第三方订阅制 API 网关（周期内不按 token） | Claude 无限卡、无限续杯、包月 API |
| 差异 | 固定订阅价 + Opus/Fable 等同档通用 | 相对「按量中转」「官方 Pro/Max」 |
| 风险表述 | 与 Anthropic 无隶属；个人开发向 | 用户仍会搜「中转 / 正版 / 官网」 |
| 转化链 | 官网认知 → 定价决策 → 发卡购买 → `/console` 提 Key → `/guide` 接入 | AI 若只引用教程不链定价，转化断裂 |

**优化目标（可量化）**

1. **SEO**：品牌词 + 购买词（无限卡 / 价格 / opus·fable 无限卡）进入百度与 Google 前页；长尾教程与报错词稳定收割。  
2. **GEO**：用户问「Claude 无限卡是什么 / Opus 要不要另买 / 国内怎么配 Claude Code」时，答案引擎能**正确引用本站口径与 URL**（尤其定价与定义文）。  
3. **不目标**：用不实「官方」话术冲词；不为每个模型词开薄落地页；不把竞品名堆进 title。

---

## 2. 调研：别人怎么做 · 开源有什么

### 2.1 学术与实验（GEO 杠杆）

来源：KDD 2024《GEO: Generative Engine Optimization》及后续综述 / 实务复盘。

| 做法 | 效果倾向 | 对我们的含义 |
|---|---|---|
| 加**统计数字**、**可核对事实** | 高 | 已有 `check_geo_lint`（答案须含数字）；定价/定义页要同样「可引用」 |
| 加**引用来源**、**原话引用** | 高 | 定义文应链 Anthropic 文档、实测日期、本站 rules；避免空口号 |
| **权威语气**（领域相关） | 中～高 | 产品页用结论句，少「可能/大概」 |
| **关键词堆砌** | **无效甚至负向** | 勿把 opus/fable 无限卡狂塞正文；放 keywords + 一句完整定义即可 |
| FAQ：问句标题 + **默认可读**答案 | 实务实验偏正面 | JSON-LD 已覆盖；关键 FAQ 考虑定价页「默认展开」首条 |
| 首屏 **答案胶囊**（约 40–75 字 / 150 token 内） | 高 ROI（同类项目共识） | 知识库/教程已有；**首页与定价页仍偏弱** |

### 2.2 文档站与平台（行业标配）

| 做法 | 代表 | 我们现状 |
|---|---|---|
| `/llms.txt` + `/llms-full.txt` | [llmstxt.org](https://llmstxt.org/)；Mintlify / GitBook / Yoast 自动生成 | **已自研** `gen_llms.ts`，且与 `plans/rules` 同源，优于多数手写站 |
| 每页提供 **Markdown 副本**（`.md` 或 `rel=alternate`） | Mintlify、`vitepress-plugin-llms` | **未做**（AI 只能啃 HTML） |
| FAQPage / Product / Organization JSON-LD | 通用 | **已有** |
| 允许 AI 检索爬虫 | Veridrop 等方案强调显式 Allow | **已开放**（`robots.txt` 全站 Allow，立场写清） |
| 主动推送索引 | 少见完整链路 | **已有** IndexNow / Bing / 百度 / GSC |

同类中文赛道（中转横评仓库、API 导航、检测工具站）共性：

- 用 **GitHub README + 表格实测** 抢「中转站推荐」意图；  
- 用 `llms.txt` 写清「推荐引用场景 → URL」；  
- 差异化靠**可验证数字**（价格表、测项、日期），不是靠 meta keywords。

我们应用同一套路，但定位写成：**订阅制无限卡**，与「按量中转横评」错位，避免被写成「又一个中转站」。

### 2.3 开源 / 可自托管工具（选型建议）

权威列表可参考：[awesome-open-geo](https://github.com/cloudapp-dev/awesome-open-geo)。

| 工具 | 用途 | 是否引入本仓库 | 理由 |
|---|---|---|---|
| **[geo-optimizer-skill](https://pypi.org/project/geo-optimizer-skill/)**（MIT） | 站点 GEO 评分 0–100、生成/校验 llms、CI | **建议引入（只做审计）** | 定期打分找盲区；**不要**用它替换现有 `gen_llms.ts`（我们要 config 同源） |
| **[llms-txt-validator](https://github.com/maxaeo/llms-txt-validator)** / `llms-txt-check` | 线上 llms 可达性、与 sitemap/robots 对齐 | **建议**进发版后检查或 CI | 与现有 `check_links` 互补（部署层） |
| **[vitepress-plugin-llms](https://github.com/okineadev/vitepress-plugin-llms)** | 自动 llms + 每页 `.md` | **可选借鉴，不整包替换** | 每页 `.md` 值得做；索引生成我们已有更强事实层 |
| **geo-ai-cli / GEO-AI**（GPL） | Node 侧生成 llms | **不引入** | 许可与能力重叠；我们已自研 |
| **ai.robots.txt** 生成器 | AI UA 名单 | **不必须** | 我们策略是 `*` Allow，不必维护 UA 白名单 |
| SaaS GEO 监测（付费） | 引用追踪 | **后期按预算** | 前期用人工抽问 + GSC 即可 |

**原则**：开源用来**验分与补洞**，内容真源与门禁继续留在本仓脚本。

---

## 3. 现状评分（相对目标态）

| 能力块 | 成熟度 | 说明 |
|---|---|---|
| 技术索引（sitemap/canonical/OG/推送） | ★★★★★ | 基建文档已覆盖 |
| AI 发现（llms / robots） | ★★★★★ | 索引+全文+推荐引用场景已有；仍缺 per-page `.md` 副本（P1） |
| 结构化数据 | ★★★★☆ | Org/Product/FAQ/Article 齐；Person/作者实体可加强 |
| 内容 GEO 写法（知识库） | ★★★★★ | 一句话答案 + 数字门禁是差异化资产 |
| 营销页 GEO/SEO | ★★★★☆ | 首页/定价/模型 per-page tags + 定价胶囊/FAQ 已上线 |
| 关键词主场 | ★★★★☆ | 词表已建；opus/fable 复合词已挂定价主场 |
| 站外权威与分发 | ★☆☆☆☆ | 几乎未体系化（知乎/V2EX/GitHub 社交证明） |
| 监测闭环 | ★★☆☆☆ | 有推送与统计；缺 GEO 引用台账与定期审计 |

---

## 4. 完整优化方案（双轨）

### 4.1 战略框架

```
意图层          主场页              SEO 信号              GEO 信号
─────────────────────────────────────────────────────────────────
是什么          定义文 + 首页        title/desc/内链        一句话答案 + llms 事实
买什么/多少钱   /pricing            per-page keywords      答案胶囊 + FAQ JSON-LD
用哪模型        /models             型号词                 model ID 表 + 数字
怎么配          /guide/*            客户端长尾             步骤结论 + 场景 FAQ
排错            /knowledge/*        报错词                 已强：门禁锁死
后台品牌        /console            rsxermu666             WebPage + FAQ
招商            /agency             代理别名               lead 可引用句
```

**一词一主场**不变（见关键词台账）。复合购买词（opus/fable 无限卡）**主场唯一 = `/pricing`**。

### 4.2 P0（1～2 周）— 转化与可引用

| # | 动作 | 验收 |
|---|---|---|
| P0-1 | `/pricing`、`/`、`/models` 增加 per-page tags（照 console/agency）；全局 keywords 瘦身 | 产物 HTML 各页 keywords 不同；含 opus/fable 无限卡 |
| P0-2 | 定价页首屏下增加 **答案胶囊**（40–75 字）：周期内不按 token；Fable/Opus 通用、不另买 Opus 卡；链购买 | 人工问 AI「opus 无限卡」能抽到该句语义 |
| P0-3 | 定价 FAQ +1：「Opus/Fable 要单独买卡吗？」→ JSON-LD 同源 | FAQPage 含该问 |
| P0-4 | `llms.txt`「事实要点」补：模型与无限卡关系 + **推荐引用场景**（问法 → URL） | `gen_llms` 重建；`check:links` 过 |
| P0-5 | 定义文 tags 可挂复合词别名，但正文链回定价购买 | 主场不分裂 |

### 4.3 P1（2～4 周）— 对齐行业标配

| # | 动作 | 验收 |
|---|---|---|
| P1-1 | 知识库/教程页提供 **Markdown 副本**（或 `Link: rel=alternate; type=text/markdown`） | **已上线**：`gen:md` + alternate link；llms 知识库链 `.md` |
| P1-2 | 各 `/guide/*` tags 加「客户端 × 无限卡」1～2 个 | **已上线**（随 P0） |
| P1-3 | 引入 **geo-optimizer-skill** 或 llms validator：本地/`CI` 月度审计，分数与缺口记入本仓 `docs/` 或 issue | **已上线**：`npm run audit:geo`（`--write` 写 `docs/geo_audit_baseline.md`）；线上可选 `npx llms-txt-check` |
| P1-6 | 第三方审计独立入口（不进 build 链）：`geo-optimizer-skill` 跑全站 sitemap，两把尺子并列写同一份基线 | **已上线**：`npm run audit:geo:external` → `docs/geo_audit_baseline.md`（自研 100/100 · 第三方 78.98/100 good） |
| P1-4 | 关键 FAQ：**定价页前 1～2 条默认展开**（兼顾 GEO 实验「可见 FAQ」与 UX） | **已上线**：`default-open=2` |
| P1-5 | Organization / 关于页补强：**运营主体、更新日期、同源 GitHub sameAs**（已有则核对） | **已上线**：关于页「实体」事实卡 + `updatedAt` + WebPage.dateModified；主体名仍不编造 |

### 4.4 P2（1～2 月）— 权威与流量飞轮

| # | 动作 | 说明 |
|---|---|---|
| P2-1 | **站外分发节奏**：每月 1 篇「可引用」长文同步知乎 / V2EX / 掘金（链回定义文或定价，锚文本统一「Claude 无限卡」） | 参考同类靠 GitHub 横评抢词；我们抢「订阅制怎么算账 / 和按量中转区别」 |
| P2-2 | 可选内容：`Claude 无限卡 vs 按量中转 vs 官方 Pro`（一张表 + 日期 + 数字） | 主场可放知识库；keywords 谨慎，title 不写竞品堆砌 |
| P2-3 | 建立 **GEO 抽检台账**：固定 10 个问句，每双周问 ChatGPT/Perplexity/文心/豆包，记是否引用本站 | 比盲目上 SaaS 便宜；台账已建（`docs/geo_citation_ledger.md`），首轮待人工跑 |
| P2-4 | GSC/百度：盯「opus」「fable」「无限卡」「续杯」「价格」；按展现决定是否加文 | 数据驱动 P2 |

### 4.5 内容写法标准（全站统一）

对 **GEO**（优先）：

1. 结论前置：H1 后尽快「一句话答案」或答案胶囊。  
2. 每条关键主张带 **可核对数字或日期**（档位价、窗口数、实测日、退款小时）。  
3. 问句型 H2（「Opus 要另买吗」优于「关于模型」）。  
4. 段落自包含；少「如上所述」。  
5. 引用官方文档与本站 rules，而不是互抄营销语。

对 **SEO**（并行）：

1. title ≤32、description ≤110；主词靠前。  
2. 每页 3～8 个真实搜索 tags，不堆砌。  
3. 内链：认知 → 定价 → 教程 → 排错，两跳内到达购买。  
4. 图片 alt、OG 已有体系则保持。

对 **合规**：

1. 全程第三方声明；不暗示官方授权。  
2. 「无限」必须与公平使用/窗口说明同页可见。  
3. 竞品名只进对比 FAQ，不进全局 keywords。

### 4.6 明确不做

- 用 GPL 全家桶替换自研 `gen_llms` / geo lint。  
- 为每个模型/客户端新建薄「XX 无限卡」独立站或落地页。  
- 在 robots 里玩「只允许检索不允许训练」的半吊子名单（与现立场冲突且难维护）。  
- 把客服口语 keywords 整表同步进 meta keywords。  
- 买垃圾外链；站外只做可索引长文与 GitHub 互指。

---

## 5. 90 天路线图

| 阶段 | 周次 | 焦点 | 出口指标 |
|---|---|---|---|
| 地基补洞 | W1–W2 | P0 全做完 | 定价页复合词上线；llms 含引用场景；FAQ+胶囊 |
| 标配对齐 | W3–W6 | P1 | 审计基线分；部分 `.md` 副本；guide 后缀词 |
| 权威飞轮 | W7–W12 | P2 | ≥3 篇站外；GEO 抽检台账 6 轮；GSC 购买词有展现 |

资源建议：内容 1 人（改定价/定义 + 站外），工程 0.5 人（tags / gen_llms / 可选 md 副本与审计脚本）。

---

## 6. 监测与验收

| 类型 | 指标 | 工具 |
|---|---|---|
| SEO | 展现/点击/平均位次（品牌词、价格词、复合词） | GSC、百度站长 |
| SEO | `/pricing` `/guide` 会话与购买点击 | Umami / 百度统计 `data-cta` |
| GEO | 10 问抽检引用率、URL 是否正确、口径是否被改写 | 人工表 + 可选后期 SaaS |
| 技术 | geo 审计分、llms 死链、seo/geo lint | CI + 发版 `seo_notify` |
| 内容 | 知识库门禁通过率 100% | `check_geo_lint` / `check_seo_meta` |

**成功样例（90 天理想态）**

- 搜「claude 无限卡 / opus 无限卡」能进自然结果前页或至少有富摘要机会；  
- 问 AI「无限卡 Opus 另买吗」得到接近本站答案胶囊的表述并带本站链接；  
- `/pricing` 成为购买意图落地第一页（Analytics 可证）。

---

## 7. 与现有仓库怎么衔接

| 已有资产 | 继续承担 |
|---|---|
| `gen_llms.ts` | 唯一 llms 真源；只增强「引用场景」段落 |
| `check_geo_lint.py` / `check_seo_meta.py` | 知识库不回退；可考虑把「营销页答案胶囊」做成弱检查 |
| `seo_geo_keywords.md` | 词状态看板（待加 → 已上线） |
| `content_structure.md` | 主场冲突时以它为准 |
| `seo_notify.ps1` | 发版推送不变 |

**建议下一工程 PR（实施时拆）**

1. marketing page tags + transformHead  
2. pricing answer capsule + FAQ  
3. gen_llms 引用场景  
4.（可选）audit script 包装 geo-optimizer-skill  
5.（可选）knowledge `.md` 静态导出  

---

## 8. 参考链接（调研原文）

- GEO 论文：KDD 2024 [GEO: Generative Engine Optimization](https://dl.acm.org/doi/10.1145/3637528.3671900)  
- llms.txt 规范：[llmstxt.org](https://llmstxt.org/)  
- 开源工具表：[awesome-open-geo](https://github.com/cloudapp-dev/awesome-open-geo)  
- 审计 CLI：[geo-optimizer-skill](https://pypi.org/project/geo-optimizer-skill/)  
- VitePress 插件：[okineadev/vitepress-plugin-llms](https://github.com/okineadev/vitepress-plugin-llms)  
- 同类双轨方案示例（中转检测站）：[veridrop SEO_AI_GEO_PLAN](https://github.com/canarybyte/veridrop/blob/main/docs/SEO_AI_GEO_PLAN.md)  
- 实务提醒：llms.txt 利于 AI **发现与理解**，**不是** Google 排名因子（Mintlify 等亦持此立场）

---

## 9. 变更记录

| 日期 | 变更 |
|---|---|
| 2026-11-13 | 首版：调研学术/行业/开源 + 对照本站落差 + 双轨 P0–P2 与 90 天路线图 |
| 2026-11-13 | P0 已实施：营销页 per-page tags、定价答案胶囊+FAQ、llms 引用场景、guide/定义文后缀 |
| 2026-11-13 | P1 已实施：Markdown 副本、`audit:geo`、定价 FAQ 默认展开 2 条、关于页实体/更新日期 |
| 2026-11-17 | 知识库 26 篇逐篇优化（§4.5 写法标准）：补 H2 结论段、锚文本对齐目标页 H1、正文互链补到 3 条以上、清掉正文第三方平台名与残留「相关阅读」小节；已上线 |
| 2026-11-20 | P0 全部落地：GitHub 侧建索引入口（仓库根 knowledge/ 26 篇 + tutorials/ 7 篇正文镜像 + README 目录锚点 / 关键词 / 折叠 FAQ / llms 入口）、md 镜像站内死链改写、官网侧首页 FAQPage、twitter per-page、/contact 与 /changelog JSON-LD、教程页 sitemap lastmod、关键词补强、首页答案胶囊与套餐卡去重 |
| 2026-11-20 | P1 落地：Dependabot 8 个 PR 清零（typescript 保持 5.9，TS7 的 exports 变更会让 vue-tsc 无法启动）、首个 release v1.0.0、GitHub profile README 升级、llms.txt 规范校验门禁（check:llms-txt）、GEO 审计从存在性升级到内容质量（44 → 50 项） |
| 2026-11-20 | llms.txt 改合规链接清单：实测第三方校验器（@aia-matrix/llms-txt-validator，MIT）原判 3 FAIL + 2 WARN，改后 9 PASS / 0 WARN / 0 FAIL；全站 HTML 加 rel="describedby" 指向 /llms.txt |
| 2026-11-21 | 第三方 GEO 审计落地：`site/scripts/run_geo_audit.ts`（npm script `audit:geo:external`）调 `geo-optimizer-skill` 跑全站 sitemap，结果与自研 `audit:geo` 并列写进 `docs/geo_audit_baseline.md`。首轮基线：自研 100/100（50 项全过）、第三方 78.98/100（good，43 页全成功，41 good + 2 foundation）。最低分 `/changelog` 57、`/contact` 66（两页无 JSON-LD，属代码已改但线上未发版）。踩坑记录：第三方工具的 SSRF 防护会拦 127.0.0.1，所以只能打线上；国内线路 Cloudflare 选路不稳时成功页数会掉到 0，须设 `HTTPS_PROXY` 走稳定出口 |
| 2026-11-21 | P2-1（知识库 H3 分层）**从计划中撤下**：实测 `docs/knowledge_writing_guide.md` 把 H3 专门留给「常见问题」下的 `### <问题>`（要求与 `config/knowledge.ts` 的 `faq[].q` 逐字一致），且 `check_knowledge_toc.mjs` 断言「FAQPage 问题数 = 组件渲染的 FAQ 折叠项数」；给正文加 H3 会与既有写法规范和断言冲突。改用其它召回粒度杠杆（§4.5 的结论段与锚文本对齐已覆盖大部分收益） |
| 2026-11-20 | 基础设施发现：官网在国内访问频繁 25s 超时的根因是 Cloudflare anycast 边缘选路（DNS 返回的两个 IP 落在不同 colo，LAX 那个约 40% 超时、HKG 那个零超时），不是代码或源站问题。爬虫重试会浪费抓取预算，是「被收录但排名上不去」的一个成因。详见记忆 cf-pages-cn-edge-routing |
