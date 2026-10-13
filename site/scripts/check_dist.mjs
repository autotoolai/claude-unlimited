/**
 * 构建后结构断言：SSR 产物必须完整。
 * VitePress 的 renderToString 会吞掉子组件渲染异常并返回注释占位，只看构建是否 exit 0 不可靠，
 * 这里把「每页外壳齐全 / 外壳内 H1 唯一 / 页内目录锚点全部命中 / 助手浮标存在 / 无未渲染模板」做成硬门禁。
 */
import fs from 'node:fs'
import path from 'node:path'
import { register, tsImport } from 'tsx/esm/api'

const DIST = path.resolve(process.cwd(), '.vitepress', 'dist')
/** 知识库条目页与 FAQ 清单：从 config/knowledge.ts 动态读取（加文章不用改这里）；其余页面手写 */
const unregisterTsx = register()
const knowledgeMod = await tsImport('../config/knowledge.ts', import.meta.url)
const { faqItems, faqCategories } = await tsImport('../config/faq.ts', import.meta.url)
const { guideShots, guideTabs, guidePages } = await tsImport('../config/guide.ts', import.meta.url)
const { siteConfig } = await tsImport('../config/site.ts', import.meta.url)
unregisterTsx()
/** 产物里允许存在的 mp4 总量上限（MB）。视频在 R2，public/ 只做上传源。 */
const VIDEO_MP4_BUDGET_MB = 150

function knowledgePages() {
  return knowledgeMod.knowledge.map((k) => [`/knowledge/${k.slug}`, `knowledge/${k.slug}`])
}
const PAGES = {
  '/': 'index',
  '/pricing': 'pricing',
  '/faq': 'faq',
  '/guide': 'guide/index',
  '/knowledge': 'knowledge/index',
  '/models': 'models',
  '/console': 'console',
}
Object.assign(PAGES, Object.fromEntries(knowledgePages()))

const fails = []
const ok = (cond, msg) => { if (!cond) fails.push(msg) }
/** 存在性读取：门禁要在文件缺失时给出可读报错，而不是抛 ENOENT */
function readFileSafe(p, enc) { try { return fs.readFileSync(p, enc) } catch { return '' } }

// —— 2026-10-13 样式链路断言 ——
// 症状：整站页面看着像「没有样式」，居中 / 限宽 / 配色全部不生效。
// 根因：产物 HTML 里样式表只有 rel="preload stylesheet"，缺 rel="stylesheet"，
// 浏览器只预加载不应用，CSS 整份被丢弃。全站视觉回归，检查不出来，只能靠人眼发现。
const distHtmlFiles = []
;(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) walk(full)
    else if (e.name.endsWith('.html')) distHtmlFiles.push(full)
  }
})(DIST)
const preloadOnly = distHtmlFiles.filter((f) => {
  const html = fs.readFileSync(f, 'utf8')
  // 只统计本地样式表（/assets/*.css、/vp-icons.css 等），外链字体不算
  const localCssLinks = [...html.matchAll(/<link[^>]*href="(\/[^"]+\.css)"[^>]*>/g)].map((m) => m[0])
  return localCssLinks.some((tag) => /rel="[^"]*stylesheet/.test(tag) === false)
})
ok(
  preloadOnly.length === 0,
  `产物里有的 HTML 只 preload 没应用样式表（CSS 会被浏览器丢弃）：${preloadOnly.map((f) => path.relative(DIST, f)).join(', ') || '—'}`
)


// —— 2026-10-13 样式作用域断言 ——
// 模型广场的引导语此前被两处规则误伤，都是「全局状态类 / 页面标记用错层级」的通病，这里钉死。
const modelsHtml = fs.readFileSync(path.join(DIST, 'models.html'), 'utf8')
// cu-guide-wrap 是教程页排版的标记（PageShell 只在 slug==='guide' 时加）。
// 无目录的营销页带上它会继承教程页的页头左对齐与 lead 限宽，窄屏下 lead 被压到两行。
ok(!/class="[^"]*cu-guide-wrap/.test(modelsHtml), 'models.html 不该带 cu-guide-wrap（这是教程页排版标记）')

// 折叠态类 html.cu-toc-collapsed 挂在 <html> 上，状态存 localStorage 全站共享，
// 解除段落限宽的规则必须挂 .cu-shell__body--reading 前缀，否则教程页一折叠，
// 模型广场 / 套餐定价等营销页的 lead 与段落也跟着变成不限宽。
const distCss = fs
  .readdirSync(path.join(DIST, 'assets'))
  .filter((f) => f.endsWith('.css'))
  .map((f) => fs.readFileSync(path.join(DIST, 'assets', f), 'utf8'))
  .join('\n')
