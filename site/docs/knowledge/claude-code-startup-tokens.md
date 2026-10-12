---
layout: page
knowledge: true
title: Claude Code 启动时那 33k token 去了哪
description: 冷启动约 33k token 的构成：系统提示、工具定义、MCP 工具 schema、环境上下文与 CLAUDE.md；三个可控杠杆与提示缓存的关系。
category: how
kicker: 原理
head:
  - - meta
    - property: og:title
      content: Claude Code 启动时那 33k token 去了哪 · Claude 知识库
  - - meta
    - property: og:description
      content: 33k 启动 token 的构成，三个可控杠杆，以及它与提示缓存的关系。
---

# Claude Code 启动时那 33k token 去了哪

> **一句话答案**：在你输入第一句话之前，Claude Code 已经发出约 33k token 的固定前缀：系统提示约 3k–5k、工具定义约 15k–20k（最大的一块）、环境上下文约 2k–4k、你的 CLAUDE.md 0–10k 不等。最大头是工具 schema，所以清理 MCP 服务器和精简 CLAUDE.md 是收益最高的两个动作。

## 33k 由什么构成

**结论**：工具定义是最大头，不是系统提示。

| 部分 | 大致 token | 说明 |
|---|---|---|
| 系统提示词 | 3k–5k | 固定 |
| 工具 / 函数定义 | 15k–20k | 最大头；每个工具的 JSON Schema 含嵌套参数描述，常占 500–1,500 token |
| 环境上下文 | 2k–4k | 工作目录、Git 状态、平台信息等 |
| CLAUDE.md 等项目指令 | 0–10k+ | 你写多少就是多少 |

作为对比，开源工具 OpenCode 的同类冷启动约 7k。差别主要来自工具集的大小和描述的详细程度。

## 三个可控杠杆

**结论**：按收益排序：清理 MCP 服务器与闲置工具 → 精简 CLAUDE.md → 接受它。

### 1. 清理 MCP 服务器与闲置工具

```bash
claude mcp list     # 看当前连接了哪些
claude mcp remove <名字>
```

每个注册的 MCP 服务器都会把自己的工具 schema 贡献到每一次请求里。装了几个重量级的 MCP 服务器，冷启动轻易翻倍。

在设置文件里 `permissions` 的 `allow` / `deny` 里关掉这个项目用不到的工具（例如 `deny` 掉从不用的 WebFetch），同样能减掉这一块的固定成本。

### 2. 精简 CLAUDE.md

只留真正会改变它行为的规则。模型默认就会做的事不要写，深层文档改成按需引用而不是整段粘进去。写法见 [The.md 怎么写](/knowledge/claude-md-guide)。

会话里 `/context` 会告诉你各类内容各占多少；The.md 占比过高时先改这里。官方建议根文件控制在 200 行以内，更长的内容拆到子目录的 CLAUDE.md 或 `.claude/rules/` 的路径规则里。

### 3. 接受它

33k 换的是即时的工具能力和更少的往返。精简它只是把固定成本换成变成本：启动轻了，每一轮却要多付搜索和解释的成本。任务密集时固定成本会被摊薄，通常更划算。

## 和提示缓存的关系

**结论**：这 33k 是一个前缀。稳定的前缀会被提示缓存命中，之后每一轮按更低的缓存读取价计费。

缓存是按前缀工作的，所以在会话中途改 CLAUDE.md，会让它之后的内容全部失效。稳定的 33k 前缀，可能比每轮重建的 7k 前缀更便宜。

实操上：把静态内容放在前面，易变内容放在消息里，不要中途重写 CLAUDE.md。机制细节见[提示缓存原理](/knowledge/prompt-caching-explained)。

## 这不是浪费

**结论**：它是固定成本换来的能力，不是乱花的钱。衡量它的正确口径是「每个任务的总 token」，而不是「第一次请求有多大」。

一次真正的重构任务里，几十轮对话的总量往往是几千到两万；启动的 33k 摊到整个任务上并不显眼。频繁开短会话、每次只问一句话的人，启动成本占比才会高。