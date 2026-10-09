/**
 * 构建后自动生成 sitemap.xml（替代手工维护）。
 * 扫 .vitepress/dist 下所有 .html，映射回站点 URL；排除 404。
 */
import { readdirSync, statSync, writeFileSync, existsSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { siteConfig } from '../config/site'

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
    return origin + '/' + f.replace(/\.html$/, '')
  })
  .sort()

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n')}
</urlset>
`
writeFileSync(join(dist, 'sitemap.xml'), xml, 'utf8')
console.log(`[sitemap] 已生成 ${urls.length} 条 -> ${join(dist, 'sitemap.xml')}`)