const leakRules = [...distCss.matchAll(/html\.cu-toc-collapsed[^{]*/g)]
  .map((m) => m[0].trim())
  .filter((sel) => /\.cu-page\s+(p|ul|ol)\b/.test(sel) && !sel.includes('cu-shell__body--reading'))
ok(
  leakRules.length === 0,
  `cu-toc-collapsed 的段落限宽解除规则必须限定在带目录的页面内，发现泄漏：${leakRules.join(' | ') || '—'}`
)


for (const [route, file] of Object.entries(PAGES)) {
  const html = fs.readFileSync(path.join(DIST, `${file}.html`), 'utf8')
  const where = route
  const isKnowledgeArticle = route.startsWith('/knowledge/') && route !== '/knowledge'
  const isKnowledgeIndex = route === '/knowledge'
  // 长文页才有左侧目录（.cu-sidenav）：教程页、后台页由 PageShell 传 toc，知识库文章页自带。
  // 营销页与列表页（/ /models /pricing /faq /knowledge）不应该再出现任何页内目录。
  const hasToc = route === '/guide' || route === '/console'
  // 首页的 H1 在 Hero 里（HomeHero 组件），知识库文章页的 H1 在 markdown 里，都没有 cu-page__head
  const headKeys = route === '/' || isKnowledgeArticle ? [] : ['cu-page__head']
  const keys = ['cu-brandbar', 'cu-tabs__inner', 'cu-shell__body', 'cu-foot', ...headKeys, 'cu-kefu__fab']
  // 有目录的必须渲染 cu-sidenav 且用两列骨架；没目录的必须一个目录节点都不许有
  if (hasToc) {
    // class 名顺序由 Vue 的 SSR 规范化决定（--reading 在前），不能假设固定顺序
    ok(/class="cu-shell__body[^"]*--reading/.test(html), `${where}: 长文页外壳未使用两列骨架 cu-shell__body--reading`)
    ok(/class="[^"]*cu-sectionnav[^"]*"/.test(html) && /class="[^"]*cu-sidenav[^"]*"/.test(html), `${where}: 长文页缺少左侧目录 cu-sectionnav/cu-sidenav`)
  } else {
    ok(!html.includes('cu-sectionnav'), `${where}: 不该有页内目录，但产物里出现了 cu-sectionnav`)
  }
  if (hasToc) {
    // DOM 顺序即窄屏（≤1280px）横排条的顺序：目录必须在正文容器之前
    ok(html.indexOf('cu-sectionnav') < html.indexOf('cu-shell__inner'), `${where}: 目录未排在正文容器之前`)
  }
  for (const key of keys) {
    ok(html.includes(key), `${where}: 缺少 ${key}`)
  }
  ok(!html.includes('<template>'), `${where}: 产物里有未渲染的 <template>，md 模板没被编译`)
  ok(!html.includes('&lt;h2') && !html.includes('&lt;HomeHero'), `${where}: 产物里有转义后的模板文本（&lt;h2…）`)
  // Vue SSR 分片标记（<!--[--> / <!--]--> / <!---->）必须保留：hydration 按它们定位片段边界，
  // 删掉会导致内容闪一下（记忆：vitepress-ssr-marker-stripping-hydration-bug）。
  // 2026-10-11 之前这里断言「产物里不该有标记」，方向写反了：每个多根组件都会有标记，
  // 于是每一页都失败，check_dist 恒以 1 退出。改成只统计不判定。
  const ssrMarkers = (html.match(/<!--\[-->|<!--\]-->|<!---->/g) || []).length
  for (const vpc of ['VPNav', 'VPLocalNav', 'VPSidebar', 'VPBackdrop', 'VPFooter', 'VPSkipLink']) {
    ok(!html.includes(vpc), `${where}: 产物里仍有默认外壳节点 ${vpc}（Layout.vue 应退到 slot-only）`)
  }
  const shellStart = html.search(/class="cu-shell[^"]*"/)
  const shell = html.slice(shellStart)
  // H1 只数外壳内的：cu-shell 之前的默认外壳节点（404 页等）不计入
  const h1 = shell.match(/<h1/g) || []
  ok(h1.length === 1, `${where}: 外壳内 H1 数量 ${h1.length}，应为 1`)

  if (isKnowledgeArticle) {
    // 文章页：H1 在 markdown 里；正文是 VPDoc 的 page 分支（layout: page，无原生 aside），页内目录是站点自己的 cu-sidenav（SSR 即完整）
    ok(/class="vp-doc[ "]/.test(html), `${where}: 缺少 vp-doc 正文容器`)
    ok(html.includes('cu-kdoc__meta'), `${where}: 缺少文章元信息行`)
    ok(html.includes('cu-shell__body--reading'), `${where}: 文章页外壳未使用单列阅读容器`)
    ok(!html.includes('VPDocAside') && !html.includes('VPDocOutline'), `${where}: 仍有 VitePress 原生目录 aside（应为 layout: page + cu-sidenav）`)
    ok(html.includes('cu-krelated'), `${where}: 缺少相关阅读`)
  }
  {
    // 目录锚点 ↔ 正文小节双向一致（知识库文章的目录在客户端挂载后从 DOM 生成，SSR 里为空，这里跳过目录比对）
    const nav = (html.match(/<aside class="cu-sectionnav[^"]*"[\s\S]*?<\/aside>/) || [''])[0]
    const hrefs = [...nav.matchAll(/<a[^>]+href="#([^"]+)"/g)].map((m) => m[1])
    // 页内目录锚点对应正文小节：普通小节是 <h2 id="…">，FAQ 分类是 <section id="cat-…">（h2 无 id）
    const ids = new Set([
      ...[...shell.matchAll(/<h2 id="([^"]+)"/g)].map((m) => m[1]),
      ...[...shell.matchAll(/<section id="([^"]+)"/g)].map((m) => m[1]),
    ])
    // 目录节点存在时必须是竖排形态（class 带 cu-sidenav），不再是导航下方的横条
    if (nav) ok(/class="[^"]*cu-sectionnav[^"]*"/.test(nav) && /class="[^"]*cu-sidenav[^"]*"/.test(nav), `${where}: 目录应为左侧竖排 cu-sectionnav/cu-sidenav，产物里仍是横条形态`)
    // 没有目录的页面（营销页 / 列表页）跳过这一整块：目录为空是预期结果
    if (hasToc) {
      ok(hrefs.length > 0, `${where}: 页内目录为空`)
      for (const h of hrefs) ok(ids.has(h), `${where}: 目录锚点 #${h} 在正文中不存在`)
      // 反向（正文 → 目录）：教程页两条轨都渲染在 SSR 产物里（切轨靠 hidden），
      // 但页内目录只列当前轨 + 共用块，所以另一轨的小节在目录里找不到是预期的，跳过。
      const otherRail = where === '/guide'
      for (const id of ids) if (!otherRail) ok(hrefs.includes(id), `${where}: 正文小节 #${id} 不在目录里`)
    }
    // 2026-10-12：/pricing 底部横条已整条去掉（购买外链只留在套餐卡上），页面不再有 H2，按例外放行。
    if (where !== '/pricing') {
      ok(/<div class="cu-shell[^"]*">[\s\S]*<h2[\s>]/.test(html), `${where}: 外壳内没有 H2，说明插槽内容没渲染`)
    }
  }
}

