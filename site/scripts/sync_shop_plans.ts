/**
 * 从发卡站拉取商品价格，回写 config/plans.ts（2026-10-10 起）。
 *
 * 用法：
 *   npm run sync:plans            # 拉价并写回 config/plans.ts
 *   npm run sync:plans -- --dry-run   # 只打印将要写入的对照表，不改文件
 *   npm run sync:plans -- --stock     # 额外打印在售库存
 *
 * 为什么走 JSON 接口而不是抓网页：
 *   catfk.com/shop/<token> 是 Vue SPA，服务端只返回空 HTML 壳，商品由前端
 *   调 /shopApi/Shop/* 系列接口渲染。所以这里直接复刻它那几次请求，稳定且免解析。
 *
 * 受管字段是 id / period / days / price / amount / original / discount / stock。
 * features、badge、featured、cta、status 这些人工撰写的文案与展示决策一律保留——
 * 发卡站的 description 是卖家口吻的 HTML，不能直接进官网。
 *
 * name 2026-10-11 起也退出受管字段：发卡站商品名形如
 * 「fable5.1+opus5.5无限-周卡」，直接当卡片标题会让三张卡看起来一模一样。
 * 它仍写回新出现的档位（防止漏数据），已有档位不再覆盖；卡片展示用人工撰写的
 * displayName 短名。
 *
 * 失败一律以非 0 退出且不写文件：商品数为 0 往往意味着 token 变了或接口改版，
 * 此时如果继续跑会把官网价格全清成「待定」。构建不依赖本脚本。
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const PLANS_FILE = resolve(HERE, '../config/plans.ts')

const API = 'https://catfk.com'
/** 发卡站商品类型：卡密 / 图文 / 资源 / 权益。本站商品都在 card 下，其余类型一并扫描以防改版搬家。 */
const GOODS_TYPES = ['card', 'article', 'resource', 'equity'] as const

const argv = new Set(process.argv.slice(2))
const dryRun = argv.has('--dry-run')
const showStock = argv.has('--stock')

function die(msg: string): never {
  console.error(`[sync:plans] 错误：${msg}`)
  process.exit(1)
}

/* ---------- 取数 ---------- */

interface ShopInfo {
  nickname?: string
  goods_count?: number
  card_count?: number
}
interface Category {
  id: number
  name: string
  goods_count?: number
}
interface Goods {
  goods_key: string
  name: string
  price: number
  market_price: number
  link?: string
  category?: { id: number; name: string }
  extend?: { stock_count?: number; limit_count?: number }
}

const API_TIMEOUT_MS = 30_000
const API_RETRIES = 3

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function api<T>(path: string, body?: unknown): Promise<T> {
  // 必须带超时：不带的话 DNS 挂起或 TLS 握手卡住时进程会无限期挂住，
  // npm run sync:plans 既不报错也不输出，看起来像死机。对齐 fetch_upstream_models.py 的 timeout + retries。
  let lastErr: unknown
  for (let attempt = 1; attempt <= API_RETRIES; attempt++) {
    try {
      const res = await fetch(`${API}${path}`, {
        method: body ? 'POST' : 'GET',
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(API_TIMEOUT_MS),
      })
      if (!res.ok) die(`${path} 返回 HTTP ${res.status}`)
      const json = (await res.json()) as { code: number; msg: string; data: T }
      if (json.code !== 1) die(`${path} 返回失败：${json.msg}`)
      return json.data
    } catch (e) {
      if (e instanceof Error && /返回 HTTP|返回失败/.test(e.message)) throw e
      lastErr = e
      const why = e instanceof Error ? e.message : String(e)
      console.error(`[plans] ${path} 第 ${attempt}/${API_RETRIES} 次失败：${why}`)
      if (attempt < API_RETRIES) await sleep(1000 * attempt)
    }
  }
  die(`${path} 重试 ${API_RETRIES} 次仍失败：${lastErr instanceof Error ? lastErr.message : String(lastErr)}`)
}

let shopToken = ''

/** 店铺信息 + 全类型商品（按 goods_key 去重） */
async function fetchShop(): Promise<{ info: ShopInfo; goods: Goods[] }> {
  const { shopToken: token } = await import('../config/plans')
  shopToken = token

  const info = await api<ShopInfo>('/shopApi/Shop/info', { token })
  console.log(`[sync:plans] 店铺「${info.nickname ?? '?'}」token=${token}，宣称商品数 ${info.goods_count ?? 0}`)

  const seen = new Map<string, Goods>()
  for (const type of GOODS_TYPES) {
    let cats: Category[]
    try {
      cats = await api<Category[]>('/shopApi/Shop/categoryList', { token, goods_type: type })
    } catch {
      // 某些商品类型可能整个接口不可用，跳过即可，不该因此中断同步
      continue
    }
    for (const cat of cats ?? []) {
      // category_id 必须来自 categoryList：硬传 -1 会拿到空列表（实测）
      const data = await api<{ total: number; list: Goods[] }>('/shopApi/Shop/goodsList', {
        token,
        goods_type: type,
        category_id: cat.id,
        current: 1,
        pageSize: 100,
      })
      console.log(`[sync:plans]   分类「${cat.name}」(${type}/${cat.id}) → ${data.total} 个商品`)
      for (const g of data.list ?? []) {
        if (!seen.has(g.goods_key)) seen.set(g.goods_key, g)
      }
    }
  }
  return { info, goods: [...seen.values()] }
}

