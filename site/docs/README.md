# docs

## 文档地图

先按「我要改什么」找一份读，不要通读：

| 我要改 | 读哪份 |
|---|---|
| 新增或重排页面、决定某段内容放哪个页面 | [`content_structure.md`](content_structure.md) |
| 写一篇知识库文章 | [`knowledge/SOP-写一篇新文章.md`](knowledge/SOP-写一篇新文章.md)，七步流程 |
| 知识库写作风格与收录 | [`knowledge_writing_guide.md`](knowledge_writing_guide.md) |
| 改教程页 | [`guide_design_spec.md`](guide_design_spec.md) |
| 套餐价格 | [`plans_sync.md`](plans_sync.md)，价格由发卡站商品详情决定，不要手改 |
| 改配色、圆角、字体、动效 | `.vitepress/theme/styles/00_base.css` 头部注释即规范原文，只改那里的 token |
| 出故障了、行为不对 | [`troubleshooting_guide.md`](troubleshooting_guide.md) |
| 想知道这个文件为什么长这样 | 上面各文档的「为什么」段；历史变更看 [`changelog.md`](changelog.md) |

---

内容根目录（VitePress `srcDir: 'docs'`）。每个 `.md` 只放 frontmatter 路由壳，正文在 `.vitepress/theme/pages/*.vue`。
`layout` 字段选页面组件，VitePress 直接把它当 Vue 组件渲染，所以 md 里不用再写组件标签：

| 文件 | layout | 页面组件 |
|---|---|---|
| `index.md` | `index` | `.vitepress/theme/index.vue` |
| `pricing.md` | `pricing` | `.vitepress/theme/pricing.vue`（含原 `/unlimited` 的内容） |
| `faq.md` | `faq` | `.vitepress/theme/faq.vue` |
| `models.md` | `models` | `.vitepress/theme/models.vue` → `components/PageModels.vue` |
| `console.md` | `console` | `.vitepress/theme/console.vue` → `components/PageConsole.vue` |
| `guide/index.md` | `guide_index` | `.vitepress/theme/guide_index.vue`（教程只有这一页） |

**页面组件必须在 `.vitepress/theme/index.ts` 的 `themePages` 里注册。** `frontmatter.layout` 的解析发生在默认主题的
`VPContent.vue`（`<component :is="frontmatter.layout" />`），它只认 `enhanceApp` 里 `app.component()` 注册过的名字。
只在 `theme/` 下建文件、不 import 进 `theme/index.ts`，构建不会报错，但产物会 SSR 成空的 `<div>`（HTML 里只有
`<guide_index></guide_index>`），而且会被 `check_dist.mjs` 的「外壳内 H1 数量」断言拦下。
页面组件里的文件名、layout 的对应关系：`docs/guide/index.md` → `layout: guide_index` → `theme/guide_index.vue` → 渲染 `config/guide.ts` 的单页 `/guide`。

## 知识库怎么写

知识库（`/knowledge`）是文章模块，与教程页不同：

- **正文在 `docs/knowledge/<slug>.md`**（原生 markdown），不是 `config/*.ts`。
- 文章页写 `layout: page` + frontmatter `knowledge: true`，由 `theme/components/KnowledgeDoc.vue` 渲染 VPDoc 的 page 分支输出；H1 来自 markdown 自己的 `# 标题`。
- 列表页 `docs/knowledge/index.md` 仍是路由壳（`layout: knowledge_index`），页面组件是 `theme/knowledge_index.vue`；结构为分类胶囊条 + 精选大卡 + 四个分类小节。
- 元数据（列表卡片、Article + FAQPage JSON-LD、OG、页脚）在 `config/knowledge.ts`（四个分类按用户旅程：start / how / cost / troubleshoot；`knowledge.ts` 的 `knowledgeCategories` 是唯一真源，文档别手写分类数）；页内目录复用 `components/SectionNav.vue`，目录项在客户端挂载后从正文的 `h2[id]` 读取（SSR 为空，由 `npm run check:toc` 在浏览器里核对），不走 `sections.ts`。
- 源站原文与抓取信息在 `config/knowledge_sources.ts`，由 `scripts/gen_sources.py` 复制到 `archive/knowledge_source_20261009/<slug>/`；`npm run check:sources` 校验逐字一致。PAGES（check_dist.mjs / verify_build.py）从 `config/knowledge.ts` 动态读取。
- 新增文章的完整流程与写作规范见 `docs/knowledge_writing_guide.md`。

## 内容结构约定（2026-10-10）

全站页面各只回答一个问题，模块分工、页面职责与「同一段内容只存在于一个页面」的硬规则见
[`content_structure.md`](content_structure.md)。新增模块或页面时先读它，确认它属于哪个页面，
避免再次出现同一段内容在两页各写一遍的情况。

限流数字、套餐边界、退款窗口只在 `config/rules.ts` 出现；页面表格、FAQ 答案、首页卖点都从它派生，改数字只改那一处。

