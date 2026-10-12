---
layout: page
knowledge: true
title: Claude Code MCP 怎么配：命令、scope 与避坑
description: 用 claude mcp add 装外部工具：三种 transport、三种 scope 的区别、Windows 要不要 cmd /c 包装、官方参考服务器哪些已归档、装几个够用、连不上怎么排查、密钥怎么放才安全。
category: start
kicker: Claude Code
head:
  - - meta
    - property: og:title
      content: Claude Code MCP 怎么配：命令、scope 与避坑 · Claude 知识库
  - - meta
    - property: og:description
      content: claude mcp add 命令、三种 scope、Windows 坑、归档包避坑、连不上排查。
---

# Claude Code MCP 怎么配：命令、scope 与避坑

> **一句话答案**：MCP 是给 Claude Code 装外部工具的插头，用 `claude mcp add` 一条命令接上一个服务器。真正会卡住新手的是三件事：scope 选哪个、Windows 上要不要 `cmd /c` 包装、以及别装早已归档的官方参考包。下面按「先看清代价 → 装第一个 → 遇到问题再回来查」的顺序写。

截至 2026-10-10，本文命令已在 Claude Code 官方文档和本机 `claude mcp --help` 上核对过，标注日期是因为这个命令的选项和状态显示会随版本变化。

## MCP 是什么，接进来发生了什么

**结论**：MCP（Model Context Protocol）是一个开放协议，规定 AI 客户端怎么连外部服务器、怎么调它的工具。Claude Code 是客户端，MCP 服务器可以是本机的一个进程，也可以是一个远程 URL。服务器把自己提供的工具名字、参数和说明交给 Claude Code，这些定义会**跟着每一次请求一起发出去**。

所以装 MCP 不是「给模型加了个插件」，而是「往固定的开场提示里塞了一堆工具说明」。直接后果有两个：

| 后果 | 说明 |
|---|---|
| 开场 token 变大 | 每个服务器的工具定义都常驻在上下文里，服务器越多、工具越多，每一轮都更贵 |
| 选工具更容易出错 | 工具一多，模型会出现「该用的没用、不该用的乱用」，实测反馈里这是比 token 更常见的问题 |

这条代价决定了下面所有取舍：装 4 到 6 个够用，每个都要有明确的用途，装之前先问「这件事我现在是不是在靠复制粘贴做」。

MCP 和技能、子代理的分工可以一句话记住：MCP 管「外部系统的工具和数据」，技能管「一套做事的流程」，子代理管「把任务拆给并行的人」。三者的详细对比见文末相关阅读。

## 第 1 步：装第一个服务器

**结论**：加一个远程 HTTP 服务器最快，不用装任何本地依赖。

```bash
# 基本形式：claude mcp add --transport http <名字> <URL>
claude mcp add --transport http sentry https://mcp.sentry.dev/mcp

# 带认证头的远程服务器
claude mcp add --transport http corridor https://app.corridor.dev/api/mcp \
  --header "Authorization: Bearer YOUR_TOKEN"
```

本地服务器（stdio）是 Claude Code 自己拉起的一个子进程：

```bash
# -- 后面才是真正要跑的命令
claude mcp add --transport stdio myserver -- npx server

# 带环境变量：只声明变量名，值从本机环境读取，密钥就不会写进配置文件
claude mcp add --env API_KEY=xxx --transport stdio myserver -- python server.py --port 8080
```

两个选项顺序的坑：**`--transport`、`--env`、`--scope` 这些选项必须写在服务器名字前面，`--` 用来把 Claude Code 的参数和服务器命令隔开**。很多中文教程里的 `claude mcp add <名字> -- npx …` 省掉了 `--transport`，靠的是默认值 stdio，能跑但不够明确。

其它几种形式：

| 形式 | 命令 |
|---|---|
| 从 Claude Desktop 导入（仅 Mac 和 WSL） | `claude mcp add-from-claude-desktop <名字>` |
| 直接给一段 JSON（支持 stdio、SSE、HTTP、WebSocket） | `claude mcp add-json <名字> '{"type":"ws","url":"wss://mcp.example.com/socket","headers":{"Authorization":"Bearer YOUR_TOKEN"}}'` |
| SSE 远程服务器（官方文档里仍在列） | `claude mcp add --transport sse <名字> <URL>` |
| 先试跑再装 | 在终端里直接运行 `npx -y <包名>`，看到它等服务端接入就 Ctrl+C。第一次运行会把包装到缓存，之后再通过 `claude mcp add` 加。 |

