---
title: 写一篇知识库新文章：七步流程
description: 给一个主题，写一篇能进知识库、过全部校验的文章：定题与定位、三层搜索、写素材卡、起草正文、注册与生成、固定顺序校验、发布前自查。
---

# 写一篇知识库新文章：七步流程

> **一句话答案**：定题 → 三层搜索 → 写素材卡 → 起草 → 注册 → 校验 → 自查。前三步决定质量，后三步决定能不能上线。

这份 SOP 是给「给一个主题，写一篇知识库文章」用的。目标是每篇文章都能一次过校验，并且事实可追溯。

## 第 0 步 定题与定位

**结论**：先看现有 21 篇占了哪些位置，再决定新文章放哪、叫什么。

- 打开 `config/knowledge.ts`，通读 `knowledge` 数组的 slug 与 cat，找出：已有主题、明显缺口、与新主题最接近的 2–3 篇。
- 定 slug：英文小写短横线，与文件名一致，和 md 的 H1 无关。
- 定 cat：只能从 `start`（上手与进阶）/ `how`（原理与机制）/ `cost`（成本与计费）/ `troubleshoot`（报错排查）里选。
- 定 related：指向 3 篇已存在的 slug，优先「同一用户旅程的前一步」和「读者可能接着看的」。这一字段就是页尾「相关阅读」卡片的全部内容，正文里不要再写链接列表。
- 判断是否要新分类：只有当新主题能独立凑够 2–3 篇、且与现有四类都不重叠时才拆。凑不够就放进现有分类，不要为了「更贴」新增分类。

**做对了的标志**：能用一句话说清「这篇写给谁、解决什么问题、和现有哪几篇互补」。

## 第 1 步 三层搜索

**结论**：一轮宽搜不够。官方来源定「准」，中文实战定「用户卡在哪」，热点与争议定「有没有反面声音」。

第一层，官方来源。命令、版本号、参数、报错文案一律以官方为准。

```bash
S=~/.claude/skills/web_search/scripts
python "$S/api_search.py" github "关键词"          # 官方仓库、skills 仓库
python "$S/fetch_url.py" https://官方文档页         # 读官方文档正文
```

第二层，中文实战。这层提供「用户实际卡在哪一步、哪条命令会报错」。

```bash
python "$S/platform_search.py" weixin  "关键词"     # 公众号教程
python "$S/platform_search.py" bilibili "关键词"    # 视频教程与实测
python "$S/platform_search.py" csdn     "关键词"    # 技术文章
python "$S/web_search.py" "site:xiaohongshu.com 关键词"   # 小红书笔记（只有 360 可用）
python "$S/web_search.py" "site:zhihu.com 关键词"         # 知乎讨论（可能需 ZHIHU_COOKIE）
```

第三层，热点与争议。避免文章只写好话。

```bash
python "$S/web_search.py" "主题 月份 刷屏 实测"
python "$S/web_search.py" "主题 缺点 翻车 争议"
```

纪律：

- 一组关键词搜不到，先换引擎（Bing 中文多词会切词、DDG 超时），再换 2–3 组关键词，才放弃。
- 封闭平台搜不到不代表内容不存在。改搜「站名 + 主题」在外网的讨论，往往能找到「该站上没有大量跟进，但有人在外网讨论它」这类结论。
- 对每个值得精读的链接，用 `fetch_url.py <URL>` 或 `content.py <URL>` 读正文 1–2 个，不要批量抓。
- 记录每个来源的标题、URL、日期。后面每条事实都要指回这里。

**做对了的标志**：至少有 5 个来源，其中 2 个官方、2 个中文实战、1 个反面或争议视角。

## 第 2 步 写素材卡

**结论**：先写卡，再写文。每条事实一句话，标注它能不能进正文。

把每条来源压成一句「事实 + 出处 + 日期」，写进 `config/knowledge_sources.ts` 里该 slug 的 `index` 字段。分三类：

