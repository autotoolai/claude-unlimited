# 使用教程页信息结构与视觉规范

页面：`/guide`（索引页）与 `/guide/<场景>`（5 个客户端页）。
数据源 `config/guide.ts`，渲染链路 `GuideIndexPage.vue` / `GuideScenePage.vue` → `GuideBlockBody.vue` → `GuideSteps.vue`。
本文件是写教程内容的唯一依据。要加一步、改一句文案或加一个客户端，先对照这里的槽位定义，不要临时新造字段。

2026-10-20 重构：教程从「单页两条轨（小白教程 / 高级配置）」改成「索引页 + 每客户端一页」。
改动原因：买家手上的真实问题是「我想在我用的那个工具里跑起来」，而不是「我是新手还是高手」。
去掉「高级配置」轨后，教程只问一个问题——**你在哪个客户端里用 Claude**。2026-10-13 那版删除的
「报错对照表」「环境变量」等入口仍然不恢复：排错由知识库文章与 `/faq#cat-setup` 承接。

## 一、页面结构

```
/guide                 索引页：选客户端
├── /guide/cc          Claude Code（VS Code 插件 / 终端）     6 节
├── /guide/desktop     Claude 桌面版                          8 节
├── /guide/codex       Codex                                  9 节
├── /guide/workbuddy   WorkBuddy                              3 节
└── /guide/cursor      Cursor 等其它客户端（三个值 + 速查表）  3 节
```

索引页与场景页的页内形状（`PageShell` 传 `toc="side"`，窄列两列骨架）：

```
页头：eyebrow + H1 + lead（页头副标题）
   ↓
场景切换条（5 个链接，aria-current 标当前；只在场景页）
   ↓
一句话答案（.cu-guide-answer，结论式独立成段）
   ↓
小节流（.cu-guide-rail）：1. … N.，编号在 H2 里
   每节：结论式 lead → 段落 → 列表 → 提示 → 命令块 → 表格 → 步骤 → 网址行 → 插图 → 按钮 → 链接
   ↓
常见问题（#faq，3–5 条 details 折叠）
   ↓
相关阅读（#related，≥3 条站内链接，锚文本是真实关键词）
   ↓
页尾：接着看（.cu-next）+ CTA
```

**没有轨切换器。** 每页一条路径，读者不需要分流。场景切换条是链接不是 tab：这 5 个是 5 个独立页面
（各自独立 URL 与 SEO meta），用 `<a>` 与 `aria-current`，不套 tablist 语义。

**路由形态已生产验证。** `docs/guide/<scene>.md` → `dist/guide/<scene>.html` → `/guide/<scene>`，
与 `docs/knowledge/<slug>.md` 同构，Cloudflare Pages 自动命中；`copy_dir_overviews.mjs` 只为
`/guide` 与 `/knowledge` 两页复制目录总览，教程子页不需要改。

## 二、md 壳与 config 的分工

| 层 | 文件 | 放什么 |
|---|---|---|
| 页面级 SEO | `docs/guide/<scene>.md` frontmatter | `title` / `description` / `head`（og:title、og:description）/ `scene` |
| 结构化内容 | `config/guide.ts` | 小节、步骤、截图、表格、FAQ[]、related[]、tags[] |

**`title` 与 `description` 有两个副本**：`docs/guide/<scene>.md` 的 frontmatter（喂 `<title>`、
`<meta description>`、OG）与 `config/guide.ts` 的 `page.title` / `page.desc`（喂 JSON-LD 的
`HowTo.name` 与 llms-full.txt）。两份文字必须一致——不一致时搜索结果与 AI 引用会各说各话。
改一处要同时改另一处。

`page.desc` 目前**没有渲染用途**（meta description 由 frontmatter 提供），但它是 JSON-LD 与
llms-full.txt 的一份冗余，改的时候以 frontmatter 为准。

`description ≤ 110 字`、`title ≤ 32 字`（`verify_build.py` 硬门禁，中文 SERP 会截断）。

## 三、小节（GuideBlock）的槽位

