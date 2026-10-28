# 使用教程页信息结构与视觉规范

页面：`/guide`（索引页）与 `/guide/<场景>`（6 个场景页）。
数据源 `config/guide.ts`，渲染链路 `GuideIndexPage.vue` / `GuideScenePage.vue` → `GuideBlockBody.vue` → `GuideSteps.vue`。
本文件是写教程内容的唯一依据。要加一步、改一句文案或加一个客户端，先对照这里的槽位定义，不要临时新造字段。

2026-10-20 重构：教程从「单页两条轨（小白教程 / 高级配置）」改成「索引页 + 每客户端一页」。
改动原因：买家手上的真实问题是「我想在我用的那个工具里跑起来」，而不是「我是新手还是高手」。
去掉「高级配置」轨后，教程只问一个问题——**你在哪个客户端里用 Claude**。2026-10-13 那版删除的
「报错对照表」「环境变量」等入口仍然不恢复：排错由知识库文章与 `/faq#cat-setup` 承接。

## 一、页面结构

```
/guide                 索引页：选用法
├── /guide/cc          Claude Code 插件（VS Code 与 Cursor）   7 节
├── /guide/cli         Claude Code CLI（终端）                5 节
├── /guide/desktop     Claude 桌面版                          9 节
├── /guide/codex       Codex                                  9 节
├── /guide/workbuddy   WorkBuddy                              3 节
└── /guide/cursor      Cursor 等其它客户端（三个值 + 速查表）  3 节
```

**插件页与 CLI 页的分工**（2026-10-21）：Claude Code 有两种用法，拆成两页，各是主场。
`/guide/cc` 讲编辑器里怎么用（VS Code 与 Cursor 装的是同一个 Anthropic 官方扩展，
ID 都是 anthropic.claude-code，读同一份配置）；`/guide/cli` 讲终端里怎么用（官方安装脚本
+ 两个环境变量）。两页只共用「换取 API Key」这一个共享块，其余正文各写各的。

场景页的页内形状（`PageShell` 传 `toc="side"`，窄列两列骨架：左侧目录 + 正文）：

```
页头：eyebrow + H1 + lead（页头副标题）
   ↓
场景切换条（6 个链接，aria-current 标当前；只在场景页）
   ↓
一句话答案（.cu-guide-answer，结论式独立成段）
   ↓
小节流（.cu-guide-rail）：1. … N.，编号在 H2 里
   每节：结论式 lead → 段落 → 列表 → 提示 → 命令块 → 表格 → 步骤 → 网址行 → 插图 → 按钮 → 链接
   ↓
常见问题（#faq，3–5 条 details 折叠）
   ↓
相关阅读（#related，≥3 条站内链接，锚文本是真实关键词；末尾一条是「下一步」）
   ↓
页尾：CTA
```

**页头 lead 与一句话 answer 的分工**（2026-10-22 明确）：

| | `page.lead`（页头副标题） | `page.answer`（一句话答案） |
|---|---|---|
| 讲什么 | 这一页解决什么问题、读完你会得到什么 | 完整结论：是什么 + 怎么做（供 AI 搜索直接引用） |
| 长度 | ≤ 50 字 | 80–150 字 |
| 消费方 | 只渲染在页头 | 页面段落 + JSON-LD `description` + llms-full.txt + `check_dist.mjs` 断言 |

**两段不能讲同一件事。** 2026-10-22 之前它们高度重合（cc 页 bigram 重合度 0.69、codex 0.68），
开篇连续两段同义，读者以为漏读了什么。重写后的 cc 页 lead 重合度 0.20、codex 0.17。

**索引页没有页内目录**（2026-10-20 起）。它只有一段内容（选客户端），目录没有意义；
它不传 `toc`，场景页仍然有左侧目录。

### 索引页的版式：营销页，不是阅读页

索引页是分流页，跟套餐页、模型页一样属于**营销页**（2026-10-21 改版）。
`PageShell` 按 slug 派发两个标记类，别混用：

| 标记类 | 加在谁身上 | 版式 |
|---|---|---|
| `.cu-guide-index` | `/guide` 索引页 | 营销页：满宽 1140px、页头居中、卡片网格 |
| `.cu-guide-wrap` | `/guide/<客户端>` 场景页 ×5 | 阅读页：56rem 正文 + 左侧目录、页头顶格左对齐 |

