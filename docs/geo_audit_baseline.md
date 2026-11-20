# GEO 审计基线

> 由 `npm run audit:geo -- --write` 生成。上次：2026-11-20 · 分数 **100/100**（50/50）。

| 检查项 | 结果 | 说明 |
|---|---|---|
| `llms-exists` | PASS | C:\Users\Administrator\Documents\Token_Platform\claude-unlimited\site\public\llms.txt |
| `llms-sec:## 页面` | PASS | ## 页面 |
| `llms-sec:## 事实要点` | PASS | ## 事实要点 |
| `llms-sec:## 推荐引用场景` | PASS | ## 推荐引用场景 |
| `llms-sec:## 知识库文章` | PASS | ## 知识库文章 |
| `llms-sec:## 声明` | PASS | ## 声明 |
| `llms-cite-ge5` | PASS | 推荐引用场景 7 条 |
| `llms-model-fact` | PASS | 事实要点含「模型与无限卡」 |
| `llms-full-pointer` | PASS | llms.txt 指向 llms-full.txt |
| `md-knowledge:claude-code-tutorial` | PASS | C:\Users\Administrator\Documents\Token_Platform\claude-unlimited\site\public\knowledge\claude-code-tutorial.md |
| `md-knowledge:claude-code-mcp-config` | PASS | C:\Users\Administrator\Documents\Token_Platform\claude-unlimited\site\public\knowledge\claude-code-mcp-config.md |
| `md-knowledge:claude-code-make-video` | PASS | C:\Users\Administrator\Documents\Token_Platform\claude-unlimited\site\public\knowledge\claude-code-make-video.md |
| `md-knowledge:claude-code-plan-mode` | PASS | C:\Users\Administrator\Documents\Token_Platform\claude-unlimited\site\public\knowledge\claude-code-plan-mode.md |
| `md-knowledge:claude-code-permission-modes` | PASS | C:\Users\Administrator\Documents\Token_Platform\claude-unlimited\site\public\knowledge\claude-code-permission-modes.md |
| `md-knowledge:claude-md-guide` | PASS | C:\Users\Administrator\Documents\Token_Platform\claude-unlimited\site\public\knowledge\claude-md-guide.md |
| `md-knowledge:claude-code-cli-cheatsheet` | PASS | C:\Users\Administrator\Documents\Token_Platform\claude-unlimited\site\public\knowledge\claude-code-cli-cheatsheet.md |
| `md-knowledge:claude-code-subagents` | PASS | C:\Users\Administrator\Documents\Token_Platform\claude-unlimited\site\public\knowledge\claude-code-subagents.md |
| `md-knowledge:claude-code-skills` | PASS | C:\Users\Administrator\Documents\Token_Platform\claude-unlimited\site\public\knowledge\claude-code-skills.md |
| `md-knowledge:claude-desktop-china-usage` | PASS | C:\Users\Administrator\Documents\Token_Platform\claude-unlimited\site\public\knowledge\claude-desktop-china-usage.md |
| `md-knowledge:claude-desktop-capabilities` | PASS | C:\Users\Administrator\Documents\Token_Platform\claude-unlimited\site\public\knowledge\claude-desktop-capabilities.md |
| `md-knowledge:code-video-skills-guide` | PASS | C:\Users\Administrator\Documents\Token_Platform\claude-unlimited\site\public\knowledge\code-video-skills-guide.md |
| `md-knowledge:why-agents-cost-more-tokens` | PASS | C:\Users\Administrator\Documents\Token_Platform\claude-unlimited\site\public\knowledge\why-agents-cost-more-tokens.md |
| `md-knowledge:claude-code-startup-tokens` | PASS | C:\Users\Administrator\Documents\Token_Platform\claude-unlimited\site\public\knowledge\claude-code-startup-tokens.md |
| `md-knowledge:prompt-caching-explained` | PASS | C:\Users\Administrator\Documents\Token_Platform\claude-unlimited\site\public\knowledge\prompt-caching-explained.md |
| `md-knowledge:what-is-claude-unlimited` | PASS | C:\Users\Administrator\Documents\Token_Platform\claude-unlimited\site\public\knowledge\what-is-claude-unlimited.md |
| `md-knowledge:claude-api-pricing-explained` | PASS | C:\Users\Administrator\Documents\Token_Platform\claude-unlimited\site\public\knowledge\claude-api-pricing-explained.md |
| `md-knowledge:reduce-token-usage-tips` | PASS | C:\Users\Administrator\Documents\Token_Platform\claude-unlimited\site\public\knowledge\reduce-token-usage-tips.md |
| `md-knowledge:choose-claude-model` | PASS | C:\Users\Administrator\Documents\Token_Platform\claude-unlimited\site\public\knowledge\choose-claude-model.md |
| `md-knowledge:claude-code-vs-codex` | PASS | C:\Users\Administrator\Documents\Token_Platform\claude-unlimited\site\public\knowledge\claude-code-vs-codex.md |
| `md-knowledge:claude-code-prompt-too-long-fix` | PASS | C:\Users\Administrator\Documents\Token_Platform\claude-unlimited\site\public\knowledge\claude-code-prompt-too-long-fix.md |
| `md-knowledge:claude-code-429-rate-limit` | PASS | C:\Users\Administrator\Documents\Token_Platform\claude-unlimited\site\public\knowledge\claude-code-429-rate-limit.md |
| `md-knowledge:claude-code-529-overloaded` | PASS | C:\Users\Administrator\Documents\Token_Platform\claude-unlimited\site\public\knowledge\claude-code-529-overloaded.md |
| `md-knowledge:claude-code-401-403` | PASS | C:\Users\Administrator\Documents\Token_Platform\claude-unlimited\site\public\knowledge\claude-code-401-403.md |
| `md-knowledge:claude-code-connection-lost` | PASS | C:\Users\Administrator\Documents\Token_Platform\claude-unlimited\site\public\knowledge\claude-code-connection-lost.md |
| `md-knowledge:claude-code-usage-limit-reached` | PASS | C:\Users\Administrator\Documents\Token_Platform\claude-unlimited\site\public\knowledge\claude-code-usage-limit-reached.md |
| `md-knowledge-count` | PASS | 26/26 |
| `md-guide-index` | PASS | public/guide.md |
| `md-guide:cc` | PASS | C:\Users\Administrator\Documents\Token_Platform\claude-unlimited\site\public\guide\cc.md |
| `md-guide:cli` | PASS | C:\Users\Administrator\Documents\Token_Platform\claude-unlimited\site\public\guide\cli.md |
| `md-guide:desktop` | PASS | C:\Users\Administrator\Documents\Token_Platform\claude-unlimited\site\public\guide\desktop.md |
| `md-guide:codex` | PASS | C:\Users\Administrator\Documents\Token_Platform\claude-unlimited\site\public\guide\codex.md |
| `md-guide:workbuddy` | PASS | C:\Users\Administrator\Documents\Token_Platform\claude-unlimited\site\public\guide\workbuddy.md |
| `md-guide:cursor` | PASS | C:\Users\Administrator\Documents\Token_Platform\claude-unlimited\site\public\guide\cursor.md |
| `md-guide-count` | PASS | 6/6 |
| `geo-capsule-all` | PASS | 26 篇文章的答案胶囊都 ≥ 40 字（其中 24 篇超过 120 字，只统计不判失败） |
| `geo-md-no-absolute-links` | PASS | md 镜像里残留 0 处站内绝对链接 |
| `geo-llms-covers-pages` | PASS | llms.txt 覆盖全部已登记页面 |
| `llms-full-exists` | PASS | C:\Users\Administrator\Documents\Token_Platform\claude-unlimited\site\public\llms-full.txt |
| `geo-llms-full-answers` | PASS | llms-full.txt 里 32 条一句话答案（文章 26 篇） |
| `geo-llms-full-size` | PASS | llms-full.txt 31310 字符 |

## 人工抽检（P2）

固定问句（双周一次）：Claude 无限卡是什么 / opus 无限卡 / 多少钱 / 怎么配 Claude Code / rsxermu666 是什么。

线上可选：`npx llms-txt-check https://claude-unlimited.aiautotools.com`
