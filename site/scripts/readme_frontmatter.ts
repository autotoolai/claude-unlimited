/**
 * 读 VitePress 路由壳的 frontmatter。
 *
 * 为什么不用 gray-matter / js-yaml：仓库只有 devDependencies 且要保持零新增依赖，
 * 而这里只需要 title / description / layout / scene / knowledge 五个顶层标量字段，
 * 正则逐行取就够了。
 *
 * frontmatter 是 `---` 包裹的 YAML 块，缩进的续行（head: 里的 list）不取。
 */
import { readFileSync } from 'node:fs'

export interface Frontmatter {
  title?: string
  description?: string
  layout?: string
  scene?: string
  knowledge?: boolean
}

/** 取 frontmatter 里的标量字段；只认顶层（无缩进）的 key: value。 */
export function parseFrontmatter(text: string): Frontmatter {
  const out: Frontmatter = {}
  if (!text.startsWith('---')) return out
  const end = text.indexOf('\n---', 3)
  if (end < 0) return out
  const block = text.slice(3, end)
  for (const line of block.split('\n')) {
    if (/^\s/.test(line)) continue
    const m = /^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/.exec(line)
    if (!m) continue
    const key = m[1]
    let value = m[2].trim()
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1)
    else if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1)
    if (key === 'title' || key === 'description' || key === 'layout' || key === 'scene') {
      out[key] = value
    } else if (key === 'knowledge') {
      out.knowledge = value === 'true'
    }
  }
  return out
}

/** 读一个 .md 文件的 frontmatter。 */
export function frontmatterOf(path: string): Frontmatter {
  return parseFrontmatter(readFileSync(path, 'utf-8'))
}
