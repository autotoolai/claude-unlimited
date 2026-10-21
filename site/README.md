# Claude 无限卡官网

Claude 无限卡的展示型官网：介绍商品与接入方式，把购买导流到第三方发卡站。不接数据库、零后端。

> 本文件只描述**当前**状态与操作方式。历次重构的记录在 [`docs/changelog.md`](docs/changelog.md)。

## 技术栈

| 项 | 选型 |
|---|---|
| 框架 | VitePress 1.6.4（Vue 3 + Vite 5，纯静态 SSG） |
| 样式 | 原生 CSS + CSS 变量：`.vitepress/theme/styles/*.css`（按区块拆分的全站样式，浅色/深色两套 token）+ `.vitepress/theme/shell_extra.css`（页脚 / 教程步骤块），全部在 `theme/index.ts` 顶层 import，构建期抽成独立 CSS 进 `<head>` |
| 组件 | 自研 Vue 组件（PageShell 外壳 + Hero/卡片/步骤/套餐卡/对比表/FAQ/助手等），无图标库、无动画库、无 Tailwind |
| 页面 | 七个 `.vue` 页面组件（`.vitepress/theme/index.vue`、`guide_index.vue` 等），`docs/` 下的 `.md` 只作路由壳；组件必须在 `theme/index.ts` 的 `themePages` 里注册，否则 `frontmatter.layout` 解析不到 |
| 部署 | Cloudflare Pages **直接上传模式**（本机构建后 `wrangler pages deploy` 推 dist，不绑 Git；托管方式抽象在 `scripts/deploy_claude_unlimited_site.ps1`，可切 Workers Static Assets） |
| 图床 | 二期接 Cloudflare R2；`imgCdn` 留空时回落打包资源 |

## 目录

```
config/rules.ts    限流数字 / 套餐边界 / 退款窗口的唯一数据源（页面表格、FAQ 答案、首页卖点都从这里派生）
config/site.ts     站点元信息 + 商品（价格 / 周期天数 days / 承诺 promise）+ 合作平台地址（purchase / activation / ccswitch）+ 客服联系方式（全站唯一数据源）
config/faq.ts      FAQ 唯一数据源（页面 + 助手 + JSON-LD 共用；7 个分类，使用与配置分类来自卖家教程站）
config/models.ts   模型层级与 model ID 表（/models、教程页、FAQ 共用）
config/guide.ts    使用教程的内容数据（索引页 + 5 个客户端场景页；唯一编辑入口，改教程只改这里）
config/logo.ts     品牌标记「无限」符号的唯一数据源（几何 + 品牌橙 #C85A1E / 米白 #FFF6EC），派生 favicon.svg、BrandLogo.vue、OG 分享图；改 logo 只改这里再 `npm run gen:logo`
docs/              内容根（srcDir=docs）：首页 / pricing / faq / models / console / 信任页三页 / changelog + guide（索引页 + 5 个场景页）/ knowledge（索引页 + 文章）+ guide/assets 截图
content/knowledge/  草稿工作台：drafts/ 正文与素材卡、scripts/（preview 预览端口 / check_draft 体检 / publish_article 发布）、guide.md 流程、log.md 改进日志
scripts/           构建脚本（sitemap、死链检查、部署、analytics/ 看板抓取与渲染、check_analytics.mjs 埋点门禁）；草稿相关脚本在 content/knowledge/scripts/
.vitepress/analytics_snippets.ts  统计埋点的 head 片段（Umami / 百度统计，两项留空则不注入）
.vitepress/theme/  外壳与组件：Layout.vue、index.ts（页面注册 + 样式入口）、components/、styles/（CSS 区块）、assets/guide/（教程截图）
public/            robots.txt、_headers、_redirects、llms.txt、favicon、og 图目录
```

## 知识库（Claude 知识库 /knowledge）

