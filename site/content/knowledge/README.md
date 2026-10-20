# 知识库草稿工作台

知识库文章从起草到上线的全部东西都在这个文件夹里。它是「文章创作 + 上知识库」的自包含工作区：
正文、素材卡、预览记录、流程文档、脚本、日志都在一处，不散落在 `docs/`、`config/`、`scripts/`。

```
content/knowledge/
  README.md      本文件：目录说明与四条命令
  guide.md       写一篇新文章的完整流程（七步），从 docs/knowledge/SOP 搬来并改写为草稿视角
  log.md         流程改进日志：每次改机制记「问题 → 原因 → 改法 → 验证命令」，只追加不重写
  drafts/        文章正文（权威源）+ 每篇的 .source.md 素材卡 + .review.md 预览记录
  assets/        草稿阶段的截图、封面候选（随草稿进 git）
  scripts/       preview.mjs（预览端口）/ check_draft.mjs（体检）/ publish_knowledge_article.ts（发布）
  preview/       生成目录，gitignored：preview.mjs 生成的第二个 vitepress root
```

## 两个位置，两种状态

| | 草稿（未确认） | 已发布 |
|---|---|---|
| 正文 | `content/knowledge/drafts/<slug>.md`（权威源） | `docs/knowledge/<slug>.md` |
| 元数据 | `config/knowledge.ts` 里的条目可以先写，md 不在 `docs/` 时它不会上线 | 同左 |
| 线上 | 完全没有 | 有 |
| 预览 | `npm run draft:preview` → 41802 端口 | 41800 端口 |

草稿不进 `docs/`，意味着 dist、sitemap、`llms.txt`、`_redirects`、IndexNow 推送全都看不到它。
不进 `config/knowledge.ts` 的页面数据，列表页、JSON-LD、页脚文章数也不会出现它。**不需要给任何派生脚本加过滤逻辑。**

## 四条命令

```bash
npm run draft:preview                                  # 起草稿预览端口 41802（只读 drafts/ 与 docs/knowledge/）
npm run check:draft -- --slug=<slug>                   # 体检：frontmatter / 一句话答案 / H2 数 / 禁用小节 / faq / related
npx tsx content/knowledge/scripts/open_draft.mjs --list # 列草稿与当前状态
npm run publish:article -- --slug=<slug>               # 确认后把草稿移进 docs/knowledge/，并打印后续命令
```

预览端口 41802 是独立的 vitepress dev server，root 是 `preview/`（生成目录）：
它把已发布文章与草稿同步到自己的 root 后按官网原生组件渲染，**站点 dev（41800）完全看不到草稿**。
草稿页会打一个 `DRAFT · 未发布` 徽标，元信息从 frontmatter 兜底；没有 canonical / og / JSON-LD，
那些要等发布后 build 才生成，预览里不伪造。列表页在 `/drafts/`，每篇显示体检摘要与文件齐备情况。

改了 `drafts/*.md` 或 `docs/knowledge/*.md` 后，预览端口会自动重新同步（预览页热更新，不用重启）。

## 视频：草稿看本地，发布时上传

草稿期 41802 上的视频从本机 `public/videos/` 播放（`config/media_cdn.ts` 按端口把 CDN 地址置空），审稿不依赖外网。但线上产物里 `src` 是 R2 地址，R2 上只存带内容哈希的文件名。所以：

- **发布时**（`npm run publish:article`）脚本会在移动 md 之前自动做视频这一关：确认文章里每个 `<VideoPlayer>` 的本地 mp4 与 poster 都在 → 重算 `VIDEO_KEYS` 哈希映射 → 上传 R2 并校验远端大小。任一步失败就停在移动前，草稿原地不动。
- **每次 build** 最前面会跑 `npm run gen:media_keys:check`，映射与磁盘不一致（比如视频换了内容但没重新上传）时 build 直接失败。

视频一换就要走完：改 `public/videos/*.mp4` → `npm run gen:media_keys` → `npm run upload:media` → `npm run gen:poster`。草稿流程本身不需要手动做这些，`publish:article` 会替你跑。

## 误上线怎么被拦住

`open_draft.mjs` 复制到 `docs/knowledge/<slug>.md` 的预览副本没有 config 条目，
`check_dist.mjs` 的「docs/knowledge 下每个 md 都要有 config 条目」断言会让 build 直接失败。
`publish_knowledge_article.ts` 发布时会自动删掉副本。这套门禁在 build 链内，部署脚本不会拿到可推的产物。

## 规则

- 流程见 `guide.md`，写作规范（分类、模板、措辞、素材边界）见 `docs/knowledge_writing_guide.md`
- 每篇草稿配一个 `.source.md`（素材卡，每条事实带出处与日期）与一个 `.review.md`（预览记录：改了哪些、审核结论）
- 遇到流程本身的问题，记进 `log.md`，不要只在会话里说