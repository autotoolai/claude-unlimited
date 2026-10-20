/**
 * 草稿预览工作台：第二个 vitepress dev server，端口 41802（默认，可用 --port 改）。
 *
 * 为什么单独一个端口：41800 是站点 dev（srcDir=docs，产物与线上一致），草稿不该出现在那里；
 * 41777 是构建产物（要 npm run build 才能看，且草稿本来就不进产物）。草稿要「独立地址 + 官网样式 + 打开就能看所有草稿」，
 * 所以给它自己的 root 与自己的 dev server：root = content/knowledge/preview/（生成目录，gitignored）。
 *
 * 生成的 root 里有什么：
 *   .vitepress/theme     -> 指向站点 .vitepress/theme 的 junction（Windows 不需要管理员权限）
 *   .vitepress/config.mts -> 本文件旁边生成，主题/layout/head 与站点一致，只改 srcDir 与 port
 *   knowledge/<slug>.md   -> 已发布文章（从 docs/knowledge 同步），用于「相关阅读」等依赖 config 的渲染
 *   knowledge/<slug>.md   -> 草稿（从 content/knowledge/drafts 同步），路由相同，草稿覆盖同名已发布文章
 *   videos/*.mp4            -> 不在 root 里，来自 site/public/，由 config/media_cdn.ts 按
 *                              location.port === '41802' 自动把 VIDEO_CDN 置空来走本地（见 media_cdn.ts 注释）
 *   drafts/index.md        -> 草稿列表页（生成）：每篇的状态、体检结果、链接
 *   index.md               -> 301 到 /drafts/ 的薄壳（VitePress dev 没有中间件重定向，用 meta refresh）
 *
 * 为什么已发布文章也要同步进来：KnowledgeDoc 的页尾相关阅读、JSON-LD、面包屑都从 config/knowledge.ts 取，
 * 与正文在不在页面里无关；同步进来只是为了「从列表页点进去能跳到已发布文章」，在 41800 看就行，不必在 41802 看。
 * 同步全部文章的成本是 22 个小文件，值。
 *
 * 草稿不会被误上线：preview/ 整个目录 gitignored，站点 build 只扫 docs/，两者无关。
 *
 * 用法：
 *   node content/knowledge/scripts/preview.mjs              # 起 41802
 *   node content/knowledge/scripts/preview.mjs --port=41803
 *   node content/knowledge/scripts/preview.mjs --once       # 只生成一次内容根，不起服务（测试用）
 */
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync, spawn } from 'node:child_process'

const here = path.resolve(import.meta.dirname)
const WORKSPACE = path.resolve(here, '..') // content/knowledge
const SITE = path.resolve(WORKSPACE, '..', '..') // site/
const DRAFTS = path.join(WORKSPACE, 'drafts')
const PUBLISHED = path.join(SITE, 'docs', 'knowledge')
const PREVIEW = path.join(WORKSPACE, 'preview')
const VP = path.join(PREVIEW, '.vitepress')
const THEME_TARGET = path.join(SITE, '.vitepress', 'theme')

const args = process.argv.slice(2)
const port = args.find((a) => a.startsWith('--port='))?.slice(7) ?? '41802'
const once = args.includes('--once')

/* ---------------- 内容根生成 ---------------- */

/** 清掉上一次生成的目录内容，但保留 .vitepress/theme junction */
function resetGenerated() {
  fs.mkdirSync(PREVIEW, { recursive: true })
  for (const name of fs.readdirSync(PREVIEW)) {
    if (name === '.vitepress') continue
    fs.rmSync(path.join(PREVIEW, name), { recursive: true, force: true })
  }
  fs.mkdirSync(path.join(PREVIEW, 'knowledge'), { recursive: true })
  fs.mkdirSync(path.join(PREVIEW, 'drafts'), { recursive: true })
}

function ensureThemeLink() {
  fs.mkdirSync(VP, { recursive: true })
  const link = path.join(VP, 'theme')
  try {
    const st = fs.lstatSync(link)
    if (st.isSymbolicLink() || st.isJunction()) {
      // junction 指向是否正确：Windows 下读它
      try {
        if (fs.realpathSync(link) === fs.realpathSync(THEME_TARGET)) return
      } catch {
        /* 断链，下面重建 */
      }
      fs.rmSync(link, { recursive: true, force: true })
    } else {
      // 真实目录（例如手工拷进来的）：保留但告警，不动
      console.warn(`[preview] ${link} 是真实目录而不是链接，确认它是不是主题副本；若是副本请删掉`)
      return
    }
  } catch {
    /* 不存在 */
  }
  try {
    execFileSync('cmd', ['/c', 'mklink', '/J', link, THEME_TARGET], { stdio: 'ignore' })
  } catch {
    // mklink 不可用时退回 symlink（可能需要开发者模式）
    fs.symlinkSync(THEME_TARGET, link, 'junction')
  }
  console.log(`[preview] 主题已链接：${path.relative(PREVIEW, link)} -> ${THEME_TARGET}`)
}

