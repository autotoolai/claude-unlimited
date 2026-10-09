/**
 * Cloudflare Pages 只把「目录里的 index.html」当路由（/pricing.html -> /pricing），目录总览页 dist/guide/index.html
 * 不会映射成 /guide，/_redirects 里指向它也只会 404。但站点正文写的是 /guide（transformHead / sitemap / 导航 / 页脚一致），
 * 所以 build 末尾把总览页额外复制成 dist/guide.html（以及带尾斜杠的目录入口 dist/guide/index.html 本来就存在）。
 * 这只是给 Pages 路由规则用的冗余文件，两份内容完全一致；sitemap 生成在复制之前，所以 sitemap 不受影响。
 */
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'

const dist = path.join(process.cwd(), '.vitepress', 'dist')
const src = path.join(dist, 'guide', 'index.html')
if (!existsSync(src)) {
  console.error('[guide] 未找到 dist/guide/index.html，跳过')
  process.exit(1)
}
mkdirSync(path.join(dist, 'guide'), { recursive: true })
copyFileSync(src, path.join(dist, 'guide.html'))
console.log('[guide] 已复制 dist/guide/index.html -> dist/guide.html（Pages 路由 /guide 的实际落点）')
