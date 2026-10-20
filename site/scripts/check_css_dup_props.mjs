/**
 * CSS 源码→产物一致性检查。
 *
 * 为什么要做（2026-10-13 真实故障）：
 * 教程页动作列表 `ul.cu-step-block__action` 在浏览器里拿到 20px 的 padding-left，
 * 源码里明明写了 `padding: 0; padding-left: 0`（压过全局 `.cu-page ul, ol` 的 (0,1,1)），
 * dist 产物里那条规则也确实是对的。于是排查了三轮：CSSOM、CDP 匹配规则、构建产物文本，
 * 全都对，唯独「实际渲染」是错的。
 *
 * 根因：产物里同一段声明出现了两次（CDP 显示 `padding-left:1.25rem` 出现两次）。
 * esbuild 把 `padding: 0` 展开成长写法 `padding-top:0px; padding-right:0px; ...` 后，
 * 再写 `padding-left: 0` 就成了 `padding:0; ...padding-left:0px; ...; padding-left:0px;`
 * 这样的重复属性；浏览器对重复属性用「最后一个生效」，本该压过 (0,1,1) 的 `.cu-page ul`，
 * 但 Playwright / Chromium 在样式表里带 `<link rel="preload stylesheet">` 副本时走了另一条
 * 解析路径（CDP 报告里同一元素匹配了四条规则，`.cu-page ul` 排在 `.cu-step-block__action` 之后），
 * 结果低优先级的 1.25rem 赢了。
 *
 * 检查规则：对 theme/styles/*.css 与 theme/shell_extra.css 做一个保守的 CSS 解析，
 * 同一个选择器块内出现重复属性即报错；同时扫 `padding: 0` 简写后面跟 `padding-left: 0` 的写法
 * （简写会被展开成长写法再被覆盖，产生重复属性）。
 *
 * 跑法：node scripts/check_css_dup_props.mjs
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const themeDir = join(dirname(fileURLToPath(import.meta.url)), '..', '.vitepress', 'theme')
const files = [
  ...readdirSync(join(themeDir, 'styles')).filter((f) => f.endsWith('.css')).map((f) => join(themeDir, 'styles', f)),
  join(themeDir, 'shell_extra.css'),
]

/** 变量定义的扫描范围要比「重复属性」那圈大：变量可以在任意一个样式文件里定义 */
function allCssFiles() {
  const out = []
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name)
      if (e.isDirectory()) walk(p)
      else if (e.name.endsWith('.css')) out.push(p)
    }
  }
  walk(join(themeDir, 'styles'))
  out.push(join(themeDir, 'shell_extra.css'))
  return out
}

/** 去掉注释 */
function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '')
}

/**
 * 解析出「选择器 -> 声明列表」的序列。
 * 只处理本项目用到的语法：@media / @supports 只做一层嵌套记录，不下钻（里面的规则照样扫）。
 */
function parse(css) {
  const rules = []
  let i = 0
  while (i < css.length) {
    const brace = css.indexOf('{', i)
    if (brace === -1) break
    const prelude = css.slice(i, brace).trim()
    // 找到配对的右括号（跳过字符串里的括号，够用了）
    let depth = 1
    let j = brace + 1
    while (j < css.length && depth > 0) {
      if (css[j] === '{') depth++
      else if (css[j] === '}') depth--
      j++
    }
    const body = css.slice(brace + 1, j - 1)
    // @ 开头一律跳过整块，但必须先把游标推到块尾 i = j。
    // 少了这一句，游标停在 '{' 处，下一轮把「@media (...) {」的前导当成选择器、拿配对括号当块体，
    // 再从块内继续找，解析器不前进也不退出，整个脚本挂住（2026-10-13 踩过）。
    // 关键帧里同一属性按 0%/50%/100% 重复是正常的；@media / @supports 里的规则都在顶层，同样会被扫到。
    if (prelude.startsWith('@')) { i = j; continue }
    rules.push({ selector: prelude.replace(/\s+/g, ' '), body, at: j })
    i = j
  }
  return rules
}

/** 展开简写：padding: 0 -> padding-top/right/bottom/left；只处理单值与两值形式 */
const SIDES = ['top', 'right', 'bottom', 'left']
function expandShorthand(prop, value) {
  if (!/^(padding|margin)$/.test(prop)) return []
  const v = value.trim().split(/\s+/)
  if (v.length === 1) return SIDES.map((s) => [`${prop}-${s}`, v[0]])
  if (v.length === 2) return [[`${prop}-top`, v[0]], [`${prop}-right`, v[1]], [`${prop}-bottom`, v[0]], [`${prop}-left`, v[1]]]
  if (v.length === 3) return [[`${prop}-top`, v[0]], [`${prop}-right`, v[1]], [`${prop}-bottom`, v[2]], [`${prop}-left`, v[1]]]
  if (v.length === 4) return SIDES.map((s, k) => [`${prop}-${s}`, v[k]])
  return []
}

const fails = []
let checked = 0