之前两类共用 `.cu-guide-wrap`，索引页因此继承了场景页的「顶格左对齐页头」，
首屏出现「左标题 + 居中副标题」两套轴。拆开后索引页的页头走营销页默认（居中）。

索引页的页内形状：

```
页头：eyebrow + H1 + lead（居中，与套餐页/模型页同一条垂直中轴；lead 就是一句话答案）
   ↓
分组标签（.cu-guide-index__label，「N 条路径」）+ 场景卡网格（3 列 auto-fill minmax(300px,1fr)）
   ↓
分组标签（「接着看」）+ 链接卡网格（.cu-next）
   ↓
页尾 CTA（CtaBand，与模型页同一套 .cu-band）
```

**索引页的三条硬约定**

1. **页头三件套（eyebrow / H1 / lead）与卡片网格共用一条垂直中轴，页头下不再有独立的框。**
   2026-10-21 起索引页只有一段话（`guideIndex.answer`，直接当页头副标题 `.cu-page__lead` 渲染），
   原来「lead + 居中结论条」两段各说一半，框起来的那段还跟下面卡片的标题重复。合并后版式
   与套餐页完全一致：居中、限宽（索引页 52rem，套餐页不限宽）、无边框无底色。
2. **场景卡用模型页 `.cu-mcard` 的度量**（`--cu-card` 底、`--cu-line` 边、12px 圆角、
   padding 1.15/1.25/1.2、hover 上浮 3px 带 `--cu-shadow-lift`），网格用 `.cu-mcards` 的
   `auto-fill minmax(300px,1fr)` + gap 1rem。满宽 1140px 下正好 3 列（每列 369px）——
   索引页以前限在 56rem（896px），那个宽度下 `minmax(300px,1fr)` 只排得下 2 列。
3. **兜底项「其它客户端」横跨两列**（`.cu-guide-scene-card--wide`），把最后一行补齐不留空格；
   1 列时复位成普通卡，否则 `span 2` 会撑出隐式列导致横向溢出。

**索引页只有一段话。** `guideIndex.answer` 既是页头副标题，也是 llms-full.txt 与
JSON-LD `description` 的来源——一个字段三处用，不存在第二处措辞可漂移。
`.cu-guide-answer` 这个类只剩场景页在用（左侧墨条形态），索引页不再渲染它。

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
| `id` | 必填 | **全站唯一**，场景页用 `'<场景>-<语义>'`（如 `cc-models`、`codex-key`） | 不手写序号；不带场景前缀会导致同一共享块在 6 页撞锚点 |
| `title` | 必填 | 小节主题名，**不含序号**。序号由 `guideBlocks()` 按页内位置生成 `h2 = 'N. title'` | 不写「小白教程 ·」前缀 |
| `shared` | 可选 | 引公共块（`install-ccswitch` / `get-key`），正文从 `sharedBlocks` 取，本页只给 `id` 与 `title` | 不把公共正文抄一遍 |
| `sharedVars` | 可选 | 共享块正文里的占位符（如 `{console}`），装配期替换成各页自己的值 | 不为了填一个值就复制整块 |
| `sharedNotes` | 可选 | **只在本页追加**的块级 notes，排在共享块自带 notes 之后 | 不改共享块正文 |
| `lead` | 必填 | **结论式首段**：做完这步你会得到什么 / 为什么必须这么做，2–3 句（知识库同款规范） | 不写「打开 XX，然后点 YY」 |
| `paras` | 可选 | 补充段落。**当前全站 0 次使用**（保留字段，要用时再启用） | |
| `list` | 可选 | 无序列表。**当前全站 0 次使用**（保留字段，要用时再启用） | |
| `notes` | 可选 | 跨子步骤的补充（如备用域名） | 能归到某个具体子步骤的提示移到该步骤的 `notes` |
| `cmd` | 可选 | 可复制的命令块（知识库文章才是命令主场）。**只有 cli 页用了一处**（`~/.claude/settings.json`） | |
| `table` | 可选 | 对照表（如 Cursor 页的「各客户端填法速查表」），列不超过 3 列 | 不放长段落 |
| `steps` | 可选 | 编号步骤 | |
| `shot` | 可选 | 块级插图（整节一张） | |
| `url` | 可选 | 外链卡（整块可点）。**当前全站 0 次使用**（保留字段，要用时再启用） | |
| `links` | 可选 | 站内延伸阅读，无序小链接。**当前全站 0 次使用**（保留字段，要用时再启用） | 站外网址走 `url` |
| `cta` | 可选 | 按钮行（`links` 是无序列表，`cta` 是按钮）。**当前全站 0 次使用**（保留字段，要用时再启用） | |

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