- 正文在 `docs/knowledge/<slug>.md`（原生 markdown），元数据在 `config/knowledge.ts`。
- 四个分类按用户旅程：start 上手与进阶 / how 原理与机制 / cost 成本与计费 / troubleshoot 报错排查；配置与接入归「使用教程」，两者不重复。页面不展示发布时间，date 只进 JSON-LD 与站内排序。
- 列表页沿用「md 路由壳 + PageShell + 页面组件」（分类胶囊条 + 精选 + 分类小节）；文章页写 `layout: page` + frontmatter `knowledge: true`，由 `theme/components/KnowledgeDoc.vue` 在单列阅读容器里渲染正文、右侧目录与页尾，H1 来自 markdown 自己的 `# 标题`。
- 页内目录复用 `components/SectionNav.vue`，目录项在客户端挂载后从正文的 `h2[id]` 读取（SSR 为空，`npm run check:toc` 在浏览器里核对），不是 `sections.ts` 的 `SECTION_NAV`；JSON-LD 为 Article + FAQPage（FAQ 来自 `config/knowledge.ts` 的 `faq[]`）。文章正文用官方 `<Content />` 渲染，页面组件目录的 `vitepress` 别名依赖 `config.mts` 的 `themePackages`。
- 加文章流程与写作规范见 `docs/knowledge_writing_guide.md`；配套脚本 `scripts/gen_knowledge_og.py`、`scripts/gen_knowledge_routes.mjs`、`scripts/gen_sources.py`、`scripts/copy_dir_overviews.mjs`。
- 素材在 `archive/knowledge_source_20261009/`（由 `scripts/gen_sources.py` 从 `config/knowledge_sources.ts` 逐字复制源站抓取正文，仅作选题与事实核对）；PAGES 从 `config/knowledge.ts` 动态读取。

## 命令

```bash
npm ci
# 本地开发要开两个终端（常驻）：
#   1) npm run dev:site   -> vitepress dev 热更新，站点页面在 41800
#      （Git Bash 下 `vitepress` 这个 bin 解析失败时，用 PowerShell 跑：npx vitepress dev --port 41800）
#   2) npm run dev        -> public/ 同步 + 静态服务 4198（favicon / robots / llms.txt）
#      VitePress 1.6 的 dev 服务器不提供 site/public 下的文件（publicDir 按 srcDir 解析成 docs/public），
#      浏览器会把 /favicon.svg 当路由请求、拿到页面 HTML。生产构建由 build 末尾的 copy_public.mjs
#      把 public/ 复制进 dist，线上无此问题，所以只在 dev 需要 4198。
# 访问地址（笔记本同 Wi-Fi 或 Tailscale）——日常开发看 41800：
#   dev 热更新  http://<本机局域网 IP>:41800   http://<本机 Tailscale IP>:41800   http://<本机 MagicDNS 主机名>:41800
#   产物预览    同上把 41800 换成 41777（需先 npm run build）
# 页面左下角有角标：DEV · 启动时刻 = 热更新服务；BUILD · 产物时刻 = 静态产物。
# 看不到角标就是看错服务了，见 CLAUDE.md「日常开发流程」。
#   静态文件单独看： http://<本机局域网 IP>:4198/favicon.svg
#   域名形式访问需要在 .vitepress/config.mts 的 server.allowedHosts 里列出（已放行 *.ts.net）；
#   IP 形式（<本机局域网 IP> / <本机 Tailscale IP>）Vite 默认放行。少了它会看到 "This host is not allowed" 白屏。
#
# 本地固定端口（都开了 strictPort，占用就直接报错，不会自动漂移）：
#   41800  dev 站点页面（热更新）        npm run dev:site
#   41777  构建产物预览（静态）          npm run build && npm run serve:dist
#   41802  草稿工作台（只读草稿与文章）    npm run draft:preview
#   4198   public/ 静态文件（仅 dev）    npm run dev
# dev 与 preview 必须分端口：曾共用 41777，导致浏览器标签还挂在旧进程上时「改了看不到最新」。41802 是草稿预览的独立 dev server。
# 改端口要同步三处：package.json 的 dev:site、config.mts 的 server.port、serve_dist.mjs 的 PORT。
# 41800/41777 都是本项目专用段，不会和其他项目的 Vite 默认端口（5173 等）或历史端口撞上。
# 预览走 scripts/serve_dist.mjs 而不是 vitepress preview：本项目的 404 路由壳由 docs/404.md
# 渲出，构建后没有物理 404.html，VitePress 自带的 preview 会直接报错退出。
# 注意：temp/ 下的历史调试脚本可能还写死 4173/5199/4199，跑它们要一并改端口。
npm run build        # vitepress build + 自动生成 sitemap.xml
npm run check:links  # dist 死链检查，有死链则退出码 1
npx vue-tsc --noEmit # 类型检查（现状：24 条，全部来自 node_modules 里的 .vue 导入；本站源码 0 条）
npx tsx scripts/check_kefu.ts   # 助手关键词匹配自测（11 条用例）
npm run verify       # 把 dist 抽到临时目录起服务，跑逐页验收断言（SEO / 购买按钮 / 组件数量 / 助手语料 / OG 图）
npm run check:dist   # 只跑构建产物结构门禁（SSR 是否完整：外壳、H1、页内目录锚点、无未渲染模板）
npm run gen:jsonld   # 单独重跑 JSON-LD 注入（改了 FAQ / 教程 / 模型表 / 知识库元数据后用）
```

