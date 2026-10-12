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
const { guideShots } = await tsImport('../config/guide.ts', import.meta.url)
const { siteConfig } = await tsImport('../config/site.ts', import.meta.url)
unregisterTsx()
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
// 教程是一页两条轨（2026-10 重构：删购买章节、页首客服条、小白八步 + 高手五节）：
// 客服条在正文第一屏，两条轨各有 kicker 计数，共用块（常见问题排查）不带 kicker。
const guideHtml = fs.readFileSync(path.join(DIST, 'guide/index.html'), 'utf8')
const guideSteps = count(guideHtml, /cu-step-block__no/g)
ok(guideSteps >= 8, `/guide: 步骤块数 ${guideSteps}，应 >= 8（小白轨 6 步 + 高手轨手填字段步骤）`)
// kicker 数 = 小白 6 + 高手 5；改教程加节时要同步这里
const GUIDE_KICKERS = 11
ok(count(guideHtml, /cu-step-kicker/g) === GUIDE_KICKERS, `/guide: 步骤标签（小白 ${6} + 高手 ${5}）应恰好 ${GUIDE_KICKERS} 个，实际 ${count(guideHtml, /cu-step-kicker/g)}`)
ok(count(guideHtml, /cu-seg__btn/g) === 2, `/guide: 分段切换应有两个胶囊（小白 / 高手），实际 ${count(guideHtml, /cu-seg__btn/g)}`)
// 教程页首客服条（KefuBar）已删除：客服只走右下角在线助手浮标，这里断言它没被挂回来
ok(!guideHtml.includes('cu-kefubar'), '/guide: 页首客服条（KefuBar）已下线，产物里不该再出现 cu-kefubar')
// 小白轨 6 步 + 高手轨 5 节 + 共用块；锚点 id 是 /guide#锚点 深链契约（config/faq.ts、kefu_bot.ts 引用）
for (const anchor of ['install-ccswitch', 'get-key', 'import', 'models', 'enable', 'vscode', 'params', 'manual', 'env', 'editors', 'selfcheck', 'errors'])
  ok(guideHtml.includes(`id="${anchor}"`), `/guide: 缺少小节锚点 id="${anchor}"（两条轨的小节）`)
// 截图文件名不会原样出现在 HTML 里（静态 import 带了 hash），按 <img class="cu-shot"> 数量断言；
// 两条轨都渲染在 SSR 产物里（切轨靠 hidden），所以总数 = config/guide.ts 里 shot.src 的去重列表长度
const GUIDE_SHOTS = guideShots.length
const shotCount = count(guideHtml, /class="cu-shot[ "]/g)
ok(shotCount === GUIDE_SHOTS, `/guide: 教程截图应渲染 ${GUIDE_SHOTS} 张（config/guide.ts 里 shot.src 的去重列表），实际 ${shotCount}`)
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

if (fails.length) {
  console.error('\n[x] 构建产物结构检查未通过:')
  for (const f of fails) console.error('    - ' + f)
  process.exit(1)
}
console.log('[x] 构建产物结构检查通过（四页外壳完整、外壳内 H1 唯一、目录锚点全部命中、无未渲染模板）')