## FAQ 怎么写

全部问答在 `config/faq.ts`，页面顺序由 `.vitepress/theme/pages/data.ts` 的 `faqGroupOrder`
（购买 → 商品 → 限速 → 配置 → 接入 → 安全 → 我们）决定，`components/sections.ts` 的 `SECTION_NAV.faq` 要与之一致
（`check_dist.mjs` 会逐页断言）。`/faq` 顶部「买之前」区块取 `buyingQuestions` 里列出的条目 id，
这些条目不会再在下面的分类里重复出现。改 FAQ 条数要同步 `check_dist.mjs` 的 `CU_FAQ_COUNT`（当前 28，与 `config/faq.ts` 的 `q:` 条数一致）。
「限速与封号」里的具体速率数字由 `config/rules.ts` 的 `limitBullets()` 插值生成，不要在答案里另写一份。

## 教程页怎么写

**先读 [`guide_design_spec.md`](guide_design_spec.md)**（信息结构与视觉规范的权威源，2026-10-12 起）。下面只讲数据放在哪。

教程正文**不在 md 里，也不在页面组件里**，而在 `config/guide.ts`：一个 `GuidePage` 数据对象（`/guide`）。购买章节已整段删除，
客服入口已下线正文里的客服条，统一走右下角在线助手浮标。正文分两条轨——`tab: 'novice'` 的小白教程（默认）与 `tab: 'pro'` 的高级配置，
由 `guideTabs` 驱动**页级**分段切换；轨内不再重新分流。不带 `tab` 的块在两条轨下面都显示。
`guide_index.vue` 直接渲染 `GuidePage.vue`，后者按 `config/guide.ts` 的 `blocks[]` 渲染：段落、列表、要点框、命令块、表格、步骤块（序号 + 段落 + 提示 + 截图）、按钮行（`cta`）。
页内目录与页脚「教程」列（`pages/data.ts` 的 `guideNavItems`）全部从同一份数据生成，改一处两处同步。

改教程的数据入口只有一个：`config/guide.ts`；改教程的规范入口是 `guide_design_spec.md`。

## 教程截图

- 放在 `.vitepress/theme/assets/guide/`，在 `theme/components/GuideShot.vue` 里登记成静态 import，
  `config/guide.ts` 的每个截图只写文件名（如 `src: 'guide_onekey_import.png'`）。**图片不能放在 `docs/` 下**：
  那里的非 .md 文件不会被 Vite 打包，也不会复制进 dist。
- 来源是发给买家的腾讯文档《AI工具使用教程》里的 9 张真实截图（2026-10 替换原先卖家教程站的示意图），每张都是买家实际操作后拍的界面，用户按官网图文做能在卖家文档里找到同一步。

## 历史

2026-10-08 之前正文写在 markdown 里（`<script setup>` + `<template>`），但 VitePress 1.6 会把 markdown 编译成
`<template><div>…</div></template>` 并用 inline 渲染模式输出，页面里的 `<template>` 标签会被当普通元素原样写进 SSR
HTML，markdown-it 对 `<script>` 块的切分又会随空行变化把正文降级成字面量 `<pre><code>`。正文改成 .vue 后没有这两个坑。
迁移前的 markdown 原文在 `site/archive/docs_before_20261008/`，仅供对照，不要再改。

## 渲染链路

`theme/Layout.vue` 是薄壳，只渲染一个 `<VPContent />`，不用默认主题的 `Layout`（`VPApp/VPNav/VPLocalNav/VPSidebar` 全部不渲染）：
VitePress 渲染 md → `VPContent` 按 `frontmatter.layout` 选页面组件 → 页面组件用 `PageShell`
画品牌页头、主导航、正文、页内目录、页脚，以及右下角的在线助手浮标（人工客服已并入助手面板，不再有第二个浮标）。

`VPContent` 必须直接 import 内部路径：`import VPContent from 'vitepress/dist/client/theme-default/components/VPContent.vue'`。
`DefaultTheme.VPContent` 与 `import { VPContent } from 'vitepress/theme'` 都是 undefined / 无导出，会让整页空白（Vue 报 `Invalid vnode type: undefined`）。

默认外壳的空节点曾经用 `visibility: hidden` 藏起来，这套补丁已删除：产品里再没有 `VPNav/VPLocalNav/VPSidebar/VPSkipLink`
节点，`scripts/check_dist.mjs` 会对此做断言。Layout 去掉默认外壳后要自己接管 hash 锚点滚动（原由 VPLocalNav 负责）。
生产构建的 dist 每页仍会有一条 `Hydration completed but contains mismatches` 控制台警告（dev 下没有），
原因与现状见 `site/temp/hydration_mismatch.md`，不影响功能。
`Layout.vue` 现在只负责三件事：JSON-LD 注入、`html.dark` 同步、hash 锚点滚动。