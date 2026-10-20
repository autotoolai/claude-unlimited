# 流程改进日志

只追加。每条写四件事：**问题 → 原因 → 改法 → 验证命令**。目的是下次遇到同类问题时不用重新踩一遍。

---

## 2026-10-14 建立草稿工作台

### 问题 1：vitepress 的 `rewrites` 无法预览 srcDir 之外的草稿

- **现象**：config.mts 里配 `rewrites: { 'content/drafts/(.*)': 'knowledge/$1' }`，41800 上访问 `/knowledge/<slug>.html` 直接 404。
- **原因**：rewrites 只在 `srcDir`（`docs/`）内部重排「已经存在的页面键」（vitepress 1.6.4 `resolveRewrites` 只遍历 `resolvePages` 扫出来的 `pages`）。
  草稿在 `docs/` 之外，根本不在页面集合里，规则不会凭空造页面。相对路径、绝对路径、带 `.html` 三种写法都实测过，全部 404。
  另外 `srcExclude` 也不能加草稿：被排除的文件既不是页面，也不会被 dev 中间件按需编译。
- **改法**：放弃 rewrites 与自写 dev 中间件（后者会撞上 vite 的 SSR 预打包检查，报
  `There is a new version of the pre-bundle for ...`，与路径无关）。改为 `open_draft.mjs` 把草稿复制进 `docs/knowledge/`
  让 41800 原生渲染，再加 `check_dist.mjs` 门禁防误上线。
- **验证**：`node content/knowledge/scripts/preview.mjs --once` 生成内容根；浏览器打开 `/knowledge/<slug>.html`，
  `document.querySelector('.cu-shell--knowledge')` 非空、H2 目录项数等于正文 h2 数。

### 问题 2：草稿流程散落在四个地方，找不到

- **现象**：正文在 `content/drafts/`、脚本在 `scripts/`、流程在 `docs/knowledge/SOP-*.md`，还有一个遗留的 `_fix_meta.py` 在 `site/` 根。
- **原因**：每加一个能力就找一个「看起来合适」的位置，没有约定。
- **改法**：整套收进 `content/knowledge/`（正文 / 素材卡 / 预览记录 / 脚本 / 流程 / 日志）。
  SOP 搬为 `guide.md` 并改写为草稿视角，原文件删除、`config.mts` 的 `srcExclude` 同步去掉那一行。
  `config/` 下的 `knowledge.ts`、`knowledge_sources.ts`、`knowledge_cover_map.json` 保持在原处——它们是全站唯一数据源，
  多个生成脚本与门禁都读它们，搬走会牵连一片。
- **验证**：`grep -rn "SOP-写一篇新文章" --include="*.md" --include="*.mts"` 只命中历史说明；`npm run build` exit 0。

### 问题 3：`publish_knowledge_article.ts` 从仓库根跑会找不到草稿

- **现象**：`process.cwd()` 作根，`cd` 到上层再跑脚本就报「找不到草稿」。
- **原因**：`process.cwd()` 依赖调用位置，而另外两个脚本用 `import.meta.dirname`，行为不一致。
- **改法**：三个脚本统一用 `import.meta.dirname` 上溯到 `site/`。
- **验证**：`cd /tmp && node <site>/content/knowledge/scripts/check_draft.mjs --list` 正常输出。

### 问题 4：预览副本会以正文文件名出现在 `git status`

- **现象**：`open_draft` 复制出的 `docs/knowledge/<slug>.md` 与已发布文章同名同形，忘关时 `git status` 里看起来像一篇正常文章，可能被误 commit。
- **原因**：副本沿用 `<slug>.md` 命名。
- **改法**：`.gitignore` 增加 `docs/knowledge/_draft-*.md`；副本文件名带 `_draft-` 前缀（路由由前缀反解）。
- **验证**：`git check-ignore docs/knowledge/_draft-x.md` 命中；`git status --short` 不出现。

### 问题 5：`check_dist.mjs` 的「非文章 md」判定写死文件名

