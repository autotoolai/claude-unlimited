<!-- markdown mirror for AI / agents; HTML: https://claude-unlimited.aiautotools.com/knowledge/claude-code-cli-cheatsheet -->
---
layout: page
knowledge: true
title: Claude Code 命令与参数速查：会话内和命令行
description: claude 的启动方式、常用参数（--model、--allowedTools、--output-format、--max-turns、--add-dir）、会话内斜杠命令表，以及写脚本和 CI 时的用法。
category: start
kicker: Claude Code
head:
  - - meta
    - property: og:title
      content: Claude Code 命令与参数速查 · Claude 知识库
  - - meta
    - property: og:description
      content: 启动方式、常用参数、会话内斜杠命令表，脚本与 CI 用法。
---

# Claude Code 命令与参数速查：会话内和命令行

> 正式发布地址：[claude-unlimited.aiautotools.com/knowledge/claude-code-cli-cheatsheet](https://claude-unlimited.aiautotools.com/knowledge/claude-code-cli-cheatsheet) ｜ 源码与文档：[GitHub 仓库](https://github.com/autotoolai/claude-unlimited)

> **一句话答案**：日常用 `claude` 进交互，会话内靠 `/init`、`/compact`、`/model`、`/status`、`/context` 这几个斜杠命令；脚本和 CI 用 `claude -p` 配 `--allowedTools` 预授权、`--max-turns` 限轮次、`--output-format json` 取结构化输出。会话内常用的斜杠命令有 10 个左右（`/init`、`/compact`、`/clear`、`/model`、`/cost`、`/status`、`/permissions`、`/mcp`、`/review`、`/doctor`），完整清单用 `/help` 查。命令行子命令有 30 多个（`claude update`、`claude auth login`、`claude mcp`、`claude doctor`、`claude setup-token`、`claude agents`、`claude import` 等），完整参数用 `claude --help` 查。

这篇按「日常交互 / 脚本与 CI / 排障」三条线组织。记住一句话就能覆盖 80% 场景：**交互用 `claude`，自动化用 `claude -p`。**

## 启动方式

**结论**：常用入口就三种：交互式会话、带一条初始提示启动、`-p` 打印模式（给答案后退出）。另外记住 `-c` 续上一次会话、`-r` 从列表里恢复、`-n` 给会话起名。

```bash
claude                          # 交互式会话
claude "修一下失败的测试"        # 带一条初始提示启动
claude -p "总结这个仓库"        # 打印模式：给答案后退出
cat logs.txt | claude -p "解释"  # 管道喂内容
claude -c                       # 继续最近一次会话
claude -r                       # 从列表里选一个会话恢复
claude -r "auth-refactor" "把这个 PR 收尾"   # 按名字恢复并直接给指令
claude --model claude-opus-5-5   # 为这次会话指定模型
claude -n "my-feature-work"     # 给会话起名，/resume 里能搜到
```

几个容易忽略的细节：

- **子命令打错会给出建议**。`claude udpate` 会打印 `Did you mean claude update?`，然后退出，不会启动会话。
- **`-c` 会跳过一部分会话**：用 `claude -p` 或 Agent SDK 创建的会话、以及第一条提示是 `/loop` 的会话不会被 `-c` 接上；但 `claude -p --continue` 反而会包含它们。
- **`-r` 传会话 ID 时**，Claude Code 先搜当前项目目录和它的 git worktree，再搜这台机器上的其它项目。

## 值得记住的参数

**结论**：脚本里最该记住的是 `-p`（非交互）、`--output-format`（结构化输出）、`--model`（选档）、`--allowedTools` 与 `--disallowedTools`（控制工具面）、`--max-turns` 与 `--max-budget-usd`（双保险）、`--worktree`（隔离并行）。

- **`-p, --print`**：非交互，标准输入进、标准输出出。所有脚本和 CI 的基础。
- **`--output-format text|json|stream-json`**：打印模式的结构化输出。
- **`--input-format text|stream-json`**：打印模式的输入格式。
- **`--model <id>`**：端点提供的任意模型 ID，也接受 `sonnet`、`opus`、`haiku`、`fable` 这类别名。
- **`--allowedTools "Read,Edit,Bash(git *)"`**：预授权工具，打印模式不会卡在审批上。
- **`--disallowedTools "Edit"`**：反向限制；写 `"*"` 移除所有工具，写 `"mcp__*"` 移除所有 MCP 工具。
- **`--tools "Bash,Edit,Read"`**：限制 Claude 能用哪些内置工具，`""` 表示全禁。
- **`--dangerously-skip-permissions`**：完全不弹审批。只在容器或可丢弃的沙箱里用。
- **`--max-turns N`**：给无头运行的 agent 循环设硬上限。
- **`--max-budget-usd N`**：按客户端估算的花费封顶，超了就停。子代理的花费也计入。
- **`--add-dir <path>`**：让这次会话能操作多个目录。
- **`--worktree, -w`**：在隔离的 git worktree 里启动，不污染当前分支。

`--allowedTools` 和 `--disallowedTools` 的区别经常搞混：**前者是「这些免审批」，后者是「这些禁用」**。要限制工具**是否可用**而不是是否要审批，用 `--tools`。

### `--add-dir` 的限制

`--add-dir` 给的是**文件访问权**，不是完整的 `.claude/` 配置发现——它不会从那些目录里加载大多数 `.claude/` 配置。另外它会校验路径确实是目录，且**大多数网络路径加不进去**（比如 `\\server\share`）。要持久化，用设置里的 `permissions.additionalDirectories`。

## 会话内斜杠命令

**结论**：最常用的是 `/init`、`/compact`、`/clear`、`/model`、`/cost`、`/status`。要管权限看 `/permissions`，要管上下文构成看 `/context`，要管外部工具看 `/mcp`，要管子代理看 `/agents`。

- `/init`：为项目生成 CLAUDE.md（约定、构建命令、不要碰的东西）。
- `/compact [重点]`：把对话压成摘要，释放上下文。
- `/clear`：清空上下文重新开始。
- `/model`：切换模型档位；`/cost`：本次消耗；`/status`：端点、密钥、模型、版本。
- `/permissions`：免确认的操作范围；`/config`：设置；`/context`：上下文构成。
- `/mcp`：已连接的 MCP 服务器；`/agents`：子代理；`/hooks`：工具事件上的 shell 钩子。
- `/review`：审查 PR；`/doctor`：检查安装；`/help`：全部命令。

另外几个值得知道的：`/resume` 恢复会话、`/rename` 改会话名（也显示在提示栏）、`/memory` 开关 auto memory、`/autocompact` 设自动压缩窗口、`/doctor prompt-audit` 审计你的指令文件。

## 怎么知道端点支持哪些模型 ID

**结论**：权威来源是端点自己的 `/v1/models` 返回值，或 CC Switch 的「获取模型列表」。填进 `--model` 的字符串必须与返回的 ID 逐字一致，大小写、短横线、数字版本都不能差。

请求端点的 `/v1/models`，返回的列表就是可用模型：

```bash
curl -s "$ANTHROPIC_BASE_URL/v1/models" -H "x-api-key: $ANTHROPIC_API_KEY" -H "anthropic-version: 2023-06-01"
```

也可以用 CC Switch 的「获取模型列表」。填进 `--model` 的值必须与返回的 ID 逐字一致，大小写、短横线、数字版本都不能错。

## 写脚本与 CI

**结论**：打印模式里用 `--allowedTools` 替代交互审批，用 `--max-turns` 防止循环，用 `-c` 续跑失败的任务。

```bash
claude -p "为 src/parser.ts 补测试，只改测试文件" \
  --allowedTools "Read,Edit,Write,Bash(npm run test*)" \
  --max-turns 20 \
  --output-format json
```

一个实用的组合是：任务失败时用 `claude -c` 续跑，配合 `CLAUDE_CODE_RETRY_WATCHDOG=1` 让它遇到临时错误时继续重试而不是退出。

### 无人值守的三个兜底

**结论**：脚本跑长任务，三道保险一起上。

```bash
claude -p "重构 src/legacy 下的三个模块，保持公开 API 不变" \
  --permission-mode auto \
  --permission-prompts none \
  --max-turns 30 \
  --max-budget-usd 5.00 \
  --output-format json
```

- `--permission-prompts none`：没有人能回答审批，所以本来会弹提示的动作一律拒绝，会话在允许范围内继续；
- `--max-turns 30`：agent 循环的硬上限；
- `--max-budget-usd 5`：按客户端估算的花费封顶。注意它核对的是**估算值**，可能和账单有出入，所以要留余量；子代理的花费也计入。

达到预算上限后再想派生子代理会报 `Budget limit reached`，运行中的后台子代理也会被停掉。

### 要严格 JSON 输出

```bash
claude -p "提取用户信息" --json-schema '{
  "type": "object",
  "properties": { "name": {"type": "string"}, "age": {"type": "integer"} },
  "required": ["name"]
}' "从 README 里提取"
```

`--json-schema` 会在 agent 完成后返回符合该 schema 的 JSON。schema 不合法时 Claude Code 直接报错退出。

## 命令行子命令速查

**结论**：`claude` 不只是启动会话，还有 30 多个子命令管安装、认证、后台会话和配置。

| 子命令 | 用途 |
|---|---|
| `claude update` | 升级到最新版 |
| `claude install [version]` | 安装或重装原生二进制，可指定版本号或 `stable` / `latest` |
| `claude auth login / logout / status` | 登录、登出、查看认证状态（JSON 输出） |
| `claude setup-token` | 生成长期 OAuth 令牌，给 CI 和脚本用 |
| `claude doctor` | 在终端跑只读的安装与设置诊断，不启动会话 |
| `claude mcp` | 配置 MCP 服务器；`claude mcp login <server>` 走 OAuth 流程 |
| `claude plugin` | 管理插件 |
| `claude agents` | 打开 agent 视图，监控和派发并行后台会话 |
| `claude attach <id>` | 在当前终端接管一个后台会话 |
| `claude logs <id>` / `claude stop <id>` / `claude rm <id>` | 查看、停止、删除后台会话 |
| `claude daemon status / logs / stop` | 后台会话守护进程的状态、日志与停止 |
| `claude import [source]` | 把别的编码 agent 的配置搬进 Claude Code |
| `claude purge [path]` | 清除某项目的全部本地状态 |
| `claude ultrareview [target]` | 非交互跑 ultrareview，结果输出到 stdout |
| `claude update` / `claude install` | 见上 |

排障时有用的两个：`claude doctor` 是**终端里的只读诊断**（安装健康度、设置文件校验错误），会话内的 `/doctor` 则能顺手修复问题，还能加 `prompt-audit` 子命令审计指令文件。

## 排查用旗标

**结论**：配置出问题时，先用这几个旗标把问题隔离出来。

- **`--debug`**：开调试模式，可带分类过滤，如 `--debug='mcp,startup'`。过滤只在 `=` 形式下生效。
- **`--debug-file <path>`**：调试日志写到指定文件，隐式开启调试模式。
- **`--safe-mode`**：**所有自定义都关掉**——CLAUDE.md、skills、plugins、hooks、MCP 服务器、自定义命令与 agent、output styles、workflows、自定义主题与键位、auto memory 都不加载。认证、模型选择、内置工具和权限仍然正常。这是判断「是不是某个自定义项触发了自动模型回退」的干净对照。
- **`--bare`**：最小模式，跳过 hooks、skills、自定义命令、子代理、插件、MCP 服务器、auto memory 和 CLAUDE.md 的自动发现，让脚本调用启动更快。但 Bash、文件读、文件编辑仍然可用。
- **`--restricted`**：评测场景用。移除所有能跑命令或代码的内置工具以及 WebFetch（除非在 `--tools` 里单独点名），把内置文件工具限制在工作目录内，只加载托管设置和 `--settings`，**拒绝 bypassPermissions**，也拒绝创建云会话。

`--safe-mode` 和 `--bare` 的区别值得记一下：`--safe-mode` 保留认证、模型、工具和权限；`--bare` 保留工具但不加载任何配置。

## 系统提示词旗标

**结论**：五个旗标控制提示词，四个设文本，一个控制是否复用。

| 旗标 | 行为 |
|---|---|
| `--system-prompt` | 整体替换默认提示词 |
| `--system-prompt-file` | 用文件内容整体替换 |
| `--append-system-prompt` | 追加到默认提示词之后 |
| `--append-system-prompt-file` | 追加文件内容 |
| `--system-prompt-snapshot off` | 每次请求重建提示词，而不是复用会话第一次请求时记录的那份 |

**追加还是替换，取决于默认身份是否还合适**。追加保留默认的工具指引、安全说明和编码约定，你只补差异部分；替换会丢掉全部默认提示词，包括工具指引和安全说明，责任由你承担。管线里跑的非编码 agent 该用替换，日常 `-p` 脚本该用追加。

想让静态部分吃到提示缓存，就在固定指令和每次都变的上下文之间放一行 `__SYSTEM_PROMPT_DYNAMIC_BOUNDARY__`：Claude Code 会在第一个该行处切开并移除这一行，上面那部分保持缓存。

## claude setup-token

**结论**：这个命令给订阅用户在 CI 或无浏览器机器上生成长期 OAuth 令牌。用 API Key 就不需要它——Key 直接走环境变量，没有刷新也没有多进程抢刷新的问题。

在浏览器登录一次，打印一个长期 OAuth 令牌，给订阅用户在 CI 或无浏览器的机器上用。用 API Key 时不需要它——Key 直接走环境变量，没有 token 刷新，也没有多进程抢刷新的问题。

生成的 token 只能用 Claude 订阅（Pro、Max、Ultra、Team、Enterprise），**只能做模型请求**，不能建立 Remote Control 会话、也不能拉取 claude.ai 的连接器。本地配的 MCP 服务器照常工作。

## 输入框怎么换行

**结论**：回车是发送，换行用 Shift+Enter；终端不支持时先打一个反斜杠再回车。长提示先写进文件再喂进去最稳，粘贴多行会被自动识别成一次输入。

回车是发送。换行用 Shift+Enter；终端不支持时先输入一个反斜杠 `\` 再按回车。多行的长提示可以先写进文件再喂进去：

```bash
claude -p "按文件里的要求做" < prompt.txt
```

粘贴多行文本会被自动识别，不会逐行发送。

## 让会话便宜的习惯

**结论**：五条：默认用中档只在难的一步切强档、读文件多的活交给子代理、日志先裁剪再喂、脚本加 `--max-turns`、跑批加 `--bare` 跳过配置发现。

- 默认用 Sonnet 档位，只在真正难的一步 `/model` 切到更强的档，做完切回来。
- 大量读文件的任务交给子代理：它们有自己的上下文，主会话只收到摘要。
- 不要把整个日志粘进来，用 `tail -n 50 build.log` 之类先裁剪。
- 脚本里加 `--max-turns`，避免死循环。
- 跑脚本时加 `--bare`，跳过所有自动发现，启动更快。

原理和更多方法见[为什么 Agent 比聊天更烧 token](why-agents-cost-more-tokens.md)与[降低 Claude 用量的工程方法：先测量再优化](reduce-token-usage-tips.md)；会话内其它命令的完整说明见 [Claude Code 教程：第一次会话之后怎么用](claude-code-tutorial.md)。

## 实战案例

**结论**：三个案例对应三类高频用法：CI 里跑生成加校验并卡预算、批量处理文件时用 `--bare` 提速、配置出错时用 `--safe-mode` 与 `--debug` 定位。

### 案例 1：CI 里跑一次生成 + 校验

```bash
claude -p "为 src/parser.ts 补测试，只改测试文件" \
  --allowedTools "Read,Edit,Write,Bash(npm run test*)" \
  --max-turns 20 \
  --output-format json > result.json
```

退出码非 0 就说明没跑成，可以配 `--max-budget-usd` 再加一道预算上限。

### 案例 2：批量处理文件

```bash
for f in logs/*.txt; do
  claude -p "提取这批日志里的错误类型并统计" < "$f" --bare
done
```

`--bare` 让每个进程都跳过配置发现，快很多。

### 案例 3：配置坏了怎么查

```bash
claude --safe-mode "你好"    # 配置全关，如果这样正常，问题在某个自定义项
claude --debug='startup'     # 看启动阶段到底加载了什么
claude doctor                # 终端只读诊断
```

## 怎么选（决策矩阵）

**结论**：按「有没有人在看」和「要不要复用上下文」两个维度选组合。

| 场景 | 组合 | 原因 |
|---|---|---|
| 日常开发 | `claude` + `/init` | 交互 + 项目上下文 |
| 探索陌生仓库 | `claude` + plan 模式 | 先看方案不动手 |
| 一次性脚本 | `claude -p --bare` | 最快，不加载配置 |
| CI 里的固定任务 | `claude -p --allowedTools --max-turns` | 免审批 + 有限轮次 |
| 无人值守长任务 | 上面这套 + `--permission-prompts none` + `--max-budget-usd` | 三道保险 |
| 批量跑很多次 | `claude -p --bare --max-turns` | 每个进程都轻量 |
| 配置出问题 | `claude --safe-mode` / `--debug` | 隔离问题源 |
| 评测 harness | `claude --restricted -p` | 不许跑命令，不读用户设置 |
| 要严格结构化输出 | `claude -p --json-schema` | 返回符合 schema 的 JSON |
| 隔离分支上的改动 | `claude -w feature-x` | worktree 里跑，不污染当前分支 |

## 最佳实践

**结论**：参数不是越多越好，先固定一套能跑的基线。

1. **交互用 `claude`，自动化用 `claude -p`**，不要用交互模式写脚本。
2. **每次 `-p` 都配 `--max-turns`**，这是唯一能兜住失控循环的硬上限。
3. **无人值守再加 `--permission-prompts none`**，别指望审批能被自动回答。
4. **CI 里用 `--output-format json`** 拿结构化结果，别去解析自然语言输出。
5. **脚本加 `--bare`**，跳过配置发现能明显加快启动。

## 进阶技巧

**结论**：四个进阶开关：`--fallback-model` 做降级链、`--worktree` 做并行隔离、`--fork-session` 保留原会话、`--exclude-dynamic-system-prompt-sections` 提升提示缓存复用率。

### 用 --fallback-model 做降级链

```bash
claude --fallback-model sonnet,haiku "重构这个模块"
```

主模型过载或不可用时按顺序回退。要跨会话持久化，用设置里的 `fallbackModel`，这个旗标会覆盖它。

### 用 --worktree 做并行任务

```bash
claude -w feature-auth        # 在 .claude/worktrees/ 下建隔离 worktree
claude -w feature-auth --tmux # 配合 tmux 显示
```

不给名字会自动生成一个。也可以传 PR 链接，从那个 PR 分支。

### 用 --fork-session 保留原始会话

```bash
claude --resume abc123 --fork-session
```

恢复时新建会话 ID 而不是复用原来的，适合在原会话基础上试跑分支。

### 用 --exclude-dynamic-system-prompt-sections 提升缓存复用

```bash
claude -p --exclude-dynamic-system-prompt-sections "query"
```

把 per-user 上下文（比如 auto memory 位置）从系统提示词挪到第一条用户消息里，这样不同用户、不同机器跑同一个任务时能共享提示词缓存。只在默认系统提示词下生效。
