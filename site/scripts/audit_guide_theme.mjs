/**
 * 教程页深浅两套模式验收：截图框、步骤正文列、提示块在两种模式下都不塌。
 *
 * 为什么要单独一个脚本（2026-10-20）：
 * 深色模式在这站是**两条路径**生效的——`html.dark` 类（用户手动切换时加）与
 * `prefers-color-scheme` 媒体查询（跟随系统时生效，见 00_base.css 的
 * `@media (prefers-color-scheme: dark)` 块）。所以只断言 `html` 上有没有 `dark` 类
 * 会漏判「系统深色但没手动切过」的情况，得看 token 的计算值。
 *
 * 它查出来过一个真缺陷：--cu-figure-frame 在 token 化迁移时从 00_base.css 漏掉了
 * （archive/custom.css 里有原始值），而 shell_extra.css 仍写着
 * `border: 1px solid var(--cu-figure-frame)` —— 变量缺失让整条声明失效，
 * 于是**浅色和深色下截图都没有边框**。构建、check:css、typecheck 全都查不出来。
 * 现在 CSS 门禁会拦「引用了但没定义也没兜底的变量」，这个脚本守的是另一半：
 * 变量在、但深浅两套下解析出来的框线颜色/尺寸不对。
 *
 * 跑法：先 npm run build && npm run preview，再 node scripts/audit_guide_theme.mjs
 * 环境变量 AUDIT_BASE 可覆盖预览地址。
 */
import { chromium } from 'playwright'

const BASE = process.env.AUDIT_BASE || 'http://127.0.0.1:41777'
const SCENES = ['cc', 'desktop', 'codex', 'workbuddy', 'cursor']
const fails = []
const ok = (cond, msg) => { if (!cond) fails.push(msg) }

/** rgba 字符串归一化成 [r,g,b,a] 数值：token 写 `.2`、计算值给 `0.2`，字符串比会误报 */
function rgbaParts(v) {
  const m = (v || '').match(/rgba?\(([^)]+)\)/)
  if (!m) return null
  const parts = m[1].split(/[,\s]+/).filter(Boolean).map(Number)
  return parts.length >= 4 ? parts : null
}
function sameColor(a, b) {
  const x = rgbaParts(a)
  const y = rgbaParts(b)
  if (!x || !y) return false
  return x.every((v, i) => Math.abs(v - y[i]) < 0.01)
}

const browser = await chromium.launch()
const rows = []

for (const scheme of ['dark', 'light']) {
  for (const scene of SCENES) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: scheme })
    await page.goto(`${BASE}/guide/${scene}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(400)
    const r = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement)
      const img = document.querySelector('.cu-shot img')
      const cs = img ? getComputedStyle(img) : null
      const step = document.querySelector('.cu-step-block__body')
      const note = document.querySelector('.cu-notes')
      return {
        bg: root.getPropertyValue('--cu-bg').trim(),
        frame: root.getPropertyValue('--cu-figure-frame').trim(),
        borderW: cs ? cs.borderTopWidth : '',
        borderC: cs ? cs.borderTopColor : '',
        imgW: img ? Math.round(img.getBoundingClientRect().width) : 0,
        imgH: img ? Math.round(img.getBoundingClientRect().height) : 0,
        stepW: step ? Math.round(step.getBoundingClientRect().width) : 0,
        noteW: note ? Math.round(note.getBoundingClientRect().width) : 0,
        noteH: note ? Math.round(note.getBoundingClientRect().height) : 0,
        rail: !!document.querySelector('.cu-guide-rail'),
      }
    })
    await page.close()
    rows.push({ scheme, scene, ...r })

    const tag = `${scheme}/${scene}`
    ok(r.rail, `${tag}: 没有渲染 .cu-guide-rail`)
    // 框线：变量要解析出来，且真的画在了图上
    ok(r.frame !== '', `${tag}: --cu-figure-frame 没解析出来（空值），截图框会整条失效`)
    ok(r.borderW === '1px', `${tag}: 截图框边框宽 ${r.borderW}，应为 1px`)
    ok(r.borderC !== 'rgba(0, 0, 0, 0)' && r.borderC !== 'transparent', `${tag}: 截图框边框色是 ${r.borderC}，看不见`)
    ok(sameColor(r.borderC, r.frame), `${tag}: 截图框颜色 ${r.borderC} 与 --cu-figure-frame（${r.frame}）不一致`)
    // 尺寸：不能塌，也不能铺满整列
    ok(r.imgW > 200 && r.imgW < 700, `${tag}: 截图宽 ${r.imgW}px，塌了或铺太满`)
    ok(r.imgH > 80, `${tag}: 截图高 ${r.imgH}px，塌了`)
    ok(r.stepW > 200, `${tag}: 步骤正文列宽 ${r.stepW}px，塌了`)
    ok(r.noteW > 200 && r.noteH > 30, `${tag}: 提示块 ${r.noteW}x${r.noteH}，塌了`)
  }
}

await browser.close()

// 深浅两套必须真的切过去（只查 html.dark 类会漏判「跟随系统」那条路径）
for (const scene of SCENES) {
  const d = rows.find((r) => r.scheme === 'dark' && r.scene === scene)
  const l = rows.find((r) => r.scheme === 'light' && r.scene === scene)
  ok(d.bg !== l.bg, `${scene}: 深浅两套的 --cu-bg 相同（都是 ${d.bg}），模式没切过去`)
  ok(d.frame !== l.frame, `${scene}: 深浅两套的 --cu-figure-frame 相同（都是 ${d.frame}），框线没跟着换色`)
}

console.log(`主题验收：测了 ${rows.length} 处（5 个场景页 × 深浅两套）`)
if (fails.length) {
  console.error('\n[x] 教程页深浅模式验收未通过:')
  for (const f of fails) console.error('    - ' + f)
  process.exit(1)
}
console.log('[x] 教程页深浅模式验收通过（截图框有边且随模式换色，步骤列与提示块不塌）')