`npm run verify` 覆盖：路由可达、每页外壳与唯一 h1 / title / description / canonical、购买按钮数量与 `rel` 与 `data-cta`、
首页组件渲染数量、FAQ 条数与分类锚点、助手语料是否进 bundle、商品 URL 是否只在数据层出现（组件无硬编码）、OG 图存在。
`npm run build` 的顺序是 check:kefu → vitepress build → gen:sitemap → copy_dir_overviews → **gen:jsonld** → copy_public → check:dist。
**gen:jsonld 必须排在 copy_dir_overviews 之后**：它按路由名匹配文件，目录总览页要先复制成 `guide.html` / `knowledge.html` 才扫得到。

### JSON-LD 为什么是构建后注入的

页面组件里的 `<JsonLd>` 走客户端注册表，只在 `Layout.vue` 的 `onMounted` 后插进 head。爬虫不执行 JS，看到的就是零结构化数据，
FAQ 富摘要、商品卡、TechArticle 全拿不到。所以 `scripts/gen_jsonld.ts` 在构建完直接往 dist 的 HTML 里插 `<script type="application/ld+json">`
（落在 `</body>` 之前的 body raw text 里），数据来自 `.vitepress/theme/pages/jsonld_server.ts`。

两条路都实测失败过，别再试：
- `transformHead` 里 push `['script', { innerHTML }]`、`children`、`textContent`，三者都会被 VitePress 当普通属性转义输出，标签体是空的；
- `transformPageData` 往 `pageData.content` 追加 `<script>`，markdown 把整段当 HTML 交给 Vue 编译器，报 `Invalid end tag`；
- 挂 Vite 插件的 `closeBundle` 不会执行，VitePress 的 build 不走标准 Vite 构建流程。

客户端那套保留做降级，但两者的分工要注意：首帧时保留 body 那份（爬虫读的就是它），SPA 换页后由 `Layout.vue` 清掉旧的、补上新的。
判断逻辑在 `renderJsonLd`（注册表为空就什么都不做）与 `keepOnlyCurrentPage`（只清 `id^="cu-jsonld-"` 的客户端标签）。
**改了 FAQ、教程步骤、模型表或知识库元数据后，两处数据源都要同步**（`config/` 为唯一真源，两边都从它生成）。

`check:dist.mjs`（build 末尾自动跑）是另一道门禁：VitePress 的 SSR 会把子组件异常吞成注释占位且日志没有堆栈，
所以产物里逐页断言「外壳节点齐全 / 外壳内 H1 唯一 / 页内目录锚点全部命中正文 h2 / 没有未渲染的 `<template>` /
没有 `<pre><code>` 降级 / FAQ·步骤·卡片数量正确」，任何一条不满足就让构建以非 0 退出。

