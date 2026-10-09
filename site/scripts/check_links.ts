/**
 * 死链检查：扫 dist 下所有 .html 的 href/src，找出指向站内但产物不存在的链接。
 * 有死链以非 0 退出码结束；外链只统计不请求。
 */
import { readdirSync, statSync, readFileSync, existsSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const dist = join(process.cwd(), '.vitepress', 'dist')
const SRC_PREFIX = '' // 与 config.mts 的 srcDir='docs' 对应：条目页产物直接在 dist 根

if (!existsSync(dist)) {
  console.error('[links] 未找到 dist，请先 npm run build')
  process.exit(1)
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.html') ? [p] : []
  })
}

/** 产物文件 -> 站点路由 */
function siteRoute(relPath: string): string {
  const r = relPath.split(sep).join('/')
  if (r === 'index.html') return '/'
  return '/' + r.replace(/\.html$/, '')
}

/** 站点路由 -> 产物文件候选：条目页（docs/）与公共资源（根）都试 */
function targetFor(route: string): string[] {
  const rel = route.replace(/^\//, '').split('/').join(sep)
  return [
    join(dist, SRC_PREFIX, rel + '.html'),
    join(dist, SRC_PREFIX, rel, 'index.html'),
    join(dist, rel),
    join(dist, rel, 'index.html'),
  ]
}

const files = walk(dist)
const attrRe = /(?:href|src)="([^"]+)"/g
let broken = 0
let checked = 0

for (const file of files) {
  const html = readFileSync(file, 'utf8')
  const from = siteRoute(relative(dist, file))
  let m: RegExpExecArray | null
  while ((m = attrRe.exec(html))) {
    const href = m[1]
    // 未被渲染的模板表达式（{{ ... }}）也算死链：VitePress 不会渲染 frontmatter head 里的模板，
    // 原样输出到产物后链接必然失效，宁可在构建阶段就报错。
    if (/\{\{.*\}\}/.test(href)) {
      console.error(`[links] 未渲染的模板表达式: ${from} -> ${href}`)
      broken++
      continue
    }
    if (/^(https?:|mailto:|tel:|data:|#|\/\/)/.test(href)) continue
    checked++
    const route = href.split('#')[0].split('?')[0]
    if (!route) continue
    if (!targetFor(route).some(existsSync)) {
      console.error(`[links] 死链: ${from} -> ${href}`)
      broken++
    }
  }
}

console.log(`[links] 检查 ${files.length} 个页面，${checked} 条站内链接，死链 ${broken} 条`)
process.exit(broken ? 1 : 0)