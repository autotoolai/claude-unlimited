/**
 * 教程页截图几何验收：抓「图片被压扁/拉长」这类只有肉眼才看得出、门禁查不出的缺陷。
 *
 * 为什么要单独一个脚本（2026-10-22）：
 * `.cu-shot img` 曾经是 `width:100% + height:auto + max-height`。浏览器在限高时
 * **不会回调宽度**——竖图（909×989）先被拉到 600px 宽、再被 max-height 压到 384px 高，
 * 盒子比例从 0.92 变成 1.56，画面被横向拉扁：字变宽、行距压扁、界面文字糊成一片。
 * build、check:css、check:theme、typecheck 全都查不出来，因为每一条规则都"正确"，
 * 错的是浏览器怎么把这几条规则合起来算。
 *
 * 判定：横向与纵向的缩放系数（显示宽/原生宽、显示高/原生高）之差超过 2% 就是失真。
 * 并排两列组（.cu-step-block__shots）用 object-fit:cover 裁切，裁切本身是设计要的，
 * 但**仍然不允许形变**——所以那条阈值同样适用。
 *
 * 跑法：先 npm run build && npm run preview，再 node scripts/audit_guide_shots.mjs
 * 环境变量 AUDIT_BASE 可覆盖预览地址。
 */
import { chromium } from 'playwright'
import { register, tsImport } from 'tsx/esm/api'

const BASE = process.env.AUDIT_BASE || 'http://127.0.0.1:41777'
const unregisterTsx = register()
const { guideScenes } = await tsImport('../config/guide.ts', import.meta.url)
unregisterTsx()

/** 允许的最大形变量。1% 是留给亚像素舍入的余量。 */
const MAX_DISTORT = 0.02

const browser = await chromium.launch()
const fails = []
let scanned = 0

for (const scene of guideScenes()) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.goto(`${BASE}/guide/${scene}`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(600)
  // 截图是 loading="lazy"，不滚一遍就不会解码，量到的 naturalWidth 是 0
  await page.evaluate(() => {
    document.querySelectorAll('.cu-shot img').forEach((i) => { i.loading = 'eager' })
  })
  const count = await page.locator('.cu-shot').count()
  for (let i = 0; i < count; i++) {
    await page.locator('.cu-shot').nth(i).scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {})
    await page.waitForTimeout(100)
  }
  await page.waitForTimeout(600)

  const rows = await page.evaluate(() => {
    const out = []
    document.querySelectorAll('.cu-shot').forEach((fig) => {
      const img = fig.querySelector('img')
      if (!img || !img.naturalWidth) return
      const r = img.getBoundingClientRect()
      if (!r.width || !r.height) return
      out.push({
        file: img.src.split('/').pop().replace(/\.[a-f0-9]{8}\./, '.'),
        sx: r.width / img.naturalWidth,
        sy: r.height / img.naturalHeight,
        natural: `${img.naturalWidth}x${img.naturalHeight}`,
        box: `${Math.round(r.width)}x${Math.round(r.height)}`,
        parallel: !!fig.closest('.cu-step-block__shots'),
        zoomable: !!fig.querySelector('a[href]'),
      })
    })
    return out
  })

  for (const r of rows) {
    scanned++
    const diff = Math.abs(r.sx - r.sy) / Math.max(r.sx, r.sy)
    if (diff > MAX_DISTORT) {
      fails.push(
        `${scene} 页 ${r.file} 被拉变形：原图 ${r.natural} 显示 ${r.box}，` +
          `横向缩放 ${r.sx.toFixed(3)}、纵向缩放 ${r.sy.toFixed(3)}，差 ${(diff * 100).toFixed(1)}%` +
          `${r.parallel ? '（并排组用 object-fit:cover 裁切，但不该形变）' : ''}`
      )
    }
  }
  await page.close()
}

await browser.close()

if (fails.length) {
  console.error(`\n截图几何验收：测了 ${scanned} 张，${fails.length} 张被拉变形`)
  fails.forEach((f) => console.error('  [x] ' + f))
  process.exit(1)
}
console.log(`截图几何验收：测了 ${scanned} 张，全部按原比例显示（无压扁/拉长）`)