// 助手语料来自 config/kefu_bot.ts：确认种子 id 与分类标签进了 bundle，裁剪版二维码进了产物
let kefuBundle = ''
const assetsDir = path.join(DIST, 'assets')
const jsFiles = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? jsFiles(path.join(dir, e.name)) : e.name.endsWith('.js') ? [path.join(dir, e.name)] : [],
)
for (const f of jsFiles(assetsDir)) kefuBundle += fs.readFileSync(f, 'utf8')
ok(kefuBundle.includes('bot-trouble-429') && kefuBundle.includes('bot-account-human'), '助手语料未序列化进 bundle（config/kefu_bot.ts 改了但没进产物？）')
ok(fs.existsSync(path.join(DIST, 'wechat-qr-code.png')), '缺少 wechat-qr-code.png（运行 python scripts/crop_wechat_qr.py 生成）')

const index = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8')
// 首页 2026-10-11 再瘦身到只剩首屏：内容全部推给定价页、FAQ 与知识库
for (const key of ['cu-hero', 'cu-band']) {
  ok(index.includes(key), `/ : 首页缺少 ${key}`)
}
const count = (s, re) => (s.match(re) || []).length
// 已删除的块不能再回来（内容瘦身的目标，防止以后无意加回）
for (const gone of ['workflow', 'trust', 'continue', 'why-unlimited', 'plans', 'which', 'partners', 'guide', 'models', 'knowledge', 'faq'])
  ok(!index.includes(`id="${gone}"`), `/ : 首页仍有已删除的「${gone}」小节`)
// 首页不再承载价格、卖点与正文卡片，这些标记只允许出现在定价页
for (const gone of ['cu-tcard', 'cu-stats', 'cu-figs', 'cu-trustlist', 'cu-card--link'])
  ok(!index.includes(gone), `/ : 首页仍有已删除的 ${gone} 区块`)
// 页头的关联声明放在导航链接之后（TabBar 之后），不是页头容器内，所以只断言页脚一行兜底声明
ok(!index.includes('以发卡站商品详情页为准'), '/ : 首页页脚仍显示已下线的发卡站条款声明')