页面正文在 `.vitepress/theme/*.vue`（`index.vue` / `pricing.vue` / `faq.vue` + `components/Page{Models,Console}.vue`），
`docs/*.md` 只是带 frontmatter 的路由壳（`layout: index|pricing|unlimited|faq` + OG 文案）；
VPContent 按 frontmatter.layout 解析主题里同名的全局组件。**不要把正文写回 markdown**：VitePress 1.6 会把
markdown 编译成 `<template><div>…</div></template>` 并用 inline 渲染模式输出，页面里的 `<template>` 标签会被
当普通元素原样写进 SSR HTML，markdown-it 对 `<script>` 块的切分又会随空行变化把正文降级成字面量 `<pre><code>`。
迁移前的 markdown 原文在 `archive/docs_before_20261008/`，仅供对照。

## 上线现状（2026-10-09）

| 项 | 值 |
|---|---|
| Pages 项目 | `claude-unlimited-site`（直接上传，生产分支 `master`，项目 ID `3b3e80aa-3a64-4d73-bdec-64ce9314ca83`） |
| 正式域名 | https://claude-unlimited.aiautotools.com（自有域名 `aiautotools.com` 的子域；注册商阿里云，DNS 与 Pages 托管在 Cloudflare） |
| 备用地址 | https://claude-unlimited-site.pages.dev（Pages 默认域，仍可访问，不做 SEO） |
| 部署凭据 | 本机环境变量 `CLOUDFLARE_API_TOKEN`（与参考项目 Product 共用同一个 token；不要写进仓库） |
| 源码仓库 | https://github.com/autotoolai/claude-unlimited（公开仓库，MIT 许可，`master` 分支；Pages 本身不依赖它，只作备份与协作）。**本机到 `github.com:443` 需走代理（`HTTP(S)_PROXY=http://127.0.0.1:7897`），直连会超时** |
| 部署前门禁 | `npm run build` 内含 `check_dist.mjs`（SSR 结构断言）+ `verify`（逐页验收断言） |
| 类型检查 | `npm run typecheck`（即 `vue-tsc --noEmit`）现状 24 条，**全部来自 node_modules 里的 `.vue` 导入**（VitePress 自带组件缺类型声明），本站源码 0 条 |

因为是直接上传模式，Cloudflare 后台的「构建命令 / 输出目录 / Node 版本」对线上站点不生效，那些只在切到 Git 集成时才需要填。

## 流量统计与看板

三个免费通道，各答一个问题，**口径不同、绝不合并**：

| 通道 | 回答什么 | 怎么接 | 在哪看 |
|---|---|---|---|
| Cloudflare Web Analytics | 站点级请求量、爬虫活动、加载性能 | 控制台一键开关，零代码 | Cloudflare 控制台 → Analytics |
| Umami Cloud（Hobby 免费：10 万事件/月、1 站、留 6 个月） | 真人访问 + **CTA 点击事件**（唯一有自定义事件的通道） | `.vitepress/analytics_snippets.ts` 注入脚本 + 事件桥 | Umami 后台，或本地看板 |
| 百度统计（免费版） | 国内口径的 PV/UV/来源/搜索词参照 | 同上文件注入 `hm.baidu.com` | 只在 tongji.baidu.com 后台 |

**百度统计不进本地看板**：它没有公开数据 API（官网文档无 API 条目，`/api/` 返回 403），无法程序化拉取，所以只能在它自己后台看。

### 埋点是怎么工作的

全站所有转化点（导航购买按钮、套餐卡、客服浮标、复制按钮）都带 `data-cta` 属性，`theme/analytics.ts` 在 `Layout.vue` 挂载时装**一个全局点击委托**（捕获阶段），把 `data-cta` 的值作为事件名，同时送进 Umami（`umami.track`）与百度（`_hmt.push(['trackEvent','cta',…])`）。以后新增按钮只要带 `data-cta` 就自动进统计，不必改组件。事件名清单见 `npm run check:analytics` 输出；非点击类事件可手工调 `window.__cuTrack?.('name', {…})`。

