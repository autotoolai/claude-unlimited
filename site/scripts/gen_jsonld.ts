/**
 * 构建后把 JSON-LD 注入 dist 的 HTML。
 *
 * 为什么绕开 VitePress 的 head / markdown 两条路（都实测失败过，别再试）：
 *  1. transformHead 里 push ['script', { innerHTML | children | textContent }]——VitePress 的 head
 *     序列化不区分这几个键，全部当普通属性转义输出，产物里是 innerHTML="&quot;..." 而标签体为空；
 *     同一行写两个键也只会有一个属性生效。
 *  2. transformPageData 往 pageData.content 追加 <script>——markdown 把整段当 HTML 交给 Vue 编译器，
 *     报 "Invalid end tag"，构建直接失败。
 *  3. 挂 Vite 插件的 closeBundle 也不会跑：VitePress 的 build 不走标准 Vite 构建流程。
 *
 * 所以直接改 dist 下的 html，这是唯一不经过 markdown-it 与 Vue 编译的通道。
 * 插入位置是最后一个 </body> 之前，落在 body raw text 里：爬虫能在 DOM 读到，
 * 浏览器也按 raw text 处理、不渲染、不影响 hydration。
 *
 * 幂等：同一条标签只插一次，重复构建不会叠加。
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { jsonLdForRoute } from '../.vitepress/theme/pages/jsonld_server'

const dist = join(process.cwd(), '.vitepress', 'dist')
if (!existsSync(dist)) {
  console.error('[jsonld] 未找到 dist，跳过')
  process.exit(0)
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.html') ? [p] : []
  })
}

let injected = 0
let skipped = 0
for (const file of walk(dist)) {
  const rel = relative(dist, file).split(sep).join('/')
  // 产物文件名 -> 路由：index.html -> 首页，<dir>/index.html -> <dir>，其余去 .html
  // rel 形如 'guide/index.html' -> 'guide/'：目录总览替换后带一个尾斜杠。
  // 直接拿去查表会全部落空（switch 里是 'guide' 不是 'guide/'），结构化数据静默不注入，
  // 所以这里统一去掉尾斜杠。
  const route = rel.replace(/(^|\/)index\.html$/, '$1').replace(/\.html$/, '').replace(/\/$/, '')
  const jsonLd = jsonLdForRoute(route)
  if (!jsonLd) continue
  const html = readFileSync(file, 'utf8')
  if (html.includes('data-cu-jsonld')) {
    skipped++
    continue
  }
  const tag = `<script type="application/ld+json" data-cu-jsonld="">${JSON.stringify(jsonLd)}</script>`
  const at = html.lastIndexOf('</body>')
  if (at < 0) {
    console.error(`[jsonld] ${rel} 找不到 </body>，跳过`)
    continue
  }
  writeFileSync(file, html.slice(0, at) + tag + '\n' + html.slice(at), 'utf8')
  injected++
}
console.log(`[jsonld] 已注入 ${injected} 页${skipped ? `（${skipped} 页已有，跳过）` : ''}`)