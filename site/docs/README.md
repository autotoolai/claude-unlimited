# docs

## 文档地图

先按「我要改什么」找一份读，不要通读：

| 我要改 | 读哪份 |
|---|---|
| 新增或重排页面、决定某段内容放哪个页面 | [`content_structure.md`](content_structure.md) |
| 写一篇知识库文章 | [`../content/knowledge/guide.md`](../content/knowledge/guide.md) 七步流程；正文先写 `content/knowledge/drafts/`，预览端口 41802 |
| 知识库写作风格与收录 | [`knowledge_writing_guide.md`](knowledge_writing_guide.md) |
| 改教程页（内容、小节、截图、目录） | [`guide_design_spec.md`](guide_design_spec.md) |
| 套餐价格 | [`plans_sync.md`](plans_sync.md)，价格由发卡站商品详情决定，不要手改 |
| 改配色、圆角、字体、动效 | `.vitepress/theme/styles/00_base.css` 头部注释即规范原文，只改那里的 token |
| 出故障了、行为不对 | [`troubleshooting_guide.md`](troubleshooting_guide.md) |
| 想知道这个文件为什么长这样 | 上面各文档的「为什么」段；历史变更看 [`changelog.md`](changelog.md) |

---

内容根目录（VitePress `srcDir: 'docs'`）。每个 `.md` 只放 frontmatter 路由壳，正文在 `.vitepress/theme/pages/*.vue` 或
`config/guide.ts`。`layout` 字段选页面组件，VitePress 直接把它当 Vue 组件渲染，所以 md 里不用再写组件标签：

| 文件 | layout | 页面组件 |
|---|---|---|
| `index.md` | `index` | `.vitepress/theme/index.vue` |
| `pricing.md` | `pricing` | `.vitepress/theme/pricing.vue` |
| `faq.md` | `faq` | `.vitepress/theme/faq.vue` |
| `models.md` | `models` | `.vitepress/theme/models.vue` → `components/PageModels.vue` |
| `console.md` | `console` | `.vitepress/theme/console.vue` → `components/PageConsole.vue` |
| `guide/index.md` | `guide_index` | `.vitepress/theme/guide_index.vue` → `components/GuideIndexPage.vue` |
| `guide/<scene>.md` | `guide_scene` | `.vitepress/theme/guide_scene.vue` → `components/GuideScenePage.vue` |

**页面组件必须在 `.vitepress/theme/index.ts` 的 `themePages` 里注册。** `frontmatter.layout` 的解析发生在默认主题的
`VPContent.vue`（`<component :is="frontmatter.layout" />`），它只认 `enhanceApp` 里 `app.component()` 注册过的名字。
只在 `theme/` 下建文件、不 import 进 `theme/index.ts`，构建不会报错，但产物会 SSR 成空的 `<div>`，而且会被
`check_dist.mjs` 的「外壳内 H1 数量」断言拦下。

教程子页（2026-10-20 重构）：`docs/guide/<scene>.md` 的 frontmatter 只有 `layout: guide_scene` + `scene: <id>`
+ SEO 三件套（title / description / head），**正文全在 `config/guide.ts`**。`scene` 是路由后缀的来源，
`guide_scene.vue` 从 frontmatter 读它再反查场景数据。5 个场景页就是 `docs/guide/{cc,desktop,codex,workbuddy,cursor}.md`。
规范见 `guide_design_spec.md`。

## 教程怎么写

数据入口只有一个：`config/guide.ts`。它里有三类东西：

1. **`sharedBlocks`** — 装 CC Switch、换取 API Key 这类每个客户端都要做的公共正文，写一份，5 个场景页用 `shared` 字段引用。
2. **5 个场景页数据**（`ccPage` / `desktopPage` / …）— 每个客户端一条完整路径：小节、步骤、截图、FAQ、相关阅读、长尾词。
3. **装配层** — `guideBlocks(page)` 合并共享块、给 H2 加页内序号、给截图加图注编号。**全站唯一给教程内容编号的地方**，数据里不许手写 `N. ` 或 `图 NN`。

`GuideIndexPage.vue` 渲染索引页（5 张场景卡 + 旧锚点兼容跳转），`GuideScenePage.vue` 渲染场景页
（一句话答案 → `GuideBlockBody` 逐块 → FAQ → 相关阅读 → 接着看 + CTA）。左侧目录（`sections.ts` 的
`SECTION_NAV`）与页脚「教程」列（`guideNavItems`）全部从同一份数据派生，改一处两处同步。

**`title` / `description` 有两个副本**：`docs/guide/<scene>.md` 的 frontmatter 与 `config/guide.ts` 的
`page.title` / `page.desc`，改一处必须同时改另一处（否则搜索结果与 AI 引用各说各话）。没有任何门禁
自动核对这两份，这是要人工守的约定。

教程页 CTA 按钮必须带 `data-cta`（`guide_ccswitch` / `guide_console`），否则转化事件丢失；
`check_analytics.mjs` 的 `REQUIRED_CTA` 里有 `guide_` 前缀守着这条。

## 教程截图

- 放在 `.vitepress/theme/assets/guide/`，在 `theme/components/GuideShot.vue` 里登记成静态 import，
  `config/guide.ts` 的每个截图只写文件名（如 `src: 'guide_onekey_import.png'`）。**图片不能放在 `docs/` 下**：
  那里的非 .md 文件不会被 Vite 打包，也不会复制进 dist。
- **漏登记不会让构建失败**，只会让产物里那张图 404（`GuideShot.vue` 拿不到映射时 `url()` 原样返回文件名）。
  `check_dist.mjs` 的「截图文件不在产物里」断言会拦，但只在跑完整 build 时才拦——改完图片先跑 build。
- 来源是发给买家的腾讯文档《AI工具使用教程》里的真实截图（2026-10-20 起四份文档、33 张图）。
  用户按官网图文做能在卖家文档里找到同一步。权威源与抓取方法见记忆文件 `guide-source-is-qq-doc`。
- 新增的密集界面图（表单、面板）加 `zoom: true`，渲染成可点开原图的链接。

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
