# Claude 无限卡官网

Claude 无限卡的展示型官网：介绍商品与接入方式，把购买导流到第三方发卡站。不接数据库、零后端。

## 技术栈

| 项 | 选型 |
|---|---|
| 框架 | VitePress 1.6.4（Vue 3 + Vite 5，纯静态 SSG） |
| 样式 | 原生 CSS + CSS 变量：`.vitepress/theme/styles/*.css`（按区块拆分的全站样式，浅色/深色两套 token）+ `.vitepress/theme/shell_extra.css`（页脚 / 教程步骤块），全部在 `theme/index.ts` 顶层 import，构建期抽成独立 CSS 进 `<head>` |
| 组件 | 自研 Vue 组件（PageShell 外壳 + Hero/卡片/步骤/套餐卡/对比表/FAQ/助手等），无图标库、无动画库、无 Tailwind |
| 页面 | 七个 `.vue` 页面组件（`.vitepress/theme/index.vue`、`guide_index.vue` 等），`docs/` 下的 `.md` 只作路由壳；组件必须在 `theme/index.ts` 的 `themePages` 里注册，否则 `frontmatter.layout` 解析不到 |
| 部署 | Cloudflare Pages **直接上传模式**（本机构建后 `wrangler pages deploy` 推 dist，不绑 Git；托管方式抽象在 `scripts/deploy_claude_unlimited_site.ps1`，可切 Workers Static Assets） |
| 图床 | 二期接 Cloudflare R2；`imgCdn` 留空时回落打包资源 |

## 内容结构重构（2026-10-10 第三轮）

按「每个页面只回答一个问题、每段内容只存在于一个页面」重排了全站内容，完整方案与页面职责见
[`docs/content_structure.md`](docs/content_structure.md)。要点：

- **首页从 9 块降到 5 块**：首屏 → 为什么值得 → 多少钱（换成真实档位卡）→ 四步怎么走 → 买之前可以先确认 → 继续了解。
  删掉「三种套餐怎么选」「合作平台」「教程入口」「模型徽标墙」「知识库精选」「内嵌 FAQ」六个纯导航或重复块。
- **`/unlimited` 并入 `/pricing` 并 301**：「与按量计费的差别」「支持哪些能力」迁进定价页（原页的模型层级表、配置三步不迁，
  归模型广场与教程）；`public/_redirects` 保留 `/unlimited /pricing 301`。
- **模型广场从 6 块降到 4 块**：删掉「三种套餐怎么选」与「怎么拿到完整列表」（CC Switch 操作已由教程 2.2 与知识库覆盖）。
- **主导航从 6 项降到 4 项**（模型广场 / 套餐定价 / 使用教程 / 知识库）；管理后台移出主导航，页头「进入后台」按钮与页脚「服务」列保留入口。
- **限流数字单点化**：新增 `config/rules.ts`，`pricing.vue` 的限流表与「不包含什么」、`faq.ts` 的限速答案、首页卖点文案
  全部从它派生。此前这些数字在 4 处各写一份，是全站最容易漂移的地方。
- **定价页 JSON-LD** 变为 Product + FAQPage 两项（原 `/unlimited` 的 FAQ 并入）。

## 用户体验改动记录（2026-10-09 第二轮）

面向真实用户视角（桌面 1440 / 平板 768 / 手机 390 三档视口走查）做的结构性调整：

- **购买入口收敛**：页头原来的第二个「立即购买」删掉，导航条右侧改用 `ExternalCta`（带价格、`data-cta="nav"`）；
  首页按钮换文案（「看套餐 ¥298」→「立即购买」）避免同页两个同义按钮。购买 URL 仍是 `products[].shopUrl` 一个来源，
  FAQ 里的下单链接改成 `partnerUrl('purchase')`。
- **FAQ 分层**：`FaqList` 新增 `defaultOpen`（默认 0，收起）与「展开全部 / 收起全部」按钮（ref 控制，不用 `:has()`）；
  `/faq` 顶部新增「买之前，先看这五个问题」常开区块，其余按分类折叠；分类顺序改为购买 → 商品 → 限速 → 配置 → 接入 → 安全 → 我们
  （`pages/data.ts` 的 `faqGroupOrder`）。`summary` 加 `role="button"` + `aria-expanded`。
