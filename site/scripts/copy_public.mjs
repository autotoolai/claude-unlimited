/**
 * 把 site/public/ 复制到 VitePress 产物目录。
 *
 * 为什么需要：VitePress 1.6 的 publicDir 用 resolveDir 按 srcDir 解析（srcDir='docs' -> docs/public，
 * 不存在），顶层 publicDir 选项又不会被 resolveDir 接受（绝对路径也不行），vite.server.configureServer
 * 也会被 vitepress 自己构建的 vite config 覆盖。所以静态文件（favicon.svg / robots.txt / _headers /
 * llms.txt / og/*.png）必须靠脚本复制进产物。
 *
 * 用法：
 *   node scripts/copy_public.mjs            # 复制一次（build 末尾用）
 *   VITEPRESS_DEV=1 node scripts/copy_public.mjs --watch   # 复制 + 每 2s 补拷 + 起 4198 静态服务（dev 用）
 *
 * dev 下另起 4198 静态服务的原因：vitepress dev 服务器本身不提供 site/public 下的文件；
 * 本地开发时 /favicon.svg、/robots.txt 这类请求要能通，浏览器才不报 404。生产部署不需要这一步。
 */
import { cpSync, createReadStream, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import path, { extname, join, normalize, resolve } from 'node:path'

// 全部相对脚本目录解析，不看 cwd：从仓库根调这个脚本也不会操作到别的目录。
// 原来 SRC_DIR 用 process.cwd()、dist 用 import.meta.dirname，同一个目录两份基准，改一处漏一处。
const root = resolve(import.meta.dirname, '..')
/** srcDir（见 config.mts），条目页产物就在 dist 根 */
const SRC_DIR = join(root, '.vitepress', 'dist')
const src = join(root, 'public')
const dist = join(root, '.vitepress', 'dist')
const WATCH = process.argv.includes('--watch')
const DEV = process.env.VITEPRESS_DEV === '1'
const STATIC_PORT = 4198

const MIME = {
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
}

/**
 * 检查 Vue SSR 的片段锚点：<!--[--> / <!--]--> 是多根组件（fragment）的边界标记，<!----> 是 v-if 空分支占位。
 * 它们会作为真实 HTML 注释进入产物（既增大体积，也让「内容是否完整」无法用简单的字符串判断）。
 *
 * 不能删：客户端 hydration 按这些注释定位片段边界，删掉后 vnode 会错位，Vue 报 "Hydration node mismatch"
 * 并重建对应子树（表现为内容闪一下）。脚本 2026-10-09 之前会删它们；自那以后只检测不修改：
 * 产物里出现标记即报错退出，提示改用 Vue 官方的 minifyHtml: true 压缩。
 */
function checkSsrMarkers() {
  let n = 0
  const offenders = []
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const f = path.join(dir, name)
      const st = statSync(f)
      if (st.isDirectory()) walk(f)
      else if (name.endsWith('.html')) {
        const html = readFileSync(f, 'utf8')
        const count = (html.match(/<!--\[-->|<!--\]-->|<!---->/g) || []).length
        if (count) {
          offenders.push(`${path.relative(dist, f)}: ${count}`)
          n += count
        }
      }
    }
  }
  walk(SRC_DIR)
  if (n) {
    console.log(`[public] 产物里有 ${n} 个 Vue SSR 片段标记（${offenders.slice(0, 5).join(', ')}${offenders.length > 5 ? ' …' : ''}）。`)
    console.log('[public] 片段标记必须保留：删掉会导致 hydration 错位。要减小体积请在 config.mts 开 vite: { build: { minifyHtml: true } }。')
  }
}

function copyAll() {
  if (!existsSync(src)) return
  mkdirSync(dist, { recursive: true })
  for (const name of readdirSync(src)) {
    const s = join(src, name)
    statSync(s).isDirectory() ? cpSync(s, join(dist, name), { recursive: true }) : cpSync(s, join(dist, name))
  }
  console.log(`[public] 已同步 -> ${dist}`)
}

/** 只服务 public/ 下的文件（与 .vitepress/theme/middleware.ts 同逻辑，那个插件在 vitepress 下不生效，仅备查） */
function handler(req, res) {
  const rel = normalize(decodeURIComponent((req.url || '/').split('?')[0])).replace(/^[\\/]+/, '')
  if (!rel || rel.startsWith('..')) {
    res.writeHead(404).end()
    return
  }
  const file = join(src, rel)
  if (!file.startsWith(src) || !existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404).end()
    return
  }
  res.writeHead(200, {
    'Content-Type': MIME[extname(file).toLowerCase()] || 'application/octet-stream',
    'Cache-Control': 'no-cache',
  })
  createReadStream(file).pipe(res)
}

copyAll()

if (WATCH) {
  // 不用 fs.watch：Node 对 Windows 目录的递归监听抛 ERR_FEATURE_UNAVAILABLE_ON_PLATFORM。
  // 直接定时补拷——public/ 只有几个文件，幂等复制，开销可忽略。
  setInterval(copyAll, 2000).unref?.()
  console.log('[public] 每 2s 补拷一次（fs.watch 在 Windows 不可用）')
}

if (DEV) {
  createServer(handler).listen(STATIC_PORT, '0.0.0.0', () => {
    console.log(`[public] 静态文件服务 http://0.0.0.0:${STATIC_PORT}/（dev 专用）`)
  })
}
checkSsrMarkers()
