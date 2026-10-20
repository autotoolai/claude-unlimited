/**
 * 发布一篇知识库文章：把草稿从 content/drafts/ 移进 docs/knowledge/，并检查发布前的硬前提。
 *
 * 为什么「发布」只是移一个文件：dist、sitemap、llms.txt、_redirects、OG、JSON-LD 全部从
 * docs/ 与 config/knowledge.ts 派生。md 进了 docs/、条目在 config 里，各生成脚本就自然带上它；
 * 反过来草稿期两者都不动，线上就完全没有它。所以发布动作刻意做得比想象中少——
 * 少到不可能漏掉某个派生物。
 *
 * 本脚本不跑 build、不部署：build 由 npm run build 一条命令覆盖，部署由
 * scripts/deploy_claude_unlimited_site.ps1 负责。这里做「移文件 + 前提校验 + 视频上传 + 打印后续命令」。
 *
 * 视频是唯一必须在移动 md 之前就做完的外部动作：草稿期 41802 上看的是本机文件，
 * 线上产物指向 R2，R2 上只有带内容哈希的文件名。文章里有 <VideoPlayer> 就必须先上传，
 * 否则发布出去的页面是黑框。这条检查与媒体上传都写在移动 md 之前，失败时草稿原地不动。
 *
 * 用法：
 *   npx tsx scripts/publish_knowledge_article.ts --slug=my-article
 */