两处必守的约束：
- **埋点脚本放 `head`（`analytics_snippets.ts`）而不是组件里**。VitePress 走 SSR，head 里的脚本服务端就渲染进 HTML 首个响应；写进组件要等 hydration 才注入，会漏掉快速跳走的访问。
- **id 类配置必须内联兜底**（同 `BAIDU_VERIFY_CODE`）：SSR 子进程读不到 shell 导出的 `process.env`，只用环境变量会出现「meta/脚本偶尔凭空消失」。

### 开通步骤

1. **Umami（网站已添加，id 已内联；只差 API key）**：注册 [cloud.umami.is](https://cloud.umami.is) → 添加网站（填 `https://claude-unlimited.aiautotools.com`）→ website id `35bc9e45-604c-4641-920e-8cfa48020045` 已写进 `analytics_snippets.ts`；**还差**：头像 → Settings → API keys 建一个 key（只显示一次），填进仓库根 `config/local/analytics_secrets.env` 的 `UMAMI_API_KEY`（文件已建好，模板 `config/analytics_secrets.example.env`）。没这个 key 看板拉不到 Umami 数据，脚本会跳过并提示。
2. **百度统计（已配置）**：站点 id `3ae4fc576a3cfa978bf7592615735bab` 已写进 `analytics_snippets.ts`，按官方代码注入 `hm.js`（不是旧版 `s.js`）。无需再动，重新部署即生效。
3. **Cloudflare Web Analytics：已完成，不需要任何操作。** 站点经 Cloudflare 代理（橙云），该通道**默认就是开启的**，Cloudflare 自动把 `static.cloudflareinsights.com/beacon.min.js` 注进每个页面（已核对线上 `/`、`/pricing`、`/guide`、`/models`、`/knowledge/*`、`/faq` 全部带 beacon）。控制台 Workers & Pages → `claude-unlimited-site` → Metrics → Web Analytics 可看数据，也可 Manage Site 改成手动注入。
4. 构建门禁 `npm run check:analytics`（`build` 末尾自动跑）会断言：**以产物事实为准**——Umami 脚本与 `data-website-id` 必须同时在或同时不在、百度 `hm.js?id` 出现就必须完整、事件桥在 head、`data-cta` 关键埋点齐全、购买链接仍是 `catfk.com`。channel id 已内联进 `analytics_snippets.ts`（2026-10-13 填入 Umami `35bc9e45…` 与百度 `3ae4fc57…`），换站只需改这一处。

### 本地看板

```bash
npm run analytics        # sync:analytics 抓数 + gen:dashboard 渲染，同时打印一行终端摘要
# 产物：scripts/analytics/dashboard.html（自包含单文件，双击即开，不入库）
npm run sync:analytics   # 只抓数 → scripts/analytics/data/{umami,cloudflare}_<date>.json
npm run gen:dashboard    # 只渲染
```

- 密钥读 `config/local/analytics_secrets.env`（环境变量优先），Cloudflare token 需要 Zone → Analytics:Read 权限。
- 看板默认最近 30 天 + 环比上期 30 天；**上期无数据（新站）时显示「无上期数据」而不是 0%**。
- Umami 的 website id 不写在密钥文件里：`fetch_data.py` 直接从 `analytics_snippets.ts` 的内联兜底值读（两处各填一次会悄悄对不上）。
- 图表：概览 stat tile + 趋势折线（单一 Y 轴，绝不双轴）+ 横条排名 + 构成堆叠条；每张图都有 `<details>` 表格视图、悬停读数、键盘可达；深浅两套颜色是对照底色各自校验过的，不是自动反相。
- Cloudflare 侧用 GraphQL（`viewer.zones` → `httpRequests1dGroups`，按父 zone `aiautotools.com` 统计，含爬虫与静态资源）；Umami 侧用 REST `/api/websites/{id}/stats|charts|metrics|events`（Bearer API key，Cloud 免费档唯一认证方式）。
- 数据落 `scripts/analytics/data/`（gitignore），每个源缺 key 就跳过并在 stderr 说明，看板照出并显示缺口卡片。

## 部署


```powershell
# 需要本机已设置 CLOUDFLARE_API_TOKEN；脚本会先 npm run build（失败即中止），再 wrangler 推到生产分支
cd site
pwsh -File scripts/deploy_claude_unlimited_site.ps1 -SkipNotify

# 只发到预览地址（不更新 pages.dev）
pwsh -File scripts/deploy_claude_unlimited_site.ps1 -Branch preview -SkipNotify
```

脚本已重写为只依赖 `site/` 自身（不再硬编码仓库根路径），并对 PowerShell 5.1 做了兼容：**注释里只能出现 ASCII**（中文注释在无 BOM 的 .ps1 里会被 5.1 按系统 ANSI 代码页读成乱码，可能触发 ParserError），`Write-Host` 里拼变量要用 `${Branch}` 而不是 `$Branch:`。

## 上线前必须确认

已随首版上线、现在只剩「待用户决定」或「待内容核对」的项：

1. **卡密兑换与 API Key 的网址**（已就位）：`config/site.ts` 的 `partners` 里 `id: 'activation'` 与 `'console'` 都是管理后台地址，教程的「打开管理后台」「一键导入」「Base URL」按钮都从 `partnerUrl('console')` 取，改地址只改 `site.ts`。`purchase`（`catfk.com`）与 `ccswitch`（`ccswitch.io`）已填。
2. **微信二维码图片**：已就位 —— 图片在 `site/public/wechat-qr.jpg`，`config/site.ts` 的 `contact.wechatQr = '/wechat-qr.jpg'`，微信号改成 `ren_mo_mo`。换图只改 `public/` 里的文件后重新构建即可；`wechatQr` 留空时助手的人工卡会自动降级为「只显示微信号 + 复制」。
3. **法务确认**：退款规则、限速数字（单 Key 并发 20、60 次/分钟、300k token/分钟）、商品描述措辞（`config/faq.ts` 与 `config/site.ts` 的 `description`）；`legal.icp` / `legal.company` 填 ICP 备案号与运营主体，填了才会出现在页脚。
4. **教程内容核对**：`config/guide.ts` 的单页三步（购买激活码 → 密钥配置 → 开始使用）与 `config/faq.ts` 的「使用与配置」分类是按卖家教程站 `https://wx.bbyy.site/` 的内容与 Claude Code 官方文档重写的，截图已裁掉品牌栏与二维码。买家到底是走自己的兑换页还是卖家站，措辞要按实际情况调一遍。
5. **SEO 提交**：`scripts/seo_notify.ps1` 已内置（部署脚本不带 `-SkipNotify` 时自动跑）。走 IndexNow + Bing Webmaster API + GSC；百度 token 未配时自动跳过。
   密钥模板在仓库根 `config/seo_secrets.example.env`，真值放 `config/local/seo_secrets.env`（已 gitignore），GSC 服务账号 JSON 在 `config/local/website_gsc_service_account.json`。
   **Bing Webmaster 后台还需把 `claude-unlimited.aiautotools.com` 单独加成站点条目**（API key 是账号级的，条目和所有权验证要自己做）。
   **百度必须先在 ziyuan.baidu.com 为这个子域单独加站并验证**（百度按域名签发 code，没有泛域机制），验证后把 token 填进 `BAIDU_TOKEN`。

   GSC 走 Google API，本机直连不通：密钥文件里的 `HTTPS_PROXY` 默认注释着，开 Clash Verge 后按实际端口打开；本机没代理时这两个端点会失败，IndexNow 与 Bing 不受影响。

   IndexNow 密钥 `public/7c2f4a91e8b34d6fa05c73be19d8426e.txt` 随产物发布，内容就是 key 本身（协议要求），key 文件按站独立，不要复用别的站。

   百度 / Google 的 HTML 标签验证写在 `config.mts` 的 head 里。**不要只靠环境变量**：vitepress 的 SSR 渲染跑在子进程，`process.env` 拿不到 bash 里 `set -a` 导出的值，只用环境变量会出现「meta 偶尔凭空消失」。当前值内联在 `config.mts`（`BAIDU_VERIFY_CODE` 环境变量仍可覆盖）。
   百度签发的 code 存成 `public/baidu_verify_codeva-<code>`（**无后缀**），文件方法与 meta 方法双管齐下。
   为什么要无后缀：Cloudflare Pages 会对 `/*.html` 请求一律 308 到无后缀路径，而百度验证机器人不跟随重定向，会报「未知原因: 308」。`_redirects` 里配了 `/xxx.html /xxx 200`，即使百度按 ziyuan 后台给出的 `.html` 地址去请求也直接 200。

已经处理掉的（首版上线时改的）：

- OG 图：`public/og/{home,pricing,unlimited,faq}.png` 已由 `npm run gen:og` 生成（1200×630）。教程页暂不出图（`transformHead` 会指向不存在的 `/og/guide*.png`，分享那几页时卡片空白，可接受）。
- `config.mts` 里没有 Analytics 埋点占位，`REPLACE_WITH_CF_ANALYTICS_TOKEN` 那条已过期。统计埋点现在是 `.vitepress/analytics_snippets.ts`（见下面「流量统计与看板」）。
- 域名：`config/site.ts` 的 `url` 现为 `https://claude-unlimited.aiautotools.com`，canonical / sitemap / robots / OG / llms.txt 全部跟随。**换域名时只改这一处**，然后重新部署。绑定流程：Pages 项目加 domain（POST `/pages/projects/<name>/domains`）→ 在 zone 里建同名 CNAME 指向 `<project>.pages.dev` 并开橙云代理（与参考项目 Product 的 `alibabadesignkit.aiautotools.com` 同款；Pages 加域时不会自动建 DNS）→ 等 Pages 签证书并把 status 推到 `active`。`docs/404.md` 里另有一处 canonical 要同步改。

## 本地 → 上线流程（改内容后照做）

1. 改 `site/config/*.ts`（商品、联系方式、合作平台地址、FAQ、教程）或 `site/.vitepress/theme/*.vue`（版式）。
2. `cd site && npm run build`：`check_dist.mjs` 结构门禁不过就不要继续；再 `npm run verify` 跑逐页验收断言（SEO / 组件 / 链接）。
3. `pwsh -File scripts/deploy_claude_unlimited_site.ps1 -SkipNotify`（需要 `CLOUDFLARE_API_TOKEN`）。
4. 线上核对：`curl -sI https://claude-unlimited.aiautotools.com/guide | grep -i location` 看是否 308 到无后缀；首页看 `grep -o 'data-cta="[a-z_]*"'`；404 看 title / robots noindex。
5. 提交并推送源码仓库（`git push`；本机到 `github.com:443` 需走代理，失败时换 SSH 传输，`gh api repos/autotoolai/claude-unlimited/commits/master` 可查远端状态）。

## 已知问题

- 兑换页地址为空（见上面第 1 条），这是当前唯一影响用户走通流程的缺口。
- `check_dist.mjs` 里「产物里不能有 Vue SSR 片段标记」那条断言已移除（它与 `copy_public.mjs` 的要求直接矛盾，会让 build 恒 exit 1）。当前 `npm run check:dist` 通过。**不要把 SSR 标记删掉**，见 `docs/troubleshooting_guide.md`。
- `analytics_snippets.ts` 有 2 条 TS2322 类型错（`async` / `defer` 布尔值传给期望 string 的 head 属性），不影响构建产物但会让 `npm run typecheck` 报红。
- 文档里凡写「N 项 / N 条」的数字，都是手写快照，脚本一改就漂。以命令实际输出为准。
- 404 页（`docs/404.md`）：VitePress 1.6 不对它跑 `transformHead`，SEO 标签用 frontmatter `head`（`<title>` / `robots noindex`）加正文裸 `<link rel="canonical">` 补齐；`NotFoundPage` 组件在客户端挂载，SSR HTML 里没有「返回首页」链接（普通浏览器无影响，纯 HTML 抓取器看不到）。
- `.wrangler/` 是 wrangler 在**仓库根**写的本地缓存（只存 account_id），已加进根 `.gitignore`；参考项目 Product 里也有同名目录并同样忽略。
- 生产构建的 dist 每页仍有一条 `Hydration completed but contains mismatches` 控制台警告（dev 下没有），原因与现状见 `temp/hydration_mismatch.md`，不影响功能。

