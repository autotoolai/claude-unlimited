/**
 * 构建后修补：把本地样式表的 link 标签补成真正的 stylesheet 关系。
 *
 * 问题（本机 vitepress 1.6.4 + vite 5.4.21 实测）：
 *   产物 HTML 里本地 CSS 只渲染成 `<link rel="preload stylesheet" href="/assets/style.*.css" as="style">`，
 *   缺 `rel="stylesheet"`。浏览器只预加载不应用，整份样式被丢弃，页面看起来像「没有 CSS」。
 *   外链字体标签正常，因为它们是用户在 head 里手写的 rel="stylesheet"。
 *
 * 为什么在这里补：
 *   样式表文件名由 vite 的 hash 生成，构建前拿不到最终 href；
 *   VitePress 的 head/meta 钩子只作用于静态配置，拿不到每页实际渲染出的 link 标签；
 *   buildEnd 在 SSG 全部写完 dist 之后触发，是唯一能拿到最终 HTML 与最终文件名的钩子。
 *
 * 修法：预加载标签保留（不损失预加载收益），另插入一条真正的 rel="stylesheet"。
 * 只处理本地 href（以 / 开头），外链（https://fonts.googleapis.com…）不动。
 */
import fs from 'node:fs'
import path from 'node:path'

const DIST = path.resolve(process.cwd(), '.vitepress', 'dist')

/** 收集 dist 下所有 html */
function htmlFiles(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) htmlFiles(full, out)
    else if (e.name.endsWith('.html')) out.push(full)
  }
  return out
}

/** rel="preload stylesheet" → 后面补一条 rel="stylesheet" */
function fixOne(html) {
  // 匹配：<link rel="preload stylesheet" href="/xxx.css" as="style">
  const re = /<link rel="preload stylesheet" href="(\/[^"]+\.css)" as="style">/g
  let changed = 0
  const next = html.replace(re, (tag, href) => {
    changed += 1
    return `${tag}\n<link rel="stylesheet" href="${href}">`
  })
  return { next, changed }
}

if (!fs.existsSync(DIST)) {
  console.error('[fix_css_links] 找不到 dist，跳过')
  process.exit(0)
}

let files = 0
let links = 0
for (const f of htmlFiles(DIST)) {
  const src = fs.readFileSync(f, 'utf8')
  const { next, changed } = fixOne(src)
  if (changed > 0) {
    fs.writeFileSync(f, next)
    files += 1
    links += changed
  }
}

console.log(`[fix_css_links] 已给 ${links} 个样式表补上 rel="stylesheet"（${files} 个 html）`)
if (links === 0) {
  console.log('[fix_css_links] 无需修补：产物里的本地样式表关系已正确')
}