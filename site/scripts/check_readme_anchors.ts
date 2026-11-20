/**
 * 校验仓库根 README 的目录锚点与 GitHub 实际生成的标题 id 一致。
 *
 * 为什么要有这道门禁：README 的目录用 github-slugger 生成锚点，
 * 但 GitHub 服务端的 slug 规则会随版本变化，且中文标题的锚点很容易算错。
 * 锚点算错 = 目录全是死链，对访客与爬虫都是负面信号。
 * 这道检查不联网：只用 github-slugger 重算一遍 README 里所有标题的 id，
 * 与目录里写的锚点比对，对不上就 exit 1。
 *
 * 用法：npx tsx scripts/check_readme_anchors.ts
 */
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import GithubSlugger from 'github-slugger'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO = join(HERE, '..', '..')
const README = join(REPO, 'README.md')

if (!existsSync(README)) {
  console.error(`[readme-anchors] 找不到 ${README}`)
  process.exit(1)
}

const src = readFileSync(README, 'utf8')

/** 去掉 md 标题里的行内标记，GitHub 也是先剥标记再算 slug */
function plain(text: string): string {
  return text
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\*\*([^*]*)\*\*/g, '$1')
    .replace(/\*([^*]*)\*/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .trim()
}

/** README 里所有标题（按出现顺序），对应 GitHub 生成的 id 集合 */
function headingIds(text: string): Set<string> {
  const slugger = new GithubSlugger()
  const ids = new Set<string>()
  for (const line of text.split('\n')) {
    const m = line.match(/^(#{1,6})\s+(.+?)\s*$/)
    if (!m) continue
    ids.add(slugger.slug(plain(m[2])))
  }
  return ids
}

/** 目录区块里写的锚点 */
function tocAnchors(text: string): string[] {
  const start = text.indexOf('<!-- readme:toc:start -->')
  const end = text.indexOf('<!-- readme:toc:end -->')
  if (start < 0 || end < 0) return []
  const block = text.slice(start, end)
  const out: string[] = []
  for (const m of block.matchAll(/\]\(#user-content-([^)]+)\)/g)) out.push(m[1])
  return out
}

const anchors = tocAnchors(src)
if (!anchors.length) {
  console.error('[readme-anchors] README 里没有目录区块（缺 readme:toc 哨兵或区块为空）')
  process.exit(1)
}

const ids = headingIds(src)
const bad = anchors.filter((a) => !ids.has(a))
if (bad.length) {
  console.error('[readme-anchors] 目录里的锚点与 README 标题对不上：')
  for (const a of bad) console.error(`  · #user-content-${a}`)
  console.error('  跑 `npm run gen:readme` 重新生成目录')
  process.exit(1)
}

console.log(`[readme-anchors] 目录锚点全部对得上（${anchors.length} 条）`)
