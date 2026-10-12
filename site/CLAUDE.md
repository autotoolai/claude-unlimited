# site 项目规则

Claude 无限卡官网（VitePress）。数据源在 `config/`，正文在 `docs/`，脚本在 `scripts/`，产物在 `.vitepress/dist/`。

## 知识库文章

写或改知识库文章（`docs/knowledge/`）前，**先读 `docs/knowledge/SOP-写一篇新文章.md`，按七步流程走**。

- 正文：`docs/knowledge/<slug>.md`（frontmatter `layout: page` + `knowledge: true`）
- 注册：`config/knowledge.ts` 的 `knowledge` 数组（`KnowledgeMeta`，含 `faq[]`）
- 素材：`config/knowledge_sources.ts`（第三方域名只允许出现在这里和 `archive/`）
- 校验命令：SOP 第 5 步，`npm run check:toc -- --slug=<新 slug>` 不要漏