- **首页重排（已被 2026-10-10 第三轮替代，见下）**：小节改为 为什么 → 开始之前 → 从买到用起来（四步）→ 套餐 → 对比 → 平台 → 教程 → FAQ。
- **信任与文案**：页头加「第三方 API 网关 · 与 Anthropic 无隶属关系」；工程口吻（「在 config/site.ts 里改」）从正文移除；
  「5 分钟内跑起」等承诺改为「分钟级」，周期天数 `days` / 承诺 `promise` 统一从 `products[]` 派生。
- **可读性**：正文限宽 44rem；900px 以下卖点卡两列；620px 以下品牌页头只留 logo；
- **深色模式**：CSS 加 `@media (prefers-color-scheme: dark)`，跟随系统（此前只在 JS 挂载后生效）。
- **分享卡片**：教程四页各出一张 OG 图（`scripts/gen_og.py` 补 4 页），FAQ 页角标改成 33 条。
- **客服**：2026-10-09 起全站只剩「在线助手」一个浮标，人工客服并入助手面板：点「联系人工客服」由助手发一张卡（二维码图 + 微信号 `ren_mo_mo` + 一键复制）。面板改成单一对话流（用户问句右 / 助手答案左），开场带 7 个分类 chip 与 6 条高频快捷问题，答不上来时给分类引导而不是一句「换个说法再问」。交互沿用 shadcn/ui Bubble + Intercom 挂件的惯例，视觉仍只用本站 token。复制按钮三级兜底：异步剪贴板 → `execCommand` → 选中文本提示手动复制。

未决：`config/site.ts` 里 `partners.activation.url`（卡密兑换页）仍为空，三处显示「兑换入口即将开放」。

## 目录

