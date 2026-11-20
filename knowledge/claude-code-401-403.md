<!-- markdown mirror for AI / agents; HTML: https://claude-unlimited.aiautotools.com/knowledge/claude-code-401-403 -->
---
layout: page
knowledge: true
title: Claude Code 报错 401 / 403 怎么解决
description: 先 /status 看当前发的是哪个凭据；环境变量里的陈旧密钥优先于登录态；Key 与端点必须匹配；OAuth token 损坏与多进程抢刷新的修法；403 的四种来源。
category: troubleshoot
kicker: 排错
head:
  - - meta
    - property: og:title
      content: Claude Code 报错 401 / 403 怎么解决 · Claude 知识库
  - - meta
    - property: og:description
      content: 先确认发的是哪个凭据，再分 Key 与端点不匹配、OAuth token、403 来源三类处理。
---

# Claude Code 报错 401 / 403 怎么解决

> 正式发布地址：[claude-unlimited.aiautotools.com/knowledge/claude-code-401-403](https://claude-unlimited.aiautotools.com/knowledge/claude-code-401-403) ｜ 源码与文档：[GitHub 仓库](https://github.com/autotoolai/claude-unlimited)

> **一句话答案**：先在会话里输入 `/status` 看当前用的是哪个凭据。环境里的 `ANTHROPIC_API_KEY` 优先于登录态，一个几个月前导出的陈旧密钥就是「反复 /login 仍然 401」的典型原因。Key 只属于一个端点：Key 与 `ANTHROPIC_BASE_URL` 不匹配就是 401；403 则多半是代理或组织权限，不是 Key 本身的问题。

## 会看到哪些消息

**结论**：这一族报错全部出在「凭据被服务器拒绝」这一层，与模型能力无关。401 是凭据本身不被认可（不存在、过期、填错位置），403 是凭据有效但没有权限（端点不在白名单、Key 没开通对应能力）。

```text
API Error: 401 {"type":"authentication_error","message":"Invalid authentication credentials"}
API Error: 401 invalid x-api-key
Invalid API key · Fix external API key
Not logged in · Please run /login
Login expired · Please run /login
API Error: 403 x-deny-reason: host_not_allowed
```

## 第一步：当前发的是哪个凭据

```text
/status                              # 鉴权方式、端点、模型
echo $ANTHROPIC_API_KEY | cut -c1-12
echo $ANTHROPIC_BASE_URL
grep -n apiKeyHelper ~/.claude/settings.json
```

**结论**：优先级很简单——环境里的 `ANTHROPIC_API_KEY`（或 `apiKeyHelper` 返回的值）一旦存在，就替代 OAuth 登录态。几个月前导进 `.bashrc` 的旧 Key，或者另一个服务商的 Key，就是每次 `/login` 之后仍然 401 的经典原因。取消它，或者换成正确的那个。

还没配过环境变量的话，变量名和端点地址见[使用教程](https://claude-unlimited.aiautotools.com/guide)；如果 curl 直接超时而不是 401，那是网络层的问题，见[Claude Code 连接中断、等待 API 响应怎么处理](claude-code-connection-lost.md)。

## 401（Key 模式）：Key 与端点必须匹配

**结论**：`invalid x-api-key` 和 `Invalid API key · Fix external API key` 表示端点不认这个 Key。一个 Key 只属于一个端点：官方控制台的 Key 只对官方 API 有效，我们这边发的 Key 只对本服务的地址有效。互相混用一律 401。

用 curl 一眼分辨：

```bash
curl -s "$ANTHROPIC_BASE_URL/v1/models" -H "x-api-key: $ANTHROPIC_API_KEY" -H "anthropic-version: 2023-06-01" | head -c 300
# 返回 JSON 模型列表 = Key 有效；返回 authentication_error = Key 与这个端点不匹配
```

再检查两个细节：粘贴进环境变量时带没带尾随换行或引号；Key 有没有在面板上被吊销或轮换过。

## 401（登录模式）：OAuth token

**结论**：浏览器登录刚成功就 401，通常是本地保存的凭据坏了，或者多个进程在抢同一个 token。

- 退出（`/logout`），删掉保存的凭据（Linux/Windows 在 `~/.claude/.credentials.json`，macOS 在钥匙串里的 `Claude Code-credentials` 项），关掉其它 Claude Code 窗口、桌面应用和 IDE 扩展，再在浏览器里 `/login`。
- 多个实例同时跑会竞争刷新同一个 token，登录页会报「another Claude Code process is refreshing it」。全部关掉重来。
- 版本回归也会导致这个问题，`claude update` 往往能解决。
- 无头或 SSH 机器：在能正常登录的机器上 `claude setup-token`，把令牌拿过去用。

## 403：能认证，但不允许做那件事

**结论**：403 的四种来源，处理方式完全不同。

- **`host_not_allowed`**：沙箱出口白名单或企业代理拒绝了目标主机。把主机加进白名单，或在沙箱外运行 CLI。
- **沙箱 git 代理 403**：在已有分支上 push 被沙箱的 git 代理策略拒绝，不是 GitHub 的问题。在普通终端里 push。
- **不再是该组织的成员**：令牌属于你已离开或已变更的组织。退出再登录，重新签发当前组织的令牌。
- **我们这边返回的 403**：Key 有效，但账户被停用、该模型余额不足，或模型不在套餐内；响应体会写明是哪种。面板里确认，不要先改客户端。

429 和 529 与 401/403 长得完全不一样，走错方向会白折腾，见[Claude Code 报 429 限流怎么办](claude-code-429-rate-limit.md)和[Claude 报错 529 overloaded 怎么处理](claude-code-529-overloaded.md)。

## 最快的绕过

**结论**：最快的绕过是决定「用哪套凭据」，而不是修 Key。走订阅就 `unset` 掉环境变量回到 OAuth 登录；走网关就把 `ANTHROPIC_BASE_URL` 和 `ANTHROPIC_API_KEY` 一起换成成对的一组。

```bash
unset ANTHROPIC_API_KEY ANTHROPIC_BASE_URL   # 回到订阅登录
# 或者完全绕开 OAuth：
export ANTHROPIC_BASE_URL=<你的网关地址>
export ANTHROPIC_API_KEY=<你的 Key>
claude
```

用 Key 就没有 OAuth、没有 token 刷新、没有组织成员关系，这一族报错只剩下「Key 是否匹配这个地址」。

