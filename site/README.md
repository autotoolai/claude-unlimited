# Claude 无限卡官网

Claude 无限卡的展示型官网：介绍商品与接入方式，把购买导流到第三方发卡站。站点不处理支付、不接数据库、零后端。

## 技术栈

| 项 | 选型 |
|---|---|
| 框架 | VitePress 1.6.4（Vue 3 + Vite 5，纯静态 SSG） |
| 样式 | 原生 CSS + CSS 变量：`.vitepress/theme/styles/*.css`（按区块拆分的全站样式，浅色/深色两套 token）+ `.vitepress/theme/shell_extra.css`（页脚 / 教程步骤块 / 人工客服浮标），全部在 `theme/index.ts` 顶层 import，构建期抽成独立 CSS 进 `<head>` |
| 组件 | 自研 Vue 组件（PageShell 外壳 + Hero/卡片/步骤/套餐卡/对比表/FAQ/助手等），无图标库、无动画库、无 Tailwind |
| 页面 | 八个 `.vue` 页面组件（`.vitepress/theme/index.vue`、`guide_index.vue` 等），`docs/` 下的 `.md` 只作路由壳；组件必须在 `theme/index.ts` 的 `themePages` 里注册，否则 `frontmatter.layout` 解析不到 |
| 部署 | Cloudflare Pages（托管方式抽象在 `scripts/deploy_claude_unlimited_site.ps1`，可切 Workers Static Assets） |
| 图床 | 二期接 Cloudflare R2；`imgCdn` 留空时回落打包资源 |

## 目录

```
config/site.ts     站点元信息 + 商品 + 合作平台地址（purchase / activation / ccswitch）+ 客服联系方式（全站唯一数据源）
config/faq.ts      FAQ 唯一数据源（页面 + 助手 + JSON-LD 共用；7 个分类，使用与配置分类来自卖家教程站）
config/models.ts   模型层级与 model ID 表（/unlimited、/guide/models、FAQ 共用）
config/guide.ts    使用教程四页的内容数据（唯一编辑入口；改教程只改这里）
docs/              内容根（srcDir=docs）：首页 / pricing / unlimited / faq / guide（4 页）+ guide/assets 截图
scripts/           构建脚本（sitemap、死链检查、部署）
.vitepress/theme/  外壳与组件：Layout.vue、index.ts（页面注册 + 样式入口）、components/、styles/（CSS 区块）、assets/guide/（教程截图）
public/            robots.txt、_headers、_redirects、llms.txt、favicon、og 图目录
```

## 命令

```bash
npm ci
# 本地开发要开两个终端：
#   1) npm run dev:site   -> vitepress dev，站点页面在 5199
#      （Git Bash 下 `vitepress` 这个 bin 解析失败时，用 PowerShell 跑：npx vitepress dev --port 5199）
#   2) npm run dev        -> public/ 同步 + 静态服务 4198（favicon / robots / llms.txt）
#      VitePress 1.6 的 dev 服务器不提供 site/public 下的文件（publicDir 按 srcDir 解析成 docs/public），
#      浏览器会把 /favicon.svg 当路由请求、拿到页面 HTML。生产构建由 build 末尾的 copy_public.mjs
#      把 public/ 复制进 dist，线上无此问题，所以只在 dev 需要 4198。
# 访问地址（笔记本同 Wi-Fi 或 Tailscale）：
#   http://<本机局域网 IP>:5199   http://<本机 Tailscale IP>:5199   http://<本机 MagicDNS 主机名>:5199
#   静态文件单独看： http://<本机局域网 IP>:4198/favicon.svg
#   域名形式访问需要在 .vitepress/config.mts 的 server.allowedHosts 里列出（已放行 *.ts.net）；
#   IP 形式（<本机局域网 IP> / <本机 Tailscale IP>）Vite 默认放行。少了它会看到 "This host is not allowed" 白屏。
npm run build        # vitepress build + 自动生成 sitemap.xml
npm run check:links  # dist 死链检查，有死链则退出码 1
npx tsc --noEmit     # 类型检查
npx tsx scripts/check_kefu.ts   # 助手关键词匹配自测（11 条用例）
npm run verify       # 把 dist 抽到临时目录起服务，跑 60+ 项验收（SEO / 购买按钮 / 组件数量 / 助手语料 / OG 图）
npm run check:dist   # 只跑构建产物结构门禁（SSR 是否完整：外壳、H1、页内目录锚点、无未渲染模板）
```

