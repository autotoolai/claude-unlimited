<!-- markdown mirror for AI / agents; HTML: https://claude-unlimited.aiautotools.com/knowledge/claude-md-guide -->
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

> 正式发布地址：[claude-unlimited.aiautotools.com/knowledge/claude-md-guide](https://claude-unlimited.aiautotools.com/knowledge/claude-md-guide) ｜ 源码与文档：[GitHub 仓库](https://github.com/autotoolai/claude-unlimited)

> **一句话答案**：CLAUDE.md 是每次会话都读入上下文的纯文本说明书，放构建与测试命令、代码约定、架构边界、工作流规则；官方建议单文件控制在 200 行以内。Claude Code 2.1.277 起，当项目里没有任何符合条件的 CLAUDE.md 时会回退读 AGENTS.md；想在 /config 里把「项目指引」改成两者都读，选 claude-md-and-agents-md。CLAUDE.md 是指令不是配置——写进去的规则会被遵守，但不会被强制执行。

大部分人写 CLAUDE.md 时踩同一个坑：把它当成「项目说明书」，写成一篇几千行的文档，结果 Claude 抓不住重点，规则之间还互相矛盾。官方给的上限是**每个文件 200 行左右**，超过就会消耗更多上下文、降低遵循度。

## CLAUDE.md 是什么，写什么

**结论**：它是纯文本 Markdown 文件，Claude Code 每次会话都读进上下文。用来记录你本来要反复交代的东西，官方建议覆盖四块：

- **构建与测试命令**：贡献者应该跑什么来构建和检查改动；
- **代码约定**：命名、格式、与这个仓库相关的其它规范；
- **项目架构**：主要组件以及它们怎么组合；
- **工作流规则**：改完和检查改动时希望它遵循的步骤。

`/init` 能根据项目生成一份初稿。它没有必须的文档格式，普通 Markdown 标题和列表就够。

**重要区别**：它是指令，不是配置。写进去的规则会进上下文，但不会被强制执行；要真正配置 Claude Code 的行为，用设置文件，不要指望 CLAUDE.md 里的散文变成设置值。

官方补充了一句更狠的：**指令由 Claude Code 执行，不由模型执行**。CLAUDE.md 里的散文影响 Claude「想做什么」，但决定不了 Claude Code「允许什么」。要授予或收回权限，用 `/permissions`、权限规则、权限模式或 PreToolUse 钩子。

## 放在哪里

**结论**：按官方文档，四层位置的加载顺序是：企业托管策略 → 用户级 `~/.claude/CLAUDE.md` → 项目级 `./CLAUDE.md` 或 `./.claude/CLAUDE.md` → 本地 `./CLAUDE.local.md`。

| 位置 | 内容 | 谁会读到 |
|---|---|---|
| 托管策略目录（macOS `/Library/Application Support/ClaudeCode/CLAUDE.md`、Linux/WSL `/etc/claude-code/CLAUDE.md`、Windows `C:\Program Files\ClaudeCode\CLAUDE.md`） | IT/DevOps 统一管理的编码规范、安全与合规要求 | 组织内所有人 |
| `~/.claude/CLAUDE.md` | 个人偏好，所有项目通用 | 只有你 |
| `./CLAUDE.md` 或 `./.claude/CLAUDE.md` | 项目架构、编码规范、常用工作流 | 团队成员（随源码提交） |
| `./CLAUDE.local.md` | 只在当前项目里的个人偏好，建议加进 `.gitignore` | 只有你 |

放在哪一层决定了它对谁生效、能不能进版本库。团队约定写进项目根的 CLAUDE.md 并提交，个人偏好写进 `~/.claude/CLAUDE.md`。

### 加载顺序是怎么算的

**结论**：所有找到的文件是**拼接**进上下文，不是互相覆盖。顺序从文件系统根往下排，离你启动位置近的读得晚。

在 `foo/bar/` 里启动 Claude Code，它会加载 `foo/CLAUDE.md`、`foo/bar/CLAUDE.md`，以及同层的 `CLAUDE.local.md`。上下文里 `foo/CLAUDE.md` 在前，`foo/bar/CLAUDE.md` 在后——**离你启动位置近的指令最后读，权重更高**。同一目录里 `CLAUDE.local.md` 追加在 `CLAUDE.md` 之后，所以你的个人备注是该层读到最后的内容。

子目录里也可以放自己的 CLAUDE.md，但**不在启动时加载**——Claude 第一次读、写、编辑那个子目录里的文件时才加载。用 Bash 看一下单个文件（`cat`、`head`）也算读。

## 用 @ 导入其它文件

**结论**：`@path/to/file` 语法可以把别的文件拉进来一起加载，但它**不省上下文**。

```markdown
See @README for project overview and @package.json for available npm commands for this project.

# Additional Instructions
- git workflow @docs/git-instructions.md
```

几个容易踩的点：

- **相对路径相对于「写导入的那份文件」**，不是工作目录。
- **可以递归导入，最多 4 跳**。
- **路径里有空格要用反斜杠转义**：`- API conventions @Design\ Docs/api-conventions.md`。不加反斜杠，路径会在第一个空格处截断；用引号包住则**完全不导入**。
- **反引号里的 `@` 不导入**。写 ``@README`` 保持字面文本，`@README` 才导入。
- **导入解析会跳过 Markdown 代码块**。
- **导入不省 token**：被导入的文件和导入它的 CLAUDE.md 一起进上下文，所以「用导入拆文件」只是让文件更好维护，不是让上下文更便宜。真正省上下文的是**路径规则**——只在 Claude 动到匹配文件时才加载。

## AGENTS.md 什么时候会被读

**结论**：2.1.277 起，Claude Code 会在项目里没有任何符合条件的 CLAUDE 指令文件时回退读根目录的 AGENTS.md。

官方给的判定表：

| 你的仓库里有 | Claude 读什么 |
|---|---|
| `AGENTS.md`，且工作目录及其上层没有 `CLAUDE.md` 或 `CLAUDE.local.md` | 你的 `AGENTS.md` |
| `AGENTS.md`，且工作目录及其上层有 `CLAUDE.md` 或 `CLAUDE.local.md` | 只读你的 `CLAUDE.md` |
| `CLAUDE.md` 里已经 `@AGENTS.md` 导入了 | 读你的 `CLAUDE.md`，AGENTS.md 通过导入一起进来 |

「符合条件」指从文件系统根到工作目录的路径上找到了 `CLAUDE.md`、`.claude/CLAUDE.md` 或 `CLAUDE.local.md` 任意一个。有一个，就不读 AGENTS.md。注意 `~/.claude/CLAUDE.md` 和 `.claude/rules/` **不**构成抑制。

这是个容易踩的点：你在 `~/.claude/CLAUDE.md` 里写了很多项目规则，但项目根没有 CLAUDE.md，那 AGENTS.md 仍然会被读；而你随手加一个 `CLAUDE.local.md`，AGENTS.md 又突然不读了。

加载 AGENTS.md 时，会在会话开头打一行提示：`no CLAUDE.md found; AGENTS.md loaded: /home/you/repo/AGENTS.md`。看到这行说明走的是回退路径。

**不会被读的**：`AGENTS.local.md`、`AGENTS.override.md`、`.agents/` 目录下的任何东西。

## 四个读取模式怎么选

**结论**：默认用 `claude-md-or-agents-md`；团队里多工具共享 `AGENTS.md` 就选 `claude-md-and-agents-md`；只想读 CLAUDE.md 就选 `claude-md`；`managed-only` 只给受管环境用。

在 `/config` 里找到 **Project instructions**，四个值：

| 模式 | 行为 |
|---|---|
| `claude-md-or-agents-md` | 默认：读 CLAUDE.md，没有才读 AGENTS.md |
| `claude-md-and-agents-md` | 两个都读，同目录的 CLAUDE.md 在前、AGENTS.md 在后 |
| `claude-md` | 只读 CLAUDE.md |
| `managed-only` | 只读托管设置指定的文件和 auto memory |

想让一个团队用多工具共享一份 `AGENTS.md`，同时项目里也有 CLAUDE.md，那就选 `claude-md-and-agents-md`；或者在 CLAUDE.md 里写 `@AGENTS.md` 导入邻近目录的指令。

选 `claude-md-and-agents-md` 时，Claude Code 会跳过已经加载过的 `AGENTS.md`——所以被 CLAUDE.md 导入或软链过去的那个不会被读两遍。

`managed-only` 只在启动时读托管的 CLAUDE.md 和 auto memory；项目级、本地级、用户级的 CLAUDE.md、`.claude/rules/` 文件和所有 AGENTS.md 都不加载，但子目录的 CLAUDE.md、`.claude/rules/` 文件和路径规则仍会按需加载。

这层指令每轮会话都会重发，长文件尤其明显，写的时候按这个成本来取舍，见[降低 Claude 用量的工程方法：先测量再优化](https://claude-unlimited.aiautotools.com/knowledge/reduce-token-usage-tips)；把流程固化下来交给技能，见 [Claude Code 技能怎么写](https://claude-unlimited.aiautotools.com/knowledge/claude-code-skills)。

**限制**：这项配置属于 plugin 配置，只能写在用户设置 `~/.claude/settings.json`、`--settings` 传入的文件或托管设置里，项目级 `.claude/settings.json` 不生效，改动下次重载后生效。对应的 JSON 是：

```json
{
  "pluginConfigs": {
    "cc-plugin-agents-md@builtin": {
      "options": { "instructionFiles": "claude-md-and-agents-md" }
    }
  }
}
```

v2.1.285 之前这个 plugin 的 ID 是 `agents-md@builtin`，Claude Code 会忽略写在新 ID 下的条目；v2.1.285 及以后两个 ID 都认。

同样的项目级/用户级优先级问题在子代理上也会出现，见[Claude Code 子代理怎么用](https://claude-unlimited.aiautotools.com/knowledge/claude-code-subagents)。

## 用 .claude/rules/ 按路径拆规则

**结论**：想让 CLAUDE.md 短下来，把「只对部分文件有效」的规则放进 `.claude/rules/`，用 `paths` 前置字段限定生效范围。

```markdown
---
paths:
  - "src/api/**/*.ts"
---

# API 开发规则

- 所有接口必须做入参校验
- 使用标准错误响应格式
- 补充 OpenAPI 文档注释
```

不带 `paths` 的规则在启动时加载，优先级和 `.claude/CLAUDE.md` 相同。带 `paths` 的规则**只在 Claude 读、写、编辑匹配文件时才加载**——用 Bash 看单个匹配文件也算。

`paths` 的匹配规则：

| 模式 | 匹配到 |
|---|---|
| `**/*.ts` | 基础目录下的任意 `.ts` |
| `src/**/*` | 基础目录 `src/` 下的所有文件 |
| `*.md` | 任意子目录下的 `.md` |
| `/*.md` | 只匹配基础目录**直接**下的 `.md`，不含子目录 |
| `src/components/*.tsx` | 只匹配 `src/components/` 直接下的 `.tsx` |

基础目录的定义：项目规则用「包含 `.claude` 目录的那一层」；用户级规则用会话的主工作目录。

**花括号会展开**：`src/**/*.{ts,tsx}` 展开成 2 个模式，`{a,b}/{c,d}/*.{ts,tsx}` 展开成 8 个。整个 `paths` 列表共享 **1000 个展开模式 / 4 MiB** 的预算，超预算的模式不展开（它的字面花括号匹配不到任何文件），没有花括号的模式不占预算。

`paths` 是规则前置字段里**唯一**会被读取的字段，其它字段会被忽略且不报错。YAML 解析失败时，Claude Code 忽略前置字段、按「没有 paths」加载规则，用 `claude --debug` 能看到解析错误。

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

**用户级规则**放在 `~/.claude/rules/`，对这台机器的所有项目生效。Claude Code 先加载用户级规则、再加载项目级规则，所以项目规则在上下文里更靠后。两者**不互相覆盖**——冲突时 Claude 可能采纳其中任意一个，所以要保持一致。

`.claude/rules/` 支持软链，可以维护一套共享规则链接到多个项目。指向工作目录之外的软链会被当作「外部导入」，需要你在项目里批准一次；批准之后只有不带 `paths` 的那些规则会加载。不想每次都批准，就把共享规则放在 `~/.claude/rules/`。

## 审计你的指令文件

**结论**：规则会过期、会互相矛盾，`/doctor prompt-audit` 让你让 Claude 自己查一遍。

```text
/doctor prompt-audit
/doctor prompt-audit .claude/skills/deploy
```

它会找出这类问题：为旧模型写的指令、引用了不存在的文件或命令、文件之间互相矛盾。你会拿到一份带修改建议的报告，**在你明确要求之前它不会改动任何文件**。

默认审计范围是 CLAUDE.md、CLAUDE.local.md、AGENTS.md，以及 `.claude/` 和 `~/.claude/` 下的 rules、skills、commands、subagents 和 output styles。这个功能需要 Claude Code v2.1.283 或更高版本，且依赖内置的 `/claude-api` 技能——该技能被 `skillOverrides` 关闭或 `disableBundledSkills` 禁用时不可用。

## 实战案例

**结论**：三个案例对应三种常见起点：从零写一份四块齐全的 CLAUDE.md、把超长文档拆成导入加路径规则、和别的工具共享同一份 AGENTS.md。

### 案例 1：从零写一份能用的 CLAUDE.md

```markdown
# 项目说明

## 构建与测试
- 安装：npm install
- 单测：npm run test
- 类型检查：npm run typecheck
- lint：npm run lint

## 代码约定
- 用 pnpm，不要用 npm
- 组件一律用 Vue 3 script setup
- 不提交 dist/ 与 node_modules/

## 架构
- src/pages/ 页面；src/components/ 复用组件；src/lib/ 纯函数
- 数据请求统一走 src/lib/api.ts，不要直接调 fetch

## 工作流
- 改完必须跑 npm run test 与 npm run typecheck
- 不要改动 public/ 下的静态文件
```

要点是**四块都写具体命令**，而不是写「请遵循最佳实践」——后者对 Claude 没有约束力。

### 案例 2：把长文档拆成导入 + 路径规则

原文件 600 行，超出 200 行建议。拆法：

- `CLAUDE.md` 只留构建命令和架构摘要（约 40 行）；
- `docs/git-instructions.md` 用 `@docs/git-instructions.md` 导入；
- 只对某类文件生效的规则放进 `.claude/rules/api.md`，用 `paths: ["src/api/**/*.ts"]` 限定。

### 案例 3：和别的工具共享一份 AGENTS.md

项目已经有 AGENTS.md，且团队里有人在用 Cursor。要让两边都读到同一份：

```markdown
@AGENTS.md

## Claude Code

改 `src/billing/` 下的代码时先出计划。
```

这样 Claude-specific 的内容排在导入内容之后被读到。

## 怎么写才算好（决策矩阵）

**结论**：按「这条规则是否只对部分文件有效」决定放哪，按「是否要随仓库提交」决定放哪层。

| 内容 | 放哪 | 为什么 |
|---|---|---|
| 构建、测试、lint 命令 | `CLAUDE.md` | 每次会话都要用 |
| 项目架构总览 | `CLAUDE.md` | 全局背景 |
| 团队编码规范 | `CLAUDE.md` + 提交 | 队友也要用 |
| 只对 `src/api/**` 生效的规范 | `.claude/rules/api.md` + `paths` | 按需加载，省上下文 |
| 只对某个子目录生效 | 那个子目录的 `CLAUDE.md` | 按需加载 |
| 你的个人偏好 | `~/.claude/CLAUDE.md` | 不进仓库 |
| 你在这个项目的个人偏好 | `CLAUDE.local.md` + `.gitignore` | 不进仓库 |
| 组织统一规范 | 托管策略目录 | IT 管理 |
| 其它工具的配置（Cursor rules 等） | 原样保留 | `/init` 会读它们 |

## 最佳实践

**结论**：短、有结构、不矛盾，比写全更重要。

1. **单文件控制在 200 行内**：超了就拆成路径规则，那才是真的省上下文。
2. **两条规则冲突时 Claude 会随机挑一条**：定期跑 `/doctor prompt-audit` 清掉过期和矛盾的内容。
3. **写命令，不写原则**：「跑 `npm run test`」比「注意测试质量」有用得多。
4. **验证加载结果**：改完跑 `/context all`，确认文件出现在 Memory files 那一栏。

## 进阶技巧

**结论**：四个进阶方向：让导入跨 worktree 生效、用 `claudeMdExcludes` 排除 monorepo 里别人的指令、用 `--add-dir` 扩展工作目录、用 `/init` 迁移别的工具的配置。

### 让导入跨 worktree 生效

git worktree 里，`.gitignore` 掉的 `CLAUDE.local.md` 只存在于你创建它的那个 worktree。要跨 worktree 共享个人指令，改成从家目录导入：

```markdown
# Individual Preferences
- @~/.claude/my-project-instructions.md
```

注意工作目录之外的导入属于「外部导入」，Claude Code 第一次遇到时会弹批准框；拒绝后导入保持禁用且不再询问。

### 用 claudeMdExcludes 排除 monorepo 里别人的指令

大型 monorepo 里，其它团队的 CLAUDE.md 会被一起加载。用 `claudeMdExcludes` 按路径模式跳过它们。

### 用 --add-dir 扩展工作目录

加了额外目录后，Claude Code 会加载那个目录的 CLAUDE.md、`.claude/CLAUDE.md`、CLAUDE.local.md 和 `.claude/rules/*.md`（带 `paths` 的除外）。需要设 `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD` 变量。

### 用 /init 迁移别的工具的配置

`/init` 会读取其它工具的指令文件并把相关内容并入生成的 CLAUDE.md：Cursor 的 `.cursor/rules/` 或 `.cursorrules`、Copilot 的 `.github/copilot-instructions.md`；设了 `CLAUDE_CODE_NEW_INIT=1` 后还会读 AGENTS.md、`.devin/rules/`、`.windsurf/rules/` 或 `.windsurfrules`、`.clinerules`。

`/import` 则能把某个编码 agent 的配置整体搬进 Claude Code：它会把 AGENTS.md 之类指令文件的一次性副本追加到对应的 CLAUDE.md，并接管 MCP 服务器、命令、子代理和技能。

## 常见问答

**结论**：三个关于 CLAUDE.md 最常被追问的点，答案都在上面，这里给出可以直接引用的短版本。

**Q：用 @ 导入别的文件能省 token 吗？**

不能。被导入的文件和导入它的 CLAUDE.md 一起进上下文，导入只是让文件更好维护。真正省上下文要靠带 `paths` 的路径规则——那类规则只在 Claude 动到匹配文件时才加载。

**Q：怎么检查 CLAUDE.md 里的规则有没有过期或冲突？**

在会话里跑 `/doctor prompt-audit`。它会找出为旧模型写的指令、引用了不存在的文件或命令、以及互相矛盾的内容，给出带建议的报告但不会自动改你的文件。需要 v2.1.283 或更高版本，且内置的 `/claude-api` 技能没被关掉。

**Q：.claude/rules/ 的 paths 怎么写？**

用 YAML frontmatter 写 glob 模式，如 `src/**/*.{ts,tsx}`。没有 `paths` 的规则在启动时加载，带 `paths` 的只在 Claude 读、写、编辑匹配文件时才加载。花括号会展开，整个 `paths` 列表共享 1000 个展开模式的预算。
