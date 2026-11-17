# 内容结构约定

2026-10-10 重排全站内容后定下的规范。**加页面、加模块、改文案前先读这份**，避免同一段内容再次在两页各写一遍。

## 一条硬规则

**任何内容模块在站内只允许有一个「主场页」。** 其它页面需要它时，只能给一行链接指过去，不能复制正文。
判断新内容该放哪：先问「用户在这个问题上想要什么答案」，再问「这是哪个页面的问题」。

## 页面角色与职责

| 页面 | 路由 | 角色 | 只回答 | 板块 |
|---|---|---|---|---|
| 首页 | `/` | 落地页 | 这是什么、多少钱、买前顾虑 | 首屏 → 套餐与价格（PlanGrid 摘要）→ 买之前先确认（`buyingQuestions`）→ CtaBand；卖点长文 / 四步流程 / 继续了解卡已下线，主场分别在定价页、教程、各索引页 |
| 套餐定价 | `/pricing` | 决策页 | 多少钱、买到什么、边界在哪、能不能退 | 档位网格 → 选套餐常问（`pricingFaqItems` 精选）；细则与限速全文主场在 `/faq` |
| 联系我们 | `/contact` | 联系页 | 怎么找到人工、代理/商务怎么谈 | 欢迎语 → 微信/QQ 双通道二维码 → 适用场景 → 次要出口（助手 / 教程 / FAQ） |
| Token 代理 | `/agency` | 招商页 | 为什么值得做代理、适合谁、怎么申请 | 为什么值得做 → 适合谁 → 申请区（左微信 CTA / 右无标题心态建议列表，备注「代理」）→ 页内 FAQ；**不讲拿货操作、不放代理后台外链**；对外名称「Token 代理」；keywords / FAQ 保留「rsxermu666 代理」搜索别名（裸词 `rsxermu666` 仍归 `/console`） |
| 模型广场 | `/models` | 目录页 | 有哪些模型、model ID 是什么、怎么切 | 模型一览 → 关于模型（`modelsFaqItems` 精选）→ CTA |
| 使用教程（索引） | `/guide` | 分流页 | 我该看哪一篇 | 一句话答案 → 6 条路径 → 选路径常问（`guideFaqItems` 精选）→ 接着看 → CTA。营销页版式；换 Key 的步骤在各场景页第一步 |
| 使用教程（场景页 ×6） | `/guide/cc` `/guide/cli` `/guide/desktop` `/guide/codex` `/guide/workbuddy` `/guide/cursor` | 操作页 | 我在这个客户端里怎么配起来 | 一句话答案 → 小节流 → 常见问题（`guide.ts` 的 `page.faq[]`，不套 faq.ts）→ 相关阅读 + CTA；排错交给知识库 / `/faq` |
| 知识库 | `/knowledge` | 目录页 | 有哪些文章 | 分类胶囊 + 精选 + 分类小节（分类数以 `config/knowledge.ts` 的 `knowledgeCategories` 为准） |
| 管理后台 | `/console` | 功能介绍页 | 后台能做什么、买完怎么上手；主 CTA 进操作台 | 主 CTA（下挂备用域名一行）→ 三步上手 → 后台功能 → 后台 FAQ |
| 常见问题 | `/faq` | 答疑页 | 我遇到的问题 | 买之前精选（默认收起）+ 5 个分类 + 还没解决 |
| 关于我们 | `/about` | 信任页 | 我们是谁、服务条款、隐私 | 定位/交付/边界 → 服务条款 → 隐私政策 |

`/unlimited`（无限额度页）已于 2026-10-10 并入 `/pricing` 并 301，不要再新建同类页面。
`/terms`、`/privacy` 已于 2026-11-05 并入 `/about`（锚点 `#terms` / `#privacy`）并 301，不要再拆回多页。

主导航只放内容页：模型广场 / 套餐定价 / 联系我们 / Token 代理 / 使用教程 / 知识库。页头「控制台」与页脚「服务」列
先落到站内 `/console` 功能介绍页（`rsxermu666` 搜索主场：document title / lead（官方后台 + 能力） / FAQ / CTA 主机名 / keywords / JSON-LD / llms；可见 H1 不塞域名；其它页不堆词）；
真实操作台在外链 `partners.console`，只由页内主 CTA 与教程「去操作」按钮新标签打开，CTA 上展示主机名。
站内叙述性链接（页脚、教程索引、关于页、知识库说明）优先链 `/console`，锚文本可用「rsxermu666.cn」或「rsxermu666.cn 管理后台」；Base URL / 粘贴卡密等操作步骤仍直链操作台。
`/about` 是服务条款与隐私政策的唯一主场；页脚底部三链（关于我们 / 服务条款 / 隐私政策）都落到本页对应锚点。联系方式主场仍是 `/contact`。
操作台（`rsxermu666.cn`）页脚或关于区应反链本页，文案示例：「官方介绍：Claude 无限卡官网 /console」。不要再为品牌词新开三级域内容站；vanity 子域若需要只做 301 到 `/console`。