**共享块正文里不许出现只对部分场景成立的名词**（CC Switch / VS Code / Cursor / Codex /
WorkBuddy / 桌面版 / 终端）。`install-ccswitch` 本身就是「装 CC Switch」，CC Switch 对它是全局词，
按块列白名单；`get-key` 是 6 页共用，原来那句「后面 CC Switch、VS Code、Cursor、终端都用它」
对 WorkBuddy 与 Cursor 的读者是错的（他们根本不装 CC Switch），已删——单页内读者不需要知道
别的客户端的事。

**共享块要瘦。** 2026-10-28 起 `get-key` 收成「一句 lead + 一步 + 两条块级 notes」，
单页高度 983px → 约 620px。块级 notes 只放对所有页面都成立的信息（「都在后台里」「备用域名」）；
只对某一步成立的提示（「激活码和 Key 存在后台」）挂到该步骤的 `notes` 上，别塞进共享正文。

需要各页不同的内容时用 `sharedVars`（装配期替换占位符）或 `sharedNotes`（本页追加），
不要把共享块整段抄一遍。

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
| `shot` | **必填** | 这一步的对照截图。**一张传一个对象，两张传数组**（`GuideSteps` 并排渲染，网格两列 + 左图吸顶）。**确认这一步不放图就写 `shot: false`**，不写是漏写 | 图，限宽 600px（`--cu-shot-max-w`），与文字层同宽 |
| `notes` | 可填 | 坑、替代做法、失败征兆 | 小字 muted 列表，左侧 1px 细线（与块级 `notes` 同形） |

### 四槽位分工：一个动作只说一遍

同一页里最难受的不是内容多，是**同一件事在三个槽位里被说了三遍**。四个槽位各管一件事，
不许互相复述：

| 槽位 | 只写什么 | 硬约束 |
|---|---|---|
| `title` | 动作的**名字**（名词化，≤14 字） | 不是完整句子；不含按钮名、菜单名 |
| `goal` | **为什么**做这一步（一句 ≤30 字） | 不含任何按钮名、菜单名 |
| `action` | **怎么做**（菜单路径、按钮名、参数值） | 全页唯一允许出现按钮名的地方 |
| `notes` | 坑、失败征兆、替代做法 | 不复述 `action` |

改写前的典型（`cc-enable`）：title「点「启用」，再点「检测链路」」、goal「启用后配置才会写进
CC Switch…」、action「回到 CC Switch 主界面 → 点「启用」→ 再点「检测链路」…」——三行字说了
两遍同一件事。改后 title 写「启用并检测」、goal 只讲为什么、action 只讲怎么点。

**门禁**（`npm run check:guide-within`，3-gram 包含率 / Jaccard，阈值按实测定的）：

| 断言 | 阈值 |
|---|---|
| 步骤 `title` ⊂ `action` | ≤ 25% |
| 步骤 `title` ⊂ `goal` | ≤ 25% |
| 步骤 `goal` ⊂ `action` | ≤ 25% |
| 步骤 `goal` ∩ `action`（Jaccard） | ≤ 30% |
| block 的 `lead` 与首个 step 的 `goal` | ≤ 25% |
| 单页正文字数 | ≤ 3200 字 |

`lead` 是结论（做完得到什么），`goal` 是理由（为什么做这一步），两者也要分家：改 `goal` 时只留
`lead` 之外的增量信息。

### 图文并排：短步骤左右分栏

一步挂**一张**图、且左列文字（`title` + `goal` + `action` + `notes`）去标签后 **≤145 字**时，
文字在左、图在右并排（`GuideSteps.vue` 的 `isAside()` + `.cu-step-block__body--aside`）。
超过就上下堆叠——左列只有 300px 宽（约 20 全角字/行），145 字约 8 行、250px 高，
再多就比图还高，并排反而更难读。

左列宽度固定 `minmax(240px, 300px)`，图占剩余列（实测 474px，不低于两图并排的 438px 底线，
否则密集界面图会看不清）。