| 类别 | 内容 | 去处 |
|---|---|---|
| 可进正文 | 有出处的具体数字、命令、案例、报错文案 | 正文 + `index` |
| 只进素材记录 | 第三方平台名、媒体名、博主名、争议观点 | 只进 `index` |
| 不进任何地方 | 联盟链接、推广段落、来源不明的二手转述 | 丢弃 |

第三方平台名不进正文，是 `config/knowledge.ts` 头部的约定，产物里出现就算违规。文章只写「公开案例」「社区实测」这类去来源化的说法。

**做对了的标志**：正文里每一个具体数字，都能在 `index` 里找到对应的一句话。

## 第 3 步 起草正文

**结论**：结构固定，每节先给结论再展开。

结构：

```
> **一句话答案**：……

（适用范围、时间线、核对日期句）

## 第一节
**结论**：……

## 第二节
……

（正文到这里结束；「常见问题」与「相关阅读」由组件渲染，正文不写）
```

每节的写法：

- 第一节行是 `**结论**：…`，一句话给答案，后面接展开。
- 命令用 fenced code block，逐行注释，注释写「这一步在做什么」而不是重复命令本身。
- 两个以上维度的对比用表格。
- 时间线、核对句固定格式：「截至 YYYY-MM-DD，本文已在 <官方来源> 核对过，标注日期是因为这类工具更新较快。」
- 每 3–4 节插一个表格或「结论」块，避免连续长段。
- 正文**不写** `## 常见问题` 和 `## 相关阅读` 两个小节。这两块由组件渲染：`KnowledgeDoc.vue` 在正文的「常见问题」h2 后插入折叠卡片（数据来自 `knowledge.ts` 的 `faq[]`），`KnowledgeFooter.vue` 在正文之后渲染「相关阅读」卡片区（数据来自 `related[]`）。正文里再写一遍会出现两个「相关阅读」区域。

**做对了的标志**：一篇没有连续超过 3 段的长文字；每个 H2 都能单独拎出来当一节摘要。

## 第 4 步 注册与生成

**结论**：正文写完才注册。注册了才有一切校验。

在 `config/knowledge.ts` 的 `knowledge` 数组加一条 `KnowledgeMeta`：

| 字段 | 约束 |
|---|---|
| `slug` / `cat` / `title` / `desc` / `summary` / `date` / `kicker` / `tags` / `minutes` | 必填 |
| `title` | ≤ 32 字，含目标长尾词 |
| `desc` | ≤ 110 字 |
| `summary` | ≤ 60 字 |
| `tags` | ≥ 3 个，是真实搜索词 |
| `related` | 3 篇已存在 slug |
| `faq` | 3–5 条，`q` 一句问题、`a` 一两句答案（答案原文写在这里，别压缩），这是 FAQ 内容的唯一来源 |
| `cover` | 可选，源页面有配图才填 |

在 `config/knowledge_sources.ts` 加一条 `SourceEntry`（`slug` / `fetchedAt` / `index` / `files`）。原创文章没有源站页面就写 `files: []`，脚本会打 WARN 并跳过 archive 生成，这是允许的。

然后依次生成：

```bash
npm run gen:og:knowledge    # OG 图
npm run gen:routes          # 路由重定向
npm run gen:sources         # 仅当 files 非空
```

**做对了的标志**：`npm run check:seo` 通过。

### 配封面

封面不要复用别的文章已经占用的那一张图。素材库是 `temp/aiprimetech_covers/`，挑**还没被使用**的素材，按文章主题做语义匹配，不按文件名机械对应。

先看哪些还空着：

```bash
# 在 site/ 下跑：先把站点已用的封面 md5 收成 /tmp/used.txt，再列出还没被用的素材名
md5sum public/knowledge/*.jpg | awk '{print $1}' | cut -c1-8 | sort -u > /tmp/used.txt
for f in temp/aiprimetech_covers/*.jpg; do d=$(md5sum $f | cut -c1-8); grep -q "^$d" /tmp/used.txt || basename $f .jpg; done
```

