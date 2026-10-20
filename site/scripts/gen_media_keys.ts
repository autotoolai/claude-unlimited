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

const h8 = (p: string) => createHash('sha256').update(readFileSync(p)).digest('hex').slice(0, 8)

/** 磁盘上的视频 -> VIDEO_KEYS 里应有的 'src': 'key' 条目 */
const wanted = readdirSync(vdir)
  .filter((f) => f.endsWith('.mp4'))
  .sort()
  .map((f) => `'videos/${f}': 'videos/${path.basename(f, '.mp4')}.${h8(path.join(vdir, f))}.mp4',`)

const block = `export const VIDEO_KEYS: Record<string, string> = {\n${wanted.join('\n')}\n}`
const next = readFileSync(cfg, 'utf8').replace(
  /export const VIDEO_KEYS: Record<string, string> = \{[\s\S]*?\n\}/,
  block,
)

/** 从文件里逐行解析出实际的 'src': 'key'，不靠正则回溯 */
function parseKeys(src: string): string[] {
  const start = src.indexOf('export const VIDEO_KEYS')
  if (start < 0) return []
  const end = src.indexOf('\n}', start)
  return src
    .slice(start, end < 0 ? undefined : end)
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith("'"))
}

const check = process.argv.includes('--check')
if (!existsSync(cfg)) throw new Error(`找不到 ${cfg}`)

if (check) {
  const actual = parseKeys(next)
  const ok = actual.length === wanted.length && actual.every((l, i) => l === wanted[i])
  if (!ok) {
    console.error('[media-keys] 与 public/videos 不一致，先跑 npx tsx scripts/gen_media_keys.ts')
    const a = new Set(actual)
    const w = new Set(wanted)
    for (const l of a) if (!w.has(l)) console.error('  多余: ' + l)
    for (const l of w) if (!a.has(l)) console.error('  缺失: ' + l)
    process.exit(1)
  }
  console.log(`[media-keys] 一致（${wanted.length} 条）`)
} else {
  writeFileSync(cfg, next, 'utf8')
  console.log(`[media-keys] 已回写 ${wanted.length} 条`)
}
