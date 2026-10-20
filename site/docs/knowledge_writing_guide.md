# 知识库写作规范（docs/knowledge/*.md）

「Claude 知识库」的正文写在 `docs/knowledge/<slug>.md`（原生 markdown，未确认的草稿先放 `content/knowledge/drafts/<slug>.md`），元数据在 `config/knowledge.ts`，源站原文登记在 `config/knowledge_sources.ts`。
本文件只管写作规范（分类、模板、措辞、素材边界），**流程见 [`content/knowledge/guide.md`](../../content/knowledge/guide.md)**。

## 四个分类（按用户旅程）

| key | 名称 | 用户动机 |
|---|---|---|
| start | 上手与进阶 | 装好只是开始：第一次会话、常用命令、计划模式、权限、CLAUDE.md，再往下是子代理与技能 |
| how | 原理与机制 | 想搞懂它为什么这么运行：上下文、token、缓存、限流 |
| cost | 成本与计费 | 想少花钱：账单构成、估算方法、按量与订阅的取舍、模型选型、终端 agent 怎么选 |
| troubleshoot | 报错排查 | 出错了：按报错信息查，一次一个问题 |

时效性内容（模型发布、版本变化）不进知识库，官网不设「更新与动态」分类：文章的价值应当长期成立，版本相关的事实写进正文并标注核对日期。

边界：**配置完成之前**看[使用教程](/guide)（装工具、Base URL、Key、模型）；**知识库只服务配置完成以后**的人。知识库里提到配置一律链到 /guide，不写自己的接入步骤。一篇一个主分类，tags 做横切。

## 加一篇文章：只管内容

流程在 [`content/knowledge/guide.md`](../../content/knowledge/guide.md)（草稿 → 预览 → 发布七步）。这里只重复三条容易忘的：

1. `faq[]` 是 FAQ 内容的**唯一来源**，正文不写 `## 常见问题`；`related[]` 是页尾「相关阅读」的唯一来源，正文不写 `## 相关阅读`。
2. 数组内书写顺序 = 站内排序，不要按字母排。
3. 第三方平台名只允许出现在 `config/knowledge_sources.ts` 与 `archive/`，本文件、`knowledge.ts` 与产物里不得出现。

`scripts/check_dist.mjs` 与 `scripts/verify_build.py` 的 PAGES 从 `config/knowledge.ts` 动态读取，不用手动加路由。

## markdown 模板

```markdown
---
layout: page
knowledge: true
title: <H1，含目标长尾词，≤ 30 字>
description: <≤ 110 字，含主关键词 + 一句话结论>
category: start | how | cost | troubleshoot
kicker: <页头短标签，如 Claude Code>
head:
  - - meta
    - property: og:title
      content: <title> · Claude 知识库
  - - meta
    - property: og:description
      content: <description>
---

# <H1，与 frontmatter title 一致>

> **一句话答案**：<40–80 字，直接回答标题的问题>

<2–3 段展开适用范围与前提，提到配置就链到 /guide>

## <H2：第一个方面>

**结论**：<1–3 句，独立成段，先给答案>

<展开细节、命令块、表格>

## 常见问题

### <问题 1>            ← 与 config/knowledge.ts 的 faq[].q 逐字一致
<直接答案，40 字以内>

### <问题 2>
…

## 相关阅读

- [使用教程](/guide)：小白六步带截图，高级配置两节给提取 Key 与手动配置（接口地址 / API Key / 模型名）的填法
- [常见问题](/faq)：限速与退款规则
```

frontmatter 里不写 `date`：发布日期只存在于 `config/knowledge.ts`，用于 JSON-LD 的 `datePublished` 与站内排序，页面不展示。

`layout: page` 是 VitePress 默认外壳的「只有正文」分支：VPDoc 输出 `.vp-doc` 但不渲染原生英文 aside；右侧目录由 `KnowledgeDoc.vue` 渲染 `SectionNav.vue`，目录项在客户端挂载后从正文的 `h2[id]` 读取（SSR 里为空，`verify_build.py` 因此不核对目录锚点，改由 `npm run check:toc` 在浏览器里核对）。

两个踩过的坑（改布局前先读 `.vitepress/theme/Layout.vue` 与 `config.mts` 的 themePackages 注释）：文章正文用 VitePress 官方的 `<Content />` 渲染，不要 import `VPContent` 组件（会形成环）；页面组件目录在 `srcDir` 下、VitePress 不为它解析 `vitepress` 内置主题别名，`.vitepress/theme/components/*.vue` 直接 `import { Content } from 'vitepress'` 必须在 `config.mts` 里配 `themePackages` 指向 `./.vitepress/theme`。

