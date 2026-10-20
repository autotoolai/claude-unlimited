---
layout: page
knowledge: true
title: Claude Code 技能怎么写
description: 技能是什么、为什么模型起先只看到 name 与 description、三个加载位置（用户级、项目级、插件内）、plugin marketplace 怎么装，以及写一个能被正确触发的技能要满足的四点。
category: start
kicker: Claude Code
head:
  - - meta
    - property: og:title
      content: Claude Code 技能怎么写 · Claude 知识库
  - - meta
    - property: og:description
      content: 渐进式披露、三个加载位置、marketplace 与写好技能的要点。
---

# Claude Code 技能怎么写

> 正式发布地址：[claude-unlimited.aiautotools.com/knowledge/claude-code-skills](https://claude-unlimited.aiautotools.com/knowledge/claude-code-skills) ｜ 源码与文档：[GitHub 仓库](https://github.com/autotoolai/claude-unlimited)

> **一句话答案**：技能是一种渐进式披露——模型起先只看到技能的 `name` 和 `description`，任务匹配上才去读完整的 `SKILL.md` 及其引用的文件。所以 `description` 要写「什么时候用我」。技能放在 `~/.claude/skills/<name>/SKILL.md`（个人）、`.claude/skills/<name>/SKILL.md`（随仓库提交）或插件内。

它是四个扩展点里最轻的一个：不需要子代理、不需要事件、不需要外部服务，只是一个把流程写下来的目录。

## 技能是什么：渐进式披露

**结论**：模型起初只看到每个技能的 `name` 与 `description`，任务匹配上才读取完整 `SKILL.md` 和它指向的文件。这样上下文始终很小，需要时又能拿到深度、任务特定的知识：流程、风格规则、领域清单，甚至可执行的辅助脚本。

`CLAUDE.md` 是每次会话全文进上下文；技能是按需加载。两者不是替代关系，静态规则放 `CLAUDE.md`，「这类任务按这套流程做」放技能，见 [CLAUDE.md 怎么写](/knowledge/claude-md-guide)。

## 最小的一个技能长什么样

**结论**：一个目录，里面一个 `SKILL.md`，frontmatter 写 name 与 description，正文写步骤。

```text
.claude/skills/release-notes/
└── SKILL.md
```

```markdown
---
name: release-notes
description: Write release notes from the git log in this repo's house style. Use when asked for a changelog or release notes.
---

1. Run `git log --oneline <last-tag>..HEAD`.
2. Group commits by area (api, ui, infra). Drop chores.
3. One line per change, user-facing wording, no commit hashes.
4. Output in the format of CHANGELOG.md; do not edit the file unless asked.
```

## 三个加载位置

**结论**：用户级、项目级、插件内。哪个该提交、哪个只是你个人的，取决于它是不是团队约定。

| 位置 | 范围 | 是否提交 |
|---|---|---|
| `~/.claude/skills/<name>/SKILL.md` | 个人，所有项目 | 不提交 |
| `.claude/skills/<name>/SKILL.md` | 随仓库，团队共享 | 提交 |
| 插件内 | 随插件安装 | 由插件决定 |

技能是机器上的文件，由 Claude Code 运行时读取，与配置了哪个 API 端点无关。

## plugin marketplace

**结论**：marketplace 就是一个带插件清单的 git 仓库，所以团队可以自建私有源。

```bash
/plugin marketplace add anthropics/claude-code   # 注册一个 marketplace（任何带清单的 git 仓库）
/plugin install <name>@<marketplace>          # 从里面安装
/plugin                                        # 浏览、启用、禁用、更新
```

官方技能仓库里有文档类技能（PDF、DOCX、XLSX、PPTX）、一个 skill-creator 和若干范例，写自己的技能前值得先读。

## 写好一个技能的要点

**结论**：`description` 写清「何时用」；`SKILL.md` 保持精简，参考材料放单独文件由它链接；确定性的步骤写成脚本让模型调用，而不是让它现场重新推导；用 `/skills` 在会话里验证它是否在你预期的任务上触发。

最常见的失败是技能写得太长，正文成了又一份 `CLAUDE.md`，失去按需加载的意义。技能被加载时才消耗上下文。

## 技能、子代理、hooks、MCP 怎么分工

**结论**：四个扩展点各管一件事，选错了会互相替代。

| 需求 | 用什么 |
|---|---|
| 这类任务按这套流程做（按需知识） | 技能 |
| 派一个独立的人去干，独立上下文 | [子代理](/knowledge/claude-code-subagents) |
| 每次都必须发生的确定性动作 | hooks |
| 外部系统的工具和数据 | MCP |

技能为三者打包流程，但它本身不做任何事。

