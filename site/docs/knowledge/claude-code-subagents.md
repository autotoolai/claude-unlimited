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

> **一句话答案**：子代理是在自己上下文窗口里完成一块任务、只把一段结论交回主会话的执行者。在 `.claude/agents/<name>.md` 里用一个 Markdown 文件定义它，靠 `description` 决定什么时候自动委派，靠 `tools` 收紧它能做什么，靠 `model` 固定档位。它省的是主会话的上下文，不是钱；并行的每个子代理各占一个并发位。

大代码库里最容易失控的不是模型能力，是主会话的上下文。一个读了四十个文件的任务，那些文件会在此后每一轮被重新发一次，账单和速度一起变差。把这类「读很多、说一句」的活交给子代理，主会话只留下它的结论。

## 子代理是什么

**结论**：子代理有自己独立的上下文窗口，只看到主会话递给它的东西加它自己读到的，返回结果由主会话摘要进自己的历史。

它和「在同一个会话里让它分几步做」的区别就在这个独立窗口：主会话不需要为子代理读过的每一行内容付费。与它并列的编排方式还有[计划模式](/knowledge/claude-code-plan-mode)（先想清楚再动手）和权限模式（决定实施阶段谁能直接做）。

## 怎么定义一个子代理

**结论**：在 `.claude/agents/` 下建一个以子代理名命名的 Markdown 文件，frontmatter 写四个字段，正文写它要做什么、做到什么程度、什么时候停。

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
| `name` | 你怎么点名调用它 | 与文件名一致，全小写 |
| `description` | Claude 决定要不要自动委派的唯一依据 | 写成「什么时候用我」的路由规则，不是职位名 |
| `tools` | 限定它能用什么工具 | 收紧是安全设计：不能编辑的评审者更可靠 |
| `model` | 固定档位 | `haiku` 做侦察与分类、`sonnet` 做多数活、`opus` 做难的那一步、`inherit` 跟随父会话 |

`description` 写错是常见失败点。写成「代码评审专家」基本不会被匹配到，写成「任何非小改动之后用它做评审」才会。

## 项目级还是用户级

**结论**：两个目录，同名时项目级优先。项目级随仓库提交，团队每个人拿到同一个评审、测试、迁移子代理。

- `.claude/agents/` 属于仓库，应该提交；队友 clone 下来就有。
- `~/.claude/agents/` 只属于你，在所有项目里都可用。
- 会话内 `/agents` 可以列出、创建、编辑两类，不用手改文件。

## Claude 什么时候会委派

**结论**：两条路，隐式和显式，指向同一个子代理。隐式是主代理读完所有子代理的 `description`，遇到匹配的任务就委派；显式是在提示里点名，比如「用 code-reviewer 子代理看一下这个 diff」。子代理不能生成子代理，层级只有一层。

## 为什么子代理更省上下文

**结论**：Claude Code 每轮都重发整个对话。子代理读四十个文件发生在它自己的窗口里，父会话只收到一段话。

大代码库的常见分工是：Haiku 子代理侦察（找出相关文件）、Sonnet 子代理评审（读那几个文件给结论）、主会话只留决策。上下文为什么按平方增长见[为什么 Agent 比聊天更烧 token](/knowledge/why-agents-cost-more-tokens)。

## 并行与限流

**结论**：多个子代理可以同时跑，每个都是一个并行的流式请求，这是撞上并发请求上限最快的方式。新环境从两个或三个并行起步，工作负载真实了再提额。撞上限时按[429 限流怎么处理](/knowledge/claude-code-429-rate-limit)的顺序处置。

## 子代理不免费

**结论**：每个子代理按自己的 token 计费。它省的是主会话的上下文，不是钱；跑很多个并行的 Opus 反而更贵。按 token 计费下要挑档位，固定费率下它才是纯上下文操作。

## agent teams 是什么

**结论**：较新的 Claude Code 版本有 agent teams：不是一个父代理委派给短命的子代理，而是多个会话作为有名字的队友协作，共享任务列表、彼此发消息，lead 可以派活、查状态、停掉某个队友。它是实验能力，随版本变化，查 `claude --help` 和更新日志里的当前开关，不要照着博客设。心智模型和子代理一样（多了持久化和通信），成本模型也一样（按队友数倍增）。