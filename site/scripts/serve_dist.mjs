/**
 * 预览构建产物（.vitepress/dist）的静态服务器 —— 固定端口 41777。
 *
 * 为什么不用 `vitepress preview`：
 *   preview 要读 404.html，而本项目的 404 路由壳是 docs/404.md 渲出来的，构建后落在别处；
 *   VitePress 自带的 preview 对这种「没有物理 404.html」的产物会直接报错退出。
 *
 * 为什么不用 http-server：没装进依赖，每次都要 npx 现拉。
 *
 * 端口：41777，与 dev:site / preview 一致。绑 0.0.0.0，这样局域网和 Tailscale 都能直接打开
 * （Tailscale 地址 <本机 Tailscale IP>:41777）。改端口要同步改 package.json 的 dev:site、
 * preview 和 .vitepress/config.mts 的 server.port 三处。
 *
 * 用法：npm run serve:dist
 */
import { createServer } from 'node:http'
import { createReadStream, existsSync, statSync, readFileSync } from 'node:fs'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(fileURLToPath(new URL('../.vitepress/dist', import.meta.url)))
const PORT = 41777
const HOST = '0.0.0.0'

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
}

if (!existsSync(ROOT)) {
  console.error(`[serve:dist] 找不到 ${ROOT}，先跑 npm run build`)
  process.exit(1)
}

/** 把 URL 路径映射到 dist 里的文件；没有扩展名的路径按 index.html 试，再试 目录/index.html */
function resolveFile(urlPath) {
  const clean = normalize(decodeURIComponent(urlPath.split('?')[0])).replace(/\.\./g, '')
  const base = join(ROOT, clean)
  if (!base.startsWith(ROOT)) return null
  const candidates = extname(base) ? [base, `${base}.html`] : [join(base, 'index.html'), `${base}.html`, base]
  for (const f of candidates) {
    if (existsSync(f) && statSync(f).isFile()) return f
  }
  return null
}

/**
 * 产物构建时间戳。取入口 index.html 的 mtime，而不是启动时刻。
 *
 * 为什么需要：dev 与 preview 曾共用 41777，浏览器标签页还挂在旧进程上时，
 * 你以为在预览新产物、其实看的是上一次 build。端口已拆开（dev 41800 / preview 41777），
 * 这里再给产物打一个可见的时间戳，双重保险：页面右下角就能确认手上这份是几点的构建。
 *
 * 注意：本脚本每次请求都 createReadStream 读磁盘，没有内存快照，不需要为刷新去杀进程。
 */
function buildStamp() {
  const entry = join(ROOT, 'index.html')
  if (!existsSync(entry)) return 'unknown'
  return new Date(statSync(entry).mtimeMs).toISOString().slice(0, 19).replace('T', ' ')
}

/** 给 HTML 注入产物角标，区分于 dev 下 config.mts 注入的 DEV 角标 */
function injectBadge(html, stamp) {
  if (html.includes('__BUILD_STAMP__')) return html.replaceAll('__BUILD_STAMP__', stamp)
  if (!html.includes('</body>')) return html
  const badge = `<div style="position:fixed;left:8px;bottom:8px;z-index:99999;padding:4px 8px;border-radius:6px;`
    + `background:rgba(0,0,0,.72);color:#fb0;font:12px/1.4 ui-monospace,monospace;pointer-events:none">`
    + `BUILD ${stamp}</div>`
  return html.replace('</body>', `${badge}</body>`)
}

const STAMP = buildStamp()

createServer((req, res) => {
  const file = resolveFile(req.url || '/')
  // SPA 兜底：VitePress 带 hash 路由，刷新到子路由时没有对应物理目录
  const target = file ?? join(ROOT, 'index.html')
  if (!existsSync(target)) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
    res.end('404')
    return
  }
  res.writeHead(200, { 'content-type': MIME[extname(target)] ?? 'application/octet-stream', 'cache-control': 'no-store' })
  if (target.endsWith('.html')) {
    res.end(injectBadge(readFileSync(target, 'utf8'), STAMP))
    return
  }
  createReadStream(target).pipe(res)
})
  .listen(PORT, HOST, () => {
    console.log(`[serve:dist] http://${HOST}:${PORT}/  (Tailscale: http://<本机 Tailscale IP>:${PORT}/)`)
    console.log(`[serve:dist] 产物构建时间 ${STAMP}。这是静态产物，改代码看不到变化；要热更新请另开 npm run dev:site（端口 41800）。`)
  })
