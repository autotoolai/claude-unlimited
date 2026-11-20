<!-- markdown mirror for AI / agents; HTML: https://claude-unlimited.aiautotools.com/knowledge/claude-code-plan-mode -->
---
layout: page
knowledge: true
title: Claude Code 计划模式怎么用：四种权限模式的区别
description: plan、manual、acceptEdits、auto 四种模式的差别，三种进入计划模式的方法，什么任务值得先规划再动手，以及计划模式与模型搭配的关系。
category: start
kicker: Claude Code
head:
  - - meta
    - property: og:title
      content: Claude Code 计划模式怎么用 · Claude 知识库
  - - meta
    - property: og:description
      content: plan / manual / acceptEdits / auto 的差别，三种进入方式，何时值得先规划。
---

# Claude Code 计划模式怎么用：四种权限模式的区别

> 正式发布地址：[claude-unlimited.aiautotools.com/knowledge/claude-code-plan-mode](https://claude-unlimited.aiautotools.com/knowledge/claude-code-plan-mode) ｜ 源码与文档：[GitHub 仓库](https://github.com/autotoolai/claude-unlimited)

> **一句话答案**：计划模式（Plan Mode）让 Claude 只读不写，先调查并给出方案，等你确认后才动手。它解决的是「我怎么知道它要干什么」，与「它能不能执行命令」（权限模式）是两件独立的事——Claude Code 共 6 种权限模式（default、acceptEdits、plan、auto、dontAsk、bypassPermissions），plan 只是其中 1 种。3 种进入方式：会话内按 Shift+Tab 循环、输入 /plan、启动时带 claude --permission-mode plan。

很多新手把计划模式当成「更安全的自动模式」，其实不是。它把「提方案」和「实施」分开：Claude 先读代码、查文件、理解任务，给出一份方案，停在那里等你批准。改错方向的成本从「已经写了半小时代码」变成「改几句计划」。

## 计划模式 vs 默认模式

**结论**：差别不在「聪不聪明」，而在「有没有写权限」。计划阶段零写入，是多文件任务最便宜的纠错窗口。

| 维度 | 默认 / acceptEdits | 计划模式（plan） |
|---|---|---|
| 执行方式 | 边想边改 | 先规划，批准后再改 |
| 文件操作 | 会读写 | **只读**：读、搜、列目录 |
| 命令执行 | 可能跑改动性命令 | 只跑只读命令（如 `git status`、搜索） |
| 适合场景 | 单文件、目标明确 | 多文件重构、原因不明的 bug、新功能骨架 |
| 风险控制 | 依赖你逐条点批准 | 计划阶段本身零写入风险 |

把它想成「只带笔记本的建筑师」：可以勘察现场、画施工图，但不会搬砖。批准计划之后，你再决定用 `default`、`acceptEdits` 还是 `auto` 去施工——计划权限和实施权限是两层开关。六种模式的完整对照见 [Claude Code 权限模式有哪些](https://claude-unlimited.aiautotools.com/knowledge/claude-code-permission-modes)。

## 为什么先规划再动手

**结论**：省的不是「读文件的 token」，而是「方向错了整段返工」的钱和时间。

- **全局视角**：先扫相关文件再动手，少出现改到一半才发现漏模块。
- **方案可审**：接口签名、迁移顺序、测试边界可以在写代码前改口。
- **知识对齐**：读计划比读 diff 更快判断「它是不是理解错了需求」。
- **可复用**：好计划可以贴进 issue / PR 描述，或存成下次同类任务的模板。

官方把 plan  freestanding 成一种权限模式，而不是单独产品：见 [Anthropic 权限模式文档](https://docs.anthropic.com/en/docs/claude-code/permissions)（以当前英文文档为准）。

## 三种进入方式

**结论**：日常用 `Shift+Tab`；要带任务描述用 `/plan`；要固定这一次会话用启动参数。

1. **会话中按 `Shift+Tab`**：循环切换权限模式。从默认状态按第一下进 `acceptEdits`，第二下进 `plan`（若当前会话默认已是 `auto`，次数可能多一次，以终端底部状态栏为准）。
2. **输入 `/plan`**：直接进入计划模式，后面可以跟任务，例如 `/plan 修复登录跳转失败`。
3. **启动时带参数**：`claude --permission-mode plan`，只对这一次会话生效。

退出同样用 `Shift+Tab` 循环到你想要的模式，或在提示里明确说「按刚才的计划开始改代码」再切到实施模式。「按两下」是从默认状态算起的描述；已经在其它模式时，看状态栏当前名字，不要死记次数。

## 计划模式下能做什么、不能做什么

**结论**：能读、能搜、能分析、能写计划；不能改文件、不能跑有副作用的命令。

| 可以 | 不可以 |
|---|---|
| 读任意项目文件 | 编辑 / 创建 / 删除文件 |
| Grep / Glob 搜索 | 安装依赖、改配置落地 |
| 看目录结构、Git 历史（只读） | `git commit`、`git push`、删分支 |
| 整理风险点与验收标准 | 静默「顺便重构」周边模块 |

所以「只读」不等于「不能用工具」——它仍然会消耗读文件与搜索的 token，只是不会在你批准前留下不可逆改动。

## 怎么写出一份能直接批准的计划

**结论**：一个好计划要让你 30 秒内看出「改哪几个文件、为什么、怎么算做对」。

提问时带上两样东西：

- **已知路径**：`@src/api/handler.ts` 直接引用，比让它自己搜更快、更省 token；
- **验收标准**：「改完后 `npm run test -- handler` 通过，且不改动导出的函数签名」。

可用的任务描述：

```text
修复用户注册后收不到邮件的问题。
相关文件：@src/auth/register.ts、@src/mail/send.ts
先给我方案，不要改文件。
验收：注册接口返回 200，且 send 被调用一次。
```

审查计划时盯三件事：改动范围是否越界、有没有误读意图、验收标准是否覆盖你真正在乎的行为。发现问题直接在对话里改：「第三步不用动数据库，改成读配置」。批准计划只表示认可方案，实施时用哪个权限模式仍然由你决定。

## 什么时候值得先规划（决策矩阵）

**结论**：范围不清、跨多文件、或你不确定它理解对不对时，先规划；小而明确的改动直接做更快。

| 场景 | 建议 | 原因 |
|---|---|---|
| 单文件、目标一句话说清 | 直接做 | 计划轮次本身有成本 |
| 改错别字 / 加一行日志 | 直接做 | 没有方案分歧 |
| 跨 3 个以上文件 | **先规划** | 顺序与接口易错 |
| 改公共 API / 数据库迁移 | **先规划** | 返工贵 |
| 原因不明的 bug | **先规划** | 先排查再动刀 |
| 你不熟的模块 | **先规划** | 用计划对齐认知 |
| 无人值守长任务 | 先规划，再 `auto` | 方案对了再放权 |

## 实战案例

**结论**：三个案例覆盖计划模式最常见的三类任务：加功能、看重构顺序、排查跨文件 bug。共同点是提示里都要带已知路径、约束和验收标准，并明确要求先不要改代码。

### 案例 1：给现有项目加邮箱验证

```text
/plan 给注册流程加邮箱验证。
约束：不改现有用户表主键；验证链接 24 小时过期；失败要有明确错误码。
相关目录：@src/auth @src/mail
先列方案与要改的文件清单，不要改代码。
```

你期望看到的计划结构大致是：读哪些文件 → 新增/修改哪些模块 → 迁移是否需要 → 测试怎么验 → 风险（例如旧用户如何处理）。审完再切回 `acceptEdits` 或 `default` 执行。

### 案例 2：重构一个偏大的模块

```text
/plan 把 src/legacy/orders 拆成 domain + infra 两层。
要求：对外导出的函数名不变；每一步可单独提交；先给迁移顺序。
不要直接改文件。
```

重点看计划有没有「 strangler 顺序」：先抽接口、再搬实现、最后删旧路径。若它一上来就要大删大改，让它改成分阶段。

### 案例 3：修跨文件 bug

```text
/plan 登录成功后偶发跳到空白页。
已知：@src/router/guards.ts 与 @src/auth/session.ts 有关；本地难复现。
先只读排查可能路径，给出 2～3 个假说与验证步骤，不要改代码。
```

这种任务最怕「猜一个原因就改」。计划模式强迫它先列假说和验证步骤，你批准某一个假说后再动手。

## 最佳实践

**结论**：描述「为什么成功」、逼它标风险、复杂计划拆阶段、和 Git 分支一起用。

1. **说 why，少说 how**：写「注册后用户必须点验证才能登录」，比写「在第 40 行加 if」更能得到合理方案。
2. **要求标风险**：加一句「列出可能破坏现有行为的点」。
3. **分阶段批准**：大计划拆成「只读排查 → 最小修复 → 补测试」，每阶段单独批准。
4. **开分支再执行**：`git checkout -b plan/email-verify`，批不准就整支丢掉。

## 进阶技巧

**结论**：计划模式可以和 CLAUDE.md、子代理、`/compact` 组合，而不是孤立开关。

### 在 CLAUDE.md 里约定计划模板

在项目 `CLAUDE.md` 写清：涉及 3 个以上文件的改动，先输出「目标 / 文件清单 / 步骤 / 风险 / 验收」五段再动手。细节见 [CLAUDE.md 怎么写：写什么、放哪](https://claude-unlimited.aiautotools.com/knowledge/claude-md-guide)。

### 计划阶段用子代理做探索

大仓库可以先让探索型子代理只读扫目录，再汇总进主会话的计划，避免主上下文被搜索刷爆。见 [Claude Code 子代理怎么用](https://claude-unlimited.aiautotools.com/knowledge/claude-code-subagents)。

### 长计划会话配 `/compact`

调查轮次多了之后，用 `/compact` 压掉过程噪音，保留「已确认的计划要点」。注意 compact 也会花一次模型调用，见 [降低 Claude 用量的工程方法：先测量再优化](https://claude-unlimited.aiautotools.com/knowledge/reduce-token-usage-tips)。

### 用计划模式做代码审查

不必真的要改代码：`/plan 审查 @src/payments 的错误处理是否覆盖超时与重试，只输出问题清单与建议，不改文件`。它会以只读方式走完审查。

## 计划模式省 token 吗

**结论**：没有固定节省比例；它减少的是返工，不是「读文件免费」。

已知路径省掉的是搜索 token，验收标准省掉的是返工轮次。计划本身要读文件、生成方案，也消耗 token。准确表述是「减少不必要的搜索与修改轮次」，不是「计划模式更省」。更多工程降本见[降低 Claude 用量的工程方法：先测量再优化](https://claude-unlimited.aiautotools.com/knowledge/reduce-token-usage-tips)。

## 让计划模式成为默认

**结论**：想让计划模式成为所有会话的默认，就把 `permissions.defaultMode` 设成 `plan` 写在用户级 `~/.claude/settings.json` 里；只想某一次用，则在启动时带 `--permission-mode plan`。

在 `~/.claude/settings.json` 里设：

```json
{
  "permissions": {
    "defaultMode": "plan"
  }
}
```

只想某一次用启动参数即可。默认模式写在用户设置里；项目级 `.claude/settings.json` 对部分高风险模式有限制，详见权限模式一文。

## 计划模式与模型搭配

**结论**：选模型和是否先规划是两个独立开关，可以自由组合。用哪个模型想是 `/model` 的事，要不要先想再做是权限模式的事，两者互不约束。

`/model` 里「用 Opus 规划、其它工作用 Sonnet」这类搭配（以 `/model` 实际列表为准），与计划权限模式不是一回事。一个是「用哪个模型想」，一个是「要不要先想再做」，两者可以独立组合。选模型见 [按任务选模型：Opus、Sonnet、Haiku 怎么选](https://claude-unlimited.aiautotools.com/knowledge/choose-claude-model)。
