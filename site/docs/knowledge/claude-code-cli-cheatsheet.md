---
layout: page
knowledge: true
title: Claude Code 命令与参数速查：会话内和命令行
description: claude 的启动方式、常用参数（--model、--allowedTools、--output-format、--max-turns、--add-dir）、会话内斜杠命令表，以及写脚本和 CI 时的用法。
category: start
kicker: Claude Code
head:
  - - meta
    - property: og:title
      content: Claude Code 命令与参数速查 · Claude 知识库
  - - meta
    - property: og:description
      content: 启动方式、常用参数、会话内斜杠命令表，脚本与 CI 用法。
---

# Claude Code 命令与参数速查：会话内和命令行

> **一句话答案**：日常用 `claude` 进交互，会话内靠 `/init`、`/compact`、`/model`、`/status`、`/context` 这几个斜杠命令；脚本和 CI 用 `claude -p` 配 `--allowedTools` 预授权、`--max-turns` 限轮次、`--output-format json` 取结构化输出。

## 启动方式

```bash
claude                          # 交互式会话
claude "修一下失败的测试"        # 带一条初始提示启动
claude -p "总结这个仓库"        # 打印模式：给答案后退出
claude -c                       # 继续最近一次会话
claude -r                       # 从列表里选一个会话恢复
claude --model claude-opus-5-5   # 为这次会话指定模型
```

## 值得记住的参数

- **`-p, --print`**：非交互，标准输入进、标准输出出。所有脚本和 CI 的基础。
- **`--output-format text|json|stream-json`**：打印模式的结构化输出。
- **`--model <id>`**：端点提供的任意模型 ID。
- **`--allowedTools "Read,Edit,Bash(git *)"`**：预授权工具，打印模式不会卡在审批上。
- **`--dangerously-skip-permissions`**：完全不弹审批。只在容器或可丢弃的沙箱里用。
- **`--max-turns N`**：给无头运行的 agent 循环设硬上限。
- **`--add-dir <path>`**：让这次会话能操作多个目录。

## 会话内斜杠命令

- `/init`：为项目生成 CLAUDE.md（约定、构建命令、不要碰的东西）。
- `/compact [重点]`：把对话压成摘要，释放上下文。
- `/clear`：清空上下文重新开始。
- `/model`：切换模型档位；`/cost`：本次消耗；`/status`：端点、密钥、模型、版本。
- `/permissions`：免确认的操作范围；`/config`：设置；`/context`：上下文构成。
- `/mcp`：已连接的 MCP 服务器；`/agents`：子代理；`/hooks`：工具事件上的 shell 钩子。
- `/review`：审查 PR；`/doctor`：检查安装；`/help`：全部命令。

## 怎么知道端点支持哪些模型 ID

请求端点的 `/v1/models`，返回的列表就是可用模型：

```bash
curl -s "$ANTHROPIC_BASE_URL/v1/models" -H "x-api-key: $ANTHROPIC_API_KEY" -H "anthropic-version: 2023-06-01"
```

也可以用 CC Switch 的「获取模型列表」。填进 `--model` 的值必须与返回的 ID 逐字一致，大小写、短横线、数字版本都不能错。

## 写脚本与 CI

**结论**：打印模式里用 `--allowedTools` 替代交互审批，用 `--max-turns` 防止循环，用 `-c` 续跑失败的任务。

```bash
claude -p "为 src/parser.ts 补测试，只改测试文件" \
  --allowedTools "Read,Edit,Write,Bash(npm run test*)" \
  --max-turns 20 \
  --output-format json
```

一个实用的组合是：任务失败时用 `claude -c` 续跑，配合 `CLAUDE_CODE_RETRY_WATCHDOG=1` 让它遇到临时错误时继续重试而不是退出。

## claude setup-token

在浏览器登录一次，打印一个长期 OAuth 令牌，给订阅用户在 CI 或无浏览器的机器上用。用 API Key 时不需要它——Key 直接走环境变量，没有 token 刷新，也没有多进程抢刷新的问题。

## 输入框怎么换行

回车是发送。换行用 Shift+Enter；终端不支持时先输入一个反斜杠 `\` 再按回车。多行的长提示可以先写进文件再喂进去：

```bash
claude -p "按文件里的要求做" < prompt.txt
```

粘贴多行文本会被自动识别，不会逐行发送。

## 让会话便宜的习惯

- 默认用 Sonnet 档位，只在真正难的一步 `/model` 切到更强的档，做完切回来。
- 大量读文件的任务交给子代理：它们有自己的上下文，主会话只收到摘要。
- 不要把整个日志粘进来，用 `tail -n 50 build.log` 之类先裁剪。
- 脚本里加 `--max-turns`，避免死循环。

原理和更多方法见[为什么 Agent 比聊天更烧 token](/knowledge/why-agents-cost-more-tokens)与[降低 Claude 用量的工程方法](/knowledge/reduce-token-usage-tips)。