---
layout: page
knowledge: true
title: Claude 提示用量上限：分清是哪个计量器
description: 订阅窗口、控制台消费上限、余额不足、服务端临时限流四类消息的区分与处理；为什么同机同时有 Key 与订阅时 Key 优先；/status 是排查账单问题的第一步。
category: troubleshoot
kicker: 排错
head:
  - - meta
    - property: og:title
      content: Claude 提示用量上限：分清是哪个计量器 · Claude 知识库
  - - meta
    - property: og:description
      content: 四类用量消息的区分与处理，/status 是排查账单问题的第一步。
---

# Claude 提示用量上限：分清是哪个计量器

> 正式发布地址：[claude-unlimited.aiautotools.com/knowledge/claude-code-usage-limit-reached](https://claude-unlimited.aiautotools.com/knowledge/claude-code-usage-limit-reached) ｜ 源码与文档：[GitHub 仓库](https://github.com/autotoolai/claude-unlimited)

> **一句话答案**：看到「用量上限」先看消息来自哪个计量器。订阅的会话 / 周 / Opus 窗口按计划时间重置，没法修；控制台的指定消费上限与预付余额不足不是 bug，只能改设置或充值；括号里写着「not your usage limit」的是服务端临时限流，等一分钟续跑。`/status` 显示当前是订阅还是 Key 在计费，是排查这类问题的第一步。

## 四类消息

**结论**：同样一句「用完了」，来源不同、处理方式完全不同。

```text
You've hit your session limit · resets 3pm
You've hit your weekly limit · resets Thu 9am
You've hit your Opus limit · resets Thu 9am
Usage credits are required for this model
You have reached your specified API usage limits. You will regain access on 2026-10-01 at 00:00 UTC.
Your credit balance is too low to access the API.
API Error: Server is temporarily limiting requests (not your usage limit) · Rate limited
```

## 订阅窗口（Pro / Max）

**结论**：前三条是订阅的滚动窗口：会话窗口（几小时后重置）、周窗口、以及顶级档位单独的周窗口。它们按 token 而不是消息消耗，所以带子智能体的长会话掉得比聊天快得多。

`/usage` 看当前状态，`/stats` 看是什么消耗的。消息里带重置时间，没有可修的东西。

两点值得知道：

- **重置锚点是每个账户固定的**，同套餐不同用户重置日不同。
- **计量器可能在你没干活时自己往上走**：后台会话、定时任务、重试循环都可能消耗。如果你闲置时用量也在涨，先查这些。

## 「Usage credits are required for this model」

**结论**：这条最容易误解——它出现在套餐还有额度的时候。意思是：你选的模型或窗口档位在套餐之外，需要额外的用量 credits 才能用。

最常见的触发是选了默认 1M 窗口的模型变体。在 `/model` 里选非 1M 变体，或设 `CLAUDE_CODE_DISABLE_1M_CONTEXT=1`。如果模型明明在套餐内却报了这条，先看状态页再考虑买任何东西——有几次是服务端事件与这条文案同时出现。

## 控制台计费：指定上限与余额不足

**结论**：这两条来自 API Key，不是订阅。

- **达到指定用量上限**：组织在控制台设置的月度消费上限，到了就停，消息里的日期一到或管理员调高后恢复。
- **余额不足**：预付余额用完了。API 是预付制，余额为空就没有调用。

两者都不是 bug，`/compact`、重启、重装都没用。

**同机同时有 Key 和订阅时 Key 优先**：环境里存在 `ANTHROPIC_API_KEY` 时，即使你以为自己在用 Max，实际也按 Key 计费。这就是有人撞上「从不知道自己设过的上限」的原因。`/status` 直接告诉你当前是哪一个。

## 「not your usage limit」

**结论**：括号里的话是全部重点——服务端在高峰时限流，你的额度没动。

等一分钟，用 `claude -c` 续跑；无人值守的运行设 `CLAUDE_CODE_RETRY_WATCHDOG=1`，让它重试而不是退出。它和 529 的处理思路一致，见 [529 怎么处理](/knowledge/claude-code-529-overloaded)。

## 怎么继续工作

**结论**：窗口是订阅的机制，API 没有。把同一个 Claude Code 指向一个 API 端点，按 token 计费，没有会话窗口也没有周窗口。

```bash
export ANTHROPIC_BASE_URL=<你的网关地址>
export ANTHROPIC_API_KEY=<你的 Key>
claude          # 按 token 计费，没有会话或周窗口
```

订阅重置后再取消环境变量切回来。注意每分钟速率限制（429）是另一套机制，见[429 怎么处理](/knowledge/claude-code-429-rate-limit)。

