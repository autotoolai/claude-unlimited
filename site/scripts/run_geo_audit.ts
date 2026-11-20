/**
 * 第三方 GEO 审计（geo-optimizer-skill）月度跑分 —— 只做审计，不进内容生成链。
 *
 * 与自研 `npm run audit:geo` 的分工：
 *   - audit_geo.ts     看「我们自己的产物齐不齐」（llms.txt / md 镜像 / 答案胶囊），确定性门禁，进 build 链。
 *   - run_geo_audit   看「外部工具怎么评价我们」，第三方视角，同一把尺子跟历史比，不进 build 链。
 * 两者的分数不可直接相减（评分模型不同），只各自看趋势。
 *
 * 用法：
 *   npm run audit:geo:external                # 跑审计并写 docs/geo_audit_baseline.md
 *   npm run audit:geo:external -- --keep      # 保留原始 JSON（默认写到 temp/）
 *
 * 依赖：第三方工具用 uv 隔离安装，不进本仓依赖：
 *   uv tool install geo-optimizer-skill       # 装出 geo / geo-mcp / geo-web 三个可执行文件
 * 找不到 geo 时脚本会跳过并给出安装提示，不让 CI 变红（这是审计工具，不是门禁）。
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { siteConfig } from '../config/site'

const root = process.cwd()
const repoDocs = resolve(root, '..', 'docs')
const tempDir = join(root, 'temp', 'seo_probe')
const KEEP = process.argv.includes('--keep')

/** 站点对外地址（config/site.ts 是唯一真源）。 */
const SITE = siteConfig.url.replace(/\/+$/, '')
const SITEMAP = `${SITE}/sitemap.xml`

/** 找 geo 可执行文件：PATH → uv tool 目录 → Windows 用户目录下的 .local/bin。 */
function findGeo(): string | null {
  const isWin = process.platform === 'win32'
  const home = process.env.USERPROFILE || process.env.HOME || ''
  const candidates = [
    'geo',
    'geo.exe',
    join(home, '.local', 'bin', isWin ? 'geo.exe' : 'geo'),
    join(home, '.local', 'share', 'uv', 'tools', 'geo-optimizer-skill', 'bin', 'geo'),
  ]
  for (const c of candidates) {
    try {
      if (c.includes('/') || c.includes('\\')) {
        if (existsSync(c)) return c
      } else {
        const r = spawnSync(isWin ? 'cmd' : 'sh', isWin ? ['/c', 'where', c] : ['-c', `command -v ${c}`], {
          encoding: 'utf8',
        })
        if (r.status === 0) return c
      }
    } catch {
      /* 试下一个 */
    }
  }
  return null
}

const geo = findGeo()
if (!geo) {
  console.log('[audit:geo:external] 未找到 geo 可执行文件，跳过第三方审计。')
  console.log('  安装：uv tool install geo-optimizer-skill')
  process.exit(0)
}

mkdirSync(tempDir, { recursive: true })
const rawPath = join(tempDir, 'geo_audit_external.json')