⚠ **`.cu-step-block__text` 包裹层不能省**：图跨行时（`grid-row: 1 / -1`），直接当网格项的
`h3` / `goal` / `action` 会被撑到行高 349px，文字行之间出现大空隙。装进一层走正常文档流，
行距才正常。改这一块的 CSS 时，同步检查那 6 条 `> h3` / `> p` / `> ul` 选择器有没有加
`.cu-step-block__text` 变体。

窄屏（≤760px）回落单列。两列规则必须包在 `@media (min-width: 761px)` 里：同优先级的单列
回落写在前面会被后写的两列覆盖，390px 下变成「340px + 0px」，左图溢出视口。

**密集界面图加 `zoom: true`**（Codex 供应商表单、WorkBuddy 添加模型、模型映射等），渲染成可点的
链接，点开在新标签看原图——版心里的界面文字始终偏小，密集表单要放大才看得清。
站内没有灯箱组件，不为一个图注去造一个。

⚠ `zoom` 必须由渲染组件显式透传：2026-10-22 之前 `GuideSteps.vue` 渲染步骤截图时**没有把 `zoom`
传给 `GuideShot`**（只有块级截图传了），于是 5 张标了 `zoom: true` 的密集表单图实际都点不开原图。
`config/guide.ts` 里标了 `zoom: true` 却在页面上点不开，先查组件有没有透传这个 prop。

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

**页尾两块合成一块**（2026-10-28）：原先场景页同时渲染「相关阅读」列表与「接着看」卡片，
两处的链接在 4 个页面上是**同一个三件套**，读者会以为是两批不同的内容。现在：

- `page.related` 保留（≥3 条站内链接是 GEO 要求）；
- `page.next` 收成**一个**对象（「读完这一页，下一步去哪」），且**不能出现在 `related` 里**；
- 场景页不再渲染 `.cu-next`，`next` 那一条作为「相关阅读」列表的最后一项，带一个「下一步」角标
  （`.cu-guide-links__next`，`::after` 加胶囊角标并去掉该条的前置「→」）；
  `.cu-next` 只留给索引页（那里它承担分组标签的职责）。

**索引卡角标的步数从 `guideBlocks(page)` 派生**（`guideStepCountOf`），不手写。此前 cc 页标
「7 步」实际 11 步、cursor 页标「3 步」实际只有 1 个可执行步骤（另有两张速查表，写
「三个值 · 两张速查表」）。

## 七、对齐契约：全页只有一条左边线

**适用范围：全部场景页（/guide/<场景>）。** 场景页所有文字层（H2 / 引导语 / 正文段 /
H3 / 动作 / 提示 / 列表）一律**左对齐**。

索引页（/guide）不适用这条契约：它 2026-10-21 起是营销页版式，页头与引导语居中、
分组标签与卡片网格左对齐（见第一节「索引页的版式：营销页，不是阅读页」）。
左右线契约是场景页的阅读契约，两种版式各有各的轴，不要互相套用。

**两个必须记住的坑**（都源于全局营销页样式，教程页要反向覆盖）：

| 全局规则 | 做了什么 | 教程页怎么覆盖 |
|---|---|---|
| `.cu-page p` | `margin: .9rem auto` + `max-width: var(--cu-content-w)`（44rem） | `.cu-page .cu-guide-rail p` 归零并限到 `--cu-guide-text` |
| `.cu-page h2 + p` | `text-align: center`（(0,1,1)，压过 `.cu-page p` 的 left） | 同上一条里带 `text-align: left` |
| `.cu-page h2` | `text-align: center` + `clamp(1.5rem, 2.6vw, 2.05rem)` | `.cu-guide-rail h2` 改回 left；页尾的 `.cu-guide-h2` 补 `.cu-page` 前缀（升到 (0,2,0)）才压得住 |
| `.cu-page__lead` | `text-align: center !important`（营销页页头居中） | `.cu-guide-wrap .cu-page__lead` 写 `text-align: left !important`（两边都 !important，后加载的胜出） |

覆盖时 **`.cu-page` 前缀不能省**（(0,1,0) 压不过 (0,1,1)）；margin 还要 `!important`，因为
`0.9rem auto` 的 auto 覆盖不掉。容器上写 `text-align: left` 没用——段落被直接指定了 center。

**缩进层级：文字只有两层左边线，容器边框不算文字左边线。**

