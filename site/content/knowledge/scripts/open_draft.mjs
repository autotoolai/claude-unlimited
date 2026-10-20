/**
 * 打开一篇草稿在 41800 站点 dev 上的预览：把 content/knowledge/drafts/<slug>.md 复制到
 * docs/knowledge/_draft-<slug>.md，让 vitepress dev 按与已发布文章完全相同的路径渲染它。
 *
 * 副本为什么带 _draft- 前缀：这样 .gitignore 的 `docs/knowledge/_draft-*.md` 能挡住它，
 * 忘关时 `git status` 里不会出现一个看起来像正式文章的 md，不会被误 commit。
 * 代价是路由由前缀反解（KnowledgeDoc 的 slug 解析容忍 `_draft-`），三个脚本都要认这个前缀。
 * 日常预览用 41802（npm run draft:preview），不产生副本；这条命令只用于「在站点 dev 里确认这个文件本身没问题」。
 *
 * 为什么是「复制」而不是插件或 rewrites（两条都实测过，走不通）：
 *  - vitepress 的 `rewrites` 只在 srcDir（docs/）内部重排「已经存在的页面键」，草稿在 srcDir 之外，
 *    rewrites 匹配不到，路由直接 404（相对路径 / 绝对路径 / 带 .html 三种写法都试过）。
 *  - 自己写 dev 中间件 + pluginContainer.transform 编译草稿，会撞上 vite 的 SSR 依赖优化检查
 *    （"There is a new version of the pre-bundle for ..."），与路径无关，绕不开。
 *  草稿只要在 docs/knowledge/ 下，就走 vitepress 原生页面链路：目录、FAQ 折叠卡、页尾相关阅读、
 *  封面、主题切换全部一致，CSS 与 token 一字不改。
 *
 * 草稿会不会误上线：不会。scripts/check_dist.mjs 断言「docs/knowledge/ 下每个 md 都在
 * config/knowledge.ts 里有条目」，草稿没有条目，所以 build 一定失败——失败在 check_dist，
 * 不会进 wrangler deploy。关掉草稿后副本会被删除，构建产物里也不会残留上一次的文件（vitepress 每次构建
 * 都会清空 outDir）。
 *
 * 用法：
 *   npx tsx content/knowledge/scripts/open_draft.mjs --slug=my-article     # 打开
 *   npx tsx content/knowledge/scripts/open_draft.mjs --slug=my-article --close
 *   npx tsx content/knowledge/scripts/open_draft.mjs --list                # 列出草稿与当前状态
 */
import fs from 'node:fs'
import path from 'node:path'

// 脚本在 content/knowledge/scripts/ 下，root 要上溯三层到 site/
const root = path.resolve(import.meta.dirname, '..', '..', '..')
const DRAFTS_DIR = path.join(root, 'content', 'knowledge', 'drafts')
const PUBLISHED_DIR = path.join(root, 'docs', 'knowledge')

const args = process.argv.slice(2)
const flag = (name) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3)
const has = (name) => args.includes(`--${name}`)

if (has('list') || !args.length) {
  const drafts = fs.existsSync(DRAFTS_DIR) ? fs.readdirSync(DRAFTS_DIR).filter((f) => f.endsWith('.md') && f !== 'README.md') : []
  if (!drafts.length) {
    console.log(`[draft] ${path.relative(root, DRAFTS_DIR)} 下没有草稿`)
  } else {
    console.log('[draft] 草稿列表（★ = 正在预览）：')
    for (const f of drafts) {
      const slug = f.replace(/\.md$/, '')
      const copy = path.join(PUBLISHED_DIR, `_draft-${f}`)
      const state = fs.existsSync(copy) ? '★ 在 41800 预览中' : fs.existsSync(path.join(PUBLISHED_DIR, f)) ? '已发布' : '草稿'
      console.log(`  [${state}] ${slug}`)
    }
    console.log('')
    console.log('[draft] 打开：npx tsx content/knowledge/scripts/open_draft.mjs --slug=<slug>    关闭：加 --close')
  }
  process.exit(0)
}

const slug = flag('slug')
if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
  console.error('用法：node scripts/open_draft.mjs --slug=<slug> [--close | --list]')
  process.exit(1)
}

const draftFile = path.join(DRAFTS_DIR, `${slug}.md`)
const previewFile = path.join(PUBLISHED_DIR, `_draft-${slug}.md`)

if (has('close')) {
  if (!fs.existsSync(previewFile)) {
    console.log(`[draft] ${slug} 没有正在预览的副本`)
    process.exit(0)
  }
  if (!fs.existsSync(draftFile)) {
    console.error(`[draft] ${slug} 的预览副本存在，但 content/knowledge/drafts/${slug}.md 已不在（可能已发布）`)
    console.error('[draft] 请确认：若是发布，publish_knowledge_article.ts 会处理；若是误删，手动删掉 docs/knowledge/_draft-' + slug + '.md。')
    process.exit(1)
  }
  fs.rmSync(previewFile)
  console.log(`[draft] 已关闭 ${slug}：删除 docs/knowledge/_draft-${slug}.md`)
  console.log('[draft] 现在可以安全地 npm run build / 发版了。')
  process.exit(0)
}

if (!fs.existsSync(draftFile)) {
  console.error(`[draft] 找不到草稿：content/knowledge/drafts/${slug}.md`)
  if (fs.existsSync(path.join(PUBLISHED_DIR, `${slug}.md`))) {
    console.error(`[draft] ${slug} 已发布（docs/knowledge/${slug}.md 存在，草稿区没有）`)
  }
  process.exit(1)
}
if (fs.existsSync(previewFile) && fs.existsSync(path.join(PUBLISHED_DIR, `${slug}.md`))) {
  console.error(`[draft] ${slug} 线上已有同 slug 的文章，草稿会覆盖 41800 上的它。先决定是否重写线上文章。`)
  process.exit(1)
}

fs.mkdirSync(PUBLISHED_DIR, { recursive: true })
fs.copyFileSync(draftFile, previewFile)
console.log(`[draft] 已复制到 docs/knowledge/_draft-${slug}.md（gitignored）`)
console.log(`[draft] 在 41800 上预览：http://localhost:41800/knowledge/_draft-${slug}.html  （左下角角标必须是 DEV）`)
console.log('[draft] 每次请求前请重新跑本脚本：改的是 content/knowledge/drafts/ 那一份，预览副本不会自动同步。')
console.log('[draft] 关闭：npx tsx content/knowledge/scripts/open_draft.mjs --slug=' + slug + ' --close')
console.log('[draft] 注意：预览期间 build 会在 check_dist 失败（副本没有 config 条目），这是预期的保护。')