/** 把配置写进 preview/.vitepress/config.mts：与站点一致，只改 srcDir / port / 允许的 host */
function writeConfig() {

  const cfg = `/**
 * 草稿预览工作台的配置（由 content/knowledge/scripts/preview.mjs 生成，勿手改）。
 * 与站点 config.mts 的差异只有三处：srcDir 指向生成目录、端口 41802、不跑 transformHead。
 */
import { defineConfig } from 'vitepress'
import { publicDirPlugin } from './theme/middleware'

/**
 * 草稿期的视频走本地文件：把 config/media_cdn.ts 里的 VIDEO_CDN 置空，
 * videoUrl() 就会回落到站点根路径（/videos/...），由 41802 自己从 site/public/ 提供。
 *
 * 为什么这么做：
 * - 视频不该在审稿阶段依赖外网。R2 域名不通或文件没传上去时，草稿页会是一排黑框，
 *   审稿人会误判「文章坏了」，而线上其实是好的。
 * - 本地 public/videos/ 里有全部 7 支 mp4 与 poster，与 media_cdn.ts 的映射一一对应，
 *   所以本地看到的画面与线上完全一致，只是不走 CDN。
 * - 只改这个生成出来的 config：站点 config 不动，build 产物里的 src 仍然是 R2 地址。
 *
 * 代价是预览时视频从 41802 自己的进程走，38MB 的片子在局域网内也能秒开，但流量不走 CDN。
 */
export default defineConfig({
  srcDir: '.',
  // 与站点一致：主题包别名必须给，否则 theme 里的 'vitepress' import 在 SSR 阶段 MODULE_NOT_FOUND
  themePackages: [{ name: '@internal/theme-default', root: './theme' }],
  cleanUrls: false,
  lastUpdated: false,
  ignoreDeadLinks: true,
  head: [
    ['link', { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    ['link', {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Lora:wght@500;600;700&family=JetBrains+Mono:wght@400;600&family=Noto+Serif+SC:wght@500;600&display=swap',
    }],
  ],
  vite: {
    plugins: [publicDirPlugin()],
    server: {
      host: true,
      port: ${port},
      strictPort: true,
      allowedHosts: ['.ts.net'],
    },
  },
})
`
  fs.writeFileSync(path.join(VP, 'config.mts'), cfg, 'utf8')
}

/** frontmatter 顶层标量（够用，不引 yaml） */
function frontmatter(md) {
  const m = md.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!m) return {}
  const out = {}
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([a-zA-Z_][\w-]*):\s*(.*)$/)
    if (kv) out[kv[1]] = kv[2].trim().replace(/^['"]|['"]$/g, '')
  }
  return out
}