| 槽位 | 是否必填 | 放什么 | 不放什么 |
|---|---|---|---|
| `id` | 必填 | **全站唯一**，场景页用 `'<场景>-<语义>'`（如 `cc-models`、`codex-key`） | 不手写序号；不带场景前缀会导致同一共享块在 5 页撞锚点 |
| `title` | 必填 | 小节主题名，**不含序号**。序号由 `guideBlocks()` 按页内位置生成 `h2 = 'N. title'` | 不写「小白教程 ·」前缀 |
| `shared` | 可选 | 引公共块（`install-ccswitch` / `get-key`），正文从 `sharedBlocks` 取，本页只给 `id` 与 `title` | 不把公共正文抄一遍 |
| `lead` | 必填 | **结论式首段**：做完这步你会得到什么 / 为什么必须这么做，2–3 句（知识库同款规范） | 不写「打开 XX，然后点 YY」 |
| `paras` | 可选 | 补充段落 | |
| `list` | 可选 | 无序列表 | |
| `notes` | 可选 | 跨子步骤的补充（如备用域名） | 能归到某个具体子步骤的提示移到该步骤的 `notes` |
| `cmd` | 暂不使用 | 可复制的命令块（知识库文章才是命令主场） | |
| `table` | 可选 | 对照表（如 Cursor 页的「各客户端填法速查表」），列不超过 3 列 | 不放长段落 |
| `steps` | 可选 | 编号步骤 | |
| `shot` | 可选 | 块级插图（整节一张） | |
| `url` | 可选 | 外链卡（整块可点） | |
| `links` | 可选 | 站内延伸阅读，无序小链接 | 站外网址走 `url` |
| `cta` | 可选 | 按钮行（`links` 是无序列表，`cta` 是按钮） | |

### 编号与图注：单一入口，装配期生成

`guideBlocks(page)` 是全站唯一给教程内容编号的地方，做三件事：合并共享块正文、给 H2 加页内
序号、给截图加图注编号。页面组件、`sections.ts`（左侧目录）、`guideShotsOf` / `guideAnchorsOf`
（门禁断言）、`gen_llms.ts`（步骤清单）五处都调这一个函数。

- **H2 序号** = 块在 `page.blocks` 里的位置（从 1 起）。插一节不用改后面所有序号。
- **图注** = 该页内截图的出现顺序（块顺序 → 块内先步骤截图、后块级截图），每页从 `图 01` 起。
  `GuideShot.label` 字段保留但由装配层覆盖，config 里不手写。
- **共享块文案里不出现步号**（「回第 2 步核对」会随场景错位），改写成「上一步」「刚才那一步」。

手写编号是最大的漂移源：插一节要手改后面所有序号，补一张图要手改后面全部图号。

### 锚点契约

`block.id` 是深链契约。`config/faq.ts` 与 `config/kefu_bot.ts` 里的站内链接都指向
`/guide/<场景>#<block.id>`（如 `/guide/cc#cc-models`）。

旧的 `/guide#<锚点>` 深链（`models` / `import` / `enable` / `vscode` / `install-ccswitch` /
`get-key` / `pro-key` / `params`）**不能断**：映射写在 `config/guide.ts` 的 `guideLegacyAnchors`，
`/guide` 索引页在 `onMounted` 读 `location.hash` 命中后 `location.replace()` 跳到新页（整页跳转，
避免 SPA 内 hash 滚动与重定向打架；fragment 不上服务器，`_redirects` 匹配不到）。
`check_dist.mjs` 会断言每一项在目标页真实存在。

### 子步骤锚点

`GuideSteps` 给每个子步骤生成 `<blockId>-<序号>` 的 id（如 `cc-models-2`）。目前没有页面引用子步骤
锚点，功能保留备用。

## 四、共享块：公共内容只写一份

装 CC Switch、换取 API Key 这类每个客户端都要做的步骤放在 `sharedBlocks`（`config/guide.ts`），
各场景页用 `shared` 字段引用。正文不抄两遍，改一处全站生效。

| key | 被哪几页引用 |
|---|---|
| `install-ccswitch` | cc / desktop / codex |
| `get-key` | 全部 5 页 |

WorkBuddy 与 Cursor 不用 CC Switch，只引用 `get-key`。共享块里的图（CC Switch 官网、管理后台首页）
在各页重复出现是预期行为。

## 五、步骤（GuideStep）的槽位