| 层 | 位置（相对列左） | 谁属于这一层 |
|---|---|---|
| L0 正文列 | 0 | H2 / 引导语 / 正文段 / 块级裸列表的符号 / `.cu-notes` / 步骤块（`li` 本身）/ 网址框 / **页头副标题** / **页尾 H2** |
| L1 步骤正文列 | 65.6 | H3 / `goal` / `action` 圆点与文字 / `link` / `cta` / `shot` / `notes` |

**带竖线的提示块（`.cu-guide-answer` / `.cu-notes`）的竖线落在 L0 上，文字在框内缩进**：
竖线宽 + 内边距 = 19px（answer 是 3px + 16px，notes 是 1px + 悬挂缩进）。
`audit_guide_align.mjs` 按「容器左缘 + 竖线 + 内边距」算它们的基准，不与 H2 左边线直接比。
2026-10-22 起这三处（页头副标题、一句话答案、页尾 H2）都纳入了审计范围——它们此前不在测量范围内，
于是「页头副标题居中」「一句话答案缩进 138px」「页尾 H2 又大又居中」三个错位长期没人发现。

序号徽标（`--cu-step-num-w`）、L1 序号列间隙（`--cu-step-gap`）、`action` 与 `notes` 的左内缩
（`--cu-step-indent`）都从 `00_base.css` 的 `:root` 取值。

**硬规则**

1. **列表容器一律 `padding-left: 0`，内缩加在 `li` 上。** 根因是全局 `.cu-page ul, ol` 给所有
   `ul/ol` 上了 `padding-left: 1.25rem`（优先级 (0,1,1)），压过组件里 (0,1,0) 的 `padding: 0`。
2. **不要用 `padding` 简写清内缩，要显式写 `padding-left: 0`。** 简写被 (0,1,1) 压过后只有
   `margin` 归零生效。
3. **`.cu-notes` 的内缩由段落自身的 `margin-left` 表达**（`--cu-step-indent`），不再靠卡片 padding
   或 `ul` 的继承 padding。2026-10-22 起 `.cu-notes` 不再是「提示卡」——没有边框、底色、圆角与
   外挂的「提示」pill 标签，改成与步骤级提示完全同形（左 1px 竖线 + 次级墨色小字），
   全页只剩一种提示语言。审计脚本算它的内容列（容器左缘 + 悬挂缩进），不与 H2 左边线比。
4. **`.cu-urlrow` 左右对称**（`padding: .45rem .85rem`）。
5. **跨组件的间距、字号、圆角走 `00_base.css` 的 token**。

**清内缩只写单侧声明**（`padding-top/right/bottom/left`），写成 `padding: 0; padding-left: 0`
（简写 + 单侧）会让 esbuild 展开出重复属性，浏览器最终拿到低优先级的值，页面看着跟没改一样。
改完跑 `npm run check:css`。

**验收**：`node scripts/audit_guide_align.mjs`（需先 `npm run preview`，或 `npm run build:ci`）。
量的是**首字实际位置**（`getClientRects`），不是元素盒子——盒子顶格 ≠ 文字对齐，2026-10-12 就是
只看盒子量而漏了两轮。脚本遍历 6 个场景页，测 L0 / L1 两条左边线内的所有文字。

## 八、屏效与层级（保留 2026-10-13 的结论）

- **不做顶部进度条**：左侧目录已有同一组节点，再加一条是重复表达。窄屏靠 H2 的「N.」与步骤
  徽标两级编号表达进度。
- **kicker 全页为 0，不要用**：H2 上方那行「小白教程 · 第 3 步」是轨时代的产物，轨没了标签也不留。
- **轨选择器已删除**：`.cu-grails` 一组样式与 `GuideRails.vue` 在 2026-10-20 一并删除。
- **H3 必须大于正文**（1.05rem / 600，即 16.8px）。2026-10-22 改：原先是 0.98rem / 600（15.68px），
  比同块内的目标句（16.64px）和动作行（16px）**都小**——步骤标题比正文轻，层级倒挂，
  读者扫一眼找不到结构。现在的层级是 H2 21.1px/700 > H3 16.8px/600 > 动作 16px/600
  > 目标句 15.5px/400 > 提示 14.4px/400，视觉权重单调递减。
