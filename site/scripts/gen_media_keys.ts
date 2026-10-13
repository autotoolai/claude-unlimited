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

const entries = readdirSync(vdir)
  .filter((f) => f.endsWith('.mp4'))
  .sort()
  .map((f) => `  'videos/${f}': 'videos/${path.basename(f, '.mp4')}.${h8(path.join(vdir, f))}.mp4',`)

const src = readFileSync(cfg, 'utf8')
const block = `export const VIDEO_KEYS: Record<string, string> = {\n${entries.join('\n')}\n}`
const next = src.replace(/export const VIDEO_KEYS: Record<string, string> = \{[\s\S]*?\n\}/, block)
if (next === src && process.argv.includes('--check')) {
  // 内容一致也算通过；只有与磁盘不一致才走到这里
  console.log('[media-keys] 一致')
}
if (!process.argv.includes('--check')) {
  if (!existsSync(cfg)) throw new Error(`找不到 ${cfg}`)
  writeFileSync(cfg, next, 'utf8')
  console.log(`[media-keys] 已回写 ${entries.length} 条`)
} else {
  const want = new RegExp(block.replace(/[.*+?^${}()|[\]\]/g, '\$&'))
  if (!want.test(next)) {
    console.error('[media-keys] 与 public/videos 不一致，先跑 npx tsx scripts/gen_media_keys.ts')
    process.exit(1)
  }
  console.log('[media-keys] 一致')
}