import { existsSync, readFileSync, renameSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

// 用脚本目录定位 site/，任意工作目录都能跑（原来用 process.cwd()，从仓库根跑会找不到 drafts）
const root = resolve(import.meta.dirname, '..', '..', '..')
// config/knowledge.ts 按绝对 URL 动态导入：脚本搬到 content/knowledge/scripts/ 后，相对路径 '../config/knowledge'
// 会指向 content/knowledge/config（不存在）。与 check_draft.mjs 同一个原因。
const { knowledge } = await import(pathToFileURL(resolve(root, 'config', 'knowledge.ts')).href)
const slug = process.argv.find((a) => a.startsWith('--slug='))?.slice(7)

if (!slug) {
  console.error('用法：npx tsx scripts/publish_knowledge_article.ts --slug=<slug>')
  process.exit(1)
}
if (!/^[a-z0-9-]+$/.test(slug)) {
  console.error(`[publish] slug 只能是小写字母、数字与短横线：${slug}`)
  process.exit(1)
}

const draft = join(root, 'content', 'knowledge', 'drafts', `${slug}.md`)
const target = join(root, 'docs', 'knowledge', `${slug}.md`)

/* ---------- 0. 预览副本先收掉：open_draft 打开的 docs/knowledge/_draft-<slug>.md 与草稿是两份文件 ---------- */
// 不收掉的话，发布后草稿区与 docs/knowledge/ 各留一份，改哪一份都不生效，是最难查的一类问题。
const previewCopy = join(root, 'docs', 'knowledge', `_draft-${slug}.md`)
if (existsSync(previewCopy)) {
  if (!existsSync(draft)) {
    console.error(`[publish] 预览副本 docs/knowledge/_draft-${slug}.md 存在，但 content/knowledge/drafts/${slug}.md 不在`)
    console.error('[publish] 草稿区已被清空却还开着预览，手动删掉那个副本，或重新放回草稿再发布。')
    process.exit(1)
  }
  rmSync(previewCopy)
  console.log(`[publish] 已删除预览副本 docs/knowledge/_draft-${slug}.md（内容仍在草稿区）`)
}

/* ---------- 1. 草稿存在且已过体检 ---------- */

if (!existsSync(draft)) {
  console.error(`[publish] 找不到草稿：content/drafts/${slug}.md`)
  console.error('[publish] 若文章已经发布过，目标文件已存在，不需要再发布。')
  process.exit(1)
}
if (existsSync(target)) {
  console.error(`[publish] 目标已存在：docs/knowledge/${slug}.md`)
  console.error('[publish] 这篇可能已经发布过。确认两篇不是同一篇再处理，不要直接覆盖。')
  process.exit(1)
}

console.log(`[publish] 草稿体检：npm run check:draft -- --slug=${slug}`)
const { spawnSync } = await import('node:child_process')
const check = spawnSync(process.execPath, [join(root, 'content', 'knowledge', 'scripts', 'check_draft.mjs'), `--slug=${slug}`], {
  stdio: 'inherit',
})
if (check.status !== 0) {
  console.error('[publish] 草稿体检未通过，已中止。先修掉 [fail] 项再发布。')
  process.exit(1)
}

/* ---------- 2. config 条目前提：faq 3–5 条、related 3 篇且都已发布 ---------- */

const meta = knowledge.find((k) => k.slug === slug)
if (!meta) {
  console.error(`[publish] config/knowledge.ts 里没有 slug '${slug}' 的条目`)
  console.error('[publish] 请先加条目（faq 3–5 条、related 3 篇），再运行本脚本。')
  process.exit(1)
}

const faqN = meta.faq?.length ?? 0
if (faqN < 3 || faqN > 5) {
  console.error(`[publish] faq ${faqN} 条，必须 3–5 条（check_dist 与 verify_build 都按这个范围断言）`)
  process.exit(1)
}

const related = meta.related ?? []
if (related.length !== 3) {
  console.error(`[publish] related ${related.length} 篇，必须 3 篇`)
  process.exit(1)
}
const missing = related.filter((r) => !existsSync(join(root, 'docs', 'knowledge', `${r}.md`)))
if (missing.length) {
  console.error(`[publish] related 指向尚未发布的文章：${missing.join('、')}`)
  console.error('[publish] 发布后这些链接会 404。先改指已发布的文章。')
  process.exit(1)
}

/* ---------- 3. 移到 docs/knowledge/ ---------- */

const md = readFileSync(draft, 'utf8')
if (/\bdraft:\s*true\b/.test(md)) {
  console.error('[publish] frontmatter 里还留着 draft: true，请删掉这一行再发布')
  process.exit(1)
}

renameSync(draft, target)
console.log(`[publish] 已移动 content/drafts/${slug}.md -> docs/knowledge/${slug}.md`)

/* ---------- 4. 后续命令 ---------- */

console.log('')
/* ---------- 视频：草稿期看本地，发布必须上传到 R2 ---------- */
/*
 * 为什么发布时要单独处理视频：草稿在 41802 上看，config/media_cdn.ts 按端口把 VIDEO_CDN 置空，
 * 视频从本机 public/videos/ 播放。但线上产物里 src 是 R2 地址（R2 上只存带内容哈希的文件名，
 * 无哈希名一律 404）。所以草稿期能播 ≠ 线上能播：<VideoPlayer> 用到的每支 mp4 都必须在 R2 上有对象。
 *
 * 这里做三件事：找出文章里 <VideoPlayer src="..."> 的每个文件、重算哈希映射、上传并校验远端。
 * 任何一步失败都在移动 md 之前退出——草稿还在，不会出现「发布到一半」。
 */
const mdBody = readFileSync(target, 'utf8')
const videoSrcs = [...mdBody.matchAll(/<VideoPlayer[^>]*src=["']([^"']+)["']/g)].map((m) => m[1])
const videosDir = join(root, 'public', 'videos')

if (videoSrcs.length) {
  console.log(`[publish] 文章内嵌 ${videoSrcs.length} 支视频，先上传到 R2`)
  // 1. 本地文件必须在
  const missing = videoSrcs.filter((f) => !existsSync(join(videosDir, f)))
  if (missing.length) {
    console.error(`[publish] public/videos/ 下缺少：${missing.join('、')}`)
    console.error('[publish] 草稿期本地能看是因为它就在那个目录；线上要走 R2，必须先有本地文件。')
    process.exit(1)
  }
  // 2. poster 必须与视频同名（VideoPlayer 的 poster 由 src 推导，缺了首帧就是空白）
  const missingPoster = videoSrcs.filter((f) => !existsSync(join(videosDir, 'poster', f.replace(/\.mp4$/, '.jpg'))))
  if (missingPoster.length) {
    console.error(`[publish] 缺少首帧缩略图：${missingPoster.map((f) => f.replace(/\.mp4$/, '.jpg')).join('、')}`)
    console.error('[publish] 跑 npm run gen:poster 生成后再发布，否则抓第一帧的平台会显示空白。')
    process.exit(1)
  }
  // 3. 重算哈希映射并回写 media_cdn.ts（视频换过内容就必须重算，否则指向旧对象）
  const run = (cmd: string, args: string[]) => {
    const r = spawnSync(cmd, args, { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' })
    if (r.status !== 0) {
      console.error(`[publish] ${cmd} ${args.join(' ')} 失败，已停在移动前，草稿还在 drafts/`)
      process.exit(1)
    }
  }
  run('npx', ['tsx', join(root, 'scripts', 'gen_media_keys.ts')])
  // 4. 实际上传。upload_media.py 上传后会拉远端对象比大小，校验不过自己会退出。
  run('python', [join(root, 'scripts', 'upload_media.py')])
  console.log('[publish] 视频已上传并校验通过')
}

console.log('[publish] 接下来按顺序跑：')
if (videoSrcs.length) console.log(`  npx tsx scripts/gen_media_keys.ts --check   # 确认视频映射与磁盘一致（已自动跑过一遍）`)
console.log(`  npm run gen:routes                    # public/_redirects 尾斜杠 301`)
console.log(`  npm run gen:llms                     # public/llms.txt 与 llms-full.txt`)
console.log(`  npm run gen:og:knowledge             # public/og/knowledge_${slug}.png`)
if (meta.sourceSlug) console.log(`  npm run gen:sources                   # ${slug} 的素材归档（sourceSlug=${meta.sourceSlug}）`)
console.log(`  npm run build                        # 含 check_dist / check:links / check:css`)
console.log(`  npm run check:toc -- --slug=${slug}   # 目录锚点与 FAQPage 条数（${meta.cat} 分类）`)
console.log(`  npm run verify                       # 全站验收`)
console.log('')
console.log('[publish] 全部通过后再发版：')
console.log('  pwsh -File scripts/deploy_claude_unlimited_site.ps1')