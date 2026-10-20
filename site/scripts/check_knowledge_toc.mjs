/**
 * 浏览器里的知识库页内目录核对：文章页的目录由 KnowledgeDoc.vue 在客户端挂载后从正文的 h2[id] 生成，
 * SSR 产物里没有，verify_build.py 无法核对。构建后起 vitepress preview，用 playwright 打开
 * /knowledge 与 /knowledge/<slug>（覆盖每个分类一篇），断言：
 * 1. 列表页分类胶囊与分类小节都存在且数量一致，胶囊锚点能跳到对应小节；
 * 2. 文章页右侧目录项数 = 正文 h2 数，且每项锚点都能在正文找到；
 * 3. 文章页 head 里有 FAQPage JSON-LD（客户端注入），问题数与正文「常见问题」的 H3 数一致。
 *
 * 用法：npm run check:toc [port]（先 npm run build；服务器用 scripts/serve_dist.py，默认端口 4231）
 */
import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

// playwright 不在本项目的 devDependencies（会拉几百 MB 浏览器），用本机全局安装的那份：
// 先从项目解析，失败再从全局 npm 根（%APPDATA%/npm/node_modules）解析；浏览器缓存在 %LOCALAPPDATA%/ms-playwright。
const require_ = createRequire(import.meta.url)
function loadPlaywright() {
  try {
    return require_('playwright')
  } catch {}
  const globalRoot = process.env.APPDATA ? path.join(process.env.APPDATA, 'npm', 'node_modules', 'playwright') : ''
  if (globalRoot) {
    try {
      return require_(globalRoot)
    } catch (e) {}
  }
  throw new Error('未找到 playwright：先 npm i -g playwright')
}
const { chromium } = loadPlaywright()

// 每篇注册了 faq 的文章，页面上会有组件渲染的「常见问题」折叠卡片（知识库 Article 壳）
const ARTICLES_FAQ = (() => {
  const full = fs.readFileSync(path.join(process.cwd(), 'config', 'knowledge.ts'), 'utf8')
  // 只取 knowledge[] 数组本体：后面的 retiredKnowledgePages 块也有 slug 字段，
  // 跨块正则会让退役页蹭到别人的 faq（退役页没有 faq，它是下线不是待检文章）
  const start = full.indexOf('export const knowledge: KnowledgeMeta[] = [')
  const end = full.indexOf('\n]', start)
  const src = full.slice(start, end)
  const map = {}
  for (const m of src.matchAll(/slug: '([^']+)'[\s\S]*?faq: \[\s*\{/g)) map[m[1]] = true
  return map
})()

const flags = process.argv.slice(2).filter((a) => a.startsWith('--'))
let PORT = Number(process.argv.slice(2).find((a) => !a.startsWith('--')) || 4231)

/**
 * 端口没被释放时直接换端口，否则脚本会连到上一次遗留的旧服务器上（核对的是旧产物，结论无效）。
 * 上一次遗留的服务器退出时会被杀掉（见 spawn 处的 process.on('exit')），这里只是兜底。
 */
async function portFree(p) {
  const net = await import('node:net')
  return !(await new Promise((res) => {
    const sock = net.connect(p, '127.0.0.1')
    sock.on('connect', () => { sock.destroy(); res(true) })
    sock.on('error', () => res(false))
  }))
}
let BASE = ''

/** 每个分类抽一篇：start / how / cost / troubleshoot。默认写死；核对某篇新文章时传 --slug=<slug> 或 CU_TOC_SAMPLE=<slug> 覆盖对应分类那一篇，其余不变。 */
const DEFAULT_ARTICLES = {
  start: 'claude-code-skills',
  how: 'prompt-caching-explained',
  cost: 'claude-api-pricing-explained',
  troubleshoot: 'claude-code-429-rate-limit',
}
const slugArg = flags.find((a) => a.startsWith('--slug='))?.slice(7)
  || process.env.CU_TOC_SAMPLE
