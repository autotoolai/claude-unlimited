## 改了什么

<!-- 一句话说清改了什么、为什么。 -->

## 怎么验的

<!-- 列出跑过的命令与结果。涉及站点改动的必须附上这些门禁的通过输出：

- `cd site && npm run build`（含 20 步构建链与 check_dist 结构门禁）
- `cd site && npm run verify`（SEO / 组件 / 链接验收）
- `cd site && npm run check:links`（死链）
- `cd site && npm run check:css`（改了 .vitepress/theme/**/*.css 必跑）
-->

## 注意

- [ ] 不含 API Key、密码、token（本仓库的 `config/local/` 与 `site/public/7c2f4a91*.txt` 除外，后者是 IndexNow 协议要求的公开校验文件）
- [ ] 不含第三方站点原文副本（`site/archive/knowledge_source_20261009/` 不入库）
- [ ] 页面正文仍在 `.vitepress/theme/*.vue` 或 `config/*.ts`，没有把正文写回 markdown
- [ ] 数字来自 `config/` 的推导，没有手写进文档
