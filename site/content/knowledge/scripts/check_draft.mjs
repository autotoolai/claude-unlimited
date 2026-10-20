/**
 * 草稿体检：在文章进知识库之前，把「发布后会卡住构建」的问题全部提前暴露。
 *
 * 为什么独立于 check_dist.mjs：check_dist 跑在 build 之后、只认 dist，且现有失败项有既有基线。
 * 草稿还没进 docs/，dist 里根本看不到它，所以要单独一个只读文件的门禁。
 * 新断言一律加在这里，不混进 check_dist——混进去就分不清哪条是本次引入的。
 *
 * 为什么断言与线上脚本对齐（而不是自己定一套）：
 *   - 「一句话答案」引用块：scripts/gen_llms.ts 的 answerOf() 从它抽 llms-full.txt 的答案段
 *   - H2 ≥ 3：scripts/check_knowledge_toc.mjs 断言目录项 ≥ 3
 *   - 禁写「## 常见问题」「## 相关阅读」：KnowledgeDoc.vue / KnowledgeFooter.vue 独占这两块
 *   - title ≤ 32 / description ≤ 110：scripts/check_seo_meta.py 的 TITLE_MAX / DESC_MAX
 *
 * 用法：
 *   node content/knowledge/scripts/check_draft.mjs                    # 扫 drafts/ 下全部文章 md
 *   node content/knowledge/scripts/check_draft.mjs --slug=my-article  # 只查一篇
 *   npm run check:draft -- --slug=my-article
 */
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { register, tsImport } from 'tsx/esm/api'

// 脚本在 content/knowledge/scripts/ 下，root 要上溯三层到 site/
const root = path.resolve(import.meta.dirname, '..', '..', '..')
const DRAFTS = path.join(root, 'content', 'knowledge', 'drafts')
const PUBLISHED = path.join(root, 'docs', 'knowledge')

/** 与 scripts/check_seo_meta.py 保持一致 */
const TITLE_MAX = 32
const DESC_MAX = 110
/** 与 scripts/check_knowledge_toc.mjs 一致：目录项至少 3 个 */
const MIN_H2 = 3

const unregisterTsx = register()
const knowledgeMod = await tsImport(pathToFileURL(path.join(root, 'config', 'knowledge.ts')).href, { parentURL: import.meta.url })
unregisterTsx()

const publishedSlugs = new Set(knowledgeMod.knowledge.map((k) => k.slug))
// docs/knowledge/ 下的 md：_draft-<slug>.md 是 open_draft 的预览副本，不算「已发布」；
// index.md 是列表页、SOP-* 是内部文档，都不是文章。
const publishedFiles = fs.existsSync(PUBLISHED)
  ? new Set(
      fs
        .readdirSync(PUBLISHED)
        .filter((f) => f.endsWith('.md') && !f.startsWith('_draft-') && f !== 'index.md' && !f.startsWith('SOP-'))
        .map((f) => f.replace(/\.md$/, '')),
    )
  : new Set()

/** 拆 frontmatter：只取顶层标量字段，够用且不引 yaml 依赖 */
function parseFrontmatter(md) {
  const m = md.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!m) return null
  const out = {}
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([a-zA-Z_][\w-]*):\s*(.*)$/)
    if (!kv) continue
    const v = kv[2].trim().replace(/^['"]|['"]$/g, '')
    out[kv[1]] = v
  }
  return out
}

const slugArg = process.argv.find((a) => a.startsWith('--slug='))?.slice(7)
if (slugArg && !/^[a-z0-9-]+$/.test(slugArg)) {
  console.error(`[draft] slug 只能是小写字母、数字与短横线：${slugArg}`)
  process.exit(1)
}

let files = []
if (!fs.existsSync(DRAFTS)) {
  console.log(`[draft] 草稿目录不存在：${path.relative(root, DRAFTS)}`)
  process.exit(0)
}
if (slugArg) {
  const p = path.join(DRAFTS, `${slugArg}.md`)
  if (!fs.existsSync(p)) {
    console.error(`[draft] 找不到草稿：${path.relative(root, p)}`)
    process.exit(1)
  }
  files = [{ slug: slugArg, file: p }]
} else {
  files = fs
    .readdirSync(DRAFTS)
    .filter((f) => f.endsWith('.md') && f !== 'README.md')
    .map((f) => ({ slug: f.replace(/\.md$/, ''), file: path.join(DRAFTS, f) }))
}

if (!files.length) {
  console.log('[draft] 草稿目录里没有文章')
  process.exit(0)
}

let fails = 0
let warns = 0