/* ---------- 商品名 → 周期 / 分组 ---------- */

/** 发卡站商品名形如「fable5.1+opus5.5无限-月卡」，周期由结尾后缀决定 */
const PERIOD_SUFFIXES: { re: RegExp; label: string; days: number }[] = [
  { re: /[-—_]?\s*天卡$/, label: '1 天', days: 1 },
  { re: /[-—_]?\s*周卡$/, label: '7 天', days: 7 },
  { re: /[-—_]?\s*月卡$/, label: '30 天', days: 30 },
  { re: /[-—_]?\s*季卡$/, label: '90 天', days: 90 },
  { re: /[-—_]?\s*半年卡$/, label: '180 天', days: 180 },
  { re: /[-—_]?\s*年卡$/, label: '365 天', days: 365 },
]

/** 商品名里出现这些词即视为无限卡（不限次数 / 无限额度） */
const UNLIMITED_HINTS = ['无限', '不限']

function periodOf(name: string): { label: string; days: number } | null {
  for (const s of PERIOD_SUFFIXES) {
    if (s.re.test(name)) return { label: s.label, days: s.days }
  }
  return null
}

/** 只有带「无限 / 不限」的无限卡商品才进 unlimited 组；其余不猜测，交人工归组 */
function isUnlimited(name: string): boolean {
  return UNLIMITED_HINTS.some((h) => name.includes(h))
}

/** 金额去掉多余小数位：13.50 → 13.5，125.00 → 125 */
function money(n: number): string {
  return String(Math.round(n * 100) / 100)
}

/** 折扣角标：13.5/25 → 「5.4 折」。保留一位小数，整数折则不带小数 */
function discountOf(price: number, market: number): string | null {
  if (!(market > price) || price <= 0) return null
  const zhe = Math.round((price / market) * 100) / 10
  return `${Number.isInteger(zhe) ? zhe : zhe.toFixed(1)} 折`
}

/* ---------- 写回 plans.ts ---------- */

/** 抽出某个 id 档位的对象字面量范围（用于局部替换） */
function tierBlock(src: string, id: string): { start: number; end: number } | null {
  const idEsc = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const idRe = new RegExp(`id:\\s*'${idEsc}'`)
  const idm = idRe.exec(src)
  if (!idm) return null
  // 往前找该对象字面量的 '{'，往后找配对的 '}'
  let start = src.lastIndexOf('{', idm.index)
  if (start < 0) return null
  let depth = 0
  for (let i = start; i < src.length; i++) {
    const ch = src[i]
    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) return { start, end: i }
    }
  }
  return null
}

/**
 * 按行改写字段，不用跨行正则匹配。
 * 历史事故：原正则 `(\n\s*${field}:\s*)([^\n]*?)(,?\n)` 在实际文件里匹配不到行首字段
 * （缩进与 lazy 段的组合），于是静默走了「字段不存在」分支，把对象最后一个逗号当成插入点，
 * 新字段被插到 cta 之后，结果受管字段的逗号全被吃掉，plans.ts 直接语法报错。
 * 现在逐行处理：命中行就整行替换并保留原行尾逗号；没命中才在末尾补一行。
 */
function setField(block: string, field: string, value: string): string {
  const lines = block.split('\n')
  // 必须用 String.raw：普通模板字符串里 \s 会先被 JS 解析成字母 s，正则变成 ^(s*)name:s 永远不匹配，
  // 于是每次同步都静默走「字段不存在」分支，重复追加同一批字段。
  const re = new RegExp(String.raw`^(\s*)${field}:\s`)
  const idx = lines.findIndex((l) => re.test(l))
  if (idx >= 0) {
    const trailing = /,\s*$/.test(lines[idx]) ? ',' : ''
    const indent = lines[idx].match(/^\s*/)?.[0] ?? '    '
    lines[idx] = `${indent}${field}: ${value}${trailing}`
    return lines.join('\n')
  }
  // 字段不存在时插在对象字面量最后一行之前（最后一行通常是 '}' 或 '},'）
  lines.splice(lines.length - 1, 0, `    ${field}: ${value},`)
  return lines.join('\n')
}

function dropField(block: string, field: string): string {
  return block
    .split('\n')
    .filter((l) => !new RegExp(String.raw`^\s*${field}:\s`).test(l))
    .join('\n')
}

interface Managed {
  id: string
  name: string
  period: string
  days: number
  price: string
  amount: number
  original?: string
  discount?: string
  stock?: number
  _srcName: string
}

