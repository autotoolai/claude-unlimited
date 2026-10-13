/**
 * 教程页对齐审计：量每一段文字「首字实际位置」，断言教程页正文只有一条左边线。
 *
 * 为什么不用元素盒子：盒子顶格 ≠ 文字对齐。全局 `.cu-page h2 + p` 给营销页的居中分节头写了
 * `text-align: center`，引导语正好是 H2 后第一个段落会命中，元素盒子量出来是顶格的，
 * 文字却居中飘在右边（2026-10-12 的 bug 就是这样漏掉两轮）。
 *
 * 覆盖范围：两条轨（.cu-guide-rail）逐节逐子步骤。
 * 排除两类设计内的差异：
 * - .cu-notes 里的段落（提示块自带 1rem 内边距）
 * - ol.cu-steps-block 的 704px 限宽（可读宽度，不是错位）
 *
 * 跑法：先 npm run build && npm run preview，再 node scripts/audit_guide_align.mjs
 * 环境变量 AUDIT_BASE 可覆盖预览地址。
 */
import { chromium } from 'playwright'

const BASE = process.env.AUDIT_BASE || 'http://127.0.0.1:41777'
const fails = []
const ok = (cond, msg) => { if (!cond) fails.push(msg) }

/** 用 Range 取元素内容里第一行文字的实际左边界（空元素返回 null） */
function firstCharLeft(el) {
  const range = document.createRange()
  range.selectNodeContents(el)
  const rects = [...range.getClientRects()].filter((r) => r.width > 0)
  if (!rects.length) return null
  // Range 会返回铺满整行的矩形（ul 的 padding 也算进去）和真正的文字矩形（高度=字高）。
  // 用字高中位数当阈值筛出文字矩形，再取第一行里最靠左的那个，即首个非空字符的位置。
  const hs = rects.map((r) => r.height).sort((a, b) => a - b)
  const med = hs[Math.floor(hs.length / 2)]
  const glyphs = rects.filter((r) => r.height <= med + 1)
  const line = glyphs[0]
  const sameLine = glyphs.filter((r) => Math.abs(r.top - line.top) < 1)
  return Math.round(Math.min(...sameLine.map((r) => r.left)))
}

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto(`${BASE}/guide/`, { waitUntil: 'networkidle' })

const rows = await page.evaluate((fnSrc) => {
  const firstCharLeft = eval(`(${fnSrc})`)
  const out = []
  const measure = (el, ctx) => {
    const cs = getComputedStyle(el)
    const left = firstCharLeft(el)
    if (left === null) return
    out.push({ ...ctx, align: cs.textAlign, left })
  }

  for (const rail of document.querySelectorAll('.cu-guide-rail')) {
    for (const blk of rail.querySelectorAll('.cu-guide-block')) {
      const base = Math.round(blk.getBoundingClientRect().left)
      const sec = blk.querySelector('h2').textContent.trim()
      measure(blk.querySelector('h2'), { sec, role: 'h2', base })

      // 引导语与块内正文段：对齐到 H2 的左边线
      for (const p of blk.querySelectorAll(':scope > p')) {
        measure(p, { sec, role: p.classList.contains('cu-guide-lead') ? 'lead' : 'para', base })
      }
      // 裸列表：对齐到 H2 的左边线（li 的文字含项目符号，实际起点略缩进，不参与断言）
      for (const ul of blk.querySelectorAll(':scope > ul')) {
        out.push({ sec, role: 'ul', alignOnly: true, align: getComputedStyle(ul).textAlign })
      }

      // 步骤块内：正文列（.cu-step-block__body）本身就是左边线。
      // h3 / goal 顶格；action 是无符号列表，文字比正文列缩进一个 padding-left。
      for (const st of blk.querySelectorAll('.cu-step-block')) {
        const title = st.querySelector('h3').textContent.trim()
        const body = Math.round(st.querySelector('.cu-step-block__body').getBoundingClientRect().left)
        const ctx = { sec: `${sec} └ ${title}`, base: body }
        measure(st.querySelector('h3'), { ...ctx, role: 'h3' })
        for (const g of st.querySelectorAll('.cu-step-block__goal')) measure(g, { ...ctx, role: 'goal' })
        const act = st.querySelector('.cu-step-block__action')
        if (act) {
          const pad = parseFloat(getComputedStyle(act.querySelector('li')).paddingLeft) || 0
          const ulBox = act.getBoundingClientRect()
          const liBox = act.querySelector('li').getBoundingClientRect()
          const actBase = Math.round(ulBox.left + (liBox.left - ulBox.left) + pad)
          for (const li of act.querySelectorAll('li')) measure(li, { ...ctx, role: 'action', base: actBase })
        }
      }
    }
  }

  return out
}, firstCharLeft.toString())

const TOL = 1
for (const r of rows) {
  const delta = r.left - r.base
  // start / left 都表示左对齐（:start 是逻辑值，随书写方向解析），只有 center / right 才算错
  ok(r.align === 'left' || r.align === 'start', `${r.sec} / ${r.role}: text-align=${r.align}，应为 left（全局 .cu-page h2 + p 的居中漏进教程页）`)
  // 列表只查 text-align：项目符号让首字天然缩进，偏移量不是错位
  if (!r.alignOnly) ok(Math.abs(delta) <= TOL, `${r.sec} / ${r.role}: 首字在左边线右侧 ${delta}px（容差 ${TOL}px）`)
}

await browser.close()

console.log(`对齐审计：测了 ${rows.length} 处文字`)
if (fails.length) {
  console.error('\n[x] 教程页对齐未通过:')
  for (const f of fails) console.error('    - ' + f)
  process.exit(1)
}
console.log('[x] 教程页对齐通过（引导语、正文段、步骤标题/目标/动作全部左对齐到同一条左边线）')
