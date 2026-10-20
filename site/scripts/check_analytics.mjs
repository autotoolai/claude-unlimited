/**
 * 构建后断言：统计埋点确实进了产物，且没有把未配置项渲染出来。
 *
 * 单独成脚本而不是塞进 check_dist.mjs：埋点缺失是「看不出错但数据永远不来」的问题，
 * 与外壳/锚点那类结构断言分开报，定位更快。
 *
 * 关键约束（都来自 VitePress SSR 的实际行为）：
 * - 每个通道要么完整出现、要么完全不出现：Umami 的 script src 与 data-website-id 必须同时在，
 *   百度 hm.js?后面必须带得到站点 id。半截 = 构建坏了；
 * - 事件桥必须内联在 head 里，不能等 Umami 脚本加载完再绑（被拦截就永远不上报）。
 *
 * 「配没配」与「配的是哪个 id」一律从产物事实里读，不从环境变量推断：analytics_snippets.ts
 * 通常已内联真实 id（env 为空是正常形态），用 env 判会误报。环境变量只在能交叉核对时用。
 */
import fs from 'node:fs'
import path from 'node:path'

const DIST = path.resolve(process.cwd(), '.vitepress', 'dist')

// 环境变量只用于交叉核对：产物里的 id 与 env 不一致时提醒（env 留空不算错）
const umamiId = process.env.UMAMI_WEBSITE_ID || ''
const tongjiId = process.env.BAIDU_TONGJI_ID || ''

const fails = []
const ok = (cond, msg) => {
  if (!cond) fails.push(msg)
}

let html = ''
try {
  html = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8')
} catch (e) {
  console.error('[x] 读不到 dist/index.html，先跑 npm run build')
  process.exit(1)
}

// VitePress 1.6 把 <head> 里的 tag 规范化成 <!--[--> ... <!--]--> 片段（JSON-LD 也走同一机制），
// </head> 仍然存在；这里再兜一层取不到 head 的情况。
const headEnd = html.indexOf('</head>')
const head = headEnd > 0 ? html.slice(0, headEnd + 7) : html

