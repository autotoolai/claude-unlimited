/**
 * dev 专用中间件：把 public/ 下的文件（favicon.svg / robots.txt / brand-logo.svg / llms.txt / og/*.png）
 * 从磁盘直接吐出来。
 *
 * 为什么需要：VitePress 1.6 的 publicDir 按 srcDir 解析（srcDir='docs' -> docs/public，不存在），
 * 顶层 publicDir 选项又不会被 resolveDir 接受；build 阶段由 scripts/copy_public.mjs 兜底，
 * dev 阶段只能靠这个中间件。生产构建不受影响（插件只实现 configureServer）。
 *
 * 挂载方式必须是 config 的顶层 plugins：vitepress 1.6 会用自己构建的 vite config 覆盖 vite.server
 * （里面的 configureServer 被丢弃），vite.plugins 也不会被合并——只有顶层 plugins 会被 vitepress
 * 加进最终配置。用 vite.server.configureServer 挂载的现象是：插件明明 new 了、却完全没生效。
 */
import fs from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'vite'

const PUBLIC_DIR = path.resolve(process.cwd(), 'public')
const MIME: Record<string, string> = {
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.json': 'application/json',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
}

/** 用 Vite 插件形式挂中间件：vitepress 会把 config.vite.plugins 合并进最终配置，比 vite.server 更可靠 */
export function publicDirPlugin(): Plugin {
  return {
    name: 'cu:public-dir',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url || '').split('?')[0]
        if (url.startsWith('/@') || url.startsWith('/node_modules') || url.startsWith('/__')) return next()
        const rel = decodeURIComponent(url).replace(/^\/+/, '')
        if (!rel || rel.includes('..')) return next()
        const file = path.join(PUBLIC_DIR, rel)
        if (!file.startsWith(PUBLIC_DIR) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return next()
        res.setHeader('Content-Type', MIME[path.extname(file).toLowerCase()] || 'application/octet-stream')
        res.setHeader('Cache-Control', 'no-cache')
        fs.createReadStream(file).pipe(res)
      })
    },
  }
}