## 写作规范（GEO）

1. 标题含目标长尾词，中文口语，不用「详解」「全解析」「一文读懂」。**标题 ≤ 32 字**：百度 SERP 中文标题约 30 字后截断，把最长的 10 篇砍到 32 字内时原则是砍掉冒号后的技术细节、保留主关键词（`.claude/agents 配置与并行` 这类内容移进 description）。
1b. **description ≤ 110 字**，含主关键词 + 一句话结论。`claude-code-permission-modes` 曾有 117 字。
1c. **正文（不含「## 相关阅读」）至少 3 条站内互链**，锚文本用真实关键词且与目标页当前 H1 一致——改标题后要全站搜一遍旧标题（`grep -rn '\[<旧标题>](/knowledge/'`）同步锚文本，否则锚文本与目标页标题不符会削弱相关性信号。2026-10-09 排查发现 20 篇里有 8 篇正文零内链，只有「相关阅读」在链，爬虫拿不到页面间关系。
1d. **`tags` 至少 3 个**，它就是这篇文章 per-page `keywords` 的唯一来源（`.vitepress/config.mts` 的 `transformHead` 按路由从 `knowledge.ts` 反查 `tags` 注入；缺 tags 会静默回落到全站那条全局 keywords）。只放用户真会输的搜索词，不要堆砌。
2. 首段是答案，不写「在当今 XX 时代」式开场。
3. 每个 h2 的**第一个自然段以 `**结论**：` 开头**，独立成段，2–3 句以内。这是被 AI 搜索直接引用的段落。
4. **每篇必须有「## 常见问题」，3–5 条**，问题用真实搜索句式，答案两段以内、先给结论。问题文本要写进 `config/knowledge.ts` 的 `faq[]`（FAQPage JSON-LD 的来源）；`verify_build.py` 会校验两者一致。
5. 每篇至少 3 条站内互链（`/knowledge/<同类>`、`/guide`、`/faq`、`/pricing`、`/models`），锚文本用真实关键词。
6. 具体数字（并发 20 / 60 次每分钟 / 300k token 每分钟）只在 `/faq`、`/pricing` 出现；两者都由 `config/rules.ts` 派生，改数字只改那一处。正文链接过去。
7. 时效性事实标注「截至 2026-10-XX」或改成「以官方文档 / CC Switch『获取模型列表』的实际返回为准」。
8. 素材页的表格被压成连续文本行，引用时重排成真表格。
9. 配置示例用 ```bash / ```json 代码块，不截图。
10. 不出现工程口吻（「在 config 里改」）；不出现素材站品牌名、链接、折扣数字；正文不得出现素材站域名（`verify_build.py` 硬门禁）。
11. 图片首批不用；需要时必须登记进 `theme/components/GuideShot.vue` 静态 import 表（图片不能放 `docs/`）。
12. 源站原稿的正文以 `h2|`、`h3|` 前缀存行（不是 Markdown），翻译时按前缀还原成标题层级。

## 收录基建

- 站长平台验证 meta 在 `.vitepress/config.mts` 的 `head` 里，但**默认不发**：`BAIDU_VERIFY_CODE` / `GOOGLE_VERIFY_CODE` 两个环境变量为空时整条跳过，避免把占位字符串发上线。构建时带上即可：

  ```bash
  BAIDU_VERIFY_CODE=<百度 HTML 标签验证 code> GOOGLE_VERIFY_CODE=<GSC code> npm run build
  ```

- `sitemap.xml` 由 `gen_sitemap.ts` 扫 dist 自动生成（2026-10-09 实测 28 条，含全部 20 篇知识库文章），`public/robots.txt` 已指到它。上线后去百度搜索资源平台手动提交一次。
- 全站目前**没有任何统计埋点**（GA / 百度统计 / Clarity / Umami 都没有），收录与排名情况是黑盒。

## 素材边界

素材原文在 `site/archive/knowledge_source_20261009/<slug>/`（由 `scripts/gen_sources.py` 从 `config/knowledge_sources.ts` 逐字复制，不做任何替换；`_index.md` 记录源 URL、栏目、抓取日期与中文摘要）。源站抓取的原始目录在仓库根 `temp/aiprimetech_site/`（gitignored），重跑前先复制到 `site/temp/aiprimetech_site/`。

全部中文原创改写，不逐句翻译；素材的句子、例子、结构都不照搬。涉及版本号、模型名、价格的必须核对官方文档并标注日期。