// 导航条右侧 CTA 走 ExternalCta（带 data-cta），页头不再有第二个购买按钮
for (const [route, file] of Object.entries(PAGES)) {
  const html = fs.readFileSync(path.join(DIST, `${file}.html`), 'utf8')
  const nav = html.match(/<nav class="cu-tabs"[\s\S]*?<\/nav>/) || ['']
  ok(!/cu-navcta/.test(html), `${route}: 页头仍有旧的 cu-navcta 购买按钮（应换成 cu-brandbar__note 声明）`)
}
// 教程是一页两条轨（2026-10 重构：删购买章节、页首客服条、小白六步 + 高级配置两节）：
// 小白轨 6 步，每步内部再分子步骤；高级轨只用表格与网址行，没有步骤块。
const guideHtml = fs.readFileSync(path.join(DIST, 'guide/index.html'), 'utf8')
// 样式表：轨选择器的选中态必须能从产物里查到（2026-10-13 的反白→竖条改动）。
const styleDir = path.join(DIST, 'assets')
const guideCss = fs.readdirSync(styleDir)
  .filter((f) => f.startsWith('style.'))
  .map((f) => fs.readFileSync(path.join(styleDir, f), 'utf8'))
  .join('\n')
const guideSteps = count(guideHtml, /cu-step-block__no/g)
ok(guideSteps >= 8, `/guide: 子步骤块数 ${guideSteps}，应 >= 8（小白轨第 6 步含「下载 VS Code」子步骤）`)
// 轨选择器（GuideRails，2026-10-13 取代 SegmentedTabs 的裸胶囊）：两列分栏，每列一个轨。
// 断言轨数仍是 2 + 每个轨名都在产物里。轨名是文案契约，改轨名时这里要同步。
ok(count(guideHtml, /cu-grails__item/g) === 2, `/guide: 轨选择器应有两个轨，实际 ${count(guideHtml, /cu-grails__item/g)}`)
for (const segName of guideTabs.map((t) => t.name)) ok(guideHtml.includes(`>${segName}</strong>`), `/guide: 轨选择器里没有「${segName}」（轨名是文案契约：轨改名时这里要同步）`)
// 选中态不能是反白填充：轨名是 <strong>，而 01_shell.css 的 `.cu-page strong` 给全页 strong 钉了
// `color: var(--cu-ink)`，反白底 + 墨字会让轨名「看得见一条线、看不见字」。断言选中态用左侧竖条。
ok(!new RegExp('\.cu-grails__item\.is-active\s*\{[^}]*--cu-contrast').test(guideCss), '/guide: 轨选择器选中态不该用 --cu-contrast 反白（轨名会被 .cu-page strong 钉成墨色而消失）')
// kicker（h2 上方那行「小白教程 · 第 3 步」）全页为 0：序号已回到 h2，轨身份由页头的轨选择器表达。
// 2026-10-13 定稿：h2 的序号管「轨内第几步」，再挂一层轨标签是同一句话说两遍。
const GUIDE_KICKERS = 0
ok(count(guideHtml, /cu-step-kicker/g) === GUIDE_KICKERS, `/guide: 步骤标签应为 ${GUIDE_KICKERS} 个，实际 ${count(guideHtml, /cu-step-kicker/g)}`)
// 教程页首客服条（KefuBar）已删除：客服只走右下角在线助手浮标，这里断言它没被挂回来
ok(!guideHtml.includes('cu-kefubar'), '/guide: 页首客服条（KefuBar）已下线，产物里不该再出现 cu-kefubar')
// 小白轨 6 步 + 高级轨 2 节；锚点 id 是 /guide#锚点 深链契约（config/faq.ts、kefu_bot.ts 引用）
// 2026-10：高级轨精简为 pro-key / params；manual、env、editors、selfcheck 与 errors 旧锚点已删除
// （common 排查块按要求整段删除，报错统一走 /faq#cat-setup 与知识库）
const GUIDE_ANCHORS = ['install-ccswitch', 'get-key', 'import', 'models', 'enable', 'vscode', 'pro-key', 'params']
for (const anchor of GUIDE_ANCHORS)
  ok(guideHtml.includes(`id="${anchor}"`), `/guide: 缺少小节锚点 id="${anchor}"（两条轨的小节）`)
// 双向：产物里出现白名单之外的 <h2 id>（误恢复带回的旧块就是这样混进来的），也要在这里拦住
{
  const distAnchors = [...guideHtml.matchAll(/<h2 id="([a-z0-9-]+)"/g)].map((m) => m[1])
  const extra = [...new Set(distAnchors)].filter((a) => !GUIDE_ANCHORS.includes(a))
  ok(extra.length === 0, `/guide: 产物里多出未登记的小节锚点：${extra.join('、')}（config/guide.ts 多了一块，或该块已删除但没删干净）`)
}
// 截图文件名不会原样出现在 HTML 里（静态 import 带了 hash），按 <img class="cu-shot"> 数量断言；
// 两条轨都渲染在 SSR 产物里（切轨靠 hidden），所以总数 = config/guide.ts 里 shot.src 按出现次数的列表长度
// 图注编号必须与正文出现顺序连续（docs/guide_design_spec.md 第三章之二）。补子步骤时最容易漏改。
const figureLabels = [...guideHtml.matchAll(/cu-shot__label[^>]*>图 (\d+)</g)].map((m) => Number(m[1]))
ok(figureLabels.length > 0, '/guide: 产物里没有图注编号')
for (let i = 1; i < figureLabels.length; i++)
  ok(figureLabels[i] === figureLabels[i - 1] + 1, `/guide: 图注编号不连续：第 ${i + 1} 张是「图 ${figureLabels[i]}」，上一张是「图 ${figureLabels[i - 1]}」（config/guide.ts 里 shot.label）`)
