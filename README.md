# Claude 无限卡 · 官网源码

[![官网](https://img.shields.io/badge/%E5%AE%98%E7%BD%91-claude--unlimited.aiautotools.com-C85A1E?style=flat-square)](https://claude-unlimited.aiautotools.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-C85A1E?style=flat-square)](LICENSE)
[![VitePress](https://img.shields.io/badge/VitePress-1.6.4-646C7A?style=flat-square)](site/package.json)
[![部署](https://img.shields.io/badge/%E9%83%A8%E7%BD%B2-Cloudflare%20Pages-F38020?style=flat-square)](https://claude-unlimited.aiautotools.com)

**[官网 →](https://claude-unlimited.aiautotools.com)** ｜ [知识库 →](https://claude-unlimited.aiautotools.com/knowledge) ｜ [使用教程 →](https://claude-unlimited.aiautotools.com/guide) ｜ [套餐定价 →](https://claude-unlimited.aiautotools.com/pricing)

> 一个 Key，Claude 不限量用。

这是 **Claude 无限卡官网**的完整前端源码：VitePress 静态站 + 22 篇 Claude Code 中文知识库 + 一整套 SEO / GEO 基建。
站内所有内容、定价与数字都能在这里逐条核对。

**[立即访问官网 →](https://claude-unlimited.aiautotools.com)**

## 这是什么

Claude 无限卡是一个独立运营的第三方 API 网关服务，把 Claude 模型的调用按订阅期打包售卖：订阅期内调用不按 token 计费，按固定订阅价收费，支持 Claude Code、Cursor、Cline 等主流客户端。

本仓库是它的**官网前端**：

- 全部页面源码（首页、模型广场、套餐定价、常见问题、使用教程、知识库、信任页）
- 22 篇原创知识库文章，覆盖用法、原理、成本与报错排查
- 构建门禁：17 步构建链 + 55 处验收断言（逐页展开），改坏了本地就红
- SEO / GEO 基建：sitemap、IndexNow 主动推送、JSON-LD、llms.txt、结构化数据

**开源的只有前端展示层。** 调用通道、额度分发与服务由运营方独立运营，仓库里没有后端代码、密钥或计费逻辑，也不能用于复刻或替代该服务。购买、兑换与售后一律以[官网](https://claude-unlimited.aiautotools.com)与管理后台为准。

## 免责声明

- 本站与 Anthropic 官方没有隶属、授权或合作关系，所有模型能力归 Anthropic 所有
- Claude、Anthropic 等名称与商标归其各自所有者，本仓库与这些商标无关联
- 本仓库的 MIT 许可只覆盖代码，不覆盖「Claude 无限卡」这一品牌、服务与任何商标

## 知识库

22 篇原创文章，按读者旅程分四类。**在线版在[官网知识库](https://claude-unlimited.aiautotools.com/knowledge)**，这里能逐篇对照源码。

**上手与进阶**（9 篇）

| 文章 | 官网 | 仓库源码 |
|---|---|---|
| Claude Code 教程：第一次会话之后怎么用 | [在线阅读](https://claude-unlimited.aiautotools.com/knowledge/claude-code-tutorial) | [`claude-code-tutorial.md`](site/docs/knowledge/claude-code-tutorial.md) |
| Claude Code MCP 怎么配：命令、scope 与避坑 | [在线阅读](https://claude-unlimited.aiautotools.com/knowledge/claude-code-mcp-config) | [`claude-code-mcp-config.md`](site/docs/knowledge/claude-code-mcp-config.md) |
| Opus 5.5 做视频教程：Remotion 出第一条 MP4 | [在线阅读](https://claude-unlimited.aiautotools.com/knowledge/claude-code-make-video) | [`claude-code-make-video.md`](site/docs/knowledge/claude-code-make-video.md) |
| Claude Code 计划模式怎么用：四种权限模式的区别 | [在线阅读](https://claude-unlimited.aiautotools.com/knowledge/claude-code-plan-mode) | [`claude-code-plan-mode.md`](site/docs/knowledge/claude-code-plan-mode.md) |
| Claude Code 权限模式有哪些 | [在线阅读](https://claude-unlimited.aiautotools.com/knowledge/claude-code-permission-modes) | [`claude-code-permission-modes.md`](site/docs/knowledge/claude-code-permission-modes.md) |
| CLAUDE.md 怎么写：写什么、放哪 | [在线阅读](https://claude-unlimited.aiautotools.com/knowledge/claude-md-guide) | [`claude-md-guide.md`](site/docs/knowledge/claude-md-guide.md) |
| Claude Code 命令与参数速查：会话内和命令行 | [在线阅读](https://claude-unlimited.aiautotools.com/knowledge/claude-code-cli-cheatsheet) | [`claude-code-cli-cheatsheet.md`](site/docs/knowledge/claude-code-cli-cheatsheet.md) |
| Claude Code 子代理怎么用 | [在线阅读](https://claude-unlimited.aiautotools.com/knowledge/claude-code-subagents) | [`claude-code-subagents.md`](site/docs/knowledge/claude-code-subagents.md) |
| Claude Code 技能怎么写 | [在线阅读](https://claude-unlimited.aiautotools.com/knowledge/claude-code-skills) | [`claude-code-skills.md`](site/docs/knowledge/claude-code-skills.md) |

**原理与机制**（3 篇）

| 文章 | 官网 | 仓库源码 |
|---|---|---|
| 为什么 Agent 比聊天更烧 token | [在线阅读](https://claude-unlimited.aiautotools.com/knowledge/why-agents-cost-more-tokens) | [`why-agents-cost-more-tokens.md`](site/docs/knowledge/why-agents-cost-more-tokens.md) |
| Claude Code 启动时那 33k token 去了哪 | [在线阅读](https://claude-unlimited.aiautotools.com/knowledge/claude-code-startup-tokens) | [`claude-code-startup-tokens.md`](site/docs/knowledge/claude-code-startup-tokens.md) |
| 提示缓存原理：什么时候省钱、什么时候白花 | [在线阅读](https://claude-unlimited.aiautotools.com/knowledge/prompt-caching-explained) | [`prompt-caching-explained.md`](site/docs/knowledge/prompt-caching-explained.md) |

**成本与计费**（4 篇）

| 文章 | 官网 | 仓库源码 |
|---|---|---|
| Claude API 怎么计费：token 构成与估算 | [在线阅读](https://claude-unlimited.aiautotools.com/knowledge/claude-api-pricing-explained) | [`claude-api-pricing-explained.md`](site/docs/knowledge/claude-api-pricing-explained.md) |
| 降低 Claude 用量的工程方法：先测量再优化 | [在线阅读](https://claude-unlimited.aiautotools.com/knowledge/reduce-token-usage-tips) | [`reduce-token-usage-tips.md`](site/docs/knowledge/reduce-token-usage-tips.md) |
| 按任务选模型：Opus、Sonnet、Haiku 怎么选 | [在线阅读](https://claude-unlimited.aiautotools.com/knowledge/choose-claude-model) | [`choose-claude-model.md`](site/docs/knowledge/choose-claude-model.md) |
| Claude Code 与 Codex CLI 怎么选 | [在线阅读](https://claude-unlimited.aiautotools.com/knowledge/claude-code-vs-codex) | [`claude-code-vs-codex.md`](site/docs/knowledge/claude-code-vs-codex.md) |

**报错排查**（6 篇）

| 文章 | 官网 | 仓库源码 |
|---|---|---|
| prompt too long 报错怎么处理 | [在线阅读](https://claude-unlimited.aiautotools.com/knowledge/claude-code-prompt-too-long-fix) | [`claude-code-prompt-too-long-fix.md`](site/docs/knowledge/claude-code-prompt-too-long-fix.md) |
| Claude Code 报 429 限流怎么办 | [在线阅读](https://claude-unlimited.aiautotools.com/knowledge/claude-code-429-rate-limit) | [`claude-code-429-rate-limit.md`](site/docs/knowledge/claude-code-429-rate-limit.md) |
| Claude 报错 529 overloaded 怎么处理 | [在线阅读](https://claude-unlimited.aiautotools.com/knowledge/claude-code-529-overloaded) | [`claude-code-529-overloaded.md`](site/docs/knowledge/claude-code-529-overloaded.md) |
| Claude Code 报错 401 / 403 怎么解决 | [在线阅读](https://claude-unlimited.aiautotools.com/knowledge/claude-code-401-403) | [`claude-code-401-403.md`](site/docs/knowledge/claude-code-401-403.md) |
| Claude Code 连接中断、等待 API 响应怎么处理 | [在线阅读](https://claude-unlimited.aiautotools.com/knowledge/claude-code-connection-lost) | [`claude-code-connection-lost.md`](site/docs/knowledge/claude-code-connection-lost.md) |
| Claude 提示用量上限：分清是哪个计量器 | [在线阅读](https://claude-unlimited.aiautotools.com/knowledge/claude-code-usage-limit-reached) | [`claude-code-usage-limit-reached.md`](site/docs/knowledge/claude-code-usage-limit-reached.md) |

## 快速开始

需要 Node 20 与 Python 3.12（构建链里有 Python 门禁）。

```bash
git clone https://github.com/autotoolai/claude-unlimited.git
cd claude-unlimited/site

npm ci          # 装依赖
npm run dev:site   # 站点 dev server，端口 41800
npm run dev        # 静态文件同步 + 4198 静态服务
```

改完必须跑这几道门禁，任意一道红就别发布：

```bash
npm run build        # 17 步构建链：结构门禁 check_dist、SEO、地理门禁、死链、CSS
npm run verify       # 55 处断言点（逐页展开）：SEO / 组件 / 链接
npm run check:links  # 死链
npm run check:css    # 改了 .vitepress/theme/**/*.css 必跑
```

## 目录结构

```
claude-unlimited/
├─ site/                     官网本体（VitePress）
│  ├─ config/                数据源：商品、模型、FAQ、教程、知识库元数据、信任页文案
│  ├─ docs/                  内容根（srcDir）：路由壳 + knowledge/ 里的 22 篇文章正文
│  ├─ .vitepress/theme/      组件与样式：页面外壳、页头页脚、知识库渲染
│  ├─ scripts/               构建与运维脚本：sitemap、llms、OG 图、检查、部署
│  ├─ content/knowledge/      草稿工作台：新文章的权威位置在 drafts/
│  └─ public/                静态资源：favicon、OG 图、知识库封面
├─ config/                   仓库级配置：SEO 提交与统计看板的密钥模板（真值只在本机 config/local/）
├─ .github/                  Issue 模板、PR 模板、CI
└─ docs/                     仓库级文档索引
```

## 部署

站点是纯静态产物，部署到 Cloudflare Pages：

```bash
cd site
npm run build
pwsh -File scripts/deploy_claude_unlimited_site.ps1
```

换域名只改一处：`site/config/site.ts` 的 `url` 字段。canonical、sitemap、OG 图、llms.txt 全部跟随。

## SEO / GEO 基建

这份源码的搜索与 AI 引用表现是认真做的，改动时别破坏它：

| 机制 | 位置 |
|---|---|
| 每页 canonical 与 og:image | `site/.vitepress/config.mts` 的 `transformHead` |
| JSON-LD（Organization / WebSite / Product / Article / FAQPage） | `site/.vitepress/theme/pages/jsonld_server.ts`，构建后由 `gen_jsonld.ts` 注入产物 |
| sitemap | `site/scripts/gen_sitemap.ts`，扫产物生成，与 dist 严格一一对应 |
| IndexNow / Bing / 百度 / GSC 主动推送 | `site/scripts/seo_notify.ps1`，发版后自动跑 |
| llms.txt 与 llms-full.txt | `site/scripts/gen_llms.ts`，给 AI 检索的索引与全文 |
| 知识库文章门禁 | `site/scripts/check_geo_lint.py`（一句话答案自包含且含数字）、`check_seo_meta.py`（标题与描述长度） |
| 站内反向链接 | `Organization.sameAs` 指向本仓库，仓库 README 指向官网，两者互为同一实体 |

## 贡献

改内容、改文案、修文档都欢迎。先读 [`site/CLAUDE.md`](site/CLAUDE.md) 了解这个项目的硬规则（正文写在 `.vue` 不写回 markdown、同一段内容只有一个主场页、数字不许手写进文档），再按 [`site/docs/README.md`](site/docs/README.md) 的文档地图找对应文件。

提交前跑完上面那四道门禁，并在 PR 里贴上输出。

## 维护说明

- **改 `.github/workflows/` 需要带 `workflow` scope 的凭据。** OAuth 令牌（`gho_`）默认只带
  `gist` / `read:org` / `repo`，推 workflow 文件会被 GitHub 整次拒绝：

  ```
  ! [remote rejected] master -> master (refusing to allow an OAuth App to create
    or update workflow `.github/workflows/ci.yml` without `workflow` scope)
  ```

  本机可用的凭据是 `futianren` 的 `ghp_` PAT。注意全局 git config 里挂着 `gh` 的凭据助手，
  它**优先于** `GIT_ASKPASS` 回答凭据，所以必须 `git -c credential.helper= push` 清空 helper 链，
  否则 askpass 不生效、仍然会用到没有 workflow scope 的令牌。

- **本地验收**：`cd site && npm run build`，再跑 `npm run check:dist`（产物结构门禁）与
  `npm run verify:build`（逐页断言 SEO / 组件 / 链接）。改完页面先跑这几条。

- **部署**：`site/scripts/deploy_claude_unlimited_site.ps1`（先 `npm run build`，再
  `wrangler pages deploy`）。站点域名 `claude-unlimited.aiautotools.com` 绑在
  Cloudflare Pages 项目 `claude-unlimited-site` 上。

- **搜索推送**：`site/scripts/seo_notify.ps1` 走 IndexNow + Bing + 百度 + GSC。
  百度有每日配额（10 条），GSC 需要 `site/temp/seo_probe/.venv` 里的 `google-auth`，
  且服务账号在 GSC 后台要有该属性的 Full 权限。

## License

[MIT](LICENSE)。代码可自由取用；品牌、服务与商标不在授权范围内。
