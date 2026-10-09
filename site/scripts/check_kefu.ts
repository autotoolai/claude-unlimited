/**
 * 助手匹配逻辑自测：复用 theme/index.ts 的 norm/tokenize 规则，
 * 对 config/faq.ts 的语料跑一组真实问法，验证命中与兜底。
 * 用法：npx tsx scripts/check_kefu.ts
 */
import { faqItems, categoryLabels } from '../config/faq'

const STOP = new Set([
  '的', '了', '吗', '呢', '吧', '是', '在', '和', '与', '有', '我', '你', '它', '们', '要', '会',
  '怎么', '什么', '如何', '为什么', '哪些', '多少', '可以', '能不能', '是不是', '支持',
  'a', 'an', 'the', 'is', 'are', 'to', 'of', 'in', 'on', 'and', 'or', 'how', 'what',
])
function norm(s: string): string {
  return s
    .replace(/[！-～]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .replace(/　/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}
function tokenize(s: string): string[] {
  const out: string[] = []
  const re = /[a-z0-9]+|[一-鿿]+/g
  let m: RegExpExecArray | null
  while ((m = re.exec(s))) {
    const seg = m[0]
    if (/^[a-z0-9]+$/.test(seg)) {
      if (!STOP.has(seg) && seg.length > 1) out.push(seg)
    } else {
      for (let i = 0; i < seg.length - 1; i++) out.push(seg.slice(i, i + 2))
      for (const ch of seg) if (!STOP.has(ch)) out.push(ch)
    }
  }
  return [...new Set(out)]
}

const entries = faqItems.map((it) => ({
  id: it.id,
  q: it.q,
  cat: categoryLabels[it.cat],
  kw: it.keywords.map(norm).filter(Boolean),
  tokens: tokenize(`${it.q} ${it.keywords.join(' ')} ${it.a.slice(0, 60)}`),
}))

function match(q: string) {
  const n = norm(q)
  if (!n) return null
  let best: { e: (typeof entries)[number]; score: number } | null = null
  for (const e of entries) {
    let score = 0
    for (const k of e.kw) if (k && n.includes(k)) score += 10 + k.length
    score += e.tokens.filter((t) => t.length >= 2 && n.includes(t)).length
    if (score > 0 && (!best || score > best.score)) best = { e, score }
  }
  return best && best.score >= 2 ? best.e : null
}

const cases: [string, string | null][] = [
  ['怎么接 claude code', 'cat-usage-claudecode'],
  ['能退吗', 'cat-purchase-refund'],
  ['429 怎么办', 'cat-limits-429'],
  ['Base URL 填什么', 'cat-usage-baseurl'],
  ['你们是官方吗', 'cat-product-official'],
  ['支持哪些模型', 'cat-product-models'],
  ['被封了怎么申诉', 'cat-limits-appeal'],
  ['key泄露了', 'cat-security-leak'],
  ['多久到期', 'cat-product-period'],
  ['今天天气怎么样', null],
  ['asdfgh', null],
]

let fail = 0
for (const [q, want] of cases) {
  const hit = match(q)
  const got = hit?.id ?? null
  const ok = got === want
  if (!ok) fail++
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${q.padEnd(16)} -> ${got ?? '(兜底)'}  ${ok ? '' : `(期望 ${want})`}`)
}
console.log(fail ? `\n${fail} 条未通过` : '\n全部通过')
process.exit(fail ? 1 : 0)
