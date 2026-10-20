---
layout: page
knowledge: true
title: 提示缓存原理：什么时候省钱、什么时候白花
description: 提示缓存按前缀命中计费：什么是好的缓存对象、cache_control 怎么标、顺序为什么重要、怎么验证命中（cache_read），以及它什么时候不省。
category: how
kicker: 原理
head:
  - - meta
    - property: og:title
      content: 提示缓存原理：什么时候省钱、什么时候白花 · Claude 知识库
  - - meta
    - property: og:description
      content: 按前缀命中的计费逻辑、cache_control 用法、命中验证与不省的情况。
---

# 提示缓存原理：什么时候省钱、什么时候白花

> 正式发布地址：[claude-unlimited.aiautotools.com/knowledge/prompt-caching-explained](https://claude-unlimited.aiautotools.com/knowledge/prompt-caching-explained) ｜ 源码与文档：[GitHub 仓库](https://github.com/autotoolai/claude-unlimited)

> **一句话答案**：提示缓存把你请求的一段前缀存下来，之后共享这段前缀的调用按更低的输入价计费。适合缓存系统提示、工具定义、被反复提问的文档、固定示例；不适合缓存用户最新消息、含时间戳的前缀、以及太短的提示。验证方法：看响应 usage 里有没有 cache_read 计数。

## 缓存的工作方式

**结论**：缓存按前缀工作。请求里从开头到标记点的那一段被存下来，之后每次请求只要这段逐字相同，就按缓存读取价计费；只要有一个字节不同，其后所有内容全部失效。

这意味着两件事：稳定内容必须放在前面，易变内容必须放在后面；以及「缓存」不是压缩，它不减少 token 数量，只是让同一段 token 更便宜。

## 什么是好的缓存对象

**结论**：任何「每次调用都逐字相同」且足够长的内容。

| 适合缓存 | 原因 |
|---|---|
| 系统提示 | 一次会话里逐字相同 |
| 工具 / 函数定义 | 整个 agent 运行期间稳定，而且往往很长 |
| 被反复提问的文档 | 一次上传，多次提问 |
| Few-shot 示例 | 固定，而且经常很长 |

| 不适合缓存 | 原因 |
|---|---|
| 用户最新消息 | 每次都变，永远不命中 |
| 靠前位置的时间戳或请求 ID | 前缀里一个变化的字节，后面全部失效 |
| 很短的提示 | 低于最小可缓存长度，没有收益 |

## 怎么标记

在 `system` 数组的文本块上加 `cache_control`：

```json
{
  "model": "claude-sonnet-5-5",
  "max_tokens": 1024,
  "system": [
    {
      "type": "text",
      "text": "<很长的、稳定的指令与工具说明……>",
      "cache_control": { "type": "ephemeral" }
    }
  ],
  "messages": [
    { "role": "user", "content": "每次都在变的问题" }
  ]
}
```

从请求开头到被标记的块（含）构成缓存前缀。顺序很重要：稳定内容在前，易变内容在后。

## 怎么验证真的命中了

**结论**：看响应里的 usage 对象。命中的 token 记在 `cache_read_input_tokens`（简称 cache_read）下面，而不是普通输入里。

如果重复调用的 cache_read 一直是 0，说明你的前缀其实并不逐字相同。常见原因：

- 前缀里拼了时间戳、随机数或请求 ID；
- JSON 序列化的键顺序不稳定；
- 会话中间重写了 CLAUDE.md。

## Claude Code 里的缓存

**结论**：Claude Code 的 33k 启动前缀天然适合缓存，但它只在你保持前缀稳定时有效。会话中途改 CLAUDE.md 会让缓存从改动点之后全部失效。

把它和「启动时那 33k token 去了哪」放在一起理解更清楚，见 [Claude Code 启动时那 33k token 去了哪](/knowledge/claude-code-startup-tokens)。

## 上线前的检查清单

- 至少有一段几千 token 以上的稳定前缀？
- 它排在所有动态内容之前？
- 序列化是确定性的？
- 能记录缓存创建与缓存读取的 token 数？
- 知道预期在缓存有效期内复用多少次？

三项以上是「否」，缓存可能仍然有效，但你其实是在猜。

## 什么时候缓存不省

**结论**：前缀每次都不同（多租户定制、请求 ID、时间戳混进系统提示）、提示太短、或者本来就不重复。缓存的经济学是「一次创建成本 + 多次低价读取」，没有复用就没有收益。

把不确定的内容从系统提示里挪出去，见[降低 Claude 用量的工程方法](/knowledge/reduce-token-usage-tips)；按场景决定哪类请求值得缓存，见[按任务选模型](/knowledge/choose-claude-model)。