依赖方面：Node 写的服务器一般要 Node.js 18 以上；用 `uvx` 写的要装 Python 的 uv 工具链（`uv python install 3.12` 再把 `~/.local/bin` 加进 PATH）。

## 第 2 步：选对 scope

**结论**：scope 决定配置存在哪、要不要提交给团队、要不要每次批准。

```bash
claude mcp add --scope user --transport stdio context7 -- npx -y @upstash/context7-mcp
```

| scope | 生效范围 | 存储位置 | 适合 |
|---|---|---|---|
| `local`（默认） | 只在当前项目、只对你自己 | 本机用户配置 | 个人试用；带私人密钥的服务器 |
| `project` | 当前项目，全团队共享 | 项目根目录 `.mcp.json`，随仓库提交 | 团队统一的工具链 |
| `user` | 你所有项目 | 用户级配置 | 到处都要用的通用服务器 |

两个容易忽略的规则：

- **项目级的 `.mcp.json` 需要人工批准。** 出于安全考虑，从仓库拉下来的服务器不会自动连上，状态是「Pending approval」，要你交互式运行一次 `claude` 确认才启用。想重置批准记录用 `claude mcp reset-project-choices`。
- **同一个名字不要在多个 scope 里各定义一次。** 官方文档明确说同名冲突会告警，而且 OAuth 登录是按 endpoint 存的：你在 A 项目登录过的配置，到了 B 项目（加载了另一个同名定义）还要再登录一次。解决方式是保留要的那个 endpoint，其余用 `claude mcp remove <名字> --scope <scope>` 删掉。

## 第 3 步：查看、排查、删除

**结论**：`claude mcp list` 是你的总入口，先看状态列再动手。

```bash
claude mcp list            # 全部服务器 + 健康检查（Connected / Failed / Pending approval）
claude mcp get <名字>      # 看某一个的详情；被拒绝的只在这里显示
claude mcp remove <名字>   # 卸载
claude mcp login <名字>    # 需要 OAuth 的远程服务器
```

交互式会话里输入 `/mcp` 可以逐个服务器做开关和重新连接。状态列的含义按官方文档是这样：

| 状态 | 含义 | 处理 |
|---|---|---|
| Pending approval | 项目级 `.mcp.json` 还没批准 | 运行 `claude`，进 `/mcp` 批准 |
| Rejected | 被 `disabledMcpjsonServers` 拒绝 | 改 `settings.json` 里的这个列表 |
| Disabled for this project | 项目级的停用清单 | `/mcp` 里重新打开 |
| `MCP server disconnected` | 连续五次重连失败后被标记为失败 | `/mcp` 里手动重连 |

`claude mcp list` 和 `/mcp` 还会主动告警四种常见配置问题：

| 告警 | 成因 |
|---|---|
| Leading or trailing whitespace | 粘贴 token 时带了首尾空格或换行。Claude Code 不会自动 trim，会原样使用 |
| Missing environment variable | `${VAR}` 引用的变量没设；可以在值里写 `${VAR:-默认值}` 给个兜底 |
| Same name in more than one scope | 同名冲突，见上一节 |
| Reserved names | `workspace`、`claude-in-chrome`、`computer-use` 等内置名，不能占用 |

排连接问题时还有一个常见误区：**不要在终端里直接跑一个常驻的 MCP 服务器等它连接**，终端会一直挂着。正确做法是先用 `claude mcp add` 装（命令返回即完成注册），或者先单独运行一次触发下载再 Ctrl+C。

另外，官方文档提到在 `claude -p` 一次性运行和 Agent SDK 会话里，服务器断开后也会按同样的节奏自动重连，只是没有 `/mcp` 面板给你点。给偶尔会跑很久的工具加超时用 `.mcp.json` 条目里的 `timeout` 字段（毫秒），它只覆盖这一台服务器。

## 第 4 步：避开两个大坑

**结论**：一个是包已归档，一个是装太多。