const GUIDE_SHOTS = guideShots.length
const shotCount = count(guideHtml, /class="cu-shot[ "]/g)
ok(shotCount === GUIDE_SHOTS, `/guide: 教程截图应渲染 ${GUIDE_SHOTS} 张（config/guide.ts 里 shot.src 按出现次数的列表），实际 ${shotCount}`)
// 抽每张图的产物路径，确认 hash 后的文件真的在 dist 里（换图后忘了更新 GuideShot.vue 的导入表会在这里暴露）
const shotSrcs = [...guideHtml.matchAll(/src="(\/assets\/guide_[^"]+\.(?:png|jpg|jpeg|webp))"/g)].map((m) => m[1])
ok(shotSrcs.length === GUIDE_SHOTS, `/guide: 教程截图 <img src> 数 ${shotSrcs.length}，应 ${GUIDE_SHOTS}`)
for (const src of shotSrcs) ok(fs.existsSync(path.join(DIST, src)), `/guide: 截图文件 ${src} 不在产物里（GuideShot.vue 的静态导入表与 config/guide.ts 的文件名要一致）`)
ok(!guideHtml.includes('/guide/clients') && !guideHtml.includes('/guide/models'), '/guide: 仍有指向已删除的教程子页链接')

const faq = fs.readFileSync(path.join(DIST, 'faq.html'), 'utf8')
// 条数与分类数直接从 config/faq.ts 取，不要在这里硬编码（改 FAQ 的人不知道要同步这里）
const FAQ_COUNT = faqItems.length
// /faq 顶部「买之前」常开 2 条 + 其余按分类列出：详情条仍是全部 FAQ，分类锚点比分类数多 1（buying）
const FAQ_CATS = faqCategories.length + 1 // cat-* 分类锚点数（buying + 各分类；页尾「还没解决？」用 id=more，不计入）
ok(count(faq, /cu-faq__item/g) === FAQ_COUNT, `/faq: FAQ 条数 ${count(faq, /cu-faq__item/g)}，应为 ${FAQ_COUNT}（config/faq.ts 条数，改 FAQ 后同步这里的默认值）`)
ok(new Set([...faq.matchAll(/id="(cat-[a-z]+)"/g)].map((m) => m[1])).size === FAQ_CATS, `/faq: 分类锚点不是 ${FAQ_CATS} 个`)
ok(count(faq, /class="cu-faq__item"/g) === FAQ_COUNT, `/faq: 渲染出的 details 条数 ${count(faq, /class="cu-faq__item"/g)}，应为 ${FAQ_COUNT}`)
ok(count(faq, /<summary role="button"/g) === FAQ_COUNT, `/faq: summary 缺 role=button（屏幕阅读器读不出展开状态），实际 ${count(faq, /<summary role="button"/g)}`)
ok(count(faq, /aria-expanded="true"/g) >= 2, `/faq: 顶部「买之前」应至少常开 2 条，实际 ${count(faq, /aria-expanded="true"/g)}`)