const ARTICLES = { ...DEFAULT_ARTICLES }
if (slugArg) {
  console.log(`[toc] 指定样本 slug=${slugArg}（替换 start 分类的样本，其余分类保持默认；该 slug 应属于 start 分类）`)
  ARTICLES.start = slugArg
}

const unknownFlags = flags.filter(f => !f.startsWith('--slug='))
if (unknownFlags.length) {
  console.error(`[toc] 无法识别的参数：${unknownFlags.join(' ')}（当前只支持 --slug=<slug>）`)
  process.exit(2)
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let browser
const fails = []
const ok = (cond, msg, detail = '') => {
  if (!cond) fails.push(msg + (detail ? '  ' + detail : ''))
  console.log(`  ${cond ? '[ok]' : '[!!]'} ${msg}${cond || !detail ? '' : '  ' + detail}`)
}

try {
  // 复用 verify_build.py 的静态服务器（scripts/serve_dist.py，按 Pages cleanUrls 规则回落目录 index.html）；
  // 不用 vitepress preview——裸路由直开时它返回的是目录页 HTML。
  // 端口被占就顺延，最多 50 个。原来的循环体是空的且 PORT 不自增，端口一被占就是永久死循环
  let port = PORT
  while (!(await portFree(port)) && port < PORT + 50) port++
  if (port >= PORT + 50) throw new Error(`${PORT}-${PORT + 49} 端口全被占用，请释放后重试`)
  PORT = port
  BASE = `http://127.0.0.1:${PORT}`
  const server = spawn('python', ['scripts/serve_dist.py', String(PORT)], { stdio: 'ignore' })
  // 子进程默认不会被父进程退出带走：没有这句，脚本跑完后 Node 已经打印「全部通过」，
  // 但 python 静态服务器还占着端口，脚本不退出（表现为 check:toc 超时 exit 124）。
  // Windows 上 server.kill() 只杀 python 自己、孙子进程还在，必须 taskkill /T 杀整棵树。
  process.on('exit', () => {
    if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' })
    else { try { server.kill() } catch {} }
  })
  // 先确认产物在（不通过 HTTP 探测：node 内置 fetch 在 Windows 上偶发 AssertionError !paused）
  // 相对脚本目录而不是 cwd：从仓库根调这个脚本也不会找错位置
  const distIndex = path.resolve(import.meta.dirname, '..', '.vitepress', 'dist', 'index.html')
  if (!fs.existsSync(distIndex)) throw new Error('未找到 dist/index.html，请先 npm run build')
  // 等服务器真正起来（端口可连接），而不是盲等固定秒数
  const net = await import('node:net')
  for (let i = 0; i < 40; i++) {
    const up = await new Promise((res) => {
      const sock = net.connect(PORT, '127.0.0.1')
      sock.on('connect', () => { sock.destroy(); res(true) })
      sock.on('error', () => res(false))
    })
    if (up) break
    await sleep(500)
  }
  browser = await chromium.launch()
  const page = await browser.newPage()

  console.log('\n知识库列表页')
  await page.goto(`${BASE}/knowledge`, { waitUntil: 'networkidle' })
  // tab 条：四个分类 + 「全部」
  const tabs = await page.locator('.cu-seg__btn[role="tab"]').count()
  ok(tabs === Object.keys(ARTICLES).length + 1, `分类 tab ${tabs} 个，应为 ${Object.keys(ARTICLES).length + 1}（每个分类 + 全部）`)
  const tiles = await page.locator('.cu-ktile').count()
  ok(tiles === (await page.locator('.cu-ktile[href^="/knowledge/"]').count()), `文章卡 ${tiles} 张，每张都要带 /knowledge/ 链接`)
  for (const cat of Object.keys(ARTICLES)) {
    ok(await page.locator(`#cat-${cat}`).count() === 1, `分类 tab #cat-${cat} 存在`)
  }
  // 切 tab：只显示该分类的文章，且 URL 同步 ?cat=<cat>
  const firstCat = Object.keys(ARTICLES)[0]
  const expectedCat = Number(await page.locator(`#cat-${firstCat} .cu-kswitcher__count`).textContent())
  await page.locator(`#cat-${firstCat}`).click()
  await page.waitForTimeout(200)
  const shown = await page.locator('.cu-ktile:visible').count()
  ok(shown === expectedCat, `切到 #cat-${firstCat} 后可见文章 ${shown} 篇，应为 tab 上的 ${expectedCat}`)
  ok(page.url().includes(`cat=${firstCat}`), `切 tab 后 URL 应带 cat=${firstCat}，实际 ${page.url()}`)
  await page.locator('.cu-seg__btn', { hasText: '全部' }).click()
  await page.waitForTimeout(200)
  ok(await page.locator('#latest').count() === 0, '没有「最新文章」重复区块')

  console.log('\n知识库文章页（客户端目录 + FAQPage）')
  // 窄屏：1100px 断点下阅读列必须占满单列（宽度≈视口减边距），不能被 208px 的目录列挤窄（先进文章页，列表页没有阅读列）
  await page.locator(`#cat-${Object.keys(ARTICLES)[0]}`).click()
  // 文章卡在 .cu-kgrid 里；点第一张就是 ARTICLES.start 那篇
  await page.locator(`.cu-ktile[href="/knowledge/${ARTICLES.start}"]`).scrollIntoViewIfNeeded()
  await page.locator(`.cu-ktile[href="/knowledge/${ARTICLES.start}"]`).click()
  await page.waitForSelector('.cu-sidenav a')
  await page.setViewportSize({ width: 480, height: 900 })
  await page.waitForTimeout(300)
  const narrow = await page.evaluate(() => {
    const inner = document.querySelector('.cu-shell__inner')
    const sidenav = document.querySelector('.cu-sidenav')
    const body = document.querySelector('.cu-shell__body')
    if (!inner || !body) return null
    const r = inner.getBoundingClientRect()
    const b = body.getBoundingClientRect()
    return {
      innerW: Math.round(r.width),
      innerX: Math.round(r.x),
      bodyW: Math.round(b.width),
      bodyX: Math.round(b.x),
      sidenavTop: sidenav ? Math.round(sidenav.getBoundingClientRect().y) : null,
      innerTop: Math.round(r.y),
    }
  })
  // 单列网格里目录排在阅读列之前（DOM 顺序），移动端是「目录标签条 → 正文」，所以只核对阅读列宽度与位置
  ok(narrow && narrow.innerW >= narrow.bodyW - 2 && narrow.innerX >= narrow.bodyX - 2, '窄屏 480px：阅读列占满单列宽度',
    `inner=${narrow?.innerW}px body=${narrow?.bodyW}px x=${narrow?.innerX} bodyX=${narrow?.bodyX} navTop=${narrow?.sidenavTop} innerTop=${narrow?.innerTop}`)
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.waitForTimeout(200)

  for (const [cat, slug] of Object.entries(ARTICLES)) {
    page.on('pageerror', (e) => console.error(`  [pageerror] ${slug}: ${String(e).slice(0, 200)}`))
    // 先到列表页再点击进入：直接 goto 裸路由时服务端返回的是目录页 HTML（静态服务器按目录回落 index.html），
    // 会与客户端 Vue 应用产生 hydration 不匹配；SPA 内部跳转没有这个问题，也更接近真实用户路径。
    await page.goto(`${BASE}/knowledge`, { waitUntil: 'networkidle' })
    await page.click(`.cu-kcard[href="/knowledge/${slug}"], a[href="/knowledge/${slug}"]`)
    await page.waitForFunction(() => document.querySelectorAll('.cu-kdoc__meta').length > 0, null, { timeout: 5000 })
    await page.waitForSelector('.cu-sidenav a', { timeout: 5000 })
    await page.waitForSelector('.cu-sidenav', { timeout: 5000 })
    // FAQ 折叠卡片是客户端填充的（KnowledgeDoc.vue 的 mountFaq），标题在 .cu-kdoc__faq 里；两处 h2 才是完整的目录集合
    if (ARTICLES_FAQ[slug]) await page.waitForSelector('.cu-kdoc__faq h2#cu-kdoc-faq-heading', { timeout: 5000 })
    const navLinks = await page.locator('.cu-sidenav a').evaluateAll((els) => els.map((e) => e.getAttribute('href')))
    const h2Ids = await page.locator('.vp-doc h2[id], .cu-kdoc__faq h2[id]').evaluateAll((els) => els.map((e) => e.id))
    ok(navLinks.length === h2Ids.length && h2Ids.length >= 3, `${slug}（${cat}）目录 ${navLinks.length} 项 = 正文 h2 ${h2Ids.length} 个（含组件渲染的常见问题标题）`)
    ok(navLinks.every((href) => h2Ids.includes(href.replace('#', ''))), `${slug} 目录锚点全部命中正文 h2`)
    // 点击第一项后，页面应滚动到对应小节
    if (navLinks.length) {
      await page.locator('.cu-sidenav a').first().click()
      await sleep(300)
      const target = await page.locator(navLinks[0].replace('#', 'h2#')).count()
      ok(target === 1, `${slug} 点击目录首项可定位到 ${navLinks[0]}`)
    }
    // FAQ 折叠卡片由 KnowledgeDoc.vue 客户端插入（正文不再写 FAQ 小节），数渲染出来的 details 条数。
    const h3Faq = await page.evaluate(() => document.querySelectorAll('.cu-kdoc__faq details.cu-faq__item').length)
    const ld = await page.evaluate(() => {
      const out = { scripts: [], types: [], faqCount: 0, parseError: null }
      for (const el of document.querySelectorAll('script[data-cu-jsonld]')) {
        const types = []
        try {
          const json = JSON.parse(el.textContent || '')
          const graph = json['@graph'] || []
          types.push(...graph.map((n) => n['@type']))
          const faq = graph.find((n) => n['@type'] === 'FAQPage')
          if (faq) out.faqCount += faq.mainEntity.length
        } catch (e) {
          out.parseError = el.id + ': ' + String(e).slice(0, 80)
        }
        out.scripts.push(el.id)
        out.types.push(...types)
      }
      return out
    })
    const articleLd = ld.scripts.some((id) => id.includes('cu-jsonld-knowledge') && !id.endsWith('-index'))
    ok(articleLd && ld.types.includes('TechArticle') && ld.types.includes('FAQPage'), `${slug} JSON-LD 含 TechArticle + FAQPage`, `scripts=${ld.scripts.join(',') || '(空)'} types=${ld.types.join('+') || '(空)'}${ld.parseError ? ' parse=' + ld.parseError : ''}`)
    ok(ld && ld.faqCount === h3Faq && h3Faq >= 3, `${slug} FAQPage ${ld?.faqCount} 条 = 组件渲染的「常见问题」折叠项 ${h3Faq} 条`)
  }
} finally {
  await browser?.close()
  // 收尾后显式退出：静态服务器子进程不主动 kill 的话，Node 会一直挂着（check:toc 表现为超时）。
  if (typeof server !== 'undefined' && server.pid) {
    if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' })
    else server.kill()
  }
}

if (fails.length) {
  console.error(`\n[x] ${fails.length} 项未通过`)
  process.exit(1)
}
console.log('\n知识库浏览器核对全部通过')

// 所有检查已结束：显式退出。Playwright 浏览器与静态服务器即使已 close/kill，
// Node 事件循环里仍可能残留句柄（Windows 上尤其明显），表现为打印完结果却不退出。
process.exit(0)