**坑一：官方参考服务器里有一半已经归档。** 官方在维护的参考实现只剩七个：Everything、Fetch、Filesystem、Git、Memory、Sequential Thinking、Time。它们在 `modelcontextprotocol/servers` 仓库的 README 里写得很清楚：这些是给开发者看怎么写 MCP 的教学示例，不是生产级方案。GitHub、PostgreSQL、SQLite、Slack、Puppeteer、Brave Search、Google Drive、Sentry 这些曾经是 `@modelcontextprotocol/server-github`、`server-postgres` 这样的包，现在全部移到了 `servers-archived` 仓库，官方 README 自己标注了归档。网上大量中文教程还在教 `npx -y @modelcontextprotocol/server-github`，装上去能跑，但已经没人维护，有安全更新也不会跟。

替代办法：

| 想要的 | 用什么 |
|---|---|
| GitHub（issue、PR、搜代码、提 PR） | 官方远程 MCP：`https://api.githubcopilot.com/mcp/`，带个人访问令牌 |
| 网页抓取 | 官方维护的 `@modelcontextprotocol/server-fetch`，或任何用 `uvx` 起的 fetch 服务器 |
| 浏览器自动化 | Playwright 或 Chrome DevTools 的独立包，不走归档包 |
| Slack、Sentry 等 | 找现役维护方或第三方实现，装之前看最近一次提交时间 |

官方文档还提到，找服务器现在应该去 MCP Registry，而不是翻那个 GitHub 仓库。装之前先看一眼这个包上一次发布是什么时候，比看教程新鲜得多。

**坑二：装 4 到 6 个就够了。** 一份 2026 年的实测清单开头就写：装 15 个服务器可能意味着上百个工具定义常驻在提示词里，既烧 token，又让模型选工具时犯迷糊；那份清单自己给的建议是 4 到 6 个，并给了唯一的选型标准——先问「这件事我现在是不是靠复制粘贴在做」。按「看起来很酷」装的服务器，一个月后都会变成上下文垃圾。

还有一个本地已有的经验可以互相印证：本机的 Claude Code 只连了 Playwright 一个服务器，开场开销就是 3 万多 token，其中一大块来自工具 schema。所以每次准备 `claude mcp add` 之前，先问一句这个工具是不是命令行就能做（Read、Grep、Glob、WebFetch 已经是内置的），能命令行解决的就别装。

## 第 5 步：Windows 上的两个细节

**结论**：Windows 用户最容易卡在这两个地方。

**要不要 `cmd /c` 包装。** 有中文教程给出一个明确结论：Windows 上所有 stdio 类型的 MCP 服务器都需要用 `cmd /c` 包装，否则连不上，配置写成：

```json
{ "command": "cmd", "args": ["/c", "uvx", "mcp-server-fetch"] }
```

值得注意的是，官方 servers 仓库 README 里的 Windows 配置示例本身就是 `cmd /c npx` 这种写法——说明这确实是 Windows 上一种正常、推荐的启动方式，而不是偏方。本机的 Claude Code 官方文档和 CLI 帮助里没有把它列为硬性要求，所以更稳妥的说法是：**遇到某个 stdio 服务器连不上而别的能连时，优先试 `cmd /c` 包装**——有些包只在 shell 层里正常工作，尤其是需要 `.cmd` 包装的 npm 可执行文件。

**选项顺序。** 另一份中文教程记录了一个具体现象：Windows 下用 `claude mcp add <名字> -- npx …` 会连不上，改成 `claude mcp add --transport stdio <名字> -- npx …` 并加上包名和参数就正常；同一篇还提到官方命令缺参数（比如 `cmd` 和 `/c`）时也是连不上。这两件事其实是同一个道理：选项要在名字前面、`--` 后面要跟完整的命令。

## 第 6 步：密钥和权限怎么放

**结论**：MCP 服务器是以你的用户权限运行的任意代码，密钥不要进仓库，路径不要给太大。

- **密钥不进项目级 `.mcp.json`。** project scope 的文件是随仓库提交的。带私人令牌的服务器一律用 local 或 user scope；要共享就只提交不含密钥的那部分，让每个人本地用 `--env` 或 `${VAR}` 填自己的令牌。
- **项目级服务器先当陌生人看。** 别人仓库里的 `.mcp.json` 让你装什么工具，你有权拒绝。批准前至少看一眼这个服务器要执行什么命令。
- **文件和命令类 MCP 给最小路径。** Filesystem 类服务器只指向项目目录，不要指向家目录；能执行命令的服务器更要在意。
- **第三方服务器就是一段任意代码。** 官方 README 自己也说参考实现只是教学示例，生产使用要自己评估安全风险。装之前至少确认包名正确（拼错的包名会被当成新包从 npm 拉，浪费钱还可能装到别人的包）。