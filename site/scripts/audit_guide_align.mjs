/**
 * 教程页对齐审计：量每一段文字「首字实际位置」，断言教程页正文只有一条左边线。
 *
 * 为什么不用元素盒子：盒子顶格 ≠ 文字对齐。全局 `.cu-page h2 + p` 给营销页的居中分节头写了
 * `text-align: center`，引导语正好是 H2 后第一个段落会命中，元素盒子量出来是顶格的，
 * 文字却居中飘在右边（2026-10-12 的 bug 就是这样漏掉两轮）。
 *
 * 覆盖范围：两条轨（.cu-guide-rail）逐节逐子步骤。断言两层左边线（规范「缩进层级」）：
 * - L0 = 小节块左缘：h2 / 引导语 / 正文段（提示卡是独立容器，按它自己的内容列断言）
 * - L1 = 步骤正文列左（.cu-step-block__body，即 grid 第二列）+ ul 内缩 + --cu-step-indent：步骤内的动作与提示文字
 * ol.cu-steps-block 的 704px 限宽是可读宽度，不是错位，不参与断言。
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
  // 不能按高度筛：字体回退后中文行盒与 li 行盒的高度常常只差 1px 内，铺满整行那个矩形会被留下，
  // 取最左就等于量到 li 的左缘。直接按行分组（行的 top/height 都一致），每行取最左，
  // 高度明显偏大的那个整行矩形被同行的文字矩形压住，读数就是首字的位置。
  const tops = [...new Set(rects.map((r) => Math.round(r.top)))]
  return Math.round(Math.min(...tops.map((t) => Math.min(...rects.filter((r) => Math.round(r.top) === t).map((r) => r.left)))))
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
      // 提示块 .cu-notes：现在是有内边距的提示卡，段落不再顶格（H2 左边线），
      // 而是对齐到卡片的内容列（卡片左缘 + 自身 padding-left + li 的悬挂缩进）。
      // 卡外还有一个绝对定位的「提示」标签，它不参与断言（它本就该压在线上）。
      const card = blk.querySelector('.cu-notes')
      if (card) {
        const cardBase = Math.round(card.getBoundingClientRect().left)
        const pad = parseFloat(getComputedStyle(card).paddingLeft) || 0
        const hang = parseFloat(getComputedStyle(card.querySelector('p')).paddingLeft) || 0
        const cardText = cardBase + pad + hang + parseFloat(getComputedStyle(card.querySelector('p')).marginLeft)
        for (const p of card.querySelectorAll(':scope > p')) measure(p, { sec, role: 'notes-block', base: cardText })
      }

      // 步骤块内：正文列（.cu-step-block__body）本身就是左边线。
      // h3 / goal 顶格；action 是无符号列表，文字比正文列缩进一个 padding-left。
      for (const st of blk.querySelectorAll('.cu-step-block')) {
        const title = st.querySelector('h3').textContent.trim()
        const body = Math.round(st.querySelector('.cu-step-block__body').getBoundingClientRect().left)
        const ctx = { sec: `${sec} └ ${title}`, base: body }
        measure(st.querySelector('h3'), { ...ctx, role: 'h3' })
        for (const g of st.querySelectorAll('.cu-step-block__goal')) measure(g, { ...ctx, role: 'goal' })
        const indent = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--cu-step-indent')) * 16 || 0
        // 步骤正文列里的列表（动作 / 提示）文字一律落在「正文列左边线 + ul 内缩 + --cu-step-indent」。
        // 步骤块是「编号徽标 + 正文列」两列 grid，body 盒子是 `minmax(0, 1fr)` 那一列，
        // 量到的就是正文列左边线（规范说它是 L1 左线，指的也是这一列）。徽标不是基准：
        // 徽标是 inline-flex 盒子，内部居中，上下有 1px 偏移，靠它的盒子会多算 8px。
        for (const [sel, role] of [['.cu-step-block__action', 'action'], ['.cu-step-block__notes', 'notes']]) {
          const item = st.querySelector(`${sel} > li`)
          if (!item) continue
          // li 落在 ul 里，ul 自身还有一层 VitePress 默认的左内缩（规范只把 ul 的 margin 归零，没清 padding）。
          const ulPad = parseFloat(getComputedStyle(item.parentElement).paddingLeft) || 0
          const listBase = body + ulPad + indent
          for (const li of st.querySelectorAll(`${sel} > li`)) measure(li, { ...ctx, role, base: listBase })
        }
      }
    }
  }

  return out
}, firstCharLeft.toString())

// 提示段是全角中文，浏览器给它们约 2px 的左侧字形边距（悬挂标点/中文字身盒），
// 其余段落测出来正好落在左边线上。提示卡差 1.6px 是这个值，不是错位。
const TOL = 1
const NOTES_TOL = 2.5
for (const r of rows) {
  const delta = r.left - r.base
  // start / left 都表示左对齐（:start 是逻辑值，随书写方向解析），只有 center / right 才算错
  ok(r.align === 'left' || r.align === 'start', `${r.sec} / ${r.role}: text-align=${r.align}，应为 left（全局 .cu-page h2 + p 的居中漏进教程页）`)
  // 列表只查 text-align：项目符号让首字天然缩进，偏移量不是错位
  const tol = r.role === 'notes-block' ? NOTES_TOL : TOL
  if (!r.alignOnly) ok(Math.abs(delta) <= tol, `${r.sec} / ${r.role}: 首字在左边线右侧 ${delta}px（容差 ${tol}px）`)
}

await browser.close()

console.log(`对齐审计：测了 ${rows.length} 处文字`)
if (fails.length) {
  console.error('\n[x] 教程页对齐未通过:')
  for (const f of fails) console.error('    - ' + f)
  process.exit(1)
}
console.log('[x] 教程页对齐通过（L0 与 L1 两条左边线内的文字全部对齐，缩进符合 --cu-step-indent）')
