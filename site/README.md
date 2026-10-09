# Claude 无限卡官网

Claude 无限卡的展示型官网：介绍商品与接入方式，把购买导流到第三方发卡站。站点不处理支付、不接数据库、零后端。

## 技术栈

| 项 | 选型 |
|---|---|
| 框架 | VitePress 1.6.4（Vue 3 + Vite 5，纯静态 SSG） |
| 样式 | 原生 CSS + CSS 变量：`.vitepress/theme/styles/*.css`（按区块拆分的全站样式，浅色/深色两套 token）+ `.vitepress/theme/shell_extra.css`（页脚 / 教程步骤块 / 人工客服浮标），全部在 `theme/index.ts` 顶层 import，构建期抽成独立 CSS 进 `<head>` |
| 组件 | 自研 Vue 组件（PageShell 外壳 + Hero/卡片/步骤/套餐卡/对比表/FAQ/助手等），无图标库、无动画库、无 Tailwind |
| 页面 | 八个 `.vue` 页面组件（`.vitepress/theme/index.vue`、`guide_index.vue` 等），`docs/` 下的 `.md` 只作路由壳；组件必须在 `theme/index.ts` 的 `themePages` 里注册，否则 `frontmatter.layout` 解析不到 |
| 部署 | Cloudflare Pages **直接上传模式**（本机构建后 `wrangler pages deploy` 推 dist，不绑 Git；托管方式抽象在 `scripts/deploy_claude_unlimited_site.ps1`，可切 Workers Static Assets） |
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

## 上线现状（2026-10-09）

| 项 | 值 |
|---|---|
| Pages 项目 | `claude-unlimited-site`（直接上传，生产分支 `master`，项目 ID `3b3e80aa-3a64-4d73-bdec-64ce9314ca83`） |
| 线上地址 | https://claude-unlimited-site.pages.dev |
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

1. **卡密兑换与 API Key 的网址**（最影响转化）：`config/site.ts` 的 `partners` 里 `id: 'activation'` 的 `url` 现在是空字符串。首页「合作平台」卡片会降级成一句「入口待补充」（组件已做空值处理，不会出现空链接），但教程第 1 步、第 3 步的「一键导入」没有入口，用户只能自己找到兑换页。补上 URL 即可，无需改代码，然后重新部署。`purchase`（`catfk.com`）与 `ccswitch`（`ccswitch.io`）已填。
2. **微信二维码图片**：把图片放到 `site/docs/assets/` 或 `site/public/`，文件名填进 `config/site.ts` 的 `contact.wechatQr`。现在留空，人工客服面板显示占位框，但「复制微信号 / QQ / QQ 群」已经可用。
3. **法务确认**：退款规则、限速数字（单 Key 并发 20、60 次/分钟、300k token/分钟）、免责声明措辞（`config/faq.ts` 与 `config/site.ts` 的 `disclaimer`）；`legal.icp` / `legal.company` 填 ICP 备案号与运营主体，填了才会出现在页脚。
4. **教程内容核对**：`config/guide.ts` 的「五步总览」与 `config/faq.ts` 的「使用与配置」分类是按卖家教程站 `https://wx.bbyy.site/` 的内容重写的，截图已裁掉品牌栏与二维码。买家到底是走自己的兑换页还是卖家站，措辞要按实际情况调一遍。
5. **SEO 提交**：`scripts/claude_unlimited_seo_notify.ps1` 未内置（部署脚本会跳过）。需要时照参考项目 `Product/scripts/marketing_seo_notify.ps1` 复制一份，密钥放 `config/local/seo_secrets.env`（已 gitignore）。

已经处理掉的（首版上线时改的）：

- OG 图：`public/og/{home,pricing,unlimited,faq}.png` 已由 `npm run gen:og` 生成（1200×630）。教程四页暂不出图（`transformHead` 会指向不存在的 `/og/guide*.png`，分享那几页时卡片空白，可接受）。
- `config.mts` 里没有 Analytics 埋点占位，`REPLACE_WITH_CF_ANALYTICS_TOKEN` 那条已过期。
- 域名：`config/site.ts` 的 `url` 现为 `https://claude-unlimited-site.pages.dev`，canonical / sitemap / robots / OG 全部跟随。**换自定义域时只改这一处**，然后重新部署；Pages 侧绑自定义域参考项目是给 Pages 加 domain（DNS 自动出 CNAME，再把同一 host 的 CNAME 指向 `<project>.pages.dev`）。

## 已知问题

- 兑换页地址为空（见上面第 1 条），这是当前唯一影响用户走通流程的缺口。
- 404 页（`docs/404.md`）：VitePress 1.6 不对它跑 `transformHead`，SEO 标签用 frontmatter `head`（`<title>` / `robots noindex`）加正文裸 `<link rel="canonical">` 补齐；`NotFoundPage` 组件在客户端挂载，SSR HTML 里没有「返回首页」链接（普通浏览器无影响，纯 HTML 抓取器看不到）。
- `.wrangler/` 是 wrangler 在**仓库根**写的本地缓存（只存 account_id），已加进根 `.gitignore`；参考项目 Product 里也有同名目录并同样忽略。
- 生产构建的 dist 每页仍有一条 `Hydration completed but contains mismatches` 控制台警告（dev 下没有），原因与现状见 `temp/hydration_mismatch.md`，不影响功能。