- **现象**：`NON_ARTICLE_MD = new Set(['index.md', 'SOP-写一篇新文章.md'])`，SOP 搬走后要改这里，漏改就 build 失败。
- **原因**：黑名单逐个列文件名，与项目里 `srcExclude` 同样的毛病。
- **改法**：改成前缀规则 `f === 'index.md' || f.startsWith('SOP-')`。
- **验证**：`npm run build` exit 0。

### 问题 6：脚本搬进 `content/knowledge/scripts/` 后，相对导入全部指错

- **现象**：`check_draft.mjs` 与 `publish_knowledge_article.ts` 都报 `Cannot find module .../content/knowledge/config/knowledge`。
- **原因**：两者原来在 `scripts/` 下，`'../config/knowledge'` 正好指到 `site/config/`；搬到 `content/knowledge/scripts/` 后它变成 `content/knowledge/config/`。
- **改法**：都用 `pathToFileURL(resolve(root, 'config', 'knowledge.ts')).href` 动态导入（`root` 由 `import.meta.dirname` 上溯三层得出）。
- **验证**：`node content/knowledge/scripts/check_draft.mjs --slug=<slug>` 与 `npm run publish:article -- --slug=<slug>` 都能跑完。
- **教训**：脚本从 `scripts/` 搬到别处时，所有相对导入都要重新算；`tsImport(specifier, { parentURL: import.meta.url })` 也必须显式给 parentURL，否则报「must be provided」。

### 问题 7：`layout: draft_index` 渲染成未注册的自定义标签

- **现象**：预览端口 `/drafts/` 页面标题是「VitePress」，DOM 里是 `<div id="app"><draft_index></draft_index></div>`，卡片全没有。
- **原因**：VPContent 走 `<component :is="frontmatter.layout">`，只能解析 `enhanceApp` 里 `app.component(name, comp)` 注册过的**全名**。
  注册的是 `DraftIndex`，md 里写 `draft_index`，解析不到就当普通 HTML 标签，组件完全没挂载。
- **改法**：`preview.mjs` 生成 frontmatter 时写 `layout: DraftIndex`（全站其它页面也是全名：`knowledge_index` 例外是因为它注册名就叫 `knowledge_index`）。
- **验证**：浏览器打开 `/drafts/`，`.cu-shell--drafts` 与 `.cu-dcard` 都存在，卡片数等于草稿数；标题不再是 VitePress。

### 问题 8：`.source.md` / `.review.md` 被当成文章收进预览列表

- **现象**：`drafts/` 里的 `e2e-test.source.md` 与 `e2e-test.review.md` 也出现在列表页，卡片标题是文件名。
- **原因**：`preview.mjs` 的过滤条件只判了 `.endsWith('.md')`。
- **改法**：再加一条 `!f.endsWith('.source.md') && !f.endsWith('.review.md')`。这两个文件是内部文档，不同步到预览端口，列表页只显示它们是否存在（`source` / `review` 标记）。
- **验证**：`node content/knowledge/scripts/preview.mjs --once` 后 `preview/drafts/` 只有 `index.md`，frontmatter 里 `drafts` 数组不含 `.source` / `.review` 条目。

### 问题 9：`check:draft` 在导入失败时仍然 exit 0（假绿）

- **现象**：`npm run check:draft -- --slug=e2e-test` 什么都不输出、退出码 0，但 config 条目根本没检查——因为脚本在 `tsImport` 那一步就崩了。
- **原因**：模块顶层异常发生在读取参数、进入主流程之前，进程以 1 退出，但 `npm` 把 stderr 混在 grep 里时很容易被忽略。
- **改法**：不靠退出码判断，命令输出里必须出现 `[ok]` 或 `[fail]` 行才算跑过。
- **验证**：`node content/knowledge/scripts/check_draft.mjs --slug=e2e-test` 输出 `[fail] e2e-test 1 项不合规` 与 `[draft] 1 篇草稿：0 篇合规`；`publish:article` 同样要看到「已移动」那一行。
### 问题 10：回滚测试数据时用整文件备份，恢复的版本比预期新