// ---- 通道判定：id 从产物里取（Umami 的 data-website-id、百度 hm.js? 后面的参数） ----
const umamiInDist = head.match(/data-website-id="([^"]+)"/)?.[1] || ''
// 百度 src 里的 id：VitePress 会把 ? 规范化掉，直接一条正则在这类产物上会失配（实测在本地产物上就是取不到）。
// 改成「定位域名 → 判断脚本名 → 从分界符后取字母数字」三步，不用正则里的转义（少一个失配来源）：
// /hm.js 与 /s.js 两版官方写法都支持。
function baiduSiteId(src) {
  const at = src.indexOf('hm.baidu.com/')
  if (at < 0) return ''
  const tail = src.slice(at + 'hm.baidu.com/'.length)
  if (!(tail.startsWith('hm.js') || tail.startsWith('s.js'))) return ''
  const q = tail.indexOf('?')
  const rest = q >= 0 ? tail.slice(q + 1) : tail.slice(5)
  const end = rest.search(/[^A-Za-z0-9]/)
  return end < 0 ? rest : rest.slice(0, end)
}
// src 里的 & 可能是 &#38; 形态，交叉核对前还原
const normalizeId = (id) => id.replace(/&#?38;?/g, '').replace(/&amp;/g, '')
const baiduInDist = baiduSiteId(head)
const baiduId = normalizeId(baiduInDist)
const anyChannel = Boolean(umamiInDist || baiduInDist)

// Umami：script src 与 data-website-id 必须同时在或同时不在
if (umamiInDist) {
  ok(head.includes('cloud.umami.is/script.js'), '产物里有 Umami 的 data-website-id 却缺 script src（半截）')
  ok(!umamiId || umamiId === umamiInDist, `UMAMI_WEBSITE_ID=${umamiId} 与产物里的 ${umamiInDist} 不一致`)
} else {
  ok(!head.includes('cloud.umami.is'), '产物里有 Umami 的 script src 却缺 data-website-id（半截）')
}

// 百度：官方代码是 hm.js（兼容旧写法 s.js）；只要出现一个就必须带得到 id
if (baiduInDist) {
  ok(
    head.includes(`hm.baidu.com/hm.js?${baiduInDist}`) || head.includes(`hm.baidu.com/s.js?${baiduInDist}`),
    '百度脚本 src 与从产物取到的站点 id 不一致',
  )
  ok(!tongjiId || tongjiId === baiduId, `BAIDU_TONGJI_ID=${tongjiId} 与产物里的 ${baiduId} 不一致`)
} else {
  ok(!head.includes('hm.baidu.com'), '产物里有 hm.baidu.com 却取不到站点 id（半截）')
}

// 事件桥：head 内联、挂 window.__cuTrack、双通道。它随任一通道注入（两通道都留空时整段不注入，此时无桥可查）
if (anyChannel) {
  ok(head.includes('window.__cuTrack=function'), 'head 里没有事件桥 window.__cuTrack')
  ok(head.includes('umami.track') && head.includes('_hmt.push'), '事件桥没有同时接 Umami 与百度统计')
} else {
  ok(!head.includes('window.__cuTrack'), '两个通道都未配置，产物里却注入了事件桥（应为整段缺席）')
}

// 转化点：每个标记只需要「在站点某个页面存在」—— 首页没有套餐卡、没有复制按钮是正常的，
// 所以扫全 dist。VitePress 产出的是 .html 目录（不是 _dir/index.html）；guide/console 各有 guide.html 与
// guide/index.html 两份同源内容，算重复无害。缺一个就说明有人改组件时把埋点标记弄丢了。
// guide_ 是教程页那两条 CTA（CC Switch 下载、管理后台）的前缀：教程页拆成 6 个页面后
// 这两个转化点换了载体，必须重新列为必检，否则改页面组件时把埋点删了也没人拦。
const REQUIRED_CTA = ['nav', 'hero_primary', 'plan_', 'kefu_open', 'copy_url', 'guide_']
const htmlFiles = fs
  .readdirSync(DIST, { recursive: true, encoding: 'utf8' })
  .filter((f) => f.endsWith('.html'))
const found = new Set()
for (const f of htmlFiles) {
  const text = fs.readFileSync(path.join(DIST, f), 'utf8')
  for (const m of text.matchAll(/data-cta="([^"]+)"/g)) found.add(m[1])
}
for (const key of REQUIRED_CTA) {
  ok([...found].some((v) => v === key || v.startsWith(key)), `产物里找不到 data-cta="${key}" 开头的埋点标记（转化事件会丢）`)
}
// 只在某类组件里出现、且该组件当前没被任何页面用上的标记（首页终端的复制按钮 term_copy 就是如此，
// LiveTerminal 只被 HomeHero 引用，而 HomeHero 目前没挂到任何页面），不作为门禁：会误报，
// 真挂上去时 check 会自动开始断言它。
// 购买链接仍然是发卡站外链（改 Purchase 相关组件时别把这条链弄丢）
const home = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8')
ok(/href="https:\/\/catfk\.com\/shop\/[A-Z0-9]+"/.test(home), '首页没有指向 catfk.com 的购买链接')

if (fails.length) {
  console.error('\n[x] 统计埋点检查未通过:')
  for (const f of fails) console.error('    - ' + f)
  process.exit(1)
}
const configured = [head.includes('cloud.umami.is/script.js') && 'Umami', head.includes('hm.baidu.com') && '百度统计'].filter(Boolean)
console.log(
  `[x] 统计埋点检查通过（事件桥在 head 内联，${configured.length ? configured.join(' + ') : '尚未配置任何通道（填 analytics_snippets.ts 里的内联值）'}；转化埋点 ${found.size} 种（扫 ${htmlFiles.length} 个 html））`,
)
