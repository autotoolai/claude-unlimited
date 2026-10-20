/**
 * 重算 R2 上的视频产物名（内容哈希后缀），并回写 config/media_cdn.ts 的 VIDEO_KEYS。
 *
 * 为什么需要这一步：产物名里的哈希必须等于文件实际内容的哈希，站点才不会指向一个
 * 还没上传、或指向旧内容的对象。视频一换就得跑一次，然后 npm run upload:media。
 *
 * 用法：
 *   npx tsx scripts/gen_media_keys.ts          # 回写 VIDEO_KEYS
 *   npx tsx scripts/gen_media_keys.ts --check   # 只校验，不一致时 exit 1（CI 用）
 */
import {createHash} from 'node:crypto'
import {existsSync, readFileSync, readdirSync, writeFileSync} from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const vdir = path.join(root, 'public', 'videos')
const cfg = path.join(root, 'config', 'media_cdn.ts')

if (!existsSync(cfg)) throw new Error(`找不到 ${cfg}`)

const h8 = (p: string) => createHash('sha256').update(readFileSync(p)).digest('hex').slice(0, 8)

/** 磁盘上的视频 -> VIDEO_KEYS 里应有的 'src': 'key' 条目 */
const wanted = existsSync(vdir)
  ? readdirSync(vdir)
      .filter((f) => f.endsWith('.mp4'))
      .sort()
      .map((f) => `'videos/${f}': 'videos/${path.basename(f, '.mp4')}.${h8(path.join(vdir, f))}.mp4',`)
  : []

const src = readFileSync(cfg, 'utf8')
const block = `export const VIDEO_KEYS: Record<string, string> = {\n${wanted.join('\n')}\n}`
const next = src.replace(
  /export const VIDEO_KEYS: Record<string, string> = \{[\s\S]*?\n\}/,
  block,
)

/** 从文件里逐行解析出实际的 'src': 'key'，不靠正则回溯 */
function parseKeys(text: string): string[] {
  const start = text.indexOf('export const VIDEO_KEYS')
  if (start < 0) return []
  const end = text.indexOf('\n}', start)
  return text
    .slice(start, end < 0 ? undefined : end)
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith("'"))
}

const check = process.argv.includes('--check')

/**
 * 本地没有 mp4 就无法校验映射（视频源文件在 R2 托管、不入库），此时一律跳过：
 * 既不报错，也不回写 —— 否则「克隆下来跑一次 gen:media_keys」会把已登记的映射清空，
 * 线上所有视频链接随即失效。公开仓库（视频不入库）就是这种状态。
 */
if (wanted.length === 0) {
  console.log('[media-keys] 跳过：本地 public/videos 没有 mp4（视频源文件在 R2 托管、不入库），无法校验映射')
  process.exit(0)
}

if (check) {
  // 比对「已登记的」与「磁盘算出的」两份，不是拿回写后的新块跟自己比：
  // 那样比恒等，映射漂移了也永远查不出来（这个门禁曾经就是这样形同虚设的）。
  const committed = parseKeys(src)
  const a = new Set(committed)
  const w = new Set(wanted)
  const extra = [...a].filter((l) => !w.has(l))
  const missing = [...w].filter((l) => !a.has(l))
  if (extra.length || missing.length) {
    console.error('[media-keys] 与 public/videos 不一致，先跑 npx tsx scripts/gen_media_keys.ts')
    for (const l of extra) console.error('  多余: ' + l)
    for (const l of missing) console.error('  缺失: ' + l)
    process.exit(1)
  }
  console.log(`[media-keys] 一致（${wanted.length} 条）`)
} else {
  writeFileSync(cfg, next, 'utf8')
  console.log(`[media-keys] 已回写 ${wanted.length} 条`)
}