/* ---------- 知识库列表页：分类 tab + 图文卡片网格，且不再有「最新文章」重复区块 ---------- */
const knowledgeIndexHtml = fs.readFileSync(path.join(DIST, 'knowledge', 'index.html'), 'utf8')
// tab 按钮上的篇数徽标仍用 .cu-kswitcher__count 类名；tab 数 = 四个分类 + 「全部」
const switcherCount = (knowledgeIndexHtml.match(/role="tab"/g) || []).length
const KNOWLEDGE_CATS = knowledgeMod.knowledgeCategories.map((c) => c.cat)
const KNOWLEDGE_SLUGS = new Set(knowledgeMod.knowledge.map((k) => k.slug))
ok(switcherCount === KNOWLEDGE_CATS.length + 1, `/knowledge: 分类 tab ${switcherCount} 个，应为 ${KNOWLEDGE_CATS.length + 1}（四个分类 + 全部）`)
for (const c of KNOWLEDGE_CATS) ok(knowledgeIndexHtml.includes(`id="cat-${c}"`), `/knowledge: 缺少分类 tab cat-${c}`)
ok(!knowledgeIndexHtml.includes('id="latest"'), '/knowledge: 仍有「最新文章」区块（与分类网格重复）')
// 有 cover 的条目必须渲染出封面卡，且渲染数与 config/knowledge.ts 的 cover 数一致（漏跑 fetch_knowledge_covers.py 时能发现）
const KNOWLEDGE_COVERED = knowledgeMod.knowledge.filter((k) => k.cover).length
const tileMedia = (knowledgeIndexHtml.match(/cu-ktile__media/g) || []).length
ok(tileMedia === KNOWLEDGE_COVERED, `/knowledge: 封面卡 ${tileMedia} 个，应为 ${KNOWLEDGE_COVERED}（config/knowledge.ts 里带 cover 的文章数）`)
// 每篇文章一张卡，卡片必须带 href（页尾的相关阅读也是同一个组件）；属性顺序不固定，只看 class 与 href 是否同时存在
const kcards = knowledgeIndexHtml.match(/<a [^>]*class="[^"]*\bcu-ktile\b[^"]*"[^>]*>/g) || []
const kcardsWithHref = knowledgeIndexHtml.match(/<a [^>]*class="[^"]*\bcu-ktile\b[^"]*"[^>]*href="\/knowledge\/[a-z0-9-]+"[^>]*>/g) || []
ok(kcards.length === knowledgeMod.knowledge.length, `/knowledge: 文章卡 ${kcards.length} 张，应为 ${knowledgeMod.knowledge.length}（每篇一张）`)
ok(kcardsWithHref.length === kcards.length, '/knowledge: 有文章卡缺 href（列表页点不开）')

/* ---------- 知识库：FAQPage JSON-LD（客户端注入的注册表，数据来自 config/knowledge.ts 的 faq[]） ---------- */
const chunksDir = path.join(DIST, 'assets', 'chunks')
const bundleJs = fs.existsSync(chunksDir)
  ? fs.readdirSync(chunksDir).filter((f) => f.endsWith('.js')).map((f) => fs.readFileSync(path.join(chunksDir, f), 'utf8')).join('')
  : ''
