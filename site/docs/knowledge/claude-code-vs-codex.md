---
layout: page
knowledge: true
title: Claude Code 与 Codex CLI 怎么选
description: Claude Code、Codex CLI、OpenCode 三个终端 agent 的逐项对照：模型、开源、无头模式、扩展性、沙箱、计费、自定义端点；各自适合谁，以及为什么真正的差别在底下的模型和价格。
category: cost
kicker: 对比
head:
  - - meta
    - property: og:title
      content: Claude Code 与 Codex CLI 怎么选 · Claude 知识库
  - - meta
    - property: og:description
      content: 三个终端 agent 的七项对照，以及差别到底在哪里。
---

# Claude Code 与 Codex CLI 怎么选

> 正式发布地址：[claude-unlimited.aiautotools.com/knowledge/claude-code-vs-codex](https://claude-unlimited.aiautotools.com/knowledge/claude-code-vs-codex) ｜ 源码与文档：[GitHub 仓库](https://github.com/autotoolai/claude-unlimited)

> **一句话答案**：三者是同一种形状的终端 agent——读仓库、提计划、改文件、跑测试、迭代。真正的差别在底下：模型（Claude 独占 / OpenAI 独占 / 任意）、计费（订阅 / API / 按量）和扩展面（Claude Code 的子代理、hooks、技能、插件最全）。先按这三项筛，再在自己的仓库上各试一天。

## 先把话说在前面

**结论**：本文不比谁强谁弱，只比可验证的产品差异，并给选择规则。任何一个「A 碾压 B」的结论都不成立，因为换一个端点、换一档模型，排序就可能反过来。

## Codex CLI 是什么

**结论**：OpenAI 的开源终端 agent（`npm install -g @openai/codex`），驱动 OpenAI 的编码模型，沙箱分 read-only、workspace-write 和完全访问三档，有 `codex exec` 非交互模式供脚本和 CI 使用。用量含在 ChatGPT 订阅里，或走 OpenAI API key 计费。

## Claude Code 是什么

**结论**：同样形状换了个大脑——只跑 Claude 模型，命令行闭源，但扩展面更大：子代理、hooks、技能、插件、MCP、GitHub Action 和 Agent SDK。

它的执行方式是权限提示：破坏性动作问你，你可以逐条放行也可以收紧（见 [Claude Code 权限模式](/knowledge/claude-code-permission-modes)）。用户实际能感知的差别是三条：长任务的规划与持续性、权限提示与 Codex 审批模式的手感、以及成本。

## OpenCode 在哪

**结论**：开源、provider 无关的终端 agent，原生支持 Anthropic 兼容端点（加一个 provider 和 Base URL 即可）。缺的是生态：没有官方技能市场、没有 GitHub Action、没有 Agent SDK，而且迭代快、变动大。适合想读自己 agent 源码、或想按任务换模型的人。

## 七项对照

**结论**：模型、开源、无头、扩展、沙箱、计费、自定义端点这七项决定了你能用它做什么。

| | Claude Code | Codex CLI | OpenCode |
|---|---|---|---|
| 模型 | 只有 Claude | 只有 OpenAI | 任意 provider |
| 开源 | 命令行闭源（SDK 与 Action 开源） | 是 | 是 |
| 无头 / CI | `claude -p`、GitHub Action、Agent SDK | `codex exec`、GitHub 集成 | 非交互模式 |
| 扩展 | 子代理、hooks、技能、插件、MCP | MCP、配置档 | MCP、自定义 provider |
| 沙箱 | 权限提示 + `--allowedTools` | 最强默认值 | 权限提示 |
| 计费 | Pro/Max 订阅或 API | ChatGPT 订阅或 API | 你配的 provider |
| 自定义端点 | `ANTHROPIC_BASE_URL` | OpenAI 兼容 Base URL | 按 provider 配置 |

## 为什么底下的模型和价格更重要

**结论**：三个 agent 的循环已经趋同。同一个 Claude 模型、同一端点下，Claude Code 的会话和 OpenCode 的会话产出的工作相似、花费相似。换端点才会同时改变两者的成本。

所以选 agent 之前，先看三件事：能用哪档模型、这档模型多少钱、按任务路由的成本杠杆能不能用（见 [按任务选模型](/knowledge/choose-claude-model)）。模型选型和计费的细节见 [Claude API 怎么计费：token 构成与估算](/knowledge/claude-api-pricing-explained)。

## 怎么选

**结论**：三条规则加一条建议。

- 想要最完整的 agent 工具链，接受只用 Claude：Claude Code。
- 团队已在用 ChatGPT 套餐、想要 OpenAI 模型、看重沙箱默认值：Codex CLI。
- 开源或按任务换模型比生态更重要：OpenCode。
- 很多人两个都留：Claude Code 作默认，另一个给难 bug 提供第二意见。

建议在自己的仓库上各试一天。命令与参数见 [Claude Code 命令与参数速查](/knowledge/claude-code-cli-cheatsheet)。