function syncContent() {
  resetGenerated()
  const drafts = []
  if (fs.existsSync(DRAFTS)) {
    // 排除 .source.md / .review.md：它们是素材卡与预览记录，不是文章
    for (const f of fs.readdirSync(DRAFTS).filter((f) => f.endsWith('.md') && !f.endsWith('.source.md') && !f.endsWith('.review.md'))) {
      const slug = f.replace(/\.md$/, '')
      const md = fs.readFileSync(path.join(DRAFTS, f), 'utf8')
      fs.writeFileSync(path.join(PREVIEW, 'knowledge', f), md, 'utf8')
      const fm = frontmatter(md)
      const h2 = [...md.matchAll(/^##\s+(.+)$/gm)].map((m) => m[1].trim()).filter((t) => !/^(常见问题|相关阅读)$/.test(t))
      const hasAnswer = /^>\s*\*\*一句话答案\*\*：(.+)$/m.test(md)
      drafts.push({
        slug,
        title: fm.title ?? slug,
        desc: fm.description ?? '',
        cat: fm.category ?? '',
        kicker: fm.kicker ?? '',
        h2: h2.length,
        answer: hasAnswer,
        src: path.join('..', 'drafts', f),
        review: fs.existsSync(path.join(DRAFTS, `${slug}.review.md`)),
        source: fs.existsSync(path.join(DRAFTS, `${slug}.source.md`)),
        published: fs.existsSync(path.join(PUBLISHED, `${slug}.md`)),
      })
    }
  }
  drafts.sort((a, b) => a.slug.localeCompare(b.slug))

  // 已发布文章同步（草稿同 slug 时草稿覆盖，因为写在前面的草稿被同名已发布文件覆盖）
  if (fs.existsSync(PUBLISHED)) {
    for (const f of fs.readdirSync(PUBLISHED).filter((f) => f.endsWith('.md') && f !== 'index.md' && !f.startsWith('SOP-'))) {
      if (drafts.some((d) => `${d.slug}.md` === f)) continue
      fs.copyFileSync(path.join(PUBLISHED, f), path.join(PREVIEW, 'knowledge', f))
    }
  }

// 列表页：数据走 frontmatter 的 YAML 数组（gray-matter 原生支持，SSR 就渲染出卡片），
  // 正文只放说明。DraftIndex.vue 从 frontmatter.drafts 读，不解析正文 DOM。
  // YAML 列表的换行 + 4 空格缩进：drafts: 下每条形如「  - slug: ..」换行后「    title: ..」
  const NL = String.fromCharCode(10) + '    '
  const DASH = '  - '
  const q = (v) => JSON.stringify(String(v ?? ''))
  const yamlList = drafts
    .map((d) => {
      const issues = []
      if (!d.answer) issues.push('缺「一句话答案」引用块')
      if (d.h2 < 3) issues.push(`H2 只有 ${d.h2} 个，至少 3 个`)
      const items = [
        `slug: ${q(d.slug)}`,
        `title: ${q(d.title)}`,
        `desc: ${q(d.desc)}`,
        `cat: ${q(d.cat)}`,
        `kicker: ${q(d.kicker)}`,
        `h2: ${d.h2}`,
        `answer: ${d.answer ? 'true' : 'false'}`,
        `source: ${d.source ? 'true' : 'false'}`,
        `review: ${d.review ? 'true' : 'false'}`,
        `published: ${d.published ? 'true' : 'false'}`,
        `issues: [${issues.map(q).join(', ')}]`,
      ]
      return DASH + items.join(NL)
    })
    .join(String.fromCharCode(10))

  // drafts: 下第一行直接顶格 '- slug: ".."'，后续字段缩进 4 空格
  const draftsFm = drafts.length ? String.fromCharCode(10) + yamlList : ' []'
  fs.writeFileSync(
    path.join(PREVIEW, 'drafts', 'index.md'),
    [
      '---',
      'layout: DraftIndex',
      'title: 草稿工作台',
      'description: 知识库草稿列表：状态、体检结果、预览入口。',
      `drafts:${draftsFm}`,
      '---',
      '',
      '正文由卡片代替，这里不放文字。',
      '',
    ].join(String.fromCharCode(10)),
    'utf8',
  )

  // 根路由：VitePress dev 没有重定向中间件，用薄壳页 + 脚本跳 /drafts/
  const shell = [
    '---',
    'layout: page',
    'title: 草稿工作台',
    '---',
    '',
    '<script setup>window.location.replace(\'/drafts/\')</script>',
    '',
    '请直接打开 [草稿列表](/drafts)。',
    '',
  ].join(String.fromCharCode(10))
  fs.writeFileSync(path.join(PREVIEW, 'index.md'), shell, 'utf8')

  return drafts
}
/* ---------------- 启动 ---------------- */

ensureThemeLink()
writeConfig()
const drafts = syncContent()
console.log(`[preview] 内容根已生成：${drafts.length} 篇草稿、${fs.readdirSync(path.join(PREVIEW, 'knowledge')).length} 篇文章`)

if (once) {
  console.log('[preview] --once：只生成内容根，不起服务')
  process.exit(0)
}

// 内容同步：vitepress dev 自己会 watch root 里的 md，但 drafts/ 不在 root 的 watch 范围内，
// 所以这里另起一个 watcher：草稿或已发布文章变了就重新同步（覆盖写入会触发 vite 的 HMR）。
const sync = () => {
  try {
    const n = syncContent().length
    console.log(`[preview] 已重新同步（${n} 篇草稿）`)
  } catch (e) {
    console.error(`[preview] 同步失败：${e.message}`)
  }
}
for (const dir of [DRAFTS, PUBLISHED]) {
  if (fs.existsSync(dir)) fs.watch(dir, { persistent: true }, (_e, f) => f?.endsWith('.md') && sync())
}

const { createServer } = await import('vitepress')
const server = await createServer(PREVIEW, { port: Number(port), strictPort: true })
await server.listen()
console.log('')
console.log(`[preview] 草稿工作台：http://localhost:${port}/drafts/   （同 Wi-Fi / Tailscale 把 localhost 换成 <本机 Tailscale IP>）`)
console.log(`[preview] 站点 dev 仍是 41800，草稿不出现在那里；本进程只读 docs/knowledge 与 content/knowledge/drafts`)
console.log('[preview] Ctrl+C 退出')
process.on('SIGINT', () => {
  server.close().finally(() => process.exit(0))
})