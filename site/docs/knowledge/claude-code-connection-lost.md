---
layout: page
knowledge: true
title: Claude Code 连接中断、等待 API 响应怎么处理
description: 两分钟自查法：curl 打端点，401 秒回说明网络通、超时或 SSL 错说明问题在本地；退避超时变量；代理、VPN 与企业 TLS 中间人证书的处理。
category: troubleshoot
kicker: 排错
head:
  - - meta
    - property: og:title
      content: Claude Code 连接中断、等待 API 响应怎么处理 · Claude 知识库
  - - meta
    - property: og:description
      content: 两分钟自查法、退避超时变量、代理与企业 TLS 中间人证书的处理。
---

# Claude Code 连接中断、等待 API 响应怎么处理

> 正式发布地址：[claude-unlimited.aiautotools.com/knowledge/claude-code-connection-lost](https://claude-unlimited.aiautotools.com/knowledge/claude-code-connection-lost) ｜ 源码与文档：[GitHub 仓库](https://github.com/autotoolai/claude-unlimited)

> **一句话答案**：用 curl 打端点做两分钟自查——一秒内返回 401 说明网络通路正常、问题在上游或客户端；超时或 SSL 错误说明问题在你这一侧。「Waiting for API response · check your network」经常冤枉自己的网络，真正难受的是指数退避的等待时间，调低首字节超时能明显改善体感。

## 会看到哪些消息

```text
API Error: Connection dropped (ECONNRESET)
API Error: Connection lost mid-response
API Error: fetch failed
Unable to connect to API (ConnectionRefused)
Waiting for API response · will retry in 2m 35s · check your network
SSL certificate verification failed: unable to get local issuer certificate
Error: certificate has expired (CERT_HAS_EXPIRED)
```

## 两分钟自查：是我还是他们

```bash
curl -sS -o /dev/null -w "%{http_code} %{time_total}s\n" \
  "$ANTHROPIC_BASE_URL/v1/models" -H "x-api-key: x" -H "anthropic-version: 2023-06-01"
# 一秒内 401 = 网络通路正常，问题在上游或 Claude Code
# 超时 / SSL 错误 / 000 = 问题在你这一侧
env | grep -i -E "proxy|anthropic|node_extra|ssl"
claude --debug     # 日志里有每个请求的耗时与重试原因
```

**结论**：curl 秒回 401 且没有代理变量，基本可以确定是上游波动。这种情况本地改不了，重试和时间会解决；多人同时报告同一时段出问题时，停止排查。

curl 返回 401 之后如果连接本身是通的，下一步要分清凭据、端点和服务端三个方向，那是[401 / 403 鉴权失败](/knowledge/claude-code-401-403)的排查路径。

## 等待 API 响应不代表你的网络有问题

**结论**：退避是指数增长的，所以真正的损害是等待而不是失败。把首字节超时调低，客户端会更快放弃沉默的流并重试。

```bash
export CLAUDE_CODE_MAX_RETRIES=15                   # 默认 10，上限 15
export CLAUDE_CODE_RETRY_WATCHDOG=1                  # 一直重试，适合无人值守
export API_TIMEOUT_MS=600000                         # 单请求超时，默认 10 分钟
export CLAUDE_STREAM_FIRST_BYTE_TIMEOUT_MS=60000    # 首字节超时，沉默更早放弃
export CLAUDE_CODE_MAX_TOOL_USE_CONCURRENCY=2        # 网络不稳时减少并行流
```

对不稳定链路，降低首字节超时和并发数是最有效的两项。

退避机制本身和[429 限流](/knowledge/claude-code-429-rate-limit)是同一套：等太久却没报 429，多半是上游在安静地丢包而不是你的速率超了。

## 代理、VPN 与企业网络

**结论**：四个常见的本地原因，各自的处理方式不同。

- **代理只在浏览器或 npm 配置里**：CLI 看不到它。设置 `HTTPS_PROXY`（以及 `HTTP_PROXY`、`NO_PROXY`）。
- **TLS 检查代理用自己的证书替换了官方证书**：报 `unable to get local issuer certificate`。把公司根证书导出成 PEM，设置 `NODE_EXTRA_CA_CERTS=/path/to/corp-root.pem`；不要关闭证书校验。
- **原生版报 `CERT_HAS_EXPIRED`**：通常是内置信任库过期，不是你的时钟。`claude update`；npm 版用的是系统信任库。
- **macOS 重装后 `ConnectionRefused`**：本地代理或 VPN 客户端没开但仍留在环境里。清掉代理变量与系统代理设置再试。

VPN 出口在会话中途切换会重置所有打开的流，重连一次就会看到一次 ECONNRESET，属于预期行为。

## 换到网关时的差别

把 `ANTHROPIC_BASE_URL` 指向网关后，链路变成「客户端 → 网关 → 上游」。它不会让你本地的坏网络变好，但对「上游重置」这一类问题，它去掉了对单一上游账户的依赖：网关会在一个账户饱和时换另一个。

切换前先对网关地址跑一遍上面的 curl 自查，确认链路通。还没配置过端点和 Key 的话，先看[使用教程](/guide)。

