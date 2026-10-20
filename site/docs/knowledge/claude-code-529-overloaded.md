---
layout: page
knowledge: true
title: Claude 报错 529 overloaded 怎么处理
description: 529 是模型容量不足不是额度问题：常见触发（模型发布、美国工作时间、自己的子代理扇出）、五步处理，以及 529、500、429 三者的区别。
category: troubleshoot
kicker: 排错
head:
  - - meta
    - property: og:title
      content: Claude 报错 529 overloaded 怎么处理 · Claude 知识库
  - - meta
    - property: og:description
      content: 529 是容量问题：五步处理，以及它与 500、429 的区别。
---

# Claude 报错 529 overloaded 怎么处理

> 正式发布地址：[claude-unlimited.aiautotools.com/knowledge/claude-code-529-overloaded](https://claude-unlimited.aiautotools.com/knowledge/claude-code-529-overloaded) ｜ 源码与文档：[GitHub 仓库](https://github.com/autotoolai/claude-unlimited)

> **一句话答案**：529 是模型那一刻没有空闲容量，不是你的额度问题，影响所有用这个模型的人，会自己恢复。让 Claude Code 把内置重试跑完、用 `/model` 换一档、减少同时运行的子代理，大任务避开高峰；它和 500（服务端故障）、429（你自己的速率上限）不是一回事。

## 529 是什么意思

**结论**：HTTP 529、错误类型 `overloaded_error`，表示上游模型此刻没有空闲容量。

```text
API Error (529 {"type":"error","error":{"type":"overloaded_error","message":"Overloaded"}}) · Retrying in 1 seconds… (attempt 1/10)
```

它发生在请求发出之后、响应之前，与你的账户状态无关。碰到同一条错误反复出现，先对照[429 限流](/knowledge/claude-code-429-rate-limit)确认不是自己撞了速率上限。

## 什么会触发

**结论**：三类原因，最后一类最容易被忽略。

1. **需求高峰**：新模型发布时，以及美国工作时间的早晨，是经典的峰值时段；最新的旗舰档位竞争最激烈。
2. **你自己的扇出**：一个编排器同时启动 N 个子代理，它们在同一分钟一起打过去，整批在同一分钟失败。
3. **任务丢失**：部分情况下 529 会终止后台子代理而不是重试它——一次扇出不只是变慢，还会丢任务。

## 五步处理

**结论**：从上到下。

1. **让内置重试跑完**。多数 529 在 10 次尝试内消失。
2. **`/model` 换档**。这一步是当前任务继续；忙完再切回来。换哪一档合适见[按任务选模型](/knowledge/choose-claude-model)。
3. **减少并发并错峰**。不要同时启动十个第一请求；给扇出加延迟或改成串行。
4. **显式重跑丢失的子任务**。检查每个分支是否真的完成。
5. **大任务避开高峰**。长时间自主运行在美国工作时间之外撞上容量的概率低得多。

## 529、500、429 三者的区别

| 错误 | 含义 | 归谁 |
|---|---|---|
| 529 | 模型容量不足 | 所有人，等或换档 |
| 500 | 服务端故障 | 上游，看状态页 |
| 429 | 你超了自己的速率上限 | 你，减少并发或压缩上下文 |

具体的并发和 token 速率数字见[常见问题](/faq)。

