# site 项目规则

Claude 无限卡官网（VitePress）。数据源在 `config/`，正文在 `docs/`，脚本在 `scripts/`，产物在 `.vitepress/dist/`。

## 动手前先读哪份

按任务查表，不要通读：

| 任务 | 必读 |
|---|---|
| 写或改知识库文章 | `docs/knowledge/SOP-写一篇新文章.md`，按七步流程走 |
| 加页面、重排内容、决定某段放哪 | `docs/content_structure.md` |
| 改教程页 | `docs/guide_design_spec.md` |
| 改套餐价格 | `docs/plans_sync.md`（价格以发卡站商品详情为准，不手改） |
| 改配色 / 圆角 / 字体 / 动效 | `.vitepress/theme/styles/00_base.css` 头部注释即规范原文，只改那里的 token |
| 排查报错或行为异常 | `docs/troubleshooting_guide.md` |

## 硬规则

**内容**
- 正文不要写回 markdown。页面正文在 `.vitepress/theme/*.vue`，教程在 `config/guide.ts`，只有知识库正文在 `docs/knowledge/*.md`。
- 同一段内容站内只允许有一个主场页。其它页面只能给一行链接。判断规则见 `docs/content_structure.md`。
- 数字不许手写进文档。文档里出现「N 项 / N 条」就是漂移的起点，以命令实际输出为准。
- 知识库文章页写 `layout: page` + frontmatter `knowledge: true`；元数据注册在 `config/knowledge.ts`（含 `faq[]`）；素材登记在 `config/knowledge_sources.ts`（第三方域名只允许出现在这里和 `archive/`）。

**改完必须跑**
```bash
npm run build                        # 含 check_dist.mjs 结构门禁，不过不继续
npm run verify                       # SEO / 组件 / 链接验收
npm run check:links                  # 死链
npm run check:toc -- --slug=<新slug>  # 写了知识库文章才跑，不要漏
```

**代码**
- 页面组件必须在 `.vitepress/theme/index.ts` 的 `themePages` 里注册，否则 `frontmatter.layout` 解析不到，产物静默 SSR 成空 div。
- 埋点脚本放 `head`（`.vitepress/analytics_snippets.ts`）而不是组件里。新按钮只要带 `data-cta` 就自动进统计，不必改组件。
- `id` 类配置必须内联兜底。SSR 子进程读不到 shell 导出的 `process.env`，只用环境变量会出现「meta 偶尔凭空消失」。
- 知识库封面不要复用别的文章已用的图。先从 `temp/aiprimetech_covers/` 里还没被使用的素材按语义挑，登记进 `config/knowledge_cover_map.json`，删掉 `public/knowledge/<slug>.jpg` 后跑 `python scripts/fetch_knowledge_covers.py` 重取。详见 SOP 第 4 步「配封面」。

## 日常开发流程（Tailscale 远程看站必读）

**默认姿势：只要是「改代码看效果」，一律走 dev，永不走 preview。**

```bash
# 终端 1（必须常驻，不要关）
npm run dev:site      # vitepress dev 热更新，端口 41800
# 终端 2（必须常驻）
npm run dev           # public/ 静态文件同步 + 4198 静态服务
```

笔记本 / 手机通过 Tailscale 打开：

| 用途 | 地址 | 角标 |
|---|---|---|
| **日常开发，看的就是这个** | `http://<本机 Tailscale IP>:41800/`（或 `http://<本机 MagicDNS 主机名>:41800/`） | 左下角黑色 `DEV · 2026-10-13 16:20:01` |
| 局域网同 Wi-Fi | `http://<本机局域网 IP>:41800/` | 同上 |
| 部署前看构建产物 | `http://<本机 Tailscale IP>:41777/` | 左下角黑色 `BUILD 2026-10-13 15:02:44` |

**没有角标 = 你看错了服务，先关掉重开 `dev:site`。** 这是判断「是不是最新」最快的办法，比刷新、比 kill 进程都可靠。

### 三条硬规则

1. **端口不能混。** 41800 是 dev 热更新，41777 是静态产物预览。历史上「改了看不到最新」的根因就是两者共用 41777，浏览器标签还挂在旧进程上。改端口要同步三处：`package.json` 的 `dev:site`、`.vitepress/config.mts` 的 `server.port`、`scripts/serve_dist.mjs` 的 `PORT`。
2. **改 `public/` 下的文件（favicon / robots.txt / llms.txt / og 图）刷新看不到是正常的。** 它不走热更新。终端 2 的 `npm run dev` 每 2s 补拷到 4198，或直接访问 `http://<本机局域网 IP>:4198/favicon.svg` 确认。
3. **什么时候才需要 `npm run build`。** 只有四种：上线前、跑 `verify` / `check:dist` 验收、改了 sitemap / JSON-LD / logo 这类脚本产物、想用域名形式看部署态。平时改代码永远不需要 build。

**`serve_dist.mjs` 不缓存 HTML**（每次请求 `readFileSync` 读磁盘，响应头 `cache-control: no-store`）。历史上「必须杀旧 serve 进程」的说法不成立，别再照做。

### 远程看站时的排查顺序

1. 看左下角角标。有 `DEV` 且时间戳是刚才的 → 服务没问题，是浏览器缓存，Ctrl+Shift+R 强刷。
2. 角标时间戳很旧 → dev 进程死了或从没起。`netstat -ano | grep 41800` 确认。
3. 白屏 + 控制台只有资源 404 → 角标是 `BUILD` 说明你在 41777，切到 41800。
4. 白屏 + "This host is not allowed" → 域名形式访问，`config.mts` 的 `server.allowedHosts` 要有 `*.ts.net`；用 IP 形式则不会遇到。

## 环境陷阱

这几条在本项目造成过真实故障，完整版见 `docs/troubleshooting_guide.md`：

- 「构建后必须杀掉旧的 `serve:dist` 进程」这条旧结论是错的，`serve_dist.mjs` 每次请求都读磁盘，不存在内存快照。真正的原因是 dev 与 preview 曾共用 41777，浏览器标签挂在旧进程上——端口已拆开（dev 41800 / preview 41777），见上面「日常开发流程」。
- 不要删产物里的 Vue SSR 片段标记（`<!--[-->`），会 hydration 错位。
- 本机 `pwsh` 是 PowerShell 5.1，`.ps1` 注释里只能有 ASCII，中文会触发 ParserError。
- 测 node 的正则或解析逻辑要写成 `.mjs` 文件跑，不要用 `node -e`（shell 会吞反斜杠）。
- 仓库 `config/` 下有明文密码与 token，不入库、不贴进对话。