- **现象**：临时 config 条目被删后，build 报「1 项未通过」，因为备份文件是在期间另一步写下的，包含了别的改动。
- **原因**：整文件备份不等于「当前状态减一处」，尤其当期间还有别的改动时。
- **改法**：回滚 config 条目用正则只删目标块（`slug: '<slug>'` 到下一个 `  },`），不要整文件覆盖。
- **验证**：`grep -c "^    slug: '" config/knowledge.ts` 应等于发布前的篇数；`git diff config/knowledge.ts` 只剩 code-video 那段删除。

### 问题 11：草稿预览的视频要本地播放，走 CDN 时浏览器报 404

- **现象**：草稿页四个 `<VideoPlayer>` 全部黑框，`video.error.code === 4`（MEDIA_ERR_SRC_NOT_SUPPORTED）。
- **排查**：R2 域名本身是通的，但产物里的 src 是**无哈希**的 `videos/v1_round3.mp4`，而 R2 上只有带哈希的 `videos/v1_round3.77bbc425.mp4`（返回 206），无哈希名返回 404。也就是说线上文章一旦内嵌视频，也会 404。
- **改法（预览侧）**：`config/media_cdn.ts` 在 `location.port === '41802'` 时把 `VIDEO_CDN` 置空，`videoUrl()` 回落站点根路径，视频由 41802 自己的进程从 `site/public/videos/` 提供。
- **为什么不走构建期 define**：试过三遍都不生效——`define: { VITE_X: '1' }`（Vite 只替换裸标识符）、`define: { 'import.meta.env.VITE_X': '"1"' }`（vitepress dev 把 `config.vite.define` 丢掉了，curl 主题模块拿到的仍是未替换源码）、换成裸常量 `__CUP_DRAFT_PREVIEW__`（同样没被替换）。运行期按端口判断是唯一可靠的做法。
- **顺带修**：`videoUrl()` 原本在 `VIDEO_CDN` 为空时回落到带哈希的 key（`/videos/xxx.a1b2.mp4`），但本地 `public/videos/` 存的是原名，那条回落一定 404。改成一律用原名。
- **顺带修**：`.vitepress/theme/middleware.ts` 的 MIME 表没有 `.mp4`，且不处理 Range 头。浏览器靠 Range 拖进度条，只回 200 全量则 seek 失效、Safari 直接不播。补 `.mp4/.webm/.mov` 的 MIME 与 206 分支。
- **验证**：`curl -o /dev/null http://127.0.0.1:41802/videos/v1_round3.mp4` → 200 `video/mp4`；带 `Range: bytes=0-1023` → 206；浏览器里四支 `readyState=4`、时长 31.9/41.7/36.0/73.8 秒、分辨率 1920x1080 / 1280x720、`error.code` 全为 null。
- **注意**：v6_seek_t.mp4 实际时长 73.8 秒，草稿 caption 写的 41.0 秒是下架前那版的数字，需要按现文件重新量。

### 问题 12：草稿能播 ≠ 线上能播（视频的两套地址）

- **现象**：草稿在 41802 上能播（四支本地 mp4 都正常），但线上产物里 `src` 是 `https://media.../videos/v1_round3.mp4`——**无哈希**。R2 上只存带内容哈希的 `videos/v1_round3.77bbc425.mp4`，无哈希名一律 404。也就是说文章一旦发布，线上就是黑框。
- **两套地址并存的原因**：草稿期 41802 按端口把 `VIDEO_CDN` 置空（问题 11），走本机 `public/videos/`；build 产物走 R2。草稿期验证的是本地文件，验证不到 R2 上有没有对应对象。
- **改法（发布侧门禁）**：`publish_knowledge_article.ts` 在移动 md **之前**检测文章里的 `<VideoPlayer src>`，逐个确认：本地 mp4 存在 → poster 存在 → 重算 `VIDEO_KEYS` 哈希映射 → `upload_media.py` 上传并校验远端大小。任一步失败就退出，草稿原地不动，不会出现"发布到一半"。
- **改法（build 侧门禁）**：`package.json` 的 `build` 最前面加 `npm run gen:media_keys:check`。视频内容一换，哈希后缀就变，`VIDEO_KEYS` 不同步时 build 直接失败——映射与磁盘不一致时，后面所有步骤都是白跑。
- **为什么两道都要**：发布门禁防"这篇没上传"，build 门禁防"视频换了但没重新上传"。前者只在 publish 时跑，后者每次 build 都跑。
- **验证**：`npm run gen:media_keys:check` → `[media-keys] 一致（7 条）`，exit 0；`npm run build` exit 0。

