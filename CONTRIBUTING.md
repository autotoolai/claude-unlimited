# 贡献指南

本仓库是「Claude 无限卡」官网的前端源码，同时是站内全部内容的可核对版本。两种贡献都欢迎，但流程不同。

**先明确一件事**：这里只讨论源码与内容。购买、兑换、额度、退款、售后走[官网](https://claude-unlimited.aiautotools.com)右下角的在线助手，不要在 issue 里提单。商业服务的消费争议也不适用本仓库的[行为准则](CODE_OF_CONDUCT.md)。

## 两种贡献

| 你想改什么 | 走哪条路 |
|---|---|
| 知识库文章、FAQ、套餐文案、教程步骤 | [改内容](#改内容) |
| 页面样式、组件、构建脚本、SEO 基建 | [改源码](#改源码) |

不确定改哪边：内容是「读者读到的话」，源码是「读者怎么看到这句话」。文案属于内容，样式属于源码。

## 改内容

### 知识库文章

新文章的权威位置是 `site/content/knowledge/drafts/`，**不是** `site/docs/knowledge/`。完整流程见 [`site/content/knowledge/guide.md`](site/content/knowledge/guide.md)（七步：定题 → 搜证 → 素材卡 → 起草 → 注册元数据与配封面 → 预览审核 → 发布校验）。

```bash
cd site
npm run check:draft -- --slug=<slug>   # 体检 frontmatter、一句话答案、H2、faq、related
npm run draft:preview                  # 本地预览草稿，端口 41802
npm run publish:article -- --slug=<slug>   # 确认后移进 docs/knowledge/
npm run check:toc -- --slug=<slug>     # 新文章必跑
```

写完还要同步两处数据源：

- `site/config/knowledge.ts` —— 文章元数据（标题、一句话简介、分类、FAQ、相关推荐）。
- `site/config/knowledge_sources.ts` —— 素材来源登记。第三方域名只允许出现在这个文件和 `site/archive/` 里。

### 写内容的硬规则

- **正文不要写回 markdown**。页面正文在 `site/.vitepress/theme/*.vue`，教程在 `site/config/guide.ts`，只有知识库文章本身在 `site/docs/knowledge/*.md`。
- **同一段内容站内只允许有一个主场页**。别处只能给一行链接。判断规则见 [`site/docs/content_structure.md`](site/docs/content_structure.md)。
- **数字不许手写进文档**。文档里出现「N 项 / N 条」就是漂移的起点。要写的数字得先落到 `site/config/` 里的数据源，页面从那里派生。改价格与限流数字的流程见 [`site/docs/plans_sync.md`](site/docs/content_structure.md)。
- **一个知识库分类只留一个主场页**，分类边界见 [`site/docs/knowledge_writing_guide.md`](site/docs/knowledge_writing_guide.md)。

### FAQ 与套餐

- FAQ 唯一数据源是 `site/config/faq.ts`。答案是纯文本，第一句必须是结论；链接与代码用 `links` / `code` 字段，不要在答案里写 Markdown。
- 套餐价格唯一数据源是 `site/config/plans.ts`，价格以发卡站商品详情为准，用 `npm run sync:plans` 同步，不要手改。

## 改源码

### 先读

- [`site/CLAUDE.md`](site/CLAUDE.md) —— 项目的硬规则与技术约定。
- [`site/docs/README.md`](site/docs/README.md) —— 文档地图，「我要改 X 就读 Y」。

### 环境

Node 20 与 Python 3.12（构建链里有 Python 门禁）。

```bash
git clone https://github.com/autotoolai/claude-unlimited.git
cd claude-unlimited/site
npm ci
npm run dev:site    # 端口 41800
```

常用端口：dev 41800、产物预览 41777、草稿预览 41802、public 静态服务 4198。**端口不能混**，细节见 `site/CLAUDE.md`。

### 提交前必跑

```bash
npm run build        # 构建链：结构门禁、SEO 与地理门禁、死链、CSS 检查
npm run verify       # 逐页验收断言：SEO / 组件 / 链接
npm run check:links  # 死链
npm run check:css    # 改了 .vitepress/theme/**/*.css 必跑
```

改了 `site/config/` 里的数据、想让仓库根 README 的清单跟着变时，再加一条：

```bash
npm run gen:readme   # 重新生成 README 的清单区块
npm run check:readme # 校验 README 与生成结果一致
```

README 的知识库清单、教程索引、套餐价格、精选 FAQ 都是脚本从 `config/` 生成的。**不要手改 README 里 `<!-- readme:xxx:start -->` 与 `<!-- readme:xxx:end -->` 之间的内容**，改数据源后跑 `gen:readme` 即可。CI 会校验两者一致。

### PR 要求

在 PR 描述里贴出门禁的通过输出。格式见 [PR 模板](.github/PULL_REQUEST_TEMPLATE.md)。

## 我们不收什么

- **售后与商业纠纷**：额度、扣费、退款、账号问题 → 官网在线助手与客服。GitHub issue 不是客服渠道。
- **直接改价格、客服号、退款规则**：这些是商业决策，不接受 PR 直接改。请开 issue 讨论，维护者会在 `site/config/` 里改。
- **重写整站**：改动太大时先开 issue 谈方向，别直接投 PR。
- **第三方站点的原文副本**：有著作权风险，不要提交。素材只做登记。

## 需要注意的两点

1. **不要在 PR 里带密钥**。仓库根的 `config/local/` 与 `site/config/seo_secrets.env` 只在本机，是 gitignore 的。`site/public/7c2f4a91*.txt` 是 IndexNow 协议要求的公开校验文件，属于例外，可以入库。
2. **不要改 `site/config/site.ts` 里的商业字段**（价格、客服联系方式、合作平台地址、法务信息）。改这些走上面的 issue 讨论流程。