console.log(`[audit:geo:external] 审计 ${SITEMAP}`)
const args = ['audit', '--sitemap', SITEMAP, '--score-version', '4', '--format', 'json', '--output', rawPath]
const run = spawnSync(geo, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
if (run.stderr) process.stderr.write(run.stderr)

// 工具把报告写进 --output；退出码非 0 也可能已写出报告（部分页面失败时它仍 exit 0）。
if (!existsSync(rawPath)) {
  console.error('[audit:geo:external] 未产出报告，第三方审计失败。')
  process.exit(0)
}

type Page = {
  url: string
  score: number
  band: string
  http_status: number
  error: string | null
  score_breakdown: Record<string, number>
}
type Report = {
  timestamp: string
  average_score: number
  average_band: string
  successful_urls: number
  failed_urls: number
  audited_urls: number
  band_counts: Record<string, number>
  average_score_breakdown: Record<string, number>
  pages: Page[]
}

const report: Report = JSON.parse(readFileSync(rawPath, 'utf8'))

/** 自研 audit_geo 的分数：同一份产物、同一时刻，两者并列可比。 */
function selfScore(): string {
  // audit_geo 在有未通过项时 exit 1，所以 stdout 要从异常里取。
  const grab = (out: string) => out.match(/分数\s*(\d+)\/100/)?.[1]
  // 直接跑本仓的 tsx，不走 npx：npx 在部分 npm 版本下会把参数吞掉。
  const tsxCli = join(root, 'node_modules', 'tsx', 'dist', 'cli.mjs')
  const cmd = existsSync(tsxCli) ? process.execPath : 'npx'
  const cmdArgs = existsSync(tsxCli)
    ? [tsxCli, 'scripts/audit_geo.ts']
    : ['tsx', 'scripts/audit_geo.ts']
  try {
    const out = execFileSync(cmd, cmdArgs, { encoding: 'utf8', cwd: root })
    return grab(out) ?? '?'
  } catch (e) {
    return grab(String((e as { stdout?: string }).stdout ?? '')) ?? '?'
  }
}

const self = selfScore()
const worst = [...report.pages].sort((a, b) => (a.score ?? 0) - (b.score ?? 0)).slice(0, 10)
const breakdown = report.average_score_breakdown ?? {}

const lines = [
  '# GEO 审计基线',
  '',
  '> 两把尺子并列：**自研** `npm run audit:geo`（产物齐全度，确定性门禁，进 build 链）与',
  '> **第三方** `geo-optimizer-skill`（外部视角，同一把尺子看月度趋势，不进 build 链）。',
  '> 两者评分模型不同，分数不可相减，只各自看趋势。',
  '',
  `| 口径 | 分数 | 说明 |`,
  `|---|---|---|`,
  `| 自研 audit_geo | ${self}/100 | 产物齐全度与内容质量，${report.pages.length} 页在线审计 |`,
  `| 第三方 geo-optimizer | ${report.average_score}/100 | 平均分，等级 ${report.average_band}；成功 ${report.successful_urls} 页 / 失败 ${report.failed_urls} 页 |`,
  '',
  `审计时间：${report.timestamp}｜对象：${SITEMAP}`,
  '',
  '## 第三方评分明细（平均分拆解）',
  '',
  '| 维度 | 得分 |',
  '|---|---|',
  ...Object.entries(breakdown).map(([k, v]) => `| ${k} | ${v} |`),
  '',
  '## 分级分布',
  '',
  '| 等级 | 页数 |',
  '|---|---|',
  ...Object.entries(report.band_counts ?? {}).map(([k, v]) => `| ${k} | ${v} |`),
  '',
  '## 最低分页面',
  '',
  '| 分数 | 等级 | 页面 |',
  '|---|---|---|',
  ...worst.map((p) => `| ${p.score} | ${p.band} | ${p.url.replace(SITE, '') || '/'} |`),
  '',
  '## 怎么跑',
  '',
  '```bash',
  'uv tool install geo-optimizer-skill',
  'npm run audit:geo:external',
  '```',
  '',
  '> 线上访问不稳定时（Cloudflare anycast 选路，见记忆 `cf-pages-cn-edge-routing`），',
  '> 可设 `HTTPS_PROXY` 走稳定出口再跑，否则成功页数会掉到 0。',
  '',
]

writeFileSync(join(repoDocs, 'geo_audit_baseline.md'), lines.join('\n'), 'utf8')
console.log(
  `[audit:geo:external] 第三方 ${report.average_score}/100（${report.average_band}）· 自研 ${self}/100 · 已写入 ${join(repoDocs, 'geo_audit_baseline.md')}`,
)

if (!KEEP) {
  console.log(`[audit:geo:external] 原始报告：${rawPath}`)
}
