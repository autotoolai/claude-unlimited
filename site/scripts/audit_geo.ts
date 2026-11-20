/**
 * GEO / llms 本地审计：不替代 check_geo_lint，验「AI 发现层」是否齐全且内容够硬。
 *
 * 检查分两层：
 *   存在性层（P1）：llms.txt 章节齐全、知识库与教程的 Markdown 副本一一对应。
 *   内容质量层（P2-2）：答案胶囊长度区间、md 镜像里有没有残留站内绝对链接、
 *     llms.txt 是否覆盖了全部页面、llms-full.txt 是否真的有答案正文。
 *     「文件在」只能证明 llms.txt 存在；分数要有意义就得看内容。
 *
 * 用法：
 *   npm run audit:geo           # 打印分数；不过 exit 1
 *   npm run audit:geo -- --write  # 同时写仓库根 docs/geo_audit_baseline.md
 *
 * 可选：发版后对本站跑 `npx llms-txt-check <url>` 做线上可达性复核（不内置依赖）。
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { siteConfig } from '../config/site'
import { knowledge } from '../config/knowledge'
import { guidePages } from '../config/guide'

const root = process.cwd()
const publicDir = join(root, 'public')
const WRITE = process.argv.includes('--write')
const repoDocs = resolve(root, '..', 'docs')

type Check = { id: string; ok: boolean; detail: string }

const checks: Check[] = []

function ok(id: string, pass: boolean, detail: string) {
  checks.push({ id, ok: pass, detail })
}

const llmsPath = join(publicDir, 'llms.txt')
ok('llms-exists', existsSync(llmsPath), llmsPath)
const llms = existsSync(llmsPath) ? readFileSync(llmsPath, 'utf8') : ''
for (const sec of ['## 页面', '## 事实要点', '## 推荐引用场景', '## 知识库文章', '## 声明']) {
  ok(`llms-sec:${sec}`, llms.includes(sec), sec)
}
// 「推荐引用场景」现在是链接列表（llmstxt.org 要求每个 H2 小节内是链接清单），
// 所以按「小节里的链接条数」数，而不是按旧格式的「- 「问句」」前缀。
const citeSection = llms.split('## 推荐引用场景')[1]?.split('\n## ')[0] ?? ''
const citeCount = (citeSection.match(/^- \[/gm) || []).length
ok('llms-cite-ge5', citeCount >= 5, `推荐引用场景 ${citeCount} 条`)
ok('llms-model-fact', llms.includes('模型与无限卡'), '事实要点含「模型与无限卡」')
// llms.txt 是索引层、llms-full.txt 是内容层。没有指针的话，只读 llms.txt 的 AI
// 拿不到任何答案正文，会放弃引用本站 —— 这一项是内容级检查，不是「文件在不在」。
ok(
  'llms-full-pointer',
  llms.includes(`${siteConfig.url.replace(/\/+$/, '')}/llms-full.txt`),
  'llms.txt 指向 llms-full.txt',
)

let mdKnowledge = 0
for (const e of knowledge) {
  const p = join(publicDir, 'knowledge', `${e.slug}.md`)
  const hit = existsSync(p)
  if (hit) mdKnowledge++
  ok(`md-knowledge:${e.slug}`, hit, p)
}
ok(
  'md-knowledge-count',
  mdKnowledge === knowledge.length,
  `${mdKnowledge}/${knowledge.length}`,
)

ok('md-guide-index', existsSync(join(publicDir, 'guide.md')), 'public/guide.md')
let mdGuide = 0
for (const p of guidePages) {
  const scene = p.slug.replace(/^\/guide\//, '')
  const f = join(publicDir, 'guide', `${scene}.md`)
  const hit = existsSync(f)
  if (hit) mdGuide++
  ok(`md-guide:${scene}`, hit, f)
}
ok('md-guide-count', mdGuide === guidePages.length, `${mdGuide}/${guidePages.length}`)

/* ---------------- 内容质量层（P2-2） ---------------- */

/**
 * 答案胶囊的下限：太短没有信息量，AI 引用后读者拿不到答案。
 * 上限不设硬门禁：各篇写法粒度不同（有的答案本身要列步骤），
 * 超过 120 字的只做统计，不判失败 —— 强行截断会破坏答案的完整性。
 */
const CAPSULE_MIN = 40
const CAPSULE_MAX = 120

/** 读 md 镜像里 H1 之后的第一段引用块（`> **一句话答案**：...`） */
function capsuleOf(md: string): string | undefined {
  const m = md.match(/^>\s*\*\*一句话答案\*\*：(.+)$/m)
  return m?.[1]?.trim()
}

/** 每篇文章都必须有足够长的答案胶囊。 */
let capsuleOk = 0
let capsuleBad = 0
let capsuleLong = 0
for (const e of knowledge) {
  const p = join(publicDir, 'knowledge', `${e.slug}.md`)
  if (!existsSync(p)) continue
  const c = capsuleOf(readFileSync(p, 'utf8'))
  const len = c ? c.length : 0
  if (c && len > CAPSULE_MAX) capsuleLong++
  if (c && len >= CAPSULE_MIN) {
    capsuleOk++
  } else {
    capsuleBad++
    ok(`geo-capsule:${e.slug}`, false, c ? `答案胶囊 ${len} 字（应 ≥ ${CAPSULE_MIN}）` : '缺一句话答案')
  }
}
if (capsuleBad === 0) {
  ok(
    'geo-capsule-all',
    true,
    `${capsuleOk} 篇文章的答案胶囊都 ≥ ${CAPSULE_MIN} 字（其中 ${capsuleLong} 篇超过 ${CAPSULE_MAX} 字，只统计不判失败）`,
  )
}

