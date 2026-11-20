# Claude 知识库（仓库副本）

> 本目录是官网[Claude 知识库](https://claude-unlimited.aiautotools.com/knowledge)的仓库副本：同一份正文，方便直接在 GitHub 上读与检索。

## 上手与进阶

装好只是开始：第一次会话、常用命令、计划模式、权限、CLAUDE.md，再往下是子代理与技能。

- [Claude Code 教程：第一次会话之后怎么用](claude-code-tutorial.md)：配置完成后怎么把 Claude Code 用顺手：CLAUDE.md、工作流、常用命令。
- [Claude Code MCP 怎么配：命令、scope 与避坑](claude-code-mcp-config.md)：claude mcp add 命令、三种 scope、Windows 坑、归档包避坑、连不上排查。
- [Opus 5.5 做视频教程：Remotion 出第一条 MP4](claude-code-make-video.md)：刷屏的「一句话出视频」背后是 Remotion：八步跑通第一条 MP4。
- [Claude Code 计划模式怎么用：四种权限模式的区别](claude-code-plan-mode.md)：plan / manual / acceptEdits / auto 的差别，何时先要计划再动手。
- [Claude Code 权限模式有哪些](claude-code-permission-modes.md)：六种权限模式的差别与无人值守任务的配置边界。
- [CLAUDE.md 怎么写：写什么、放哪](claude-md-guide.md)：CLAUDE.md 写什么放哪，AGENTS.md 何时被读，.claude 目录各文件用途。
- [Claude Code 命令与参数速查：会话内和命令行](claude-code-cli-cheatsheet.md)：启动方式、常用参数、会话内斜杠命令表，脚本与 CI 用法。
- [Claude Code 子代理怎么用](claude-code-subagents.md)：子代理的独立上下文、定义方式、委派方式与并行上限。
- [Claude Code 技能怎么写](claude-code-skills.md)：渐进式披露、三个加载位置、marketplace 与写好技能的要点。
- [Claude 桌面版在国内怎么用：注册、网络与登录](claude-desktop-china-usage.md)：支持地区清单不含中国大陆，客户端可装可用，靠 API Key 与本地路由走通。
- [Claude 桌面版能做什么：功能、免费额度与和终端版区别](claude-desktop-capabilities.md)：对话、Claude Code、Cowork 三块功能与计划准入，和终端版的分工。

## 原理与机制

想搞懂它为什么这么运行：上下文、token、缓存、限流。

- [用代码做视频：四个开源技能怎么选](code-video-skills-guide.md)：四个代码渲染视频技能按场景选型，附素材清单、配音路线与三轮迭代的踩坑记录。
- [为什么 Agent 比聊天更烧 token](why-agents-cost-more-tokens.md)：输入 token 按轮次平方增长，工具输出是大头，四种控制历史的模式。
- [Claude Code 启动时那 33k token 去了哪](claude-code-startup-tokens.md)：33k 启动 token 的构成，三个可控杠杆，以及它与提示缓存的关系。
- [提示缓存原理：什么时候省钱、什么时候白花](prompt-caching-explained.md)：按前缀命中的计费逻辑、cache_control 用法、命中验证与不省的情况。

## 成本与计费

想少花钱：账单构成、估算方法、按量与订阅的取舍、模型选型、终端 agent 怎么选。

- [Claude 无限卡是什么：订阅期内不按 token 计费](what-is-claude-unlimited.md)：第三方订阅制网关的定义与边界；文档站与 rsxermu666.cn 管理后台的分工。
- [Claude API 怎么计费：token 构成与估算](claude-api-pricing-explained.md)：输入与输出 token 的构成、缓存价，以及一个可复用的估算公式。
- [降低 Claude 用量的工程方法：先测量再优化](reduce-token-usage-tips.md)：分段记账、路由预算、检索裁剪、结构化摘要、输出 schema 与诚实衡量。
- [按任务选模型：Opus、Sonnet、Haiku 怎么选](choose-claude-model.md)：三档模型的任务边界，先降一档再升级，以及用自己任务做评测。
- [Claude Code 与 Codex CLI 怎么选](claude-code-vs-codex.md)：三个终端 agent 的七项对照，以及差别到底在哪里。

## 报错排查

出错了：按报错信息查，一次一个问题。

- [prompt too long 报错怎么处理](claude-code-prompt-too-long-fix.md)：先 /context 看构成，再按固定成本、单次输出、正常增长三种情况分别处理。
- [Claude Code 报 429 限流怎么办](claude-code-429-rate-limit.md)：429 的三个上限、Agent 更容易撞上的原因、六步处理顺序。
- [Claude 报错 529 overloaded 怎么处理](claude-code-529-overloaded.md)：529 是容量问题：五步处理，以及它与 500、429 的区别。
- [Claude Code 报错 401 / 403 怎么解决](claude-code-401-403.md)：先确认发的是哪个凭据，再分 Key 与端点不匹配、OAuth token、403 来源三类处理。
- [Claude Code 连接中断、等待 API 响应怎么处理](claude-code-connection-lost.md)：两分钟自查法、退避超时变量、代理与企业 TLS 中间人证书的处理。
- [Claude 提示用量上限：分清是哪个计量器](claude-code-usage-limit-reached.md)：四类用量消息的区分与处理，/status 是排查账单问题的第一步。
