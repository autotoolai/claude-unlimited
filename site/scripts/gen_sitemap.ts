/**
 * 构建后自动生成 sitemap.xml（替代手工维护）。
 * 扫 .vitepress/dist 下所有 .html，映射回站点 URL；排除 404。
 */
import { readdirSync, statSync, writeFileSync, existsSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { siteConfig } from '../config/site'
import { knowledge } from '../config/knowledge'

const dist = join(process.cwd(), '.vitepress', 'dist')
if (!existsSync(dist)) {
  console.error('[sitemap] 未找到 dist，跳过')
  process.exit(0)
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.html') ? [p] : []
  })
}

const origin = siteConfig.url.replace(/\/$/, '')
const urls = walk(dist)
  .map((f) => relative(dist, f).split(sep).join('/'))
  .filter((f) => f !== '404.html')
  .map((f) => {
    // srcDir='docs' 时条目页产物在 dist 根；去掉 .html 得到路由，首页映射为 /
    if (f === 'index.html') return origin + '/'
    // 目录总览页（guide/index.html、knowledge/index.html）对外是 /guide、/knowledge：无尾斜杠，与
    // transformHead 的 canonical、导航、页脚一致（copy_dir_overviews.mjs 会把 index.html 再复制成 /guide.html，
    // 两份内容相同，这里用 Set 去重）
    if (f.endsWith('/index.html')) return origin + '/' + f.replace(/index\.html$/, '').replace(/\/$/, '')
    // Pages 只把「目录里的 index.html」当路由，裸 .html 会 308 到无后缀（见 public/_redirects）；
    // canonical 与 transformHead 用的也是无后缀形式，所以这里统一去掉 .html，三处 URL 信号才一致。
    return origin + '/' + f.replace(/\.html$/, '')
  })
  .filter((u) => !u.endsWith('/knowledge/') || u === origin + '/knowledge') // 双保险：目录总览不带尾斜杠
  // /console 是后台入口壳（正文全靠客户端渲染，SSR 只剩导航），且 public/robots.txt 已 Disallow 它。
  // sitemap 是「主动告诉引擎这些 URL 值得收录」，与 Disallow 直接矛盾，所以这里排除，保证两个信号一致。
  .filter((u) => u !== origin + '/console')
  .filter((u, i, a) => a.indexOf(u) === i)
  .sort()

/**
 * lastmod：爬虫靠它判断内容有没有变、要不要重抓。取值优先级：
 *  1) 知识库文章用 config/knowledge.ts 的 updated（不填则 date）——人工维护的编辑时间，稳定且语义准确；
 *  2) 其余页面用 docs/ 下对应 md 源文件的修改时间。
 * 不能用 dist 里 html 的 mtime：那是本次构建时间，等于宣称每次发版全站都更新了，会稀释新建文章的信号。
 */
function lastmodFor(url: string): string | undefined {
  const route = url.slice(origin.length).replace(/^\//, '')
  if (route.startsWith('knowledge/')) {
    const e = knowledge.find((k) => k.slug === route.slice('knowledge/'.length))
    if (e) return e.updated ?? e.date
  }
  // 首页 -> docs/index.md；目录总览（guide / knowledge）-> docs/<dir>/index.md；其余 -> docs/<route>.md
  const md = join(process.cwd(), 'docs', route === '' ? 'index.md' : existsSync(join(process.cwd(), 'docs', route, 'index.md')) ? route + '/index.md' : route + '.md')
  if (!existsSync(md)) return undefined
  return statSync(md).mtime.toISOString().slice(0, 10)
}

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map((u) => {
    const lm = lastmodFor(u)
    return `  <url><loc>${u}</loc>${lm ? `<lastmod>${lm}</lastmod>` : ''}</url>`
  })
  .join('\n')}
</urlset>
`
writeFileSync(join(dist, 'sitemap.xml'), xml, 'utf8')
console.log(`[sitemap] 已生成 ${urls.length} 条 -> ${join(dist, 'sitemap.xml')}`)