### 问题 13：结构化数据有两份实现，改一处漏一处

- **现象**：定价页 2026-10-12 起页内不再挂 FAQ 组件，但 `pages/data.ts`（客户端注入）与 `pages/jsonld_server.ts`（构建期写进产物）两处都还输出 FAQPage。产物里声明了页面上看不见的 4 条限速问答。
- **原因**：JSON-LD 在本项目有两个生成入口，各写一份，内容靠人工同步；验收脚本只查「产物里有没有 FAQPage」，没查「页内有没有对应内容」，两份实现漂移时没人发现。
- **改法**：两处同时去掉定价页的 FAQPage 节点；验收脚本补两条断言——「定价页 JSON-LD 不含 FAQPage（页内没有 FAQ）」与「限速类条目在 /faq 齐活」，把「结构化数据必须与页内可见内容一致」变成门禁。
- **验证**：`npm run verify` 输出「定价页 JSON-LD 不含 FAQPage」与「FAQ 页：限速类 4 条齐活」两项 [ok]。

### 问题 14：门禁只扫 chunks，按页拆出的 chunk 从旁边漏过去

- **现象**：`docs/changelog.md` 正文写了素材站域名，域名随页面进了 bundle 与 sitemap，但 `npm run build` 通过，只有 `npm run verify` 抓到。
- **原因**：`check_dist.mjs` 的域名检查只扫 `dist/assets/chunks/*.js`；VitePress 把 `changelog.md` 编译成 `dist/assets/changelog.md.<hash>.js`，在 chunks 目录之外，不在扫描范围内。chunks 目录里只有共享代码。
- **改法**：域名检查改成递归扫全 dist 的文本文件（html/js/css/xml/txt/json），命中就报出具体是哪个文件。
- **验证**：`grep -rl aiprimetech .vitepress/dist` 无输出；改动前 changelog.html 与 changelog.md.*.js 都能命中。

### 问题 15：media_keys 门禁拿「回写后的新块」跟自己比，恒真

- **现象**：`npm run gen:media_keys:check` 永远 exit 0。故意把 `config/media_cdn.ts` 里的哈希改成错值，门禁照样报「一致」；`build` 链条第一道（`gen:media_keys:check`）因此形同虚设。
- **原因**：脚本先按磁盘上的视频算出 `wanted`，再用它生成 `next`（要回写的内容），然后拿 `parseKeys(next)` 去和 `wanted` 比——`next` 本来就是 `wanted` 生成的，比较的是同一个值的两份拷贝，永远相等。
- **改法**：拿「文件里已登记的」`parseKeys(src)` 与「磁盘算出的」`wanted` 做集合比较，报多余/缺失。另加一条：本地 `public/videos` 没有 mp4 时（视频源文件在 R2 托管、不入库）直接跳过并 exit 0，且**不回写**——否则公开仓库里克隆下来跑一次 `gen:media_keys` 就会把已登记的映射清空，线上视频链接全失效。
- **验证**：本机（7 支 mp4 在盘）报「一致（7 条）」exit 0；把某条哈希改成 DEADBEEF 后报「多余/缺失」并 exit 1；干净克隆（无 mp4）报「跳过」exit 0，且 `config/media_cdn.ts` 的 VIDEO_KEYS 仍是 7 条。