ok(bundleJs.includes('FAQPage'), '知识库：bundle 里没有 FAQPage（Article + FAQPage JSON-LD 未生成）')
ok(!bundleJs.includes('aiprimetech'), '知识库：bundle 里出现素材站域名')
for (const k of knowledgeMod.knowledge) {
  const w = `/knowledge/${k.slug}`
  const faq = k.faq ?? []
  ok(faq.length >= 3 && faq.length <= 5, `${w}: faq ${faq.length} 条，应为 3–5 条`)
  const md = fs.readFileSync(path.join(process.cwd(), 'docs', 'knowledge', `${k.slug}.md`), 'utf8')
  // 正文不再写 FAQ 小节：折叠卡片由 KnowledgeDoc.vue 客户端插入，权威源只有 config/knowledge.ts 的 faq[]。
  // 这里断言「正文没有残留 FAQ 小节 / 相关阅读小节」，FAQ 文本则断言进了 bundle（SSR 不渲染，靠客户端注入）。
  ok(!/^## 常见问题\s*$/m.test(md), `${w}: 正文残留「## 常见问题」小节，应只写在 knowledge.ts 的 faq[]`)
  ok(!/^## 相关阅读\s*$/m.test(md), `${w}: 正文残留「## 相关阅读」小节，应只写在 knowledge.ts 的 related[]`)
  for (const f of faq) {
    ok(bundleJs.includes(f.q), `${w}: bundle 里没有 FAQ 问题文本：${f.q}`)
  }
  ok(!md.includes('aiprimetech'), `${w}: 正文残留素材站域名`)
  // 页尾「相关阅读」是 KnowledgeFooter.vue 渲染的，只读 config/knowledge.ts 的 related，
  // 与 md 正文里的站内链接无关：正文链接是阅读途中出现的上下文引用，两者不必一一对应。
  const relatedList = Array.isArray(k.related) ? k.related : []
  for (const r of relatedList) {
    ok(KNOWLEDGE_SLUGS.has(r), `${w}: related 指向不存在的文章 ${r}`)
  }
}

/* ============================================================
 * SEO / GEO 断言（2026-10-13 新增）
 *
 * 动机：srcExclude 是逐个文件名的黑名单，新增内部文档漏写就会产出一个可索引页面并进 sitemap。
 * 真实事故：docs/troubleshooting_guide.md 漏排除，产物有 /troubleshooting_guide.html 并进了 sitemap，
 * 全站零内链，稀释主题权重。这里用三条互相独立的断言堵：
 *   1) dist 里每个 html（除 404）都必须在 sitemap 里 —— 内部文档没有 sitemap 条目就会被抓住
 *   2) sitemap 里每个 URL 都必须在 dist 里有 html —— 反向堵死链
 *   3) 每个可索引页恰好一条 canonical，且等于自己的无后缀 URL —— 挡住三套 URL 信号打架
 * 外加 robots.txt / llms.txt 在场检查与关键 JSON-LD 类型检查。
 * ============================================================ */
{
  const origin = siteConfig.url.replace(/\/+$/, '')
  const sitemapPath = path.join(DIST, 'sitemap.xml')
  ok(fs.existsSync(sitemapPath), 'dist 缺 sitemap.xml（gen_sitemap 没跑或写错位置）')
  const sitemapXml = fs.existsSync(sitemapPath) ? fs.readFileSync(sitemapPath, 'utf8') : ''
  const sitemapLocs = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim())
  ok(sitemapLocs.length > 0, 'sitemap.xml 里一条 URL 都没有')

  // 产物 html -> 对外 URL（映射规则必须与 gen_sitemap.ts 一致）
  const relHtml = distHtmlFiles.map((f) => path.relative(DIST, f).split(path.sep).join('/'))
  const routeOf = (rel) => {
    if (rel === 'index.html') return '/'
    if (rel.endsWith('/index.html')) return '/' + rel.replace(/index\.html$/, '').replace(/\/$/, '')
    return '/' + rel.replace(/\.html$/, '')
  }
  // copy_dir_overviews.mjs 会把 guide/index.html 再复制成 guide.html、knowledge/index.html 复制成
  // knowledge.html，两份内容相同，这里按 URL 去重后再比对，避免同一路由被算两次。
  // robots.txt 里 Disallow 的入口壳（有产物但故意不收录）：/console 正文全靠客户端渲染，
  // gen_sitemap.ts 已把它排除，两个断言都要跳过，否则会误报成「漏加 srcExclude」。
  const robotsDisallowed = new Set(
    fs.readFileSync(path.join(DIST, 'robots.txt'), 'utf8')
      .split(/\r?\n/)
      .map((l) => l.match(/^Disallow:\s*(\/[^\s#]*)/i))
      .filter(Boolean)
      .map((m) => m[1].replace(/\/$/, ''))
      .filter((p) => p !== '/')
  )
  const distUrls = [...new Set(relHtml.filter((r) => r !== '404.html').map(routeOf))].filter(
    (u) => ![...robotsDisallowed].some((d) => u === d || u.startsWith(d + '/'))
  )
  const sitemapSet = new Set(sitemapLocs.map((u) => u.replace(origin, '')))

  for (const u of distUrls) {
    ok(sitemapSet.has(u), `dist 里有 ${u} 但 sitemap.xml 里没有 —— 多半是内部文档漏加 config.mts 的 srcExclude`)
  }
  for (const u of sitemapSet) {
    ok(distUrls.includes(u), `sitemap.xml 收了 ${u}，但 dist 里没有对应产物（死链）`)
  }

  // canonical：恰好一条，且等于自己的无后缀 URL
  for (const f of distHtmlFiles) {
    const rel = path.relative(DIST, f).split(path.sep).join('/')
    if (rel === '404.html') continue
    const html = fs.readFileSync(f, 'utf8')
    const canonicals = [...html.matchAll(/<link[^>]*rel="canonical"[^>]*>/g)].map((m) => m[0])
    ok(canonicals.length === 1, `${rel}: canonical 应恰好 1 条，实际 ${canonicals.length} 条`)
    const want = origin + routeOf(rel)
    ok(
      canonicals.length === 1 && canonicals[0].includes(`href="${want}"`),
      `${rel}: canonical 应为 ${want}，实际 ${canonicals[0] || '(缺失)'}`,
    )
  }

  // robots.txt / llms.txt 在场；llms.txt 的限流数字必须与 config/rules.ts 同源
  const robotsPath = path.join(DIST, 'robots.txt')
  ok(fs.existsSync(robotsPath), 'dist 缺 robots.txt')
  if (fs.existsSync(robotsPath)) {
    const robots = fs.readFileSync(robotsPath, 'utf8')
    ok(/^User-agent:\s*\*/m.test(robots), 'robots.txt 缺 User-agent: * 段')
    ok(robots.includes(`${origin}/sitemap.xml`), `robots.txt 没有指向 ${origin}/sitemap.xml`)
  }
  const llmsPath = path.join(DIST, 'llms.txt')
  ok(fs.existsSync(llmsPath), 'dist 缺 llms.txt')
  if (fs.existsSync(llmsPath)) {
    const llms = fs.readFileSync(llmsPath, 'utf8')
    ok(llms.includes('## 知识库文章'), 'llms.txt 缺「## 知识库文章」段')
    // 限流数字只允许在 config/rules.ts 出现一次，llms.txt 必须由它派生。抽 rpm 与会话数对一下。
    const rulesSrc = readFileSafe(path.join(process.cwd(), 'config', 'rules.ts'), 'utf8')
    const rpm = (rulesSrc.match(/rpm:\s*([\d_]+)/) || [])[1]
    if (rpm) {
      const n = Number(String(rpm).replace(/_/g, ''))
      ok(
        llms.split('\n').some((l) => l.includes('请求速率') && l.includes(' ' + n + ' ')),
        `llms.txt 的「请求速率」一行没有出现 ${n} —— llms.txt 在漂移（应由 config/rules.ts 派生）`,
      )
    }
    const sessions = (rulesSrc.match(/sessions:\s*([\d_]+)/) || [])[1]
    if (sessions) {
      const n = Number(String(sessions).replace(/_/g, ''))
      ok(
        // 按「标签 + 数字」判定，不正则：措辞与空格由 limitRows 派生会变，正则等于把门禁写成第二份文案。
        llms.split('\n').some((l) => l.includes('会话窗口') && l.includes(' ' + n + ' ')),
        `llms.txt 的「会话窗口」一行没有出现 ${n} —— llms.txt 在漂移（应由 config/rules.ts 派生）`,
      )
    }
  }

  // 关键 JSON-LD 类型在场（gen_jsonld.ts 注入在最后一个 </body> 前）
  const readJsonLd = (f) => {
    if (!fs.existsSync(f)) return null
    const html = fs.readFileSync(f, 'utf8')
    const m = html.match(/<script type="application\/ld\+json" data-cu-jsonld="">([\s\S]*?)<\/script>/)
    if (!m) return null
    try {
      return JSON.parse(m[1])
    } catch {
      return null
    }
  }
  const graphTypes = (ld) => ((ld && ld['@graph']) || []).map((x) => x['@type'])

  const homeJsonLd = readJsonLd(path.join(DIST, 'index.html'))
  ok(!!homeJsonLd, '首页没有 data-cu-jsonld 脚本（gen_jsonld 没跑）')
  if (homeJsonLd) {
    for (const t of ['Organization', 'WebSite', 'Product']) {
      ok(graphTypes(homeJsonLd).includes(t), `首页 JSON-LD 缺 ${t}`)
    }
  }
  // 知识库文章：TechArticle + FAQPage + BreadcrumbList + dateModified
  for (const [route, rel] of knowledgePages()) {
    const ld = readJsonLd(path.join(DIST, rel + '.html'))
    if (!ld) {
      ok(false, `${route}: 没有 data-cu-jsonld 脚本`)
      continue
    }
    const types = graphTypes(ld)
    for (const t of ['TechArticle', 'FAQPage', 'BreadcrumbList']) {
      ok(types.includes(t), `${route}: JSON-LD 缺 ${t}`)
    }
    const art = (ld['@graph'] || []).find((x) => x['@type'] === 'TechArticle')
    if (art) {
      ok(!!art.dateModified, `${route}: TechArticle 缺 dateModified`)
      ok(art.url === origin + route, `${route}: TechArticle.url 应为 ${origin + route}，实际 ${art.url}`)
    }
  }
  const faqJsonLd = readJsonLd(path.join(DIST, 'faq.html'))
  if (faqJsonLd) ok(graphTypes(faqJsonLd).includes('FAQPage'), '/faq: JSON-LD 缺 FAQPage')
  const pricingJsonLd = readJsonLd(path.join(DIST, 'pricing.html'))
  if (pricingJsonLd) ok(graphTypes(pricingJsonLd).includes('Product'), '/pricing: JSON-LD 缺 Product')
}


// 视频体积门禁：视频本体走 R2（config/media_cdn.ts），public/videos/ 下的 mp4 只是上传源，
// 不该进部署包。这里守住「源目录别无声膨胀」——真要加新视频先确认它上了 R2。
{
  const vdir = path.join(DIST, 'videos')
  if (fs.existsSync(vdir)) {
    let total = 0
    let count = 0
    for (const f of fs.readdirSync(vdir)) {
      if (!f.endsWith('.mp4')) continue
      total += fs.statSync(path.join(vdir, f)).size
      count++
    }
    const mb = total / 1048576
    ok(mb <= VIDEO_MP4_BUDGET_MB, `videos: 产物里有 ${count} 个 mp4 共 ${mb.toFixed(1)}MB，超过 ${VIDEO_MP4_BUDGET_MB}MB 上限（视频应走 R2，见 config/media_cdn.ts）`)
  }
}

if (fails.length) {
  console.error('\n[x] 构建产物结构检查未通过:')
  for (const f of fails) console.error('    - ' + f)
  process.exit(1)
}
console.log('[x] 构建产物结构检查通过（外壳完整、H1 唯一、目录锚点命中、无未渲染模板；SEO：sitemap 与产物一一对应、canonical 正确、robots/llms 在场、JSON-LD 类型齐全）')