槽位固定六个，**渲染顺序恒定**：`title → goal → action → link → cta → shot → notes`。缺哪个就不渲染
哪个，所以每一步的视觉节奏都一样。

| 槽位 | 是否必填 | 放什么 | 视觉 |
|---|---|---|---|
| `title` | 必填 | 动作短语，动词开头，不带句号，不带「第 X 步」 | H3 |
| `goal` | 必填 | 这一个子动作**为什么**要做，一句 | 正文，次级墨色，顶格 |
| `action` | 必填 | 实际要敲的按钮／菜单路径，**数组每一项是一个动作** | 行内高亮：左一个 6px 圆点 + 加粗墨色文字，不画框、不画底色 |
| `link` | 可填 | 这一步要去的一个地址。`copy: false` 是点开型地址（官网、后台），不给复制按钮 | 网址行：明文 URL + 复制 + 打开链接 |
| `cta` | 可填 | 这一步的按钮（与 `link` 指向同一处时二选一，别重复） | 幽灵按钮，与块级 `cta` 同组件 |
| `shot` | 可填 | 这一步的对照截图。**一张传一个对象，两张传数组**（`GuideSteps` 并排渲染，网格两列 + 左图吸顶） | 图，限宽 640px |
| `notes` | 可填 | 坑、替代做法、失败征兆 | 小字 muted 列表，左侧 1px 细线 |

**密集界面图加 `zoom: true`**（Codex 供应商表单、WorkBuddy 添加模型、模型映射等），渲染成可点的
链接，点开在新标签看原图——544px 版心看不清表格与表单文字。站内没有灯箱组件，不为一个图注去造一个。

## 六、GEO 结构（与知识库同一套规范）

爬虫读的是渲染后的 HTML，源码是 md 还是 Vue 对爬虫完全等价。决定 GEO 的是**结构**，不是文件格式。
教程场景页与知识库文章同款结构：

| 层 | 来源 | 谁在用 |
|---|---|---|
| 一句话答案 | `page.answer` | 页面首段 `.cu-guide-answer`、JSON-LD 的 `HowTo.description`、llms-full.txt |
| 结论式首段 | 每节的 `lead` | 页面正文、被 AI 直接引用的段落 |
| FAQPage | `page.faq[]`（3–5 条） | 页面折叠问答 + `FAQPage` JSON-LD |
| per-page keywords | `page.tags[]` | `config.mts` 的 `transformHead` 按路由注入 `meta keywords` |
| 站内互链 | `page.related[]`（≥3 条） | 页尾「相关阅读」 |
| HowTo | `guideBlocks(page)` 的 h2 | `HowTo` JSON-LD，`step.name` 取带序号的 h2，与页面小节一字不差 |
| llms-full 收录 | `gen_llms.ts` 遍历 `guidePages` | 一句话答案 + 步骤清单 + 常见问题 |

**结构化数据有两份产出路径，必须同时在**：客户端注入走 `pages/data.ts`（`<JsonLd>` → `Layout.vue`
挂载后插 head，做降级）；构建期写进产物 HTML 走 `pages/jsonld_server.ts` + `scripts/gen_jsonld.ts`
（爬虫不执行 JS，只能看到这份）。生成逻辑下沉到 `pages/guide_jsonld.ts` 单一来源，两边各自 import。
`jsonLdForRoute()` 里 `guide/<scene>` 的分支必须放在 `switch` **之前**——`switch` 是精确匹配，
`case 'guide'` 命中不了 `guide/cc`，漏了构建不报错，只是爬虫看不到结构化数据。
`gen_jsonld.ts` 的路由推导要去尾斜杠（`guide/index.html` → `guide/`），否则索引页也拿不到。

## 七、对齐契约：全页只有一条左边线

教程页所有文字层（H2 / 引导语 / 正文段 / H3 / 动作 / 提示 / 列表）一律**左对齐**。

**两个必须记住的坑**（都源于全局营销页样式，教程页要反向覆盖）：

| 全局规则 | 做了什么 | 教程页怎么覆盖 |
|---|---|---|
| `.cu-page p` | `margin: .9rem auto` + `max-width: 42rem` | `.cu-page .cu-guide-rail p` 归零 |
| `.cu-page h2 + p` | `text-align: center`（(0,1,1)，压过 `.cu-page p` 的 left） | 同上一条里带 `text-align: left` |
| `.cu-page h2` | `text-align: center` | `.cu-guide-rail h2` 改回 left |

