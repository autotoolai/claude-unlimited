/**
 * llms.txt 规范校验门禁（P1-3）。
 *
 * 用第三方校验器 @aia-matrix/llms-txt-validator（MIT）跑本地 llms.txt，
 * 只取它的 format.* 系列规则（llmstxt.org 格式规范），不跑网络检查：
 *   - 网络检查会去抓 llms.txt 里每一个链接，Cloudflare Pages 在国内线路
 *     有落到 LAX 边缘节点导致 20-60s 超时的情况（见记忆 cf-pages-cn-edge-routing），
 *     放进 CI 会变成随机失败；链接可达性由 check:links 与 check:repo-mirrors 负责。
 *   - 我们要守的是「格式对不对」：每个 H2 小节必须是链接清单、条目必须以链接开头、
 *     链接后的说明必须以冒号开头。这几条格式错会让部分 AI 客户端直接放弃解析。
 *
 * 用法：tsx scripts/check_llms_txt.ts [--json]
 * 退出码：0 = 通过；1 = 有 fail 项。
 */
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { siteConfig } from '../config/site'

const publicLlms = join(process.cwd(), 'public', 'llms.txt')
const repoLlms = join(process.cwd(), '..', 'llms.txt')

if (!existsSync(publicLlms)) {
  console.error(`[llms-check] 缺 ${publicLlms}，先跑 npm run gen:llms`)
  process.exit(1)
}

// 仓库根那份 llms.txt 必须与 site/public 那份逐字节一致（GitHub 侧索引入口）。
if (existsSync(repoLlms)) {
  const a = readFileSync(publicLlms, 'utf8')
  const b = readFileSync(repoLlms, 'utf8')
  if (a !== b) {
    console.error('[llms-check] 仓库根 llms.txt 与 site/public/llms.txt 不一致，跑 npm run gen:repo-mirrors')
    process.exit(1)
  }
} else {
  console.error(`[llms-check] 缺仓库根 llms.txt（${repoLlms}），跑 npm run gen:repo-mirrors`)
  process.exit(1)
}

// Windows 上 npx 是 npx.cmd（.cmd 不是真正的可执行文件，spawnSync 直接起会 EINVAL），
// 所以走 cmd /c。其余平台直接起 npx。
const isWin = process.platform === 'win32'
const npxArgs = ['--yes', '@aia-matrix/llms-txt-validator', publicLlms, '--json', '--no-network']
const res = isWin
  ? spawnSync('cmd', ['/c', 'npx', ...npxArgs], { encoding: 'utf8' })
  : spawnSync('npx', npxArgs, { encoding: 'utf8' })

if (res.error) {
  console.error(`[llms-check] 无法运行校验器：${res.error.message}`)
  process.exit(1)
}

// 校验器退出码 2 = 工具自身报错（不是校验失败），要区别对待。
if (res.status === 2) {
  console.error(`[llms-check] 校验器执行失败：\n${res.stdout || res.stderr}`)
  process.exit(1)
}

let report: { summary?: { pass?: number; info?: number; warn?: number; fail?: number }; results?: Array<{ id: string; status: string; message: string }> }
try {
  report = JSON.parse(res.stdout)
} catch {
  console.error(`[llms-check] 校验器输出不是 JSON：\n${res.stdout}\n${res.stderr}`)
  process.exit(1)
}

const results = report.results ?? []
const failures = results.filter((r) => r.status === 'fail')
const warnings = results.filter((r) => r.status === 'warn')

// 只把格式类问题当硬失败：格式错 = 客户端可能直接放弃解析。
// 其余 warn（例如文件体积提示）只记录不拦截。
const formatFailures = failures.filter((r) => r.id.startsWith('format.'))

console.log(
  `[llms-check] 格式校验 ${results.filter((r) => r.status === 'pass').length} 通过 / ${warnings.length} 警告 / ${failures.length} 失败`,
)
for (const r of warnings) console.log(`  · 警告 ${r.id}: ${r.message}`)
for (const r of failures) console.log(`  · 失败 ${r.id}: ${r.message}`)

if (formatFailures.length > 0) {
  console.error(`[llms-check] llms.txt 格式不符合 llmstxt.org 规范（${formatFailures.length} 项），AI 客户端可能拒绝解析`)
  process.exit(1)
}

console.log(`[llms-check] llms.txt 格式通过（${siteConfig.url.replace(/\/+$/, '')}/llms.txt）`)