`npm run verify` 覆盖：路由可达、每页外壳与唯一 h1 / title / description / canonical、购买按钮数量与 `rel` 与 `data-cta`、
首页组件渲染数量、FAQ 条数与分类锚点、助手语料是否进 bundle、商品 URL 是否只在数据层出现（组件无硬编码）、OG 图存在。
`check:dist.mjs`（build 末尾自动跑）是另一道门禁：VitePress 的 SSR 会把子组件异常吞成注释占位且日志没有堆栈，
所以产物里逐页断言「外壳节点齐全 / 外壳内 H1 唯一 / 页内目录锚点全部命中正文 h2 / 没有未渲染的 `<template>` /
没有 `<pre><code>` 降级 / FAQ·步骤·卡片数量正确」，任何一条不满足就让构建以非 0 退出。

页面正文在 `.vitepress/theme/*.vue`（`index.vue` / `pricing.vue` / `unlimited.vue` / `faq.vue`），
`docs/*.md` 只是带 frontmatter 的路由壳（`layout: index|pricing|unlimited|faq` + OG 文案）；
VPContent 按 frontmatter.layout 解析主题里同名的全局组件。**不要把正文写回 markdown**：VitePress 1.6 会把
markdown 编译成 `<template><div>…</div></template>` 并用 inline 渲染模式输出，页面里的 `<template>` 标签会被
当普通元素原样写进 SSR HTML，markdown-it 对 `<script>` 块的切分又会随空行变化把正文降级成字面量 `<pre><code>`。
迁移前的 markdown 原文在 `archive/docs_before_20261008/`，仅供对照。

## 部署

```powershell
pwsh -File scripts/deploy_claude_unlimited_site.ps1
```

先在 Cloudflare 建 Pages 项目（构建命令 `npm run build`，输出目录 `.vitepress/dist`，Node 20）并配置环境变量 `CLOUDFLARE_API_TOKEN`。

## 上线前必须确认

1. 正式主域名：改 `config/site.ts` 的 `url`，Pages 绑定自定义域，sitemap / canonical / OG 自动跟随。
2. 商品文案：改 `config/site.ts` 的 `products[0]`（名称、价格、周期、卖点）。
3. 首页数据条：`config/site.ts` 的 `stats` 只用可核实数字，否则删掉整块。
4. **卡密兑换与 API Key 的网址**：改 `config/site.ts` 的 `partners` 里 `id: 'activation'` 的 `url`。现在留空，首页「合作与兑换」卡片与教程里第 1、3 步拿不到链接，补上即可，无需改代码。`purchase`（发卡站）与 `ccswitch`（下载站）同理。
5. 客服：改 `config/site.ts` 的 `contact`（`wechatId` / `wechatQr` / `qq` / `qqGroup` / `email` / `hours`）。把微信二维码图片放到 `docs/assets/` 或 `public/`，文件名填进 `wechatQr`；现在留空，人工客服面板显示占位框但「复制微信号 / QQ / QQ 群」已经可用。
6. Cloudflare Analytics token：`config.mts` 里的 `REPLACE_WITH_CF_ANALYTICS_TOKEN`。
7. OG 图：`public/og/*.png` 目前**缺失**，社交分享卡片会是空白。需按 1200×630 出图（品牌底色 + 标题 + 价格）。`npm run verify` 会把缺失项报成 FAIL。教程页可暂不出图。
8. 法务确认：退款规则、限速数字、免责声明措辞（`config/faq.ts` 与 `config/site.ts` 的 `disclaimer`）；`legal.icp` / `legal.company` 填备案号与运营主体。
9. 教程内容核对：`config/guide.ts` 的「五步总览」按卖家教程站 `https://wx.bbyy.site/` 提炼重写，截图已裁掉品牌栏与二维码；上线前对照自家流程核一遍措辞与截图。
