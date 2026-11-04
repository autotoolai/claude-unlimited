/**
 * 从 config/ 与 docs/ 生成仓库根 README.md 里的清单区块。
 *
 * 为什么生成：README 首屏要靠「可核对的数字」建立信任，但手写的数字必然漂移
 * （项目铁律「数字不许手写进文档」）。知识库精选与总篇数、教程场景、套餐价格、精选 FAQ
 * 全部从单一数据源派生，README 只做呈现。
 *
 * 两种模式：
 *   npm run gen:readme          写入 README.md
 *   npm run check:readme -- --check  只校验，不一致则 exit 1（CI 用）
 *
 * 幂等：只替换哨兵注释之间的内容，手写区永不触碰。哨兵缺失或不成对 → 报错退出，
 * 不自动插入（自动插入会让「忘记加哨兵」这件事静默过去）。
 *
 * 用法：npx tsx scripts/gen_readme_index.ts [--check]
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

import { siteConfig } from '../config/site'
import { knowledge, knowledgeCategories } from '../config/knowledge'
import { faqItems } from '../config/faq'
import { allTiers } from '../config/plans'
import { guideSceneCards } from '../config/guide'

const HERE = dirname(fileURLToPath(import.meta.url))
const SITE = join(HERE, '..')
const REPO = join(SITE, '..')
const README = join(REPO, 'README.md')

const BASE = siteConfig.url.replace(/\/+$/, '')
const CHECK_ONLY = process.argv.includes('--check')

/** 仓库内相对路径（README 在仓库根，链接要能直接点开） */
function repoPath(abs: string): string {
  return relative(REPO, abs).split(sep).join('/')
}

/* ---------------------------------------------------------------- 区块生成 */

function guideBlock(): string {
  const cards = guideSceneCards()
  const rows = cards.map((c) => {
    const url = `${BASE}${c.url}`
    return `| [${c.title}](${url}) | ${c.desc} | ${c.meta} |`
  })
  return [
    `按你用的客户端选一条路，每条路都有完整步骤与真实截图。共 ${cards.length} 条路径。`,
    '',
    '| 客户端 | 这条路讲什么 | 规模 |',
    '|---|---|---|',
    ...rows,
    '',
    `全部路径：[使用教程索引](${BASE}/guide)`,
  ].join('\n')
}

function knowledgeBlock(): string {
  // README 只放精选：完整篇目在官网知识库。featured 未标时按分类各取一篇兜底，避免空表。
  let items = knowledge.filter((k) => k.featured)
  if (!items.length) {
    const cats = [...knowledgeCategories].sort((a, b) => a.order - b.order)
    items = cats
      .map((c) => knowledge.find((k) => k.cat === c.cat))
      .filter((k): k is (typeof knowledge)[number] => Boolean(k))
  }
  const parts: string[] = [
    `精选 ${items.length} 篇（完整 ${knowledge.length} 篇见[Claude 知识库](${BASE}/knowledge)）。官网与仓库是同一份正文。`,
    '',
    '| 文章 | 一句话 | 仓库源码 |',
    '|---|---|---|',
  ]
  for (const k of items) {
    const src = repoPath(join(SITE, 'docs', 'knowledge', `${k.slug}.md`))
    parts.push(
      `| [${k.title}](${BASE}/knowledge/${k.slug}) | ${k.summary || k.desc} | [\`${src}\`](${src}) |`,
    )
  }
  return parts.join('\n')
}

/**
 * 取答案的结论段：按空行切段，取第一段。
 * 第一段以冒号结尾时（结论后面跟着列表，如限速数字），把列表段一并带上——
 * 限速数字对买家是最有说服力的信息，不该在 README 里被砍掉。
 */
function answerLead(a: string): string {
  const parts = a.split('\n\n')
  let out = parts[0].trim()
  if (/[：:]$/.test(out) && parts[1]) out += '\n\n' + parts[1].trim()
  return out
}

function faqBlock(): string {
  const items = faqItems.filter((f) => f.featured)
  if (!items.length) return '（还没有标记精选问题）'
  const parts: string[] = ['买家最常问的几个，完整 FAQ 见[官网常见问题](%s/faq)。'.replace('%s', BASE)]
  for (const f of items) {
    parts.push('')
    parts.push(`**${f.q}**`)
    parts.push('')
    parts.push(answerLead(f.a))
  }
  return parts.join('\n')
}

function plansBlock(): string {
  const rows: string[] = []
  for (const { group, tier } of allTiers) {
    if (tier.status === 'coming-soon') continue
    const url = tier.shopUrl || `${BASE}/pricing`
    const orig = tier.original ? ` <s>${tier.original}</s>` : ''
    rows.push(
      `| ${group.name} · ${tier.displayName || tier.name} | ${tier.period} | ${tier.price}${orig} | ${tier.badge || ''} | [购买](${url}) |`,
    )
  }
  return [
    '价格与发卡站在售商品同步，官网[套餐定价](%s/pricing)页是最终准价来源。'.replace('%s', BASE),
    '',
    '| 档位 | 有效期 | 价格 | 备注 | 购买 |',
    '|---|---|---|---|---|',
    ...rows,
  ].join('\n')
}

/* ---------------------------------------------------------------- 哨兵替换 */

const BLOCKS: { key: string; gen: () => string }[] = [
  { key: 'guide', gen: guideBlock },
  { key: 'knowledge', gen: knowledgeBlock },
  { key: 'faq', gen: faqBlock },
  { key: 'plans', gen: plansBlock },
]

function replaceBlock(src: string, key: string, body: string): string {
  const start = `<!-- readme:${key}:start -->`
  const end = `<!-- readme:${key}:end -->`
  const si = src.indexOf(start)
  const ei = src.indexOf(end)
  if (si < 0 || ei < 0) {
    throw new Error(`README 缺少哨兵 ${start} / ${end}，请手工补上再跑（脚本不自动插入）`)
  }
  if (ei < si) {
    throw new Error(`README 的哨兵顺序反了：${end} 出现在 ${start} 之前`)
  }
  const head = src.slice(0, si + start.length)
  const tail = src.slice(ei)
  return `${head}\n\n${body}\n\n${tail}`
}

/* ---------------------------------------------------------------- 主流程 */

if (!existsSync(README)) {
  console.error(`[readme] 找不到 ${README}`)
  process.exit(1)
}

const original = readFileSync(README, 'utf-8')
let next = original
for (const b of BLOCKS) {
  next = replaceBlock(next, b.key, b.gen())
}

if (next === original) {
  console.log('[readme] README 与生成结果一致')
  process.exit(0)
}

if (CHECK_ONLY) {
  console.error('[readme] README 与生成结果不一致。跑 `npm run gen:readme` 更新。')
  // 打印第一处差异的上下文，便于定位
  const a = original.split('\n')
  const b = next.split('\n')
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i] !== b[i]) {
      console.error(`  第 ${i + 1} 行：`)
      console.error(`    现状: ${a[i] ?? '(无)'}`)
      console.error(`    应为: ${b[i] ?? '(无)'}`)
      break
    }
  }
  process.exit(1)
}

writeFileSync(README, next, 'utf-8')
console.log(`[readme] 已更新 ${README}（${BLOCKS.length} 个区块）`)