for (const file of files) {
  const css = stripComments(readFileSync(file, 'utf8'))
  for (const rule of parse(css)) {
    checked++
    // 1. 同一块内同一个属性的重复声明
    const seen = new Map()
    const decls = rule.body.split(';').map((d) => d.trim()).filter(Boolean)
    for (const d of decls) {
      const idx = d.indexOf(':')
      if (idx === -1) continue
      const prop = d.slice(0, idx).trim()
      const value = d.slice(idx + 1).trim()
      for (const [p, v] of [[prop, value], ...expandShorthand(prop, value)]) {
        if (seen.has(p)) fails.push(`${file.slice(themeDir.length + 1)} :: ${rule.selector.slice(0, 80)}\n      ${p} 出现两次：${seen.get(p)} → ${v}`)
        seen.set(p, v)
      }
    }
    // 2. 「简写归零 + 再写某个边」这种写法，长写法会被后面的重复属性搞乱
    const hasZeroShorthand = /(?:^|[;{\s])padding:\s*(?:0|0px)\s*(?:;|$)/m.test(rule.body)
    const hasSide = /padding-(left|right|top|bottom):/.test(rule.body)
    if (hasZeroShorthand && hasSide) {
      fails.push(`${file.slice(themeDir.length + 1)} :: ${rule.selector.slice(0, 80)}\n      「padding: 0」与「padding-<边>:」同块出现，esbuild 展开后产生重复属性；只写 padding-left: 0`)
    }
  }
}


// 3. 引用了但既没定义、也没有兜底的 CSS 变量。
//    真实故障（2026-10-20）：--cu-figure-frame 在 token 化迁移时从 00_base.css 漏掉了
//    （archive/custom.css 里有原始值），而 shell_extra.css 仍写着
//    `border: 1px solid var(--cu-figure-frame)` —— 变量缺失会让整条声明失效，
//    于是截图框在浅色与深色下都没有边框，而构建、check:css、typecheck 全都察觉不到。
//    `var(--x, 兜底)` 不算问题：变量缺失时用兜底值，行为是确定的。
//    只查 --cu- 前缀：--vp-* 由 VitePress 自己定义，不归本项目管。
{
  const cssFiles = allCssFiles()
  const defined = new Set()
  for (const file of cssFiles) {
    const css = stripComments(readFileSync(file, 'utf8'))
    for (const m of css.matchAll(/(--cu-[a-z0-9-]+)\s*:/g)) defined.add(m[1])
  }
  for (const file of cssFiles) {
    const css = stripComments(readFileSync(file, 'utf8'))
    for (const m of css.matchAll(/var\(/g)) {
      // 取出这一处 var() 的参数表：按顶层逗号切分（括号内的逗号不算）
      const start = m.index + m[0].length
      let depth = 1
      let i = start
      while (i < css.length && depth > 0) {
        if (css[i] === '(') depth++
        else if (css[i] === ')') depth--
        i++
      }
      const inner = css.slice(start, i - 1)
      const args = []
      let d = 0
      let last = 0
      for (let k = 0; k < inner.length; k++) {
        const ch = inner[k]
        if (ch === '(') d++
        else if (ch === ')') d--
        else if (ch === ',' && d === 0) { args.push(inner.slice(last, k)); last = k + 1 }
      }
      args.push(inner.slice(last))
      const line = css.slice(0, m.index).split('\n').length
      const where = `${file.slice(themeDir.length + 1)} 第 ${line} 行`
      // 第一个参数是变量名：后面带逗号说明写了兜底，变量缺失也是确定的
      const nm = (args[0] || '').trim().match(/^(--cu-[a-z0-9-]+)$/)
      if (nm && !defined.has(nm[1]) && args.length === 1) {
        fails.push(
          `${where} :: ${nm[1]} 引用了但没有任何地方定义它，也未写兜底（var(${nm[1]}, 兜底)）\n      变量缺失会让整条声明失效：这条属性静默不生效，构建与其它门禁都查不出来`,
        )
      }
      // 兜底里再嵌 var() 的，那些变量必须自己被定义（或自己带兜底）
      for (let k = 1; k < args.length; k++) {
        for (const nested of args[k].matchAll(/var\((--cu-[a-z0-9-]+)([^)]*)\)/g)) {
          if (defined.has(nested[1])) continue
          if (nested[2].includes(',')) continue
          fails.push(
            `${where} :: ${nested[1]} 出现在兜底值里但没有定义（兜底值里的变量缺失同样会让声明失效）`,
          )
        }
      }
    }
  }
}

console.log(`CSS 重复属性检查：扫了 ${files.length} 个文件 / ${checked} 条规则`)
if (fails.length) {
  console.error('\n[x] 发现重复属性或未定义变量（浏览器按最后一个生效；变量缺失则整条声明静默失效）：')
  for (const f of fails) console.error('    - ' + f)
  process.exit(1)
}
console.log('[x] CSS 重复属性检查通过（无「简写 + 单侧」混写，无同块重复声明，无未定义且无兜底的变量）')