选好素材名后：

1. 在 `config/knowledge_cover_map.json` 的 `covers` 里加一条 `"<slug>": "<素材名>"`（无源页的文章必需；有 `/blog/` 源页的脚本会优先直抓源站 hero 图，登记只作备份）。
2. 删掉 `public/knowledge/<slug>.jpg`，否则脚本会跳过。
3. 跑 `python scripts/fetch_knowledge_covers.py`。它会复制素材、回写 `knowledge.ts` 的 `cover` 字段，并自动维护 `config/knowledge_cover_sources.json` 来源台账（`blog:<末段>` 是源站直抓，`cover_map:<素材名>` 是本地素材）。
4. `python scripts/fetch_knowledge_covers.py --check` 确认无缺失。

素材名对应的源文标题在 `temp/aiprimetech_site/pages/blog__<素材名>.md` 第一行 `h1|`，挑之前先读一眼确认没挑错。

素材库会枯竭。剩余素材里别家模型（GPT、Grok、The 等）的发布图与本站调性不符，优先挑 Claude Code / 成本 / 协议类主题。真挑不到合适的不填 `cover`，卡片会退化成纯文字卡，比配一张跑题的图好。

## 第 5 步 校验

**结论**：顺序固定，每步只看它该看的东西。

```bash
python scripts/check_seo_meta.py     # title ≤32 / desc ≤110 / tags ≥3
npm run check:sources                 # 素材登记与 archive 一致；原创文章打 WARN 属正常
npm run build                         # 产物
npm run check:links                   # 站内死链
node scripts/check_dist.mjs           # 结构、卡片、分类 tab
npm run check:toc -- --slug=<新 slug> # 目录锚点、FAQPage 条数、点击定位
python scripts/verify_build.py 4200   # 浏览器实测，本文项全 [ok]
```

两个已知陷阱：

- `npm run build` 现在应当通过（exit 0）。它曾在任何代码状态下都 exit 1，因为 `check_dist.mjs` 断言「产物里不能有 Vue SSR 标记」，
  与 `copy_public.mjs`「必须保留 SSR 标记否则 hydration 错位」直接矛盾；该断言已移除。若 build 又恒定失败，先读 [`../troubleshooting_guide.md`](../troubleshooting_guide.md) 再判断是不是回归。
- `npm run check:toc` 默认只抽每类一篇。传 `--slug=<新 slug>` 会把 start 分类的样本换成新文章（该 slug 应属于 start 分类），其余分类不变。传完记得看输出首行的确认。

**做对了的标志**：上面七条命令全部执行完，新 slug 没有出现在任何失败项里。

## 第 6 步 发布前自查

- [ ] 每条具体数字都能指回 `index` 里的素材卡
- [ ] 正文没有第三方平台名、媒体名、博主名
- [ ] 正文里没有 `## 常见问题`、`## 相关阅读` 小节（`grep -n '^## 常见问题\|^## 相关阅读' docs/knowledge/<slug>.md` 无输出）
- [ ] `faq` 3–5 条，答案写的是原文而不是压缩版
- [ ] `related` 里的 3 篇都已存在
- [ ] 封面图没有和其他文章重复，且语义对得上本文主题（没复用已用素材）
- [ ] `git diff scripts/` 为空，除非本次有意改了脚本
- [ ] 新建 md 后立即确认它能被读到（`ls` 与 `python -c "import os; os.path.exists(...)"`），不要只在写文件的那一步自认成功
- [ ] `check:toc -- --slug=` 跑过
- [ ] `verify_build.py` 本文项全绿

## 相关阅读

- [Claude Code 教程：第一次会话之后怎么用](/knowledge/claude-code-tutorial)：装好之后的第一次会话、CLAUDE.md、常用命令
- [Claude Code 技能怎么写](/knowledge/claude-code-skills)：技能是什么、装在哪、怎么写一个能被正确触发的技能