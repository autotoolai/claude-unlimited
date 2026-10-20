/**
 * 从 config/knowledge.ts 生成「需要与文章数同步」的两类产物，消除手工遗漏：
 * 1. public/_redirects 的知识库尾斜杠 301（与 check_dist.mjs / verify_build.py 的 PAGES 一一对应）
 * 2. public/_redirects 的退役页 301（来自 config/knowledge.ts 的 retiredKnowledgePages）
 *
 * 用法：node scripts/gen_knowledge_routes.mjs
 * 加新文章后跑一遍即可，不会动到知识库以外的行。
 * llms.txt / llms-full.txt 已改由 scripts/gen_llms.ts 统一生成，本脚本不再碰它们。
 *
 * 解析规则（与 gen_knowledge_og.py、verify_build.py 一致）：条目以「两空格缩进的 { 独占一行」开头，
 * slug 是条目的第一个字段；其余字段（title / desc / summary / date / kicker / minutes）按名字查找，不依赖顺序。
 */
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

// 一律相对脚本目录解析，不看 cwd：从仓库根调这个脚本也不会找错位置
const root = path.resolve(import.meta.dirname, '..')

/** 正式域名只有一个权威源：config/site.ts。换域名不要动这里。 */
function readSiteUrl() {
  const src = readFileSync(path.join(root, 'config', 'site.ts'), 'utf8')
  const m = src.match(/url:\s*'([^']+)'/)
  if (!m) throw new Error('未能从 config/site.ts 读到 siteConfig.url')
  return m[1]
}

const siteUrl = readSiteUrl()
const src = readFileSync(path.join(root, 'config', 'knowledge.ts'), 'utf8')

const articles = []
// 只取 knowledge[] 数组本体，不截到文件尾：后面还有 retiredKnowledgePages 等块，
// 它们也有 slug 字段，截到文件尾会把退役页当成现役文章（它没有 title/desc/date，解析会失败）。
const knowledgeStart = src.indexOf('export const knowledge: KnowledgeMeta[] = [')
const knowledgeEnd = src.indexOf('\n]', knowledgeStart)
const body = src.slice(knowledgeStart, knowledgeEnd)
for (const part of body.split(/^  \{\s*$/m).slice(1)) {
  const sm = part.match(/^\s*slug:\s*'([^']+)'/)
  if (!sm) continue
  const slug = sm[1]
  const pick = (name) => {
    const m = part.match(new RegExp(`^\\s*${name}:\\s*'([^']*)'`, 'm'))
    return m ? m[1] : ''
  }
  const title = pick('title')
  const desc = pick('desc')
  const date = pick('date')
  if (!title || !desc || !date) {
    console.error(`[routes] ${slug} 缺少 title/desc/date；config/knowledge.ts 的条目首字段应为 slug`)
    process.exit(1)
  }
  articles.push({
    slug,
    cat: pick('cat'),
    title,
    desc,
    summary: pick('summary') || desc,
    date,
    kicker: pick('kicker'),
    minutes: Number(pick('minutes') || 5),
  })
}

if (!articles.length) {
  console.error('[routes] 未从 config/knowledge.ts 解析到文章')
  process.exit(1)
}
if (new Set(articles.map((a) => a.slug)).size !== articles.length) {
  console.error('[routes] config/knowledge.ts 里有重复 slug')
  process.exit(1)
}

/* ---------- 退役页（从 knowledge[] 移出、但保留外链与收录的文章） ---------- */
const retiredSrc = readFileSync(path.join(root, 'config', 'knowledge.ts'), 'utf8')
const retiredBlock = retiredSrc.match(
  /export const retiredKnowledgePages:[^=]*=\s*\[([\s\S]*?)\n\]/,
)
if (!retiredBlock) {
  console.error('[routes] 未能从 config/knowledge.ts 解析 retiredKnowledgePages')
  process.exit(1)
}
const retired = [...retiredBlock[1].matchAll(/\{\s*\n\s*slug:\s*'([^']+)',\s*\n\s*to:\s*'([^']+)'/g)].map((m) => ({
  slug: m[1],
  to: m[2],
}))
for (const r of retired) {
  if (articles.some((a) => a.slug === r.slug)) {
    console.error(`[routes] ${r.slug} 同时出现在 knowledge[] 与 retiredKnowledgePages（退役页不该在现役列表里）`)
    process.exit(1)
  }
  const targetSlug = r.to.replace(/^\/knowledge\//, '')
  if (r.to !== '/knowledge' && !articles.some((a) => a.slug === targetSlug)) {
    console.error(`[routes] 退役页 ${r.slug} 指向 ${r.to}，但该文章不在 knowledge[] 里（目标页会是 404）`)
    process.exit(1)
  }
}

/* ---------- _redirects ---------- */
const redirectsPath = path.join(root, 'public', '_redirects')
let redirects = readFileSync(redirectsPath, 'utf8')
// 早期手工维护的「带尾斜杠 -> 无尾斜杠」区块里也写了一组知识库规则，与下面的自动块重复；
// 这里只删掉 /knowledge/ 开头的行（含注释行），其它手写规则（/pricing/ 等）保持不动。
const manualStart = redirects.indexOf('# 带尾斜杠')
const manualEnd = redirects.indexOf('# 旧域名')
if (manualStart >= 0 && manualEnd > manualStart) {
  const kept = redirects.slice(manualStart, manualEnd).split('\n').filter((l) => !/^\/knowledge\//.test(l.trim()))
  redirects = redirects.slice(0, manualStart) + kept.join('\n') + redirects.slice(manualEnd)
}
const knowledgeBlock = [
  '/knowledge/ /knowledge 301',
  ...articles.map((a) => `/knowledge/${a.slug}/ /knowledge/${a.slug} 301`),
].join('\n')
const retiredBlockLines = [
  '',
  '# 退役文章 -> 现在的落点（auto-generated, do not edit）：保外链与已收录权重，读者不会撞 404',
  ...retired.map((r) => `/knowledge/${r.slug} ${r.to} 301`),
]
const start = '# >>> knowledge routes (auto-generated, do not edit)'
const end = '# <<< knowledge routes'
const block = `${start}\n${knowledgeBlock}${retiredBlockLines.join('\n')}\n${end}`
if (redirects.includes(start)) {
  const before = redirects.slice(0, redirects.indexOf(start))
  const after = redirects.slice(redirects.indexOf(end) + end.length)
  redirects = before + block + after
} else {
  redirects = redirects.trimEnd() + '\n\n' + block + '\n'
}
writeFileSync(redirectsPath, redirects, 'utf8')
console.log(
  `[routes] _redirects 已更新 ${articles.length + 1} 条知识库尾斜杠规则${retired.length ? ` + ${retired.length} 条退役页 301（${retired.map((r) => r.slug).join('、')}）` : ''}`,
)

/* ---------- llms.txt ---------- */
// 2026-10-13 起 llms.txt 改由 scripts/gen_llms.ts 从 config/ 全量生成（页面清单 + 事实要点 + 文章清单）。
// 本脚本只管 _redirects；知识库文章清单的同步也交给 gen_llms，避免两处写 llms.txt。
console.log('[routes] llms.txt 由 gen_llms 维护，本脚本不再写')