```
config/rules.ts    限流数字 / 套餐边界 / 退款窗口的唯一数据源（页面表格、FAQ 答案、首页卖点都从这里派生）
config/site.ts     站点元信息 + 商品（价格 / 周期天数 days / 承诺 promise）+ 合作平台地址（purchase / activation / ccswitch）+ 客服联系方式（全站唯一数据源）
config/faq.ts      FAQ 唯一数据源（页面 + 助手 + JSON-LD 共用；7 个分类，使用与配置分类来自卖家教程站）
config/models.ts   模型层级与 model ID 表（/models、教程页、FAQ 共用）
config/guide.ts    使用教程四页的内容数据（唯一编辑入口；改教程只改这里）
docs/              内容根（srcDir=docs）：首页 / pricing / faq / guide（1 页）/ console / models / knowledge + guide/assets 截图
scripts/           构建脚本（sitemap、死链检查、部署）
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
#
# 本地固定端口（都开了 strictPort，占用就直接报错，不会自动漂移）：
#   5199  dev 站点页面      npm run dev:site
#   4198  public/ 静态文件  npm run dev
#   4199  构建产物预览      npm run build && npm run preview
# 注意：temp/ 下的历史调试脚本写死 4173，改成 4199 后跑它们要一并改端口。
npm run build        # vitepress build + 自动生成 sitemap.xml
npm run check:links  # dist 死链检查，有死链则退出码 1
npx tsc --noEmit     # 类型检查（现状：站点源码 0 条，44 条全部来自 node_modules/vitepress 内部的 .vue）
npx tsx scripts/check_kefu.ts   # 助手关键词匹配自测（11 条用例）
npm run verify       # 把 dist 抽到临时目录起服务，跑 60+ 项验收（SEO / 购买按钮 / 组件数量 / 助手语料 / OG 图）
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
| 源码备份 | https://github.com/futianren/claude-unlimited-site（公开仓库，`master` 分支；Pages 本身不依赖它，只作备份与协作）。**首次上线期间 `github.com:443` 从本机间歇性连不上（`api.github.com` 正常），若 `git push` 报连接失败，重试即可，Pages 不受影响** |
| 部署前门禁 | `npm run build` 内含 `check_dist.mjs`（SSR 结构断言）+ `verify`（60+ 项 SEO / 组件 / 链接验收） |
| 类型检查 | `npm run typecheck` 会报 24 条 TS7016，**全部来自 `node_modules/vitepress` 内部的 `.vue` 文件**，站点源码 0 条；VitePress 1.6.4 自身不带 `.js` 模块声明，`skipLibCheck` 管不到 `.vue`，所以只能过滤：`grep -v "node_modules/vitepress" temp/typecheck.log` 应为空 |

因为是直接上传模式，Cloudflare 后台的「构建命令 / 输出目录 / Node 版本」对线上站点不生效，那些只在切到 Git 集成时才需要填。

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
   `check:dist` 目前恒不通过（它断言产物里不能有 Vue SSR 片段标记，而 VitePress 正常渲染就会写这些标记），这是既有问题；部署要跳过门禁直接用 `wrangler pages deploy`，或临时给部署脚本加跳过参数。

   IndexNow 密钥 `public/7c2f4a91e8b34d6fa05c73be19d8426e.txt` 随产物发布，内容就是 key 本身（协议要求），key 文件按站独立，不要复用别的站。

   百度 / Google 的 HTML 标签验证写在 `config.mts` 的 head 里。**不要只靠环境变量**：vitepress 的 SSR 渲染跑在子进程，`process.env` 拿不到 bash 里 `set -a` 导出的值，只用环境变量会出现「meta 偶尔凭空消失」。当前值内联在 `config.mts`（`BAIDU_VERIFY_CODE` 环境变量仍可覆盖）。
   百度签发的 code 存成 `public/baidu_verify_codeva-<code>`（**无后缀**），文件方法与 meta 方法双管齐下。
   为什么要无后缀：Cloudflare Pages 会对 `/*.html` 请求一律 308 到无后缀路径，而百度验证机器人不跟随重定向，会报「未知原因: 308」。`_redirects` 里配了 `/xxx.html /xxx 200`，即使百度按 ziyuan 后台给出的 `.html` 地址去请求也直接 200。

已经处理掉的（首版上线时改的）：

- OG 图：`public/og/{home,pricing,unlimited,faq}.png` 已由 `npm run gen:og` 生成（1200×630）。教程页暂不出图（`transformHead` 会指向不存在的 `/og/guide*.png`，分享那几页时卡片空白，可接受）。
- `config.mts` 里没有 Analytics 埋点占位，`REPLACE_WITH_CF_ANALYTICS_TOKEN` 那条已过期。
- 域名：`config/site.ts` 的 `url` 现为 `https://claude-unlimited.aiautotools.com`，canonical / sitemap / robots / OG / llms.txt 全部跟随。**换域名时只改这一处**，然后重新部署。绑定流程：Pages 项目加 domain（POST `/pages/projects/<name>/domains`）→ 在 zone 里建同名 CNAME 指向 `<project>.pages.dev` 并开橙云代理（与参考项目 Product 的 `alibabadesignkit.aiautotools.com` 同款；Pages 加域时不会自动建 DNS）→ 等 Pages 签证书并把 status 推到 `active`。`docs/404.md` 里另有一处 canonical 要同步改。

## 本地 → 上线流程（改内容后照做）

1. 改 `site/config/*.ts`（商品、联系方式、合作平台地址、FAQ、教程）或 `site/.vitepress/theme/*.vue`（版式）。
2. `cd site && npm run build`：`check_dist.mjs` 结构门禁不过就不要继续；再 `npm run verify` 跑 60+ 项 SEO / 组件 / 链接验收。
3. `pwsh -File scripts/deploy_claude_unlimited_site.ps1 -SkipNotify`（需要 `CLOUDFLARE_API_TOKEN`）。
4. 线上核对：`curl -sI https://claude-unlimited.aiautotools.com/guide | grep -i location` 看是否 308 到无后缀；首页看 `grep -o 'data-cta="[a-z_]*"'`；404 看 title / robots noindex。
5. 提交并推送备份仓库（`git push`；本机到 `github.com:443` 曾出现间歇性连不上，失败时重试或改用 SSH 传输，`gh api repos/futianren/claude-unlimited-site/commits/master` 可查远端状态）。

## 已知问题

- 兑换页地址为空（见上面第 1 条），这是当前唯一影响用户走通流程的缺口。
- 404 页（`docs/404.md`）：VitePress 1.6 不对它跑 `transformHead`，SEO 标签用 frontmatter `head`（`<title>` / `robots noindex`）加正文裸 `<link rel="canonical">` 补齐；`NotFoundPage` 组件在客户端挂载，SSR HTML 里没有「返回首页」链接（普通浏览器无影响，纯 HTML 抓取器看不到）。
- `.wrangler/` 是 wrangler 在**仓库根**写的本地缓存（只存 account_id），已加进根 `.gitignore`；参考项目 Product 里也有同名目录并同样忽略。
- 生产构建的 dist 每页仍有一条 `Hydration completed but contains mismatches` 控制台警告（dev 下没有），原因与现状见 `temp/hydration_mismatch.md`，不影响功能。