for (const { slug, file } of files) {
  const md = fs.readFileSync(file, 'utf8')
  const fm = parseFrontmatter(md)
  const body = fm ? md.slice(md.indexOf('---', 3) + 4) : md
  const errs = []
  const wrns = []

  if (!fm) errs.push('没有 frontmatter')
  else {
    if (fm.layout !== 'page') errs.push(`frontmatter layout 应为 page（实际 ${fm.layout ?? '缺失'}）`)
    if (fm.knowledge !== 'true') errs.push('frontmatter 缺 knowledge: true（KnowledgeDoc.vue 靠它选渲染分支）')
    if (!fm.title) errs.push('frontmatter 缺 title')
    else if (fm.title.length > TITLE_MAX) errs.push(`title ${fm.title.length} 字，超出 ${TITLE_MAX}`)
    if (!fm.description) errs.push('frontmatter 缺 description')
    else if (fm.description.length > DESC_MAX) errs.push(`description ${fm.description.length} 字，超出 ${DESC_MAX}`)
    if (!fm.category) errs.push('frontmatter 缺 category（start / how / cost / troubleshoot）')
    else if (!knowledgeMod.knowledgeCategories.some((c) => c.cat === fm.category))
      errs.push(`category ${fm.category} 不在 config/knowledge.ts 的分类里`)
    if (!fm.kicker) errs.push('frontmatter 缺 kicker')
  }

  // 一句话答案：gen_llms.ts 的 answerOf() 用同一个正则
  if (!/^>\s*\*\*一句话答案\*\*：(.+)$/m.test(body)) {
    errs.push('H1 后缺「> **一句话答案**：…」引用块（llms-full.txt 从这里抽答案段）')
  }

  const h2 = [...body.matchAll(/^##\s+(.+)$/gm)].map((m) => m[1].trim())
  const realH2 = h2.filter((t) => !/^(常见问题|相关阅读)$/.test(t))
  if (realH2.length < MIN_H2) errs.push(`H2 只有 ${realH2.length} 个，至少 ${MIN_H2} 个（check:toc 断言目录项 ≥ ${MIN_H2}）`)

  if (/^## 常见问题\s*$/m.test(body)) errs.push('正文写了「## 常见问题」，应只写在 config/knowledge.ts 的 faq[]')
  if (/^## 相关阅读\s*$/m.test(body)) errs.push('正文写了「## 相关阅读」，应只写在 config/knowledge.ts 的 related[]')
  if (/aiprimetech/i.test(body)) errs.push('正文出现素材站域名 aiprimetech')

  // slug 冲突：已发布文章存在同名文件，或 config 里已有条目（config 有条目但 md 还在草稿区是允许的）
  const previewCopy = path.join(PUBLISHED, `_draft-${slug}.md`)
  if (fs.existsSync(previewCopy)) {
    if (fs.readFileSync(previewCopy, 'utf8') !== md) {
      errs.push('docs/knowledge/_draft-' + slug + '.md 与草稿内容不一致——重跑 open_draft.mjs 刷新，或 --close 关掉')
    } else {
      wrns.push('正在 41800 预览：_draft-' + slug + '.md 与草稿一致。预览期间 build 会在 check_dist 失败，属预期')
    }
  }
  if (publishedFiles.has(slug)) {
    errs.push('docs/knowledge/' + slug + '.md 已发布——这篇 slug 与线上冲突，先决定是改 slug 还是撤下线上那篇')
  }
  const meta = knowledgeMod.knowledge.find((k) => k.slug === slug)
  if (!meta) errs.push('config/knowledge.ts 里没有该 slug 的条目（FAQ 与 related 是发布必需，发布前先补上）')
  else {
    const faqN = meta.faq?.length ?? 0
    if (faqN < 3 || faqN > 5) errs.push(`faq ${faqN} 条，必须 3–5 条`)
    const rel = meta.related ?? []
    if (rel.length !== 3) errs.push(`related ${rel.length} 篇，必须 3 篇`)
    for (const r of rel) if (!publishedFiles.has(r)) wrns.push(`related「${r}」还没发布，发布后该链接会 404`)
    for (const r of rel) if (r === slug) errs.push('related 指向自己')
  }

  // 封面：草稿期可以没有，只是提醒
  if (!fs.existsSync(path.join(root, 'public', 'knowledge', `${slug}.jpg`))) {
    wrns.push('没有封面 public/knowledge/' + slug + '.jpg（草稿期允许，发布前按 SOP 第 4 步配）')
  }

  const total = errs.length + wrns.length
  if (errs.length) {
    fails++
    console.log(`[fail] ${slug}  ${errs.length} 项不合规`)
    for (const e of errs) console.log(`         · ${e}`)
  } else {
    console.log(`[ok]   ${slug}  ${h2.length} 个 H2，${meta ? `faq ${meta.faq?.length ?? 0} 条 / related ${meta.related?.length ?? 0} 篇` : '无 config 条目'}`)
  }
  for (const w of wrns) {
    warns++
    console.log(`         ! ${w}`)
  }
}

console.log(`[draft] ${files.length} 篇草稿：${files.length - fails} 篇合规，${fails} 篇不合规，${warns} 条提醒`)
if (fails) process.exit(1)