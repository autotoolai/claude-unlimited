/**
 * 构建后结构断言：SSR 产物必须完整。
 * VitePress 的 renderToString 会吞掉子组件渲染异常并返回注释占位，只看构建是否 exit 0 不可靠，
 * 这里把「每页外壳齐全 / 外壳内 H1 唯一 / 页内目录锚点全部命中 / 助手浮标存在 / 无未渲染模板」做成硬门禁。
 */
import fs from 'node:fs'
import path from 'node:path'

const DIST = path.resolve(process.cwd(), '.vitepress', 'dist')
const PAGES = {
  '/': 'index',
  '/pricing': 'pricing',
  '/unlimited': 'unlimited',
  '/faq': 'faq',
  '/guide': 'guide/index',
  '/guide/clients': 'guide/clients',
  '/guide/models': 'guide/models',
  '/guide/ccswitch': 'guide/ccswitch',
}
const fails = []
const ok = (cond, msg) => { if (!cond) fails.push(msg) }

for (const [route, file] of Object.entries(PAGES)) {
  const html = fs.readFileSync(path.join(DIST, `${file}.html`), 'utf8')
  const where = route
  // 首页的 H1 在 Hero 里（HomeHero 组件），没有 cu-page__head 抬头区
  const headKeys = route === '/' ? [] : ['cu-page__head']
  for (const key of ['cu-brandbar', 'cu-tabs__inner', 'cu-shell__body', 'cu-foot', ...headKeys, 'cu-sidenav', 'cu-kefu__fab', 'cu-human__fab']) {
    ok(html.includes(key), `${where}: 缺少 ${key}`)
  }
  ok(!html.includes('<template>'), `${where}: 产物里有未渲染的 <template>，md 模板没被编译`)
  ok(!html.includes('&lt;h2') && !html.includes('&lt;HomeHero'), `${where}: 产物里有转义后的模板文本（&lt;h2…）`)
  ok(!html.includes('<!--[-->') && !html.includes('<!---->'), `${where}: 产物里有 Vue SSR 注释标记`)
  for (const vpc of ['VPNav', 'VPLocalNav', 'VPSidebar', 'VPBackdrop', 'VPFooter', 'VPSkipLink']) {
    ok(!html.includes(vpc), `${where}: 产物里仍有默认外壳节点 ${vpc}（Layout.vue 应退到 slot-only）`)
  }
  const shellStart = html.indexOf('class="cu-shell"')
  const shell = html.slice(shellStart)
  // H1 只数外壳内的：cu-shell 之前的默认外壳节点（404 页等）不计入
  const h1 = shell.match(/<h1/g) || []
  ok(h1.length === 1, `${where}: 外壳内 H1 数量 ${h1.length}，应为 1`)
  const nav = (html.match(/<aside class="cu-sidenav"[\s\S]*?<\/ul>[\s\S]*?<\/aside>/) || [''])[0]
  const hrefs = [...nav.matchAll(/<a[^>]+href="#([^"]+)"/g)].map((m) => m[1])
  // 页内目录锚点对应正文小节：普通小节是 <h2 id="…">，FAQ 分类是 <section id="cat-…">（h2 无 id）
  const ids = new Set([
    ...[...shell.matchAll(/<h2 id="([^"]+)"/g)].map((m) => m[1]),
    ...[...shell.matchAll(/<section id="([^"]+)"/g)].map((m) => m[1]),
  ])
  ok(hrefs.length > 0, `${where}: 页内目录为空`)
  for (const h of hrefs) ok(ids.has(h), `${where}: 目录锚点 #${h} 在正文中不存在`)
  for (const id of ids) ok(hrefs.includes(id), `${where}: 正文小节 #${id} 不在目录里`)
  ok(/<div class="cu-shell"[\s\S]*<h2 /.test(html), `${where}: 外壳内没有 H2，说明插槽内容没渲染`)
}

