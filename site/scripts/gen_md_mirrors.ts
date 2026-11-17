/**
 * 为知识库与教程生成 AI 可读的 Markdown 副本（GEO / llmstxt.org 惯例）。
 *
 * 产出（写入 public/，由 copy_public 进 dist）：
 *   /knowledge/<slug>.md  —— 自 docs/knowledge/<slug>.md 复制（保留正文与一句话答案）
 *   /guide/<scene>.md     —— 自 config/guide.ts 装配（答案 + 步骤 + FAQ）
 *   /guide.md             —— 教程索引
 *
 * HTML 页在 transformHead 里挂 rel=alternate type=text/markdown 指到对应副本。
 * 用法：tsx scripts/gen_md_mirrors.ts（build 里在 gen:llms 之后跑）
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { knowledge } from '../config/knowledge'
import { guideIndex, guidePages, guideBlocks, guideSceneCards } from '../config/guide'
import { siteConfig } from '../config/site'

const root = process.cwd()
const publicDir = join(root, 'public')
const docsKnowledge = join(root, 'docs', 'knowledge')
const BASE = siteConfig.url.replace(/\/+$/, '')

function ensureDir(p: string) {
  mkdirSync(p, { recursive: true })
}

/** 知识库：复制源 md；文首补一行「HTML 版」便于人机互指 */
function writeKnowledgeMirrors(): number {
  const outDir = join(publicDir, 'knowledge')
  ensureDir(outDir)
  let n = 0
  for (const e of knowledge) {
    const src = join(docsKnowledge, `${e.slug}.md`)
    if (!existsSync(src)) {
      console.warn(`[md] 缺源文件 docs/knowledge/${e.slug}.md，跳过`)
      continue
    }
    const body = readFileSync(src, 'utf8')
    const header = [
      `<!-- markdown mirror for AI / agents; HTML: ${BASE}/knowledge/${e.slug} -->`,
      '',
    ].join('\n')
    writeFileSync(join(outDir, `${e.slug}.md`), header + body, 'utf8')
    n++
  }
  return n
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, '').trim()
}

/** 教程场景页：答案 + 步骤提纲 + FAQ（不嵌截图二进制，只保留 caption） */
function writeGuideMirrors(): number {
  const outDir = join(publicDir, 'guide')
  ensureDir(outDir)
  let n = 0
  for (const p of guidePages) {
    const lines: string[] = [
      `<!-- markdown mirror for AI / agents; HTML: ${BASE}${p.slug} -->`,
      '',
      `# ${p.title}`,
      '',
      `> **一句话答案**：${p.answer}`,
      '',
      p.lead,
      '',
    ]
    for (const b of guideBlocks(p)) {
      lines.push(`## ${b.h2}`)
      lines.push('')
      if (b.lead) {
        lines.push(stripHtml(b.lead))
        lines.push('')
      }
      if (b.steps?.length) {
        for (const s of b.steps) {
          lines.push(`### ${s.title}`)
          lines.push('')
          if (s.goal) {
            lines.push(s.goal)
            lines.push('')
          }
          for (const a of s.action ?? []) {
            lines.push(`- ${stripHtml(a)}`)
          }
          lines.push('')
        }
      }
      if (b.notes?.length) {
        lines.push('注意：')
        for (const note of b.notes) lines.push(`- ${stripHtml(note)}`)
        lines.push('')
      }
    }
    if (p.faq.length) {
      lines.push('## 常见问题')
      lines.push('')
      for (const f of p.faq) {
        lines.push(`### ${f.q}`)
        lines.push('')
        lines.push(f.a)
        lines.push('')
      }
    }
    if (p.related.length) {
      lines.push('## 相关阅读')
      lines.push('')
      for (const r of p.related) lines.push(`- [${r.text}](${BASE}${r.url})`)
      lines.push('')
    }
    const scene = p.slug.replace(/^\/guide\//, '')
    writeFileSync(join(outDir, `${scene}.md`), lines.join('\n'), 'utf8')
    n++
  }

  // 索引
  const indexLines: string[] = [
    `<!-- markdown mirror for AI / agents; HTML: ${BASE}/guide -->`,
    '',
    `# ${guideIndex.title}`,
    '',
    `> **一句话答案**：${guideIndex.answer}`,
    '',
    '## 选择一条路径',
    '',
    ...guideSceneCards().map(
      (c) => `- [${c.title}](${BASE}${c.url}.md)：${c.desc}（${c.meta}）`,
    ),
    '',
  ]
  writeFileSync(join(publicDir, 'guide.md'), indexLines.join('\n'), 'utf8')
  return n + 1
}

const k = writeKnowledgeMirrors()
const g = writeGuideMirrors()
console.log(`[md] 已生成知识库 ${k} 篇 + 教程 ${g} 份 Markdown 副本 → public/`)
