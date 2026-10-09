# docs

内容根目录（VitePress `srcDir: 'docs'`）。每个 `.md` 只放 frontmatter 路由壳，正文在 `.vitepress/theme/pages/*.vue`。
`layout` 字段选页面组件，VitePress 直接把它当 Vue 组件渲染，所以 md 里不用再写组件标签：

| 文件 | layout | 页面组件 |
|---|---|---|
| `index.md` | `index` | `.vitepress/theme/index.vue` |
| `pricing.md` | `pricing` | `.vitepress/theme/pricing.vue` |
| `unlimited.md` | `unlimited` | `.vitepress/theme/unlimited.vue` |
| `faq.md` | `faq` | `.vitepress/theme/faq.vue` |
| `guide/index.md` | `guide_index` | `.vitepress/theme/guide_index.vue` |
| `guide/clients.md` | `guide_clients` | `.vitepress/theme/guide_clients.vue` |
| `guide/models.md` | `guide_models` | `.vitepress/theme/guide_models.vue` |
| `guide/ccswitch.md` | `guide_ccswitch` | `.vitepress/theme/guide_ccswitch.vue` |

**页面组件必须在 `.vitepress/theme/index.ts` 的 `themePages` 里注册。** `frontmatter.layout` 的解析发生在默认主题的
`VPContent.vue`（`<component :is="frontmatter.layout" />`），它只认 `enhanceApp` 里 `app.component()` 注册过的名字。
只在 `theme/` 下建文件、不 import 进 `theme/index.ts`，构建不会报错，但产物会 SSR 成空的 `<div>`（HTML 里只有
`<guide_index></guide_index>`），而且会被 `check_dist.mjs` 的「外壳内 H1 数量」断言拦下。
页面组件里的文件名、slug 的对应关系：`docs/guide/clients.md` → `layout: guide_clients` → `theme/guide_clients.vue` → `slug: '/guide/clients'`。

## 教程页怎么写

教程正文**不在 md 里，也不在页面组件里**，而在 `config/guide.ts`：四个 `GuidePage` 数据对象（总览 / 接入与模型 / 模型与切换 / CC Switch 详解）。
`guide_*.vue` 只是把 slug 传给 `GuidePage.vue`，后者按 `config/guide.ts` 的 `blocks[]` 渲染：段落、列表、要点框、命令块、表格、步骤块（序号 + 段落 + 提示 + 截图）。
页内目录、页脚「教程」列、首页「使用教程」卡片、`/guide` 互链全部从同一份数据生成，改一处四处同步。

改教程的入口只有一个：`config/guide.ts`。

## 教程截图

- 放在 `.vitepress/theme/assets/guide/`，在 `theme/components/GuideShot.vue` 里登记成静态 import，
  `config/guide.ts` 的每个截图只写文件名（如 `src: 'guide_get_apikey.jpg'`）。**图片不能放在 `docs/` 下**：
  那里的非 .md 文件不会被 Vite 打包，也不会复制进 dist。
- 来源是卖家教程站 `https://wx.bbyy.site/` 的 10 张 PNG，原始文件在 `Token_Platform/temp/website_capture/images/`（不入库），
  已裁掉顶部品牌栏、去掉含二维码的图片，转码成 JPG 入库。

## 历史

2026-10-08 之前正文写在 markdown 里（`<script setup>` + `<template>`），但 VitePress 1.6 会把 markdown 编译成
`<template><div>…</div></template>` 并用 inline 渲染模式输出，页面里的 `<template>` 标签会被当普通元素原样写进 SSR
HTML，markdown-it 对 `<script>` 块的切分又会随空行变化把正文降级成字面量 `<pre><code>`。正文改成 .vue 后没有这两个坑。
迁移前的 markdown 原文在 `site/archive/docs_before_20261008/`，仅供对照，不要再改。

## 渲染链路

`theme/Layout.vue` 是薄壳，只渲染一个 `<VPContent />`，不用默认主题的 `Layout`（`VPApp/VPNav/VPLocalNav/VPSidebar` 全部不渲染）：
VitePress 渲染 md → `VPContent` 按 `frontmatter.layout` 选页面组件 → 页面组件用 `PageShell`
画品牌页头、主导航、正文、页内目录、页脚、两个客服浮标。

`VPContent` 必须直接 import 内部路径：`import VPContent from 'vitepress/dist/client/theme-default/components/VPContent.vue'`。
`DefaultTheme.VPContent` 与 `import { VPContent } from 'vitepress/theme'` 都是 undefined / 无导出，会让整页空白（Vue 报 `Invalid vnode type: undefined`）。

默认外壳的空节点曾经用 `visibility: hidden` 藏起来，这套补丁已删除：产品里再没有 `VPNav/VPLocalNav/VPSidebar/VPSkipLink`
节点，`scripts/check_dist.mjs` 会对此做断言。Layout 去掉默认外壳后要自己接管 hash 锚点滚动（原由 VPLocalNav 负责）。
生产构建的 dist 每页仍会有一条 `Hydration completed but contains mismatches` 控制台警告（dev 下没有），
原因与现状见 `site/temp/hydration_mismatch.md`，不影响功能。
`Layout.vue` 现在只负责三件事：JSON-LD 注入、`html.dark` 同步、hash 锚点滚动。