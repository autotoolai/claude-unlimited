/**
 * 生成仓库根的 knowledge/ 与 tutorials/ 目录（GitHub 侧的索引入口）。
 *
 * 为什么必须有：GitHub 不读我们的 sitemap，它只索引「仓库里的文件页」与 README 页。
 * 仓库根原本没有任何教程/知识库目录，爬虫在 GitHub 树里找不到可索引的内容页，
 * 所以 `site:github.com/autotoolai/claude-unlimited` 只命中 /security 与一张图。
 * 把正文放到仓库根的语义目录里，GitHub 才有可能把这些 md 收进索引。
 *
 * 单一真源：site/public/** 的 md 副本（由 gen_md_mirrors.ts 从 config/ 与 docs/ 生成）。
 * 本脚本只做两件事：复制 + 按 md_link_rules 改写站内链接。
 * 手抄 33 篇必然漂移，所以这里不手工复制任何正文。
 *
 * 用法：
 *   npx tsx scripts/gen_repo_mirrors.ts           写入
 *   npx tsx scripts/gen_repo_mirrors.ts --check   只校验，不一致则 exit 1
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, copyFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { knowledge, knowledgeCategories } from '../config/knowledge'
import { guidePages, guideSceneCards, guideIndex } from '../config/guide'
import { siteConfig } from '../config/site'
import { rewriteMdLinks, hasRootRelativeLink, REPO_MIRROR_DIRS } from './md_link_rules'

const HERE = dirname(fileURLToPath(import.meta.url))
const SITE = join(HERE, '..')
const REPO = join(SITE, '..')
const PUBLIC = join(SITE, 'public')

const BASE = siteConfig.url.replace(/\/+$/, '')
const CHECK_ONLY = process.argv.includes('--check')

type Item = { /** 仓库内相对路径（posix） */ rel: string; /** 文件内容 */ body: string }

/** 二进制资源（图片）：仓库内相对路径 → 源文件绝对路径 */
type Asset = { rel: string; src: string }

/** 生成一个 md 文件的仓库内条目 */
function fileItem(rel: string, body: string): Item {
  return { rel, body }
}

/**
 * 抽出正文里引用的同目录图片（形如 `![...](./xxx.jpg)`）。
 *
 * 为什么必须拷贝：GitHub 上的 md 里 `![](./xxx.jpg)` 会解析到同目录的 xxx.jpg，
 * 仓库里没有这个文件就是裂图。教程场景页用的是外链截图，只有知识库正文有同目录图片。
 */
function localImagesOf(body: string): string[] {
  const out: string[] = []
  for (const m of body.matchAll(/!\[[^\]]*\]\(\.\/([^)\s]+)\)/g)) {
    if (!out.includes(m[1])) out.push(m[1])
  }
  return out
}

/** 仓库内镜像的二进制资源（图片），全局收集后统一拷贝 */
const assets: Asset[] = []

/** 知识库目录：26 篇正文 + 1 篇索引 */
function knowledgeItems(): Item[] {
  const items: Item[] = []
  const dir = REPO_MIRROR_DIRS.knowledge
  for (const e of knowledge) {
    const src = join(PUBLIC, 'knowledge', `${e.slug}.md`)
    if (!existsSync(src)) {
      console.warn(`[repo-mirrors] 缺源文件 public/knowledge/${e.slug}.md，跳过（先跑 npm run gen:md）`)
      continue
    }
    const body = rewriteMdLinks(readFileSync(src, 'utf8'), {
      repoRelative: true,
      fromDir: dir,
      selfSlug: e.slug,
    })
    items.push(fileItem(`${dir}/${e.slug}.md`, body))
    // 同目录图片一并带过去，否则 GitHub 上是裂图
    for (const img of localImagesOf(body)) {
      const imgSrc = join(PUBLIC, 'knowledge', img)
      if (!existsSync(imgSrc)) {
        console.warn(`[repo-mirrors] 缺图片源文件 public/knowledge/${img}，${e.slug}.md 里的这张图在 GitHub 上会裂`)
        continue
      }
      assets.push({ rel: `${dir}/${img}`, src: imgSrc })
    }
  }
  // 索引页：按分类分组，每篇给出标题与一句话摘要
  const lines: string[] = [
    '# Claude 知识库（仓库副本）',
    '',
    `> 本目录是官网[Claude 知识库](${BASE}/knowledge)的仓库副本：同一份正文，方便直接在 GitHub 上读与检索。`,
    '',
  ]
  for (const cat of [...knowledgeCategories].sort((a, b) => a.order - b.order)) {
    const inCat = knowledge.filter((k) => k.cat === cat.cat)
    if (!inCat.length) continue
    lines.push(`## ${cat.name}`)
    lines.push('')
    lines.push(cat.desc)
    lines.push('')
    for (const k of inCat) {
      lines.push(`- [${k.title}](${k.slug}.md)：${k.summary || k.desc}`)
    }
    lines.push('')
  }
  items.push(fileItem(`${dir}/index.md`, lines.join('\n')))
  return items
}

