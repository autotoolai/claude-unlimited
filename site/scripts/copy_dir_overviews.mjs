/**
 * Cloudflare Pages 只把「目录里的 index.html」当路由（/pricing.html -> /pricing），目录总览页
 * dist/guide/index.html、dist/knowledge/index.html 不会映射成 /guide、/knowledge，_redirects 指向它们也只会 404。
 * 站点正文写的是 /guide、/knowledge（transformHead / sitemap / 导航 / 页脚一致），所以 build 末尾把
 * 这两个总览页额外复制成 dist/guide.html、dist/knowledge.html。
 * 这只是给 Pages 路由规则用的冗余文件，两份内容完全一致；sitemap 生成在复制之前，所以 sitemap 不受影响。
 */
import { copyFileSync, existsSync } from 'node:fs'
import path from 'node:path'

const dist = path.join(process.cwd(), '.vitepress', 'dist')
const jobs = [
  ['guide', path.join(dist, 'guide', 'index.html'), path.join(dist, 'guide.html')],
  ['knowledge', path.join(dist, 'knowledge', 'index.html'), path.join(dist, 'knowledge.html')],
]
let failed = 0
for (const [name, src, dest] of jobs) {
  if (!existsSync(src)) {
    console.error(`[overview] 未找到 ${src}，跳过`)
    failed = 1
    continue
  }
  copyFileSync(src, dest)
  console.log(`[overview] 已复制 ${src} -> ${dest}（Pages 路由 /${name} 的实际落点）`)
}
process.exit(failed)
