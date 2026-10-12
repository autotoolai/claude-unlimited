---
layout: page
knowledge: true
title: CLAUDE.md 怎么写：写什么、放哪
description: CLAUDE.md 该写什么、放在哪；2.1.277 起 AGENTS.md 在什么条件下会被读取；四个读取模式怎么选；设置、命令、子代理、技能分别放在 .claude 目录的哪里。
category: start
kicker: Claude Code
head:
  - - meta
    - property: og:title
      content: CLAUDE.md 怎么写：写什么、放哪 · Claude 知识库
  - - meta
    - property: og:description
      content: CLAUDE.md 写什么放哪，AGENTS.md 何时被读，.claude 目录各文件用途。
---

# CLAUDE.md 怎么写：写什么、放哪

> **一句话答案**：CLAUDE.md 是每次会话都读入上下文的纯文本说明书，放构建与测试命令、代码约定、架构边界、工作流规则。Claude Code 2.1.277 起，当项目里没有任何符合条件的 CLAUDE.md 时会回退读 AGENTS.md；想在 /config 里把「项目指引」改成两者都读，选 claude-md-and-agents-md。

## CLAUDE.md 是什么，写什么

**结论**：它是纯文本 Markdown 文件，Claude Code 每次会话都读进上下文。用来记录你本来要反复交代的东西，官方建议覆盖四块：

- **构建与测试命令**：贡献者应该跑什么来构建和检查改动；
- **代码约定**：命名、格式、与这个仓库相关的其它规范；
- **项目架构**：主要组件以及它们怎么组合；
- **工作流规则**：改完和检查改动时希望它遵循的步骤。

`/init` 能根据项目生成一份初稿。它没有必须的文档格式，普通 Markdown 标题和列表就够。

**重要区别**：它是指令，不是配置。写进去的规则会进上下文，但不会被强制执行；要真正配置 Claude Code 的行为，用设置文件，不要指望 CLAUDE.md 里的散文变成设置值。

## 放在哪里

**结论**：按官方文档，四层位置的加载顺序是：企业托管策略 → 用户级 `~/.claude/CLAUDE.md` → 项目级 `./CLAUDE.md` 或 `./.claude/CLAUDE.md` → 本地 `./CLAUDE.local.md`。

| 位置 | 内容 | 谁会读到 |
|---|---|---|
| 托管策略目录（macOS `/Library/Application Support/ClaudeCode/CLAUDE.md`、Linux/WSL `/etc/claude-code/CLAUDE.md`、Windows `C:\Program Files\ClaudeCode\CLAUDE.md`） | IT/DevOps 统一管理的编码规范、安全与合规要求 | 组织内所有人 |
| `~/.claude/CLAUDE.md` | 个人偏好，所有项目通用 | 只有你 |
| `./CLAUDE.md` 或 `./.claude/CLAUDE.md` | 项目架构、编码规范、常用工作流 | 团队成员（随源码提交） |
| `./CLAUDE.local.md` | 只在当前项目里的个人偏好，建议加进 `.gitignore` | 只有你 |

放在哪一层决定了它对谁生效、能不能进版本库。团队约定写进项目根的 CLAUDE.md 并提交，个人偏好写进 `~/.claude/CLAUDE.md`。

子目录里还可以放自己的 CLAUDE.md：Claude 进入该目录工作时才会读它。把只对部分代码有效的规则拆进子目录的 CLAUDE.md 或 `.claude/rules/` 的路径规则，比全部堆在根文件里更省上下文。

## AGENTS.md 什么时候会被读

**结论**：2.1.277 起，Claude Code 会在项目里没有任何符合条件的 CLAUDE 指令文件时回退读根目录的 AGENTS.md；官方文档的表述是「`./AGENTS.md` 在 `./CLAUDE.md` 缺失时替代它加载，也可以与它并存」。

「符合条件」指从文件系统根到工作目录的路径上找到了 `CLAUDE.md`、`.claude/CLAUDE.md` 或 `CLAUDE.local.md` 任意一个。有一个，就不读 AGENTS.md。注意 `~/.claude/CLAUDE.md` 和 `.claude/rules/` 不构成抑制。

这是个容易踩的点：你在 `~/.claude/CLAUDE.md` 里写了很多项目规则，但项目根没有 CLAUDE.md，那 AGENTS.md 仍然会被读；而你随手加一个 `CLAUDE.local.md`，AGENTS.md 又突然不读了。

## 四个读取模式怎么选

在 `/config` 里找到 **Project instructions**，四个值：

| 模式 | 行为 |
|---|---|
| `claude-md-or-agents-md` | 默认：读 CLAUDE.md，没有才读 AGENTS.md |
| `claude-md-and-agents-md` | 两个都读 |
| `claude-md` | 只读 CLAUDE.md |
| `managed-only` | 只读托管设置指定的文件 |

想让一个团队用多工具共享一份 `AGENTS.md`，同时项目里也有 CLAUDE.md，那就选 `claude-md-and-agents-md`；或者在 CLAUDE.md 里写 `@AGENTS.md` 导入邻近目录的指令。

这层指令每轮会话都会重发，长文件尤其明显，写的时候按这个成本来取舍，见[降低 Claude 用量的工程方法](/knowledge/reduce-token-usage-tips)。

**限制**：这项配置属于 plugin 配置，只能写在用户设置 `~/.claude/settings.json`、`--settings` 传入的文件或托管设置里，项目级 `.claude/settings.json` 不生效，改动下次重载后生效。

同样的项目级/用户级优先级问题在子代理上也会出现，见[子代理怎么用](/knowledge/claude-code-subagents)。

## .claude 目录里各放什么

**结论**：`.claude/` 是项目级设置的根，按功能分文件：

| 路径 | 内容 |
|---|---|
| `.claude/settings.json` | 项目设置（权限、环境变量、hooks 配置） |
| `.claude/CLAUDE.md` | 项目指令 |
| `.claude/commands/` | 自定义斜杠命令 |
| `.claude/agents/` | 子代理定义 |
| `.claude/skills/` | 技能 |
| `.claude/rules/` | 按路径匹配的补充规则 |
| `~/.claude/auto-memory/` | Claude 自动保存的记忆 |

版本库里建议提交 settings.json、commands、agents、skills；带个人密钥或机器路径的设置写进 `.claude/settings.local.json` 并加进 `.gitignore`。