`/contact` 是联系信息唯一主场（微信 / QQ 二维码与可复制号码）。FAQ 底栏、页脚「联系我们」、信任页联系区块只给一行链接；右下角在线助手客服卡保留作快捷扫码入口，可链回本页。
`/agency` 是 Token 代理招商唯一主场（对外名称与 document title / H1 / 导航 / lead 一律「Token 代理」；`Claude 无限卡代理` / `rsxermu666 代理` 只作 keywords 与 FAQ 搜索别名，不堆成页面名）。页脚「服务」列与联系页「代理与渠道」链「Token 代理」。`/console` 可一行链回本页分流渠道意图。本页只讲合作价值与申请入口（备注「代理」），拿货细节加微后沟通，代理后台入口不开公示。

## 内容模块词汇表

命名统一用这里的词，方案讨论与代码注释都按这套对齐。

**通用外壳**
- 页头导航 — `TabBar`，主导航链接
- 首屏 — `HomeHero` + `StatBar`，只在首页
- 页尾 CTA 条 — `CtaBand`
- 页尾声明 — `siteConfig.disclaimer`

**说服类（首页、定价页）**
- 卖点卡组 — `FeatureCards`，只讲「为什么值得」，不讲能力清单与流程
- 计价对比 — 我们 / 按量 API / 官方订阅 三列对比
- 档位网格 — `PlanGrid` + `PlanCard`（分组切换器 `SegmentedTabs` 已于 2026-10-20 随教程两轨下线一并删除，定价页不再使用）

**规格类（定价页）**
- 规格表 — 包含什么（能力、客户端、SDK）
- 边界表 — 不包含什么

**规则类（定价页，信任核心）**
- 公平使用 — 会话窗口怎么选（对外不披露并发路数 / RPM / TPM）
- 退款规则

**索引类（目录页）**
- 模型一览 — `ModelCard` / `ModelBadges` / 层级分工表
- 文章索引 — `KnowledgeCard` + 分类胶囊

**流程类（首页、教程场景页）**
- 四步流程 — `StepFlow`（首页）/ `GuideSteps`（教程场景页的小节步骤）
- 命令块 — `GuideTerm`

**答疑类**
- FAQ 折叠组 — `FaqList`（全站 FAQ / 营销页精选 / 后台 FAQ）
- 场景 FAQ — `GuideFaqList`（仅教程场景页，数据在 `guide.ts` 的 `page.faq[]`）

**管理后台功能介绍页**
- 入口门户 — 主 CTA（展示操作台主机名）+ 备用域名静默一行
- 三步上手 — 兑换 → 提 Key → 导入配置
- 功能卡组 — 后台功能一句盘点

**落地页 / 营销页精选 FAQ**
- 套餐摘要 — 首页 `#plans`，复用 `PlanGrid`（主场仍是 `/pricing`）
- 页面意图精选 — 首页 / 定价 / 模型 / 教程索引底部各挂 3–4 条，id 列表在 `config/faq.ts`（`buyingQuestionIds` / `pricingFaqIds` / `modelsFaqIds` / `guideFaqIds`）；**不与** `/faq` 五分类一一对应；全文主场在 `/faq`
- 场景页 FAQ 独立维护，不要把 `faq.ts` 整类灌进 `/guide/<场景>`
- 信任条 / 继续了解条 — 已下线，勿再加回

## 数据归属

| 内容 | 唯一数据源 | 谁在渲染 |
|---|---|---|
| 会话窗口口径、套餐边界、退款窗口 | `config/rules.ts` | FAQ 窗口怎么选、信任页公平使用、llms 事实要点 |
| 价格、档位、退款条款 | `config/plans.ts` | 首页档位卡、定价页档位网格 |
| 模型层级与 model ID | `config/models.ts` | 模型广场、教程 3.6、知识库文章 |
| 全部问答 | `config/faq.ts` | `/faq` 全文；营销页精选内嵌；在线助手；相关 JSON-LD |
| 场景页问答 | `config/guide.ts` 的 `page.faq[]` | 教程场景页折叠问答 + 场景 FAQPage |
| 教程正文 | `config/guide.ts` | 索引页与 6 个场景页、页脚、llms-full.txt、JSON-LD |
| 商品、平台地址、联系方式、导航 | `config/site.ts` | 全站；联系方式正文只在 `/contact` 展示；`/agency` 可嵌微信 CTA，数据仍读这里 |
| Token 代理文案与页内 FAQ | `config/agency.ts` | `/agency`；不进全站 `/faq` 主分类 |

新增内容前先查这张表：已有数据源就派生，不要在页面组件里另写一份。

## 门禁

改完必须跑通：

```bash
npm run build        # 内含 check_dist.mjs：页面外壳、H1 唯一、板块 id、卡片数量
npm run verify       # 48 项 SEO / 组件 / 链接验收
npm run check:links  # 死链
```

```bash
npm run check:align   # 教程页文字左边线，需先 npm run preview
```

`check_dist.mjs` 对首页断言：首屏 + 档位卡 + featured FAQ + CTA；并禁止把已下线的 workflow / trust / continue 等整段正文板块加回。
增删首页板块时要同步改那里的断言。教程的断言是逐页的（6 个场景页各一套），改动教程结构时按
`guide_design_spec.md` 第九节核对。
