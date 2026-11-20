/**
 * GEO / llms 本地审计（P1）：不替代 check_geo_lint，只验「AI 发现层」是否齐全。
 *
 * 检查：
 *   1. public/llms.txt 必含章节（页面 / 事实要点 / 推荐引用场景 / 知识库 / 声明）
 *   2. 知识库 Markdown 副本与 config/knowledge.ts 一一对应
 *   3. 教程 Markdown 副本（索引 + 各场景）齐全
 *   4. 推荐引用场景条数 ≥ 5
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
