---
layout: page
knowledge: true
title: Claude Code 教程：第一次会话之后怎么用
description: 配置完成后怎么把 Claude Code 用顺手：/init 与 CLAUDE.md 怎么写、先要计划再动手的工作流、常用斜杠命令表、让它自跑测试、环境变量冲突的排查。
category: start
kicker: Claude Code
head:
  - - meta
    - property: og:title
      content: Claude Code 教程：第一次会话之后怎么用 · Claude 知识库
  - - meta
    - property: og:description
      content: /init 与 CLAUDE.md 怎么写、先要计划再动手的工作流、常用斜杠命令、让它自跑测试。
---

# Claude Code 教程：第一次会话之后怎么用

> **一句话答案**：安装、配置 Base URL 与 Key、装模型这些步骤在[使用教程](/guide)里。本文只讲配置完成之后的事：进项目目录跑 `/init` 生成 CLAUDE.md 并改对，先用 Shift+Tab 切到计划模式让它给方案，批准后再动手，告诉它测试命令并要求自跑自修。

配置完成后，`cd` 进项目目录，终端输入 `claude`，第一件事是 `/init`。

```bash
cd 你的项目
claude
/init
```

`/init` 会扫描仓库并起草 `CLAUDE.md`：怎么构建、怎么测试、代码约定、哪些文件不要动。这个文件每次会话都会自动带进上下文，相当于项目的长期说明书。生成后花一分钟改对，比后面反复纠正省事得多。官方建议把根文件控制在 200 行以内，更长的内容拆到子目录的 CLAUDE.md 或 `.claude/rules/` 的路径规则里。

## CLAUDE.md 怎么写才有用

**结论**：只写「会改变它行为」的规则，不写它本来就会做的事。构建命令、测试命令、代码风格、架构边界、明确不能碰的文件，五类就够。

一份实用的开头长这样：

```markdown
# 项目约定

## 构建与测试
- 构建：npm run build
- 测试：npm run test（单文件：npm run test -- path/to/file）
- 提交前必须跑 lint

## 约定
- 业务代码放 src/，不要动 generated/
- 新接口先写 types 再写实现
- 不改数据库 schema，除非我明确同意

## 边界
- 支付相关的文件不要动，改之前先问我
```

**不要**把整份 API 文档、目录树、历史决策粘进去。它们会占掉每次会话的上下文，真正需要时让它去读文件更好。怎么知道占了多少，会话里输入 `/context` 就能看到各类内容各占多少。更多关于这个文件的细节见 [The.md 怎么写](/knowledge/claude-md-guide)。

## 先要计划，再让它动手

**结论**：改动跨多个文件、需求本身模糊、或者你不确定它理解得对不对时，先让它给方案。

会话中按 `Shift+Tab` 循环切换权限模式，切到 plan；也可以输入 `/plan`，或者直接说「先给我一个方案，不要改文件」。它会读文件、列步骤、告诉你打算怎么改，然后停下来等你批准。批准后才进入实施。

给它的任务描述里带上两个东西，能显著减少返工：

- **已知路径**：`@src/auth/login.ts` 直接指定文件，比让它自己搜更快也更准；
- **验收标准**：比如「改完后 `npm run test -- auth` 要通过，并且不能改动 public API 的签名」。

写一条好的计划比反复纠正要省时间。详见 [Claude Code 计划模式怎么用](/knowledge/claude-code-plan-mode)。

## 让它自跑测试与自修

**结论**：把测试命令告诉它，并明确要求「跑测试，失败就自己修，直到通过或告诉我」。

这一步是 Claude Code 和普通代码补全最大的区别：它会执行命令、读回报错、继续改，形成「改代码 → 跑测试 → 读报错 → 再修」的循环。你要做的只是在它偏离方向时打断。

三句话的模板：

```text
把 src/parser.ts 改成支持嵌套括号。
改完跑 npm run test -- parser，失败就自己修，修到通过为止。
不要改 src/parser.test.ts。
```

最后一句「不要改测试文件」值得每次都写，能挡掉一大类「为了让测试通过而改断言」的操作。

## 常用斜杠命令

会话内输入 `/` 会列出全部命令，最常用的这些：

| 命令 | 作用 |
|---|---|
| `/init` | 生成 CLAUDE.md |
| `/compact` | 把对话压成摘要，释放上下文 |
| `/clear` | 清空上下文重新开始 |
| `/model` | 切换模型档位 |
| `/cost` | 本次会话消耗 |
| `/status` | 当前端点、密钥、模型、版本 |
| `/permissions` | 免确认的操作范围 |
| `/context` | 上下文被什么填满 |
| `/mcp` | 已连接的 MCP 服务器 |
| `/review` | 审查一个 PR |
| `/doctor` | 检查安装 |

完整的命令与命令行参数见 [Claude Code 命令与参数速查](/knowledge/claude-code-cli-cheatsheet)。

## 会话太长时：/compact 与 /clear

**结论**：话题没变就 `/compact`，换了任务就 `/clear`。压缩保留脉络，清空只留你重新交代的那几句话。

如果 `Compact` 反复失败，通常是这次会话只有一次巨大的往返（例如一次超大的工具输出），没有更早的轮次可以折叠，改用 `/clear`。窗口被什么填满、报错怎么处理，见 [prompt too long 怎么处理](/knowledge/claude-code-prompt-too-long-fix)。

## 环境变量冲突：连不上时先查这里

**结论**：`ANTHROPIC_BASE_URL` 或 `ANTHROPIC_API_KEY` 的旧值还留在系统环境变量里，是「明明填对了却连不上」最常见的原因。

排查顺序：

1. 新开一个终端（改完环境变量后旧终端不会更新）；
2. `echo $ANTHROPIC_BASE_URL` 看是不是旧值；
3. 检查 `~/.zshrc`、`~/.bashrc`、PowerShell 配置文件里有没有残留；
4. Windows 上「用户环境变量」和「系统环境变量」是两处，都要看。

`/status` 会直接显示 Claude Code 当前用的是哪个端点、哪个密钥、哪个模型，比猜快。