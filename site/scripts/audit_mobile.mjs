/**
 * 手机 / 平板视口门禁：断言窄屏无整页横滚、购买按钮不被裁切、主导航菜单入口存在。
 *
 * 跑法：先起站点（dev 41800 或 preview 41777），再：
 *   AUDIT_BASE=http://127.0.0.1:41800 npm run check:mobile
 * 默认 AUDIT_BASE=http://127.0.0.1:41777（与其它 audit_* 一致）。
 */
import { chromium } from 'playwright'

const BASE = process.env.AUDIT_BASE || 'http://127.0.0.1:41777'
const VIEWPORTS = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
]
const ROUTES = [
  '/',
  '/pricing',
  '/guide',
  '/guide/cc',
  '/knowledge',
  '/knowledge/what-is-claude-unlimited',
  '/contact',
  '/agency',
  '/models',
  '/faq',
  '/console',
]

const fails = []
const ok = (cond, msg) => {
  if (!cond) fails.push(msg)
}

const browser = await chromium.launch()

try {
  for (const vp of VIEWPORTS) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } })
    for (const route of ROUTES) {
      const url = `${BASE}${route}`
      let status = 0
      try {
        const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 })
        status = res?.status() ?? 0
      } catch (err) {
        fails.push(`${vp.name} ${route}: 打开失败 ${err instanceof Error ? err.message : err}`)
        continue
      }
      ok(status >= 200 && status < 400, `${vp.name} ${route}: HTTP ${status}`)

      await page.waitForSelector('.cu-brandbar', { timeout: 8000 }).catch(() => null)

      const report = await page.evaluate(() => {
        const cw = document.documentElement.clientWidth
        const sw = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth)
        const buy = document.querySelector('.cu-navtools .cu-tabs__cta, .cu-navtools a[data-cta="nav"]')
        const buyR = buy?.getBoundingClientRect()
        const menu = document.querySelector('.cu-nav-menu')
        const menuCs = menu ? getComputedStyle(menu) : null
        const menuVisible = !!(menu && menuCs && menuCs.display !== 'none' && menuCs.visibility !== 'hidden')
        return {
          cw,
          sw,
          hasHScroll: sw > cw + 1,
          buyRight: buyR ? Math.round(buyR.right) : null,
          buyClipped: !!(buyR && buyR.right > cw + 1),
          menuVisible,
        }
      })

      ok(!report.hasHScroll, `${vp.name} ${route}: 整页横滚 scrollWidth=${report.sw} clientWidth=${report.cw}`)
      ok(report.buyRight !== null, `${vp.name} ${route}: 顶栏购买按钮缺失`)
      ok(!report.buyClipped, `${vp.name} ${route}: 购买按钮被裁切 right=${report.buyRight} cw=${report.cw}`)
      if (vp.width <= 820) {
        ok(report.menuVisible, `${vp.name} ${route}: 窄屏缺少可见的 .cu-nav-menu 主导航入口`)
      }
    }
    await page.close()
  }
} finally {
  await browser.close()
}

if (fails.length) {
  console.error(`[x] check:mobile 失败 ${fails.length} 条（${BASE}）`)
  for (const f of fails) console.error('  -', f)
  process.exit(1)
}

console.log(`[x] check:mobile 通过（${VIEWPORTS.map((v) => v.width).join('/')} × ${ROUTES.length} 页 · ${BASE}）`)