function toManaged(g: Goods): Managed | null {
  const p = periodOf(g.name)
  if (!p) return null
  const m: Managed = {
    id: `shop-${g.goods_key}`,
    name: g.name,
    period: p.label,
    days: p.days,
    price: `¥${money(g.price)}`,
    amount: g.price,
    _srcName: g.name,
  }
  if (g.market_price > g.price) {
    m.original = `¥${money(g.market_price)}`
    const zhe = discountOf(g.price, g.market_price)
    if (zhe) m.discount = zhe
  }
  const stock = g.extend?.stock_count
  if (typeof stock === 'number') m.stock = stock
  return m
}

/* ---------- main ---------- */

const { info, goods } = await fetchShop()

if (!goods.length) {
  die(`店铺里一个商品都没取到。常见原因：token 变了、接口改版、或店铺下架。已跳过写入。`)
}

const unlimited = goods.filter((g) => isUnlimited(g.name))
const unmanaged = goods.filter((g) => !isUnlimited(g.name))

console.log(`[sync:plans] 取到 ${goods.length} 个商品，其中 ${unlimited.length} 个识别为无限卡档位`)
if (unmanaged.length) {
  console.warn(`[sync:plans] 警告：${unmanaged.length} 个商品名未识别为无限卡，已跳过，请人工归组：`)
  for (const g of unmanaged) console.warn(`           - ${g.name} (${g.goods_key}) ¥${money(g.price)}`)
}

const managed: Managed[] = []
for (const g of unlimited) {
  const m = toManaged(g)
  if (m) managed.push(m)
  else console.warn(`[sync:plans] 警告：「${g.name}」是无限卡但周期后缀不认识，已跳过`)
}

if (!managed.length) die('没有识别出任何带周期后缀的无限卡档位，已跳过写入（防止把官网价格全清空）')

// 按周期从短到长排序，与官网卡片阅读顺序一致
managed.sort((a, b) => a.days - b.days)

// —— 对照表 ——
console.log('\n[sync:plans] 拉取结果：')
console.log('  发卡站商品名'.padEnd(34) + '周期'.padEnd(8) + '现价'.padEnd(10) + '划线'.padEnd(10) + '折扣' + (showStock ? '库存' : ''))
for (const m of managed) {
  console.log(
    '  ' + m._srcName.padEnd(32) +
      m.period.padEnd(8) +
      m.price.padEnd(10) +
      (m.original ?? '—').padEnd(10) +
      (m.discount ?? '—') +
      (showStock ? String(m.stock ?? '—') : ''),
  )
}

if (dryRun) {
  console.log('\n[sync:plans] --dry-run：未改动 config/plans.ts')
  process.exit(0)
}

// —— 写回 ——
let src = readFileSync(PLANS_FILE, 'utf-8')
const changed: string[] = []
const missing: string[] = []

for (const m of managed) {
  const blk = tierBlock(src, m.id)
  if (!blk) {
    missing.push(m.id)
    continue
  }
  const before = src.slice(blk.start, blk.end + 1)
  let after = before
  // 后面还要往 after 里插新字段，行数会变；最后必须按「长度差」把 src 重新接上，
  // 否则还是用旧的 blk.end 去切，会把整个块复制一遍（历史事故：档位字段被重复追加）
  // name 与 displayName 都不回写：卡片标题由人工撰写的 displayName 承担（见文件头注释）
  after = setField(after, 'period', `'${m.period}'`)
  after = setField(after, 'days', String(m.days))
  after = setField(after, 'price', `'${m.price}'`)
  after = setField(after, 'amount', String(m.amount))
  if (m.original) {
    after = setField(after, 'original', `'${m.original}'`)
    after = setField(after, 'discount', `'${m.discount}'`)
  } else {
    after = dropField(after, 'original')
    after = dropField(after, 'discount')
  }
  if (typeof m.stock === 'number') after = setField(after, 'stock', String(m.stock))

  if (after !== before) {
    // 用 after 自身的实际长度切片，不依赖旧的 blk.end
    src = src.slice(0, blk.start) + after + src.slice(blk.start + before.length)
    changed.push(m.id)
  }
}

if (missing.length) {
  console.warn('[sync:plans] 警告：plans.ts 里找不到以下档位 id，价格未写入：')
  for (const id of missing) console.warn(`         - ${id}（发卡站有售，但官网还没建这个档位）：在 config/plans.ts 的 unlimitedTiers 里加一条，name 填发卡站原名、displayName 填卡片上要显示的短名`)
}

writeFileSync(PLANS_FILE, src, 'utf-8')
console.log(`\n[sync:plans] 已更新 ${changed.length} 个档位 → config/plans.ts`)
console.log('[sync:plans] 提示：features / badge / featured / cta 属人工撰写区，脚本未改动')
if (info.card_count !== undefined) console.log(`[sync:plans] 店铺当前在售卡密 ${info.card_count} 个`)