/** md 镜像里不能残留站内绝对链接：它们在 GitHub 上会解析成仓库里的死链。 */
let deadLinks = 0
const mdFiles = [
  ...knowledge.map((e) => join(publicDir, 'knowledge', `${e.slug}.md`)),
  ...guidePages.map((p) => join(publicDir, 'guide', `${p.slug.replace(/^\/guide\//, '')}.md`)),
  join(publicDir, 'guide.md'),
]
for (const f of mdFiles) {
  if (!existsSync(f)) continue
  const body = readFileSync(f, 'utf8')
  const hits = body.match(/\]\(\/[^)]*\)/g) ?? []
  if (hits.length) deadLinks += hits.length
}
ok('geo-md-no-absolute-links', deadLinks === 0, `md 镜像里残留 ${deadLinks} 处站内绝对链接`)

/** llms.txt 的页面清单要覆盖全站已登记的页面（按 path 比对）。 */
const llmsPaths = new Set(
  [...llms.matchAll(/^- \[[^\]]*\]\(https?:\/\/[^/]+\/([^)\s]*)/gm)].map((m) => (m[1] ?? '').replace(/\/$/, '')),
)
let uncovered = 0
const uncoveredList: string[] = []
// 用 sitemap 的实际产物做基准：dist 里有哪些页面，就都该在 llms.txt 里有条目。
const sitemapPath = join(root, '.vitepress', 'dist', 'sitemap.xml')
if (existsSync(sitemapPath)) {
  const sitemap = readFileSync(sitemapPath, 'utf8')
  const origin = siteConfig.url.replace(/\/+$/, '')
  for (const m of sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    const url = m[1]
    const p = url.replace(origin, '').replace(/^\//, '').replace(/\/$/, '')
    // 目录总览页在 llms.txt 里是 /knowledge 与 /guide（无尾斜杠），已包含在上面的集合里
    if (!p) continue
    // 知识库文章在 llms.txt 里链的是 .md 副本（给 AI 可读 Markdown），不是 HTML 页
    if (p.startsWith('knowledge/')) {
      if (llmsPaths.has(p + '.md')) continue
    }
    if (!llmsPaths.has(p)) {
      uncovered++
      uncoveredList.push(p)
    }
  }
} else {
  uncovered = -1
  uncoveredList.push('（缺 sitemap.xml，跳过覆盖比对）')
}
ok('geo-llms-covers-pages', uncovered === 0, uncovered ? `llms.txt 未收录 ${uncovered} 个页面：${uncoveredList.join('、')}` : 'llms.txt 覆盖全部已登记页面')

/** llms-full.txt 是内容层：每篇文章都要有「一句话答案」正文，不是空壳。 */
const llmsFullPath = join(publicDir, 'llms-full.txt')
ok('llms-full-exists', existsSync(llmsFullPath), llmsFullPath)
if (existsSync(llmsFullPath)) {
  const full = readFileSync(llmsFullPath, 'utf8')
  const answerCount = (full.match(/一句话答案：/g) ?? []).length
  ok('geo-llms-full-answers', answerCount >= knowledge.length, `llms-full.txt 里 ${answerCount} 条一句话答案（文章 ${knowledge.length} 篇）`)
  ok('geo-llms-full-size', full.length > 10000, `llms-full.txt ${full.length} 字符`)
}

const passed = checks.filter((c) => c.ok).length
const failed = checks.filter((c) => !c.ok)
const score = Math.round((passed / checks.length) * 100)

console.log(`[audit:geo] ${passed}/${checks.length} 通过 · 分数 ${score}/100`)
if (failed.length) {
  console.log('[audit:geo] 未通过：')
  for (const f of failed) console.log(`  · ${f.id}: ${f.detail}`)
}

if (WRITE) {
  const lines = [
    '# GEO 审计基线',
    '',
    `> 由 \`npm run audit:geo -- --write\` 生成。上次：${new Date().toISOString().slice(0, 10)} · 分数 **${score}/100**（${passed}/${checks.length}）。`,
    '',
    '| 检查项 | 结果 | 说明 |',
    '|---|---|---|',
    ...checks.map((c) => `| \`${c.id}\` | ${c.ok ? 'PASS' : 'FAIL'} | ${c.detail.replace(/\|/g, '\\|')} |`),
    '',
    '## 人工抽检（P2）',
    '',
    '固定问句（双周一次）：Claude 无限卡是什么 / opus 无限卡 / 多少钱 / 怎么配 Claude Code / rsxermu666 是什么。',
    '',
    '线上可选：`npx llms-txt-check https://claude-unlimited.aiautotools.com`',
    '',
  ]
  const out = join(repoDocs, 'geo_audit_baseline.md')
  writeFileSync(out, lines.join('\n'), 'utf8')
  console.log(`[audit:geo] 已写入 ${out}`)
}

process.exit(failed.length ? 1 : 0)
