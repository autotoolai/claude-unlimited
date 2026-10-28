/**
 * 教程页「单页内」质量门禁：跨页共享块不算重复，单页内的重复才算。
 *
 * 背景（docs/guide_design_spec.md）：
 * 跨页共享块是设计要求（公共内容只写一份），所以这里不比跨页重合度。
 * 真正要拦的是同一页里同一件事被说了 3 遍——那是读者难受的来源。
 *
 * 断言清单（阈值按实测定的，改文案前先看 temp/guide_audit/ 的测量）：
 *   1. 步骤 title ⊂ action  ≤ 25%   title 是动作名，action 是怎么做，重合说明重复了一遍
 *   2. 步骤 goal ⊂ action   ≤ 25%   goal 讲为什么，action 讲怎么做
 *   3. 步骤 goal ∩ action   ≤ 30%   （Jaccard）
 *   4. block 的 lead 与首个 step 的 goal ≤ 25%   lead 是结论，goal 是理由
 *   5. 同页 related ∩ next = ∅     页尾两块不能是同一批链接
 *   6. 每个步骤显式声明 shot        漏写与「确认不放图」要分得开
 *   7. 共享块正文不出现只对部分页面成立的名词
 *   8. 单页正文字数 ≤ 3200
 *
 * 用法：node scripts/check_guide_within.mjs
 */
import { register, tsImport } from 'tsx/esm/api'

// config/guide.ts 是 TS，要用 tsx 的 loader 导入；register() 必须在 import 之前生效，
// 所以这里用动态 import 而不是静态 import。
register()
const { guidePages, guideBlocks, sharedBlocks } = await import('../config/guide.ts')

/** 去掉标签与标点，只留可比较的字 */
const norm = (s) =>
  (s || '')
    .replace(/<[^>]+>/g, '')
    .replace(/[，。、；：！？「」（）()\s·—→\-—,.:!?"'"]/g, '')

/** 3-gram 集合 */
const grams = (s, n = 3) => {
  const t = norm(s)
  const out = new Set()
  for (let i = 0; i + n <= t.length; i++) out.add(t.slice(i, i + n))
  return out
}

/** A 的 3-gram 有多少落在 B 里（包含率） */
const contain = (a, b) => {
  if (!a.size) return 0
  let n = 0
  for (const g of a) if (b.has(g)) n++
  return n / a.size
}

/** Jaccard 相似度 */
const jaccard = (a, b) => {
  if (!a.size && !b.size) return 0
  let n = 0
  for (const g of a) if (b.has(g)) n++
  return n / (a.size + b.size - n)
}

const fails = []
const fail = (msg) => fails.push(msg)

/** 步骤的四槽位文字（并排判定用：title/goal/action/notes 都在左列） */
const stepText = (s) => [s.title, s.goal ?? '', ...(s.action ?? []), ...(s.notes ?? [])].join('')

/* ---- 1–4：槽位之间的重复 ---- */
for (const page of guidePages) {
  for (const block of guideBlocks(page)) {
    const steps = block.steps ?? []
    for (const s of steps) {
      const t = grams(s.title)
      const g = grams(s.goal)
      const a = grams((s.action ?? []).join(''))
      const tg = contain(t, g)
      const ta = contain(t, a)
      const ga = contain(g, a)
      const jc = jaccard(g, a)
      const where = `${page.slug} ${block.id}「${s.title}」`
      if (tg > 0.25) fail(`${where}：标题与目标句重合 ${(tg * 100).toFixed(0)}%（应 ≤25%）`)
      if (ta > 0.25) fail(`${where}：标题与动作重合 ${(ta * 100).toFixed(0)}%（应 ≤25%）`)
      if (ga > 0.25) fail(`${where}：目标句与动作重合 ${(ga * 100).toFixed(0)}%（应 ≤25%）`)
      if (jc > 0.3) fail(`${where}：目标句与动作 Jaccard ${(jc * 100).toFixed(0)}%（应 ≤30%）`)
    }
    // lead 与首个 step 的 goal
    if (block.lead && steps[0]?.goal) {
      const c = contain(grams(steps[0].goal), grams(block.lead))
      if (c > 0.25) fail(`${page.slug} ${block.id}：小节首段与首个步骤的目标句重合 ${(c * 100).toFixed(0)}%（应 ≤25%）`)
    }
  }
}

/* ---- 5：页尾两块不重复 ---- */
for (const page of guidePages) {
  const related = new Set(page.related.map((r) => r.url))
  if (related.has(page.next.url)) fail(`${page.slug}：「接着看」与「相关阅读」是同一条链接`)
}

/* ---- 6：每个步骤显式声明 shot ----
   查的是原始数据而不是装配后的步骤：装配层会把 shot:false 一并剥掉（不渲染图），
   剥掉之后就看不出「这一步确认不放图」和「这一步漏写了」。 */
for (const page of guidePages) {
  for (const block of page.blocks) {
    const body = block.shared ? sharedBlocks[block.shared] : block
    for (const s of body.steps ?? []) {
      if (s.shot === undefined) fail(`${page.slug} ${block.id}「${s.title}」：没有显式声明 shot（不放图请写 shot: false）`)
    }
  }
}

/* ---- 7：共享块正文不出现只对部分页面成立的名词 ----
   install-ccswitch 共享块本身就是「装 CC Switch」，6 个场景页全都用它，
   CC Switch 对它是全局词，不算局部名词。其余共享块（get-key）用到的客户端名
   只对部分场景成立（WorkBuddy / Cursor 的读者不装 CC Switch），要拦。
   允许名单按共享块逐个列：共享块是什么就说什么，不做全局词表。 */
const sharedAllowedWords = { 'install-ccswitch': ['CC Switch'], 'get-key': [] }
const clientWords = ['CC Switch', 'VS Code', 'Cursor', 'Codex', 'WorkBuddy', '桌面版', '终端']
for (const [key, body] of Object.entries(sharedBlocks)) {
  const allowed = sharedAllowedWords[key] ?? []
  const text = [body.lead ?? '', ...(body.notes ?? []), ...(body.steps ?? []).flatMap((s) => [s.title, s.goal ?? '', ...(s.action ?? []), ...(s.notes ?? [])])].join(' ')
  for (const word of clientWords) {
    if (allowed.includes(word)) continue
    if (text.includes(word)) fail(`共享块 ${key}：正文出现只对部分场景成立的名词「${word}」（共享块是 6 页共用的）`)
  }
}

/* ---- 8：单页正文字数 ---- */
for (const page of guidePages) {
  let chars = 0
  for (const block of guideBlocks(page)) {
    chars += norm(block.lead).length + norm(block.answer).length
    for (const p of block.paras ?? []) chars += norm(p).length
    for (const s of block.steps ?? []) chars += norm(stepText(s)).length
    for (const n of block.notes ?? []) chars += norm(n).length
  }
  if (chars > 3200) fail(`${page.slug}：正文 ${chars} 字（应 ≤3200）`)
}

if (fails.length) {
  console.error(`\n[x] 教程页单页内质量门禁未通过（${fails.length} 处）:`)
  for (const f of fails) console.error('    - ' + f)
  process.exit(1)
}
console.log('[x] 教程页单页内质量门禁通过（槽位不重复、页尾不重、shot 显式、共享块无局部名词、字数达标）')