/** 教程目录：6 篇场景正文 + 1 篇索引 */
function tutorialItems(): Item[] {
  const items: Item[] = []
  const dir = REPO_MIRROR_DIRS.tutorials
  for (const p of guidePages) {
    const scene = p.slug.replace(/^\/guide\//, '')
    const src = join(PUBLIC, 'guide', `${scene}.md`)
    if (!existsSync(src)) {
      console.warn(`[repo-mirrors] 缺源文件 public/guide/${scene}.md，跳过（先跑 npm run gen:md）`)
      continue
    }
    const body = rewriteMdLinks(readFileSync(src, 'utf8'), {
      repoRelative: true,
      fromDir: dir,
    })
    items.push(fileItem(`${dir}/${scene}.md`, body))
    for (const img of localImagesOf(body)) {
      const imgSrc = join(PUBLIC, 'guide', img)
      if (!existsSync(imgSrc)) {
        console.warn(`[repo-mirrors] 缺图片源文件 public/guide/${img}，${scene}.md 里的这张图在 GitHub 上会裂`)
        continue
      }
      assets.push({ rel: `${dir}/${img}`, src: imgSrc })
    }
  }
  const lines: string[] = [
    '# 使用教程（仓库副本）',
    '',
    `> ${guideIndex.answer}`,
    '',
    `本目录是官网[使用教程](${BASE}/guide)的仓库副本：同一份正文与真实截图说明。`,
    '',
    '## 选择一条路径',
    '',
  ]
  for (const c of guideSceneCards()) {
    const scene = c.url.replace(/^\/guide\//, '')
    lines.push(`- [${c.title}](${scene}.md)：${c.desc}（${c.meta}）`)
  }
  lines.push('')
  items.push(fileItem(`${dir}/index.md`, lines.join('\n')))
  return items
}

/* ---------------------------------------------------------------- 主流程 */

const items = [...knowledgeItems(), ...tutorialItems()]

if (!items.length) {
  console.error('[repo-mirrors] 没有可生成的条目：先跑 npm run gen:md')
  process.exit(1)
}

// 一致性校验：不允许残留站内根相对链接（在 GitHub 上会变死链）
const bad = items.filter((it) => hasRootRelativeLink(it.body))
if (bad.length) {
  console.error(`[repo-mirrors] 以下文件仍含站内根相对链接（在 GitHub 上是死链）：`)
  for (const b of bad) console.error(`  · ${b.rel}`)
  process.exit(1)
}

const byDir = new Map<string, Item[]>()
for (const it of items) {
  const d = it.rel.split('/')[0]
  if (!byDir.has(d)) byDir.set(d, [])
  byDir.get(d)!.push(it)
}

let changed = 0
for (const [dir, list] of byDir) {
  const absDir = join(REPO, dir)
  // 只清掉我们自己生成的目录（仓库根 knowledge/ 与 tutorials/）
  if (existsSync(absDir)) {
    for (const f of readdirSync(absDir)) {
      if (!f.endsWith('.md')) continue
      const abs = join(absDir, f)
      const rel = `${dir}/${f}`
      const want = list.find((x) => x.rel === rel)
      const have = readFileSync(abs, 'utf8')
      if (!want || have !== want.body) {
        if (CHECK_ONLY) {
          console.error(`[repo-mirrors] ${rel} 与生成结果不一致`)
          changed++
        } else {
          writeFileSync(abs, want ? want.body : '', 'utf8')
        }
      }
    }
  } else if (!CHECK_ONLY) {
    mkdirSync(absDir, { recursive: true })
  }
  if (!CHECK_ONLY) {
    for (const it of list) {
      const abs = join(REPO, it.rel)
      if (!existsSync(abs)) {
        mkdirSync(dirname(abs), { recursive: true })
        writeFileSync(abs, it.body, 'utf8')
        changed++
      }
    }
  }
}

// 二进制资源：拷贝图片；--check 模式下只校验存在
for (const a of assets) {
  const abs = join(REPO, a.rel)
  if (CHECK_ONLY) {
    if (!existsSync(abs)) {
      console.error(`[repo-mirrors] ${a.rel} 缺失（应为 ${a.src} 的副本）`)
      changed++
    }
    continue
  }
  if (!existsSync(abs)) {
    mkdirSync(dirname(abs), { recursive: true })
    copyFileSync(a.src, abs)
    changed++
  }
}

/* -------------------------------------------------- llms.txt / llms-full.txt 副本 */

/**
 * 把官网的 llms.txt 拷到仓库根。
 *
 * 为什么：llms.txt 是全站最 AI 友好的资产，官网上有但 GitHub 访客看不到它。
 * 仓库根放一份（内容与官网同源），爬虫与 AI 抓仓库时就能直接拿到站点索引。
 */
const LLM_FILES = ['llms.txt', 'llms-full.txt']

for (const f of LLM_FILES) {
  const src = join(PUBLIC, f)
  const abs = join(REPO, f)
  if (!existsSync(src)) {
    console.warn(`[repo-mirrors] 缺源文件 public/${f}，跳过（先跑 npm run gen:llms）`)
    continue
  }
  const want = readFileSync(src, 'utf8')
  const have = existsSync(abs) ? readFileSync(abs, 'utf8') : ''
  if (have === want) continue
  if (CHECK_ONLY) {
    console.error(`[repo-mirrors] ${f} 与 site/public/${f} 不一致`)
    changed++
  } else {
    writeFileSync(abs, want, 'utf8')
    changed++
  }
}

if (CHECK_ONLY) {
  if (changed) {
    console.error(`[repo-mirrors] 仓库镜像与生成结果不一致（${changed} 处），跑 \`npm run gen:repo-mirrors\` 更新`)
    process.exit(1)
  }
  console.log(`[repo-mirrors] 仓库镜像与生成结果一致（${items.length} 个文件）`)
  process.exit(0)
}

console.log(`[repo-mirrors] 已生成仓库镜像 ${items.length} 个文件 → ${[...byDir.keys()].join(' / ')}/`)
