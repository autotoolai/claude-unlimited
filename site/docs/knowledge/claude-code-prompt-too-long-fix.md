---
layout: page
knowledge: true
title: prompt too long 报错怎么处理
description: 「prompt is too long」「context limit reached」的完整处理：先 /context 看窗口被什么填满，再按优先级释放；/compact 与 /clear 的区别。
category: troubleshoot
kicker: 排错
head:
  - - meta
    - property: og:title
      content: prompt too long 报错怎么处理 · Claude 知识库
  - - meta
    - property: og:description
      content: 先 /context 看窗口被什么填满，再按优先级释放；/compact 与 /clear 的区别。
---

# prompt too long 报错怎么处理

> **一句话答案**：先 `/context` 看上下文窗口被什么填满，再 `/compact` 压缩；还是不行就 `/clear` 重开。这是 400 错误，不是网络问题，重试没用。

「prompt is too long」「input is too long for requested model」「context limit reached」是同一类问题：一次请求的内容超过了模型的上下文窗口。

## 这个报错到底是什么

**结论**：HTTP 400，请求里的内容（系统提示 + 对话历史 + 工具结果 + 你这次的输入）加起来超过了模型的上下文窗口。重试不会成功，因为下一次还是同样长。

Claude Code 这类 agent 工具的官方标准窗口是 200k token，我们不对每一档模型的实测上限做承诺。200k 听起来很大，但 agent 会话会不断累积：每轮对话、每次工具调用的结果、CLAUDE.md、MCP 工具的描述，都会被重新发送。

## 先看 /context 定位元凶

**结论**：不要猜，先 `/context`。它会列出窗口里每一部分占了多少 token，你能立刻看出是大文件、长对话历史、还是 MCP 工具描述占了大头。

## 按优先级释放

按代价从低到高处理：

1. **`/compact`**：把前面的对话历史压缩成摘要，保留关键决定，释放大量空间。适合「话题没变但聊了太久」。
2. **减少一次性粘贴**：不要一次贴整个大文件或长日志，先让它读相关片段，或你手动摘出报错部分。
3. **关掉用不到的 MCP 工具与连接器**：每个启用的工具都会在每轮请求里带上它的描述，累积起来很可观。
4. **`/clear`**：完全清空，重新描述任务。适合「话题已经变了」或 `/compact` 也压不动的情况（比如一整轮都是巨大的工具输出，没有可折叠的旧对话）。

## /compact 与 /clear 的区别

| 命令 | 做什么 | 什么时候用 |
|---|---|---|
| `/compact` | 把历史压缩成摘要，保留关键决定 | 同一话题聊太久，历史太长 |
| `/clear` | 清空全部，重新开始 | 换任务、或 `/compact` 失败 |

**结论**：能 `/compact` 就不 `/clear`。`/compact` 保留了「我们刚才决定这么做」的上下文，`/clear` 之后你要重新交代背景。

## 什么时候它会在没满的时候也报

**结论**：如果 `/context` 显示远没到上限却仍报错，当成误报处理，直接 `/compact` 继续。这类 bug 在 issue  tracker 上有记录，不是你的配置问题。

## 怎么预防

**结论**：把「话题一变就 `/compact`，不相关的任务之间 `/clear`」当成习惯。这是最有效的成本控制手段，比省着用更管用。

另外注意：选模型时先看窗口大小。网关上标着 1M 的变体，实测与普通档相同，只是多一层「需要额外用量」的限制，不要选它。以 `/context` 报告的当前窗口为准。

窗口是被什么填满的，直接决定该释放哪一块，见[启动时那 33k token 去了哪](/knowledge/claude-code-startup-tokens)；工具输出为什么是最大的一块，见[为什么 Agent 比聊天更烧 token](/knowledge/why-agents-cost-more-tokens)。

每次压缩仍会重发全部内容，所以在服务端侧还有更省的办法，见[降低 Claude 用量的工程方法](/knowledge/reduce-token-usage-tips)。