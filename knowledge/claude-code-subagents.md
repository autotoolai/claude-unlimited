<!-- markdown mirror for AI / agents; HTML: https://claude-unlimited.aiautotools.com/knowledge/claude-code-subagents -->
---
layout: page
knowledge: true
title: Claude Code 子代理怎么用
description: 子代理是什么、.claude/agents/<name>.md 的 frontmatter 四个字段、项目级与用户级目录的优先级、隐式委派与显式点名、子代理为什么能省上下文，以及并行多少个会撞 429。
category: start
kicker: Claude Code
head:
  - - meta
    - property: og:title
      content: Claude Code 子代理怎么用 · Claude 知识库
  - - meta
    - property: og:description
      content: 子代理的独立上下文、定义方式、委派方式与并行上限。
---

# Claude Code 子代理怎么用

> 正式发布地址：[claude-unlimited.aiautotools.com/knowledge/claude-code-subagents](https://claude-unlimited.aiautotools.com/knowledge/claude-code-subagents) ｜ 源码与文档：[GitHub 仓库](https://github.com/autotoolai/claude-unlimited)

> **一句话答案**：子代理是在自己上下文窗口里完成一块任务、只把一段结论交回主会话的执行者。在 `.claude/agents/<name>.md` 里用一个 Markdown 文件定义它，靠 `description` 决定什么时候自动委派，靠 `tools` 收紧它能做什么，靠 `model` 固定档位——这 4 个 frontmatter 字段就够了。一个读了 40 个文件的任务，那些文件会在此后每一轮被重新发一次，交给子代理后主会话只留它的结论。它省的是主会话的上下文，不是钱；正常并行使用子代理即可。

大代码库里最容易失控的不是模型能力，是主会话的上下文。一个读了四十个文件的任务，那些文件会在此后每一轮被重新发一次，账单和速度一起变差。把这类「读很多、说一句」的活交给子代理，主会话只留下它的结论。

## 子代理是什么

**结论**：子代理有自己独立的上下文窗口、自己的系统提示、自己的工具访问权和独立的权限。它发出的请求**计入和主会话同一个用量限制**。

它和「在同一个会话里让它分几步做」的区别就在这个独立窗口：主会话不需要为子代理读过的每一行内容付费。与它并列的编排方式还有[Claude Code 计划模式怎么用：四种权限模式的区别](claude-code-plan-mode.md)（先想清楚再动手）和权限模式（决定实施阶段谁能直接做）。

**判断该不该用子代理**：如果某个副任务会把搜索结果、日志、文件内容灌进主对话，而你之后不会再引用它们，就交给子代理。反过来，如果你**反复需要同一类工人、同样的指令**，那就该把它定义成一个自定义子代理，而不是每次手动重复一遍。

## 内置子代理

**结论**：Claude Code 自带几个子代理，不用自己写就能用。

| 子代理 | 模型 | 什么时候用 |
|---|---|---|
| `Explore` | 继承模型顺序 | 需要搜索或理解代码库、但不做改动时。工具是只读的，Write 与 Edit 被拒绝 |
| `claude` | 无自有模型，跟随模型顺序 | 任务不属于更专门的 agent 时。是一个拥有全部子代理可用工具的兜底 agent |
| `statusline-setup` | Sonnet | 跑 `/statusline` 配置状态栏时 |
| `claude-code-guide` | Haiku | 你问 Claude Code 的功能相关问题时 |

`Explore` 是最有用的那个：它做文件发现、代码搜索、代码库探索，并把结果挡在主会话上下文之外。

想让它跑在更便宜的模型上，定义一个同名的用户级或项目级子代理 `Explore`，并保留自己的 `model` 字段——比如 `model: haiku`。用户或项目子代理只要叫 `Explore` 就会覆盖内置的，且保留自己的 model 字段。

## 怎么定义一个子代理

**结论**：在 `.claude/agents/` 下建一个以子代理名命名的 Markdown 文件，frontmatter 写字段，正文写它要做什么、做到什么程度、什么时候停。

```markdown
---
name: code-reviewer
description: Reviews a diff for correctness, security and test coverage. Use after any non-trivial change.
tools: Read, Grep, Glob, Bash(git diff *)
model: sonnet
---

You are a senior reviewer. Read the staged diff, list concrete defects with file:line,
flag untested paths, and stop. Do not edit files.
```

四个字段各管一件事：

| 字段 | 作用 | 怎么写 |
|---|---|---|
| `name` | 你怎么点名调用它 | 唯一标识，最长 256 字符；**不必和文件名一致**；不能含 `:` |
| `description` | Claude 决定要不要自动委派的唯一依据 | 写成「什么时候用我」的路由规则，不是职位名 |
| `tools` | 限定它能用什么工具 | 收紧是安全设计：不能编辑的评审者更可靠 |
| `model` | 固定档位 | `haiku` 做侦察与分类、`sonnet` 做多数活、`opus` 做难的那一步、`fable` 做最难的、`inherit` 跟随父会话 |

`description` 写错是常见失败点。写成「代码评审专家」基本不会被匹配到，写成「任何非小改动之后用它做评审」才会。

**名字里不能有 `:`**——那个字符留给插件作用域的标识符（比如 `my-plugin:reviewer`）。钩子收到的 `agent_type` 就是这个 `name` 值。

### frontmatter 完整字段表

**结论**：只有 `name` 和 `description` 是必填，其余按需用。字段名是驼峰，大小写必须完全对上——认不出来的字段会被**静默忽略**。

| 字段 | 作用 |
|---|---|
| `tools` / `disallowedTools` | 允许与禁用的工具。省略 `tools` 则继承子代理可用的全部工具 |
| `model` | `sonnet` / `opus` / `haiku` / `fable` / 完整模型 ID / `inherit` |
| `permissionMode` | 该子代理的权限模式 |
| `maxTurns` | 最大 agent 轮次；到顶后输出被标记为 partial，主代理可以恢复它继续 |
| `autoCompactWindow` | 单独调低这个子代理的自动压缩窗口（100000 到 1000000 token） |
| `skills` | 启动时预加载进上下文的技能，注入的是**完整内容**而非描述 |
| `mcpServers` | 这个子代理可用的 MCP 服务器 |
| `hooks` | 限定在这个子代理上的生命周期钩子 |
| `memory` | 持久记忆作用域：`user` / `project` / `local`，可跨会话学习 |
| `background` | 设 `true` 则即使主代理要等它也留在后台 |
| `omitClaudeMd` | 启动时不加载用户、项目、本地的 CLAUDE.md |
| `initialPrompt` | 初始提示 |
| `effort` | 该子代理的 effort 档位 |

**字段名拼错是最隐蔽的坑**：Claude Code 会忽略不认识的字段而不报错。排查方法是在 shell 里跑 `claude --debug`，然后在 `~/.claude/debug/*.txt` 里搜 `does not recognize or apply`，它会列出最多 5 个不认识的顶层字段，并在有相近合法字段时给出建议。

## 项目级还是用户级

**结论**：一共有 5 个来源，同名时按优先级生效。

| 位置 | 作用域 | 优先级 |
|---|---|---|
| 托管设置 | 全组织 | 1（最高） |
| `--agents` 命令行旗标 | 当前会话 | 2 |
| `.claude/agents/` | 当前项目 | 3 |
| `~/.claude/agents/` | 你的所有项目 | 4 |
| 插件的 `agents/` 目录 | 启用该插件的地方 | 5（最低） |

- `.claude/agents/` 属于仓库，应该提交；队友 clone 下来就有。
- `~/.claude/agents/` 只属于你，在所有项目里都可用。
- 会话内 `/agents` 可以列出、创建、编辑两类，不用手改文件。

**新建目录要重启**：如果 `~/.claude/agents/` 在会话启动时还不存在，运行中的会话不会发现新建的 `agents` 目录。这时重启 Claude Code 再试。

**插件子代理有安全限制**：出于安全原因，插件子代理**不支持** `hooks`、`mcpServers`、`permissionMode` 三个字段——加载时会被忽略。需要的话就把 agent 文件复制到 `.claude/agents/` 或 `~/.claude/agents/`。

## Claude 什么时候会委派

**结论**：两条路，隐式和显式，指向同一个子代理。隐式是主代理读完所有子代理的 `description`，遇到匹配的任务就委派；显式是在提示里点名，比如「用 code-reviewer 子代理看一下这个 diff」。子代理不能生成子代理，层级只有一层。

委派在 transcript 里表现为一个工具调用行，显示子代理名加一句简短的任务描述，例如 `code-improver(Suggest code improvements)`。

**description 的长度有成本**：所有子代理的 description（内置的除外）加起来超过 **15000 token** 时，Claude Code 会在启动时警告并给出总数。所以 description 要短——细节挪进子代理的系统提示里，那里只在该子代理运行时才加载。

## 为什么子代理更省上下文

**结论**：Claude Code 每轮都重发整个对话。子代理读四十个文件发生在它自己的窗口里，父会话只收到一段话。

大代码库的常见分工是：Haiku 子代理侦察（找出相关文件）、Sonnet 子代理评审（读那几个文件给结论）、主会话只留决策。上下文为什么按平方增长见[为什么 Agent 比聊天更烧 token](why-agents-cost-more-tokens.md)。

## 并行与限流

**结论**：多个子代理可以同时跑；日常个人开发里正常并行一般不受影响。若短时扇出过猛碰到 429，按[Claude Code 报 429 限流怎么办](claude-code-429-rate-limit.md)的顺序处置。

## 子代理不免费

**结论**：每个子代理按自己的 token 计费，它发出的请求计入和主会话同一个用量限制。它省的是主会话的上下文，不是钱；跑很多个并行的 Opus 反而更贵。按 token 计费下要挑档位，固定费率下它才是纯上下文操作。

## 用 --agents 在会话内临时定义

**结论**：不用建文件也能起子代理，适合一次性场景。

```bash
claude --agents '{
  "code-reviewer": {
    "description": "Expert code reviewer. Use proactively after code changes.",
    "prompt": "You are a senior code reviewer. Focus on code quality, security, and best practices.",
    "tools": ["Read", "Grep", "Glob", "Bash"],
    "model": "sonnet"
  }
}'
```

JSON 的每个顶层键是子代理名，值是它的定义。`prompt` 是系统提示（相当于文件版的正文），可以为空。`color` 和 `experimental` 这两个字段不被接受，会被忽略而不是报错。

值校验不通过时 Claude Code 会在启动时报错退出。

## 实战案例

**结论**：两个案例对应子代理的两种典型配置：只读侦察用 `tools` 限定 Read/Grep/Glob 加 `model: haiku`，主会话只收路径；隔离改动用 `isolation: worktree`，让子代理在自己的 worktree 里跑命令。

### 案例 1：只读侦察子代理

```markdown
---
name: locator
description: Finds the files and functions relevant to a question. Use when you need to locate code before reading it in detail.
tools: Read, Grep, Glob
model: haiku
---

Find the files relevant to the question. Return only a list of file paths with one line each.
Do not read whole files. Do not summarize code.
```

关键在 `tools` 不含 Edit/Write，和 `model: haiku`。主会话拿到的只是一串路径。

### 案例 2：隔离运行的子代理

```markdown
---
name: fixer
description: Applies a small fix in an isolated worktree and reports the diff.
tools: Read, Edit, Write, Bash(git *)
model: sonnet
isolation: worktree
---
```

`isolation: worktree` 让子代理在独立 worktree 里跑 Bash 和 PowerShell 命令，不碰你的主检出目录。Claude Code 会拦掉把 git 重定向进主检出的命令，也会拒绝那些从命令文本无法确认 git 留在 worktree 内的命令（比如命令名在运行时才计算出来的）。

注意：子代理从主会话的当前工作目录启动，子代理内部的 `cd` 在 Bash 或 PowerShell 调用之间不保留。

### 案例 3：给它自己的权限模式

```markdown
---
name: reviewer
description: Reviews changes for correctness and security. Use after any non-trivial change.
tools: Read, Grep, Glob, Bash(git diff *)
model: sonnet
permissionMode: plan
maxTurns: 10
---
```

`permissionMode: plan` 让它只读，`maxTurns: 10` 兜住失控循环。

## 怎么选（决策矩阵）

**结论**：按「这个任务是否只产出结论」和「要不要多档位」两个维度决定。

| 你的处境 | 建议 | 原因 |
|---|---|---|
| 任务是「读很多、说一句」 | 交给子代理 | 结果只留结论，上下文不涨 |
| 每次都要跑同样一套指令 | 定义成自定义子代理 | 不用每次重复描述 |
| 要做文件发现、代码搜索 | 用内置 `Explore` | 工具只读，结果挡在主会话外 |
| 要低成本跑侦察 | 自定义 `Explore` + `model: haiku` | 覆盖内置的，保留自己的 model |
| 任务要改文件但怕污染主分支 | `isolation: worktree` | 独立副本 |
| 要防止子代理乱跑 | `tools` 收紧 + `maxTurns` | 权限与轮次双保险 |
| 一次性、只用一次 | `--agents` 命令行传 JSON | 不用建文件 |
| 多个子代理定义同时生效 | 用 `--agents`（优先级 2） | 高于项目级与用户级目录 |

## 最佳实践

**结论**：description 写路由规则，tools 收紧，model 分档。

1. **description 写成触发条件**，不写职位名：「任何非小改动之后用它做评审」而不是「代码评审专家」。
2. **description 保持短**：全部加起来超过 15000 token 会触发启动警告，细节挪进系统提示。
3. **tools 尽量收紧**：只读子代理更可靠，也不容易误改你的代码。
4. **按任务分档**：侦察用 haiku，多数活用 sonnet，难的用 opus。
5. **加 maxTurns**：这是唯一能兜住子代理失控循环的硬上限。

## 进阶技巧

**结论**：进阶配置集中在四处：用 `skills` 字段预加载技能内容、用 `memory` 让子代理跨会话积累、用 `omitClaudeMd` 跳过 CLAUDE.md 加载、统一指定模型以免主会话行为不一致。

### 用 skills 预加载而不是列 Skill 工具

要在子代理启动时把技能内容注入上下文，用 `skills` 字段，而不是在 `tools` 里列 `Skill`——前者注入的是完整内容，不只是描述。

### 用 memory 让子代理跨会话积累

```markdown
memory: project
```

开启持久记忆作用域（`user` / `project` / `local`），子代理能跨会话学习。它会记录你的纠正、你的偏好、项目里无法从代码推导的决策；能从代码推导出来的（架构、文件路径、调试修复）它会跳过。

### 用 omitClaudeMd 减少输入

子代理从委派提示里就能拿到全部需要的信息时，设 `omitClaudeMd: true` 跳过 CLAUDE.md 加载，进一步省上下文。

### 统一所有子代理的模型

想强制所有子代理（包括 `Explore`）跑同一个模型，用 `--agents` 逐个指定，或在设置里配模型顺序。

### 分清子代理、后台会话与 agent teams

三者容易混：

- **子代理**：单个会话内的-worker，生命周期跟着主会话；
- **后台会话**（`claude --bg`）：独立会话，可以在 Claude Code 之外跑并集中监控；
- **agent teams**：多个会话作为有名字的队友协作，共享任务列表、彼此发消息。
