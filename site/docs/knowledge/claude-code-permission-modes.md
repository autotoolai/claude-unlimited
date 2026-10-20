---
layout: page
knowledge: true
title: Claude Code 权限模式有哪些
description: default、acceptEdits、plan、auto、dontAsk、bypassPermissions 六种权限模式的差别，跳过权限到底跳过了什么，无人值守任务怎么配。
category: start
kicker: Claude Code
head:
  - - meta
    - property: og:title
      content: Claude Code 权限模式有哪些 · Claude 知识库
  - - meta
    - property: og:description
      content: 六种权限模式的差别、--dangerously-skip-permissions 跳过了什么、无人值守任务怎么配。
---

# Claude Code 权限模式有哪些

> 正式发布地址：[claude-unlimited.aiautotools.com/knowledge/claude-code-permission-modes](https://claude-unlimited.aiautotools.com/knowledge/claude-code-permission-modes) ｜ 源码与文档：[GitHub 仓库](https://github.com/autotoolai/claude-unlimited)

> **一句话答案**：权限模式决定「哪些动作要问你」。default 和 acceptEdits 只影响文件修改；plan 只读；auto 由一个分类器判断动作是否安全并自动批准；bypassPermissions（`--dangerously-skip-permissions`）跳过常规审批但仍保留少量保护。无人值守的长时间任务用 auto 加 `--permission-prompts none` 最稳，跳过权限只在容器或沙箱里做。

## 六种权限模式

**结论**：六种模式的差别只在「哪些动作会停下来问你」。

| 模式 | 基线行为 | 什么时候用 |
|---|---|---|
| `default` | 每个工具调用都等你批准 | 不确定场景的默认值 |
| `acceptEdits` | 自动接受文件修改；命令仍要批准 | 信任代码库，想少点几下 |
| `plan` | 只读规划，不改任何东西 | 动手前先看方案 |
| `auto` | 分类器判断，安全的自动批准，不安全的拦截 | 长时间无人值守 |
| `dontAsk` | 需要询问的动作一律拒绝，其余直接做 | 脚本与 CI |
| `bypassPermissions` | 跳过常规审批 | 只在容器或一次性沙箱里 |

`default` 会话内按 `Shift+Tab` 循环切换，也可以用 `/permissions` 随时改。切换到 `auto` 需要对应的模型与账号支持；不满足时用启动参数指定它不会生效。

## --dangerously-skip-permissions 到底跳过了什么

**结论**：它跳过的是常规权限审批，不是所有检查。危险的删除操作在 bypass 和 auto 模式下仍会先等待再拒绝，不会静默执行。

```bash
claude --dangerously-skip-permissions
# 等价写法
claude --permission-mode bypassPermissions
```

这两个都不会导致「每个动作都必须成功」或「Claude Code 再也不会问你任何问题」。官方明确建议只在隔离环境（容器、一次性沙箱、可以随时丢弃的虚拟机）里用。

## --allow-dangerously-skip-permissions 是什么

**结论**：它只是让 bypass 模式「可用」，不会立刻激活。

```bash
claude --permission-mode plan --allow-dangerously-skip-permissions
```

这条命令以计划模式启动，同时保留中途切到 bypass 的能力。`allow` 这个词是关键：没有它，`bypassPermissions` 在很多账号上压根不能被选中。

## 「不问我」有两种意思

**结论**：「自动批准动作」和「永不因权限提示停下」是两个不同目标，配置方式不同。

- 想自动批准 → `auto` 模式，由分类器逐个判断。
- 想永不因权限提示停下 → `auto` 加 `--permission-prompts none`：本来会弹提示的动作一律拒绝，会话在允许的范围内继续。
- 想全部放行 → `bypassPermissions`，只在隔离环境。

## 无人值守跑长任务怎么配

一个比较稳的组合：

```bash
claude \
  --permission-mode auto \
  --permission-prompts none \
  --max-turns 30 \
  -p "重构 src/legacy 目录下的三个模块，保持公开 API 不变，跑测试"
```

- `--permission-mode auto`：安全的自动做；
- `--permission-prompts none`：不会有人来点批准，不会的东西直接拒绝；
- `--max-turns`：即使它绕不出来也只烧 30 轮；
- `-p`：非交互，输出完就退出，适合 cron 与 CI。

这组参数的完整列表在[命令与参数速查](/knowledge/claude-code-cli-cheatsheet)；`--max-turns` 为什么能兜住失控的循环，见[报 429 限流怎么办](/knowledge/claude-code-429-rate-limit)。

## 为什么在项目设置里配 auto 没反应

**结论**：`defaultMode` 在项目的 `.claude/settings.json` 和 `.claude/settings.local.json` 里不接受 `auto` 和 `bypassPermissions`，出于安全设计这两项被限制。

要设为默认，写到用户设置 `~/.claude/settings.json`；或每次启动用 `--permission-mode auto` 显式指定。

## 和隔离措施一起用

**结论**：权限模式只是其中一层，容器与沙箱是另一层。跳过权限 + 一次性容器，是跑陌生代码或批量任务时唯一稳妥的组合。先在本地把动作验证过再放进这个组合，见[Claude Code 教程](/knowledge/claude-code-tutorial)。

至少把工作目录放在容器里、网络出站限制到 API 端点、容器可随时销毁。