覆盖时 **`.cu-page` 前缀不能省**（(0,1,0) 压不过 (0,1,1)）；margin 还要 `!important`，因为
`0.9rem auto` 的 auto 覆盖不掉。容器上写 `text-align: left` 没用——段落被直接指定了 center。

**缩进层级：文字只有两层左边线，容器边框不算文字左边线。**

| 层 | 位置（相对列左） | 谁属于这一层 |
|---|---|---|
| L0 正文列 | 0 | H2 / 引导语 / 正文段 / 块级裸列表的符号 / `.cu-notes` / 步骤块（`li` 本身）/ 网址框 |
| L1 步骤正文列 | 65.6 | H3 / `goal` / `action` 圆点与文字 / `link` / `cta` / `shot` / `notes` |

序号徽标（`--cu-step-num-w`）、L1 序号列间隙（`--cu-step-gap`）、`action` 与 `notes` 的左内缩
（`--cu-step-indent`）都从 `00_base.css` 的 `:root` 取值。

**硬规则**

1. **列表容器一律 `padding-left: 0`，内缩加在 `li` 上。** 根因是全局 `.cu-page ul, ol` 给所有
   `ul/ol` 上了 `padding-left: 1.25rem`（优先级 (0,1,1)），压过组件里 (0,1,0) 的 `padding: 0`。
2. **不要用 `padding` 简写清内缩，要显式写 `padding-left: 0`。** 简写被 (0,1,1) 压过后只有
   `margin` 归零生效。
3. **`.cu-notes` 的内缩由卡片自身的 padding 表达**，不再靠 `ul` 的继承 padding。审计脚本算卡片
   内容列（卡片左缘 + padding + 悬挂缩进），不与 H2 左边线比。
4. **`.cu-urlrow` 左右对称**（`padding: .45rem .85rem`）。
5. **跨组件的间距、字号、圆角走 `00_base.css` 的 token**。

**清内缩只写单侧声明**（`padding-top/right/bottom/left`），写成 `padding: 0; padding-left: 0`
（简写 + 单侧）会让 esbuild 展开出重复属性，浏览器最终拿到低优先级的值，页面看着跟没改一样。
改完跑 `npm run check:css`。

**验收**：`node scripts/audit_guide_align.mjs`（需先 `npm run preview`，或 `npm run build:ci`）。
量的是**首字实际位置**（`getClientRects`），不是元素盒子——盒子顶格 ≠ 文字对齐，2026-10-12 就是
只看盒子量而漏了两轮。脚本遍历 5 个场景页，测 L0 / L1 两条左边线内的所有文字。

## 八、屏效与层级（保留 2026-10-13 的结论）

- **不做顶部进度条**：左侧目录已有同一组节点，再加一条是重复表达。窄屏靠 H2 的「N.」与步骤
  徽标两级编号表达进度。
- **kicker 全页为 0，不要用**：H2 上方那行「小白教程 · 第 3 步」是轨时代的产物，轨没了标签也不留。
- **轨选择器已删除**：`.cu-grails` 一组样式与 `GuideRails.vue` 在 2026-10-20 一并删除。
- **H3 降一档**（0.98rem / 600），让 H2 的节号成为本页最重的元素。
- **徽标不反白**：描边 + 空底次级墨色。反白是全站最重的一档，H2 旁边挂一个反白的「1」比 h3 还重。

### 数字约定

| 位置 | 值 | 为什么 |
|---|---|---|
| 正文列 `.cu-shell__body--reading.cu-guide-wrap .cu-shell__inner` | 52rem（`14_knowledge.css`） | 步骤块序号列 + 间隙把截图压到 638px，`max-width: 700px` 从来没生效过 |
| 文字层限宽 `--cu-guide-text` | 46rem（`shell_extra.css` 一处） | 行宽由文字层管住，否则每行 39 字，超过中文长读上限 |
| 步骤块 `ol.cu-steps-block` | `padding-left: 0`、`max-width: none` | `li` 继承 `ol` 的 1.25rem 内边距；全局 `.cu-page ol` 还给了 `max-width: var(--cu-content-w)`（44rem） |
| 截图 `.cu-step-block__shot` | `--cu-shot-max-w: 34rem`（544px）+ `--cu-shot-max-h: 22rem`（352px） | 宽高两个上限同时生效，按比例取先到的那档 |
| 多图并排 `.cu-step-block__shots` | 340px + 剩余列，左图吸顶，两图等高 | 两图并排时右边那张被挤到 282px，界面文字缩得看不清 |
| 引导语 line-height | 1.7 | 它是 H2 的续行，1.85 太散；步骤块里的短句保持 1.85 |