const index = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8')
for (const key of ['cu-hero', 'cu-cards', 'cu-steps', 'cu-stats', 'cu-price-card', 'cu-table', 'cu-faq__item', 'cu-band', 'cu-notice']) {
  ok(index.includes(key), `/ : 首页缺少 ${key}`)
}
const count = (s, re) => (s.match(re) || []).length
// 首页新增了「合作平台」与「教程」两组 cu-card 与一组 FAQ，这里改成下限断言：只防模板整块没渲染，不锁死条数
ok(count(index, /cu-faq__item/g) >= 6, `/ : 首页 FAQ 条数 ${count(index, /cu-faq__item/g)}，应 >= 6`)
const cards = count(index, /class="cu-card"/g)
ok(cards >= 6, `/ : 首页卖点卡数 ${cards}，应 >= 6（卖点 6 + 合作平台 3 + 教程 4）`)
ok(index.includes('partner_'), '/ : 首页缺少合作平台卡片（data-cta=partner_*）')
ok(count(index, /cu-card--link/g) === 4, `/ : 首页教程卡片应为 4，实际 ${count(index, /cu-card--link/g)}`)
ok(index.includes('id="get-started"') && index.includes('id="workflow"'), '/ : 首页缺少「开始之前 / 从买到用起来」小节')
ok(index.includes('cu-brandbar__note'), '/ : 首页页头缺少关联声明（cu-brandbar__note）')

// 导航条右侧 CTA 走 ExternalCta（带 data-cta），页头不再有第二个购买按钮
for (const [route, file] of Object.entries(PAGES)) {
  const html = fs.readFileSync(path.join(DIST, `${file}.html`), 'utf8')
  const nav = html.match(/<nav class="cu-tabs"[\s\S]*?<\/nav>/) || ['']
  ok(/data-cta="nav"/.test(nav[0]), `${route}: 导航条缺少购买 CTA（ExternalCta data-cta=nav）`)
  ok(!/cu-navcta/.test(html), `${route}: 页头仍有旧的 cu-navcta 购买按钮（应换成 cu-brandbar__note 声明）`)
}
const guideSteps = count(fs.readFileSync(path.join(DIST, 'guide/index.html'), 'utf8'), /cu-step-block__no/g)
ok(guideSteps === 5, `/guide: 五步总览步骤数 ${guideSteps}，应为 5`)

const faq = fs.readFileSync(path.join(DIST, 'faq.html'), 'utf8')
const FAQ_COUNT = Number(process.env.CU_FAQ_COUNT || 33)
// /faq 顶部「买之前」常开 5 条 + 其余按分类列出：详情条仍是全部 FAQ，分类锚点比分类数多 1（buying）
const FAQ_CATS = Number(process.env.CU_FAQ_CATS || 8) // cat-* 分类锚点数（buying + 7 个分类；页尾「还没解决？」用 id=more，不计入）
ok(count(faq, /cu-faq__item/g) === FAQ_COUNT, `/faq: FAQ 条数 ${count(faq, /cu-faq__item/g)}，应为 ${FAQ_COUNT}（config/faq.ts 条数，改 FAQ 后同步这里的默认值）`)
ok(new Set([...faq.matchAll(/id="(cat-[a-z]+)"/g)].map((m) => m[1])).size === FAQ_CATS, `/faq: 分类锚点不是 ${FAQ_CATS} 个`)
ok(count(faq, /class="cu-faq__item"/g) === FAQ_COUNT, `/faq: 渲染出的 details 条数 ${count(faq, /class="cu-faq__item"/g)}，应为 ${FAQ_COUNT}`)
ok(count(faq, /<summary role="button"/g) === FAQ_COUNT, `/faq: summary 缺 role=button（屏幕阅读器读不出展开状态），实际 ${count(faq, /<summary role="button"/g)}`)
ok(count(faq, /aria-expanded="true"/g) >= 5, `/faq: 顶部「买之前」应至少常开 5 条，实际 ${count(faq, /aria-expanded="true"/g)}`)

if (fails.length) {
  console.error('\n[x] 构建产物结构检查未通过:')
  for (const f of fails) console.error('    - ' + f)
  process.exit(1)
}
console.log('[x] 构建产物结构检查通过（四页外壳完整、外壳内 H1 唯一、目录锚点全部命中、无未渲染模板）')