- **徽标不反白**：描边 + 空底次级墨色。反白是全站最重的一档，H2 旁边挂一个反白的「1」比 h3 还重。
- **每一组都画徽标**（2026-10-28 改）：原先 49 个步骤块里有 22 个（45%）只含 1 个子步骤，
  单步组的徽标 `visibility: hidden`，于是同一页里出现「有的看得见有的看不见」——读者会以为
  「看不见 = 这一步不重要」或「漏画了」。现在单步组与多步组一样画，序号是子步骤号，
  多步组从 1 连续排下去。
  ⚠ 用 `visibility` 控制显隐，**不能删掉那个元素**：步骤块是 grid
  （`--cu-step-num-w minmax(0,1fr)`），删掉后正文列会从第 2 列落回第 1 列，
  L1 左边线在 65.6px 与 0 之间跳，单步组与多步组的 H3 就左右错开。

### 数字约定

| 位置 | 值 | 为什么 |
|---|---|---|
| 正文列 `.cu-shell__body--reading.cu-guide-wrap .cu-shell__inner` | 实际 860px（由 `.cu-shell__body--reading` 的 `grid-template-columns: 224px minmax(0,1fr)` + `gap: 3.5rem` 决定，`14_knowledge.css` 那条 `max-width: 56rem` 从未生效） | 正文列比目录列宽一档是刻意的：多出来的宽度留给截图与表格 |
| 文字层限宽 `--cu-guide-text` | **40rem（640px ≈ 40 个全角字一行）**，定义在 `00_base.css` 的 `:root` | 中文长读的舒适区是 30–40 字。2026-10-22 改：原先各处硬编码 46rem（736px = 46 字/行），提示块更到 55 字/行，超出后眼睛每行要跨太远，读者「看得见字读不下去」。**这个 token 2026-10-22 之前从未定义过**（各处靠 `var(--cu-guide-text, 46rem)` 兜底），所以「改这一个数」曾经是假的 |
| 步骤块 `ol.cu-steps-block` | `padding-left: 0`、`max-width: none` | `li` 继承 `ol` 的 1.25rem 内边距；全局 `.cu-page ol` 还给了 `max-width: var(--cu-content-w)`（44rem） |
| 截图 `.cu-step-block__shot` | `--cu-shot-max-w: 37.5rem`（600px）+ `--cu-shot-max-h: 34rem`（544px） | 2026-10-22 改：原 24rem（384px）。宽度上限 37.5rem 是为了让图不宽于文字层；高度上限抬回 34rem 是因为下面那条形变修复——竖图不再被横向拉宽，改由高度上限决定显示尺寸，384px 上限下只剩 353px 宽、界面文字太小 |
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
npm run check:align  # 教程页文字左边线（遍历 6 个场景页，需先 npm run preview）
npm run check:theme  # 教程页深浅两套模式（截图框有边且随模式换色，需先 npm run preview）
npm run check:shots  # 教程页截图几何（横向纵向缩放一致，无压扁/拉长，需先 npm run preview）
npm run check:guide-within  # 教程页单页内质量门禁（槽位不重复、页尾不重、shot 显式、共享块无局部名词、字数）
```

`check:guide-within` 已并入 `npm run build` 链。**跨页共享块不算重复**——公共内容只写一份是设计
要求，拦的是同一页里同一件事被说了 3 遍。门禁查的是原始数据（`page.blocks` / `sharedBlocks`），
不是装配后的步骤：装配层会把 `shot: false` 一起剥掉，剥掉之后就看不出「这一步确认不放图」
和「这一步漏写了」的区别。

`check_dist.mjs` 对教程的断言（逐页，替换掉旧的「全站扁平常量」）：

- 小节锚点双向一致：产物里该页 `<h2 id>` 集合 == `guideAnchorsOf(page)`（`faq` / `related` 两个
  页尾小节除外）。左侧目录（`sections.ts`）也含这两项，所以「正文小节 ↔ 目录」双向断言才过。
- 小节序号从 1 连续；图注编号每页从 01 连续。
- 截图：`guideShotsOf(page)` 的条数 == 产物里 `class="cu-shot "` 与 `<img src="/assets/guide_...">`
  的条数，且每个文件真实存在（`GuideShot.vue` 的静态导入表与 `config/guide.ts` 的文件名要一致）。
- per-page keywords 非空、不是全站那条全局词、且与 `page.tags` 一致。
- 一句话答案、每条 FAQ、场景切换条 5 个、FAQPage 与 HowTo 结构化数据都在产物里。
- `guideLegacyAnchors` 每一项在目标页存在且目标页产物存在。
- 索引页 6 张场景卡全部渲染且 href 指向真实路由。