多图并排的断点两条：**≤760px** 回落单列，**≤560px** 额外把吸顶还原成 static。720px 那条单列
回落已在 2026-10-13 删除（与宽屏两列选择器优先级相同、媒体条件又更宽，560~760px 之间一直生效）。

### 插图规范

只看**展示尺寸**，不看原图像素。实现集中在 `shell_extra.css` 的 `.cu-step-block__shot` 一条，只通过
两个自定义属性出数，并排组用 `.cu-step-block__shots .cu-step-block__shot` 把两个上限归零。

- 缩放只能靠 `width:100%` + `max-height`，不写 `transform: scale()`（缩放让文字发虚、图注对不齐）。
- 单图不用 `object-fit`（按比例缩放不裁），只有并排等高时用 `cover` + `object-position: top center`。
- 新增插图先量原图宽高比：≤1.2 的竖图只受高度上限约束，>1.8 的宽图只受宽度上限约束。
- **块级截图也要挂 `cu-step-block__shot`**：`GuideBlockBody.vue` 里 `block.shot` 渲染的
  `<GuideShot>` 必须带这个类，否则两个自定义属性双双回退到 `none`，图片按整列铺开、高度不设防。
- **截图的框线颜色走 `--cu-figure-frame`**（浅色 `rgba(20,20,19,.18)` / 深色 `rgba(243,240,232,.2)`），
  定义在 `00_base.css` 的三处（浅色 `:root`、深色块、`prefers-color-scheme` 块）。
  这个 token 在 2026-10-20 之前是缺失的（token 化迁移时漏掉，`archive/custom.css` 里有原始值），
  而 `shell_extra.css` 一直在引用它——变量缺失会让整条 `border` 声明失效，
  于是**浅色和深色下截图都没有边框**，而构建、`check:css`、`typecheck` 全都查不出来。
  现在 `check:css` 会拦「引用了但没定义、也没写兜底（`var(--x, 兜底)`）的变量」，
  `check:theme` 守另一半：变量在，但深浅两套下解析出来的框线颜色或尺寸不对。

## 九、验收

```bash
npm run build        # 含 check_dist.mjs 的逐页结构断言
npm run verify       # SEO / 组件 / 链接验收
npm run check:links  # 死链
npm run check:css    # 改了 .vitepress/theme/**/*.css 必跑
npm run check:align  # 教程页文字左边线（遍历 5 个场景页，需先 npm run preview）
npm run check:theme  # 教程页深浅两套模式（截图框有边且随模式换色，需先 npm run preview）
```

`check_dist.mjs` 对教程的断言（逐页，替换掉旧的「全站扁平常量」）：

- 小节锚点双向一致：产物里该页 `<h2 id>` 集合 == `guideAnchorsOf(page)`（`faq` / `related` 两个
  页尾小节除外）。左侧目录（`sections.ts`）也含这两项，所以「正文小节 ↔ 目录」双向断言才过。
- 小节序号从 1 连续；图注编号每页从 01 连续。
- 截图：`guideShotsOf(page)` 的条数 == 产物里 `class="cu-shot "` 与 `<img src="/assets/guide_...">`
  的条数，且每个文件真实存在（`GuideShot.vue` 的静态导入表与 `config/guide.ts` 的文件名要一致）。
- per-page keywords 非空、不是全站那条全局词、且与 `page.tags` 一致。
- 一句话答案、每条 FAQ、场景切换条 5 个、FAQPage 与 HowTo 结构化数据都在产物里。
- `guideLegacyAnchors` 每一项在目标页存在且目标页产物存在。
- 索引页 5 张场景卡全部渲染且 href 指向真实路由。
