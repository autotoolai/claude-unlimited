/**
 * 在线助手的问句匹配器 —— 组件与自测脚本共用的唯一实现。
 *
 * 单独成文件的原因：scripts/check_kefu.ts 要跑真实的问句验证七档通道。曾经组件与脚本各写一份，
 * 改一边就漂移；现在自测直接调这里的 matchKefu()，跑通的用例就是线上行为。
 */
import type { KbEntry } from '../../config/kefu_types'
import { tokenize } from './kefu_items'

/** 输入归一化：全角转半角、连续空白压成一个空格、小写（英文专名要靠空格分词：api key、invalid api key） */
function norm(s: string): string {
  return s
    .replace(/[！-～]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

/** 去掉空格后的形式，用来比对「带空格的写法」与「不带空格的写法」是否同一种 */
function flat(s: string): string {
  return s.replace(/ /g, '')
}

export type Channel = 'exact' | 'latin' | 'literal' | 'cjk' | 'title' | 'weak' | 'tokens'

interface Scored {
  e: KbEntry
  channel: Channel
  score: number
  /** 命中关键词比问句长多少（换卡 -1 比换套餐 -2 更具体），越小越具体 */
  kwSpec: number
  /** 题面具体度：语料标题 / 关键词有多少字没落在问句里，越小越具体 */
  spec: number
  /** 命中词占问句的比例，越大越具体（「key 过期了」之于「key」1/3，之于「key 过期」2/3） */
  cov: number
}

const LATIN_TOKEN_RE = /^[a-z0-9]+$/
const LATIN_CJK_RE = /^[a-z0-9]+[一-鿿]$/
const LATIN_TITLE_RE = /^[a-z0-9]/i

/** 通道优先级：精确标题 > 整词专名 > 字面专名 > 中文关键词 > 标题前缀 / 子串 > 泛词 > 分词 */
const CHANNEL_ORDER: Channel[] = ['exact', 'latin', 'literal', 'cjk', 'title', 'weak', 'tokens']

/**
 * 不走分词覆盖度兜底的语料：问句本身既是这条的标题、又是别的语料里的高频关键词（「支持哪些模型」）。
 * 分词只看词重叠，这种问句跟哪条语料都像，只能靠精确标题 / 前缀 / 关键词三档来认。
 */
const SKIP_TOKENS = new Set(['bot-setup-models'])

/**
 * 匹配：逐条打分后按「通道优先级 → 分数 → 命中关键词比问句多几个字（kwSpec）→ 命中词占问句的比例（cov）→
 * 题面具体度」选最优，不按书写顺序先命中先得。后两档必须在每档都算：恒为 0 时「key 怎么填」「key 过期」、
 * 「key 泄露」这三条语料都只靠裸 key 命中，谁写在 config/kefu_bot.ts 前面谁赢，问句里的「怎么填 / 过期 / 泄露」
 * 完全不起作用。
 * 前六档命中即作答；只有分词档需要过阈值（0.45；长问句 0.62），过不了就返回 null 走兜底。
 *
 * 1. 精确标题：问句就是某条语料的 q——分数最高。
 * 2. 整词专名：问句里的拉丁词元（429、apikey、ccswitch、key）与关键词逐词相等；「api key」这种多词写法
 *    与问句去空格后相同也算；问句「cc」能被「ccswitch」包含。关键词含汉字时要连汉字一起对上（见下方注释）。
 * 3. 字面专名：关键词与问句去掉空格后互相包含（「invalid api key」≈「invalidapikey」、「key 怎么填」≈「key怎么填」）。
 *    关键词至少 3 字，2 字的留给子串 / 分词通道。
 * 4. 中文关键词：keywords 是人工写的口语别名（「换卡要重新配置吗」「在哪拿」），问句含它即命中；
 *    歧义词（裸 key、模型、过期、限制……）登记在 kefu_items 的泛词表里，不走这一档。
 * 5. 标题前缀 / 子串：问句是标题的前缀（「支持哪些模型」之于「支持哪些模型？新模型上线要换 Key 吗？」），
 *    或是含拉丁词标题的子串（「key 怎么填」之于「API Key 怎么用？」）。问句只是标题中段（「人工」之于
 *    「怎么找人工客服？」）不算，交给泛词档。
 * 6. 泛词兜底：裸 key、人工这类词只在前面都没命中、且问句以它开头或它覆盖了问句大部时才作答。
 * 7. 分词 + 覆盖度：中文 2 字滑窗切分后，问句里 >= 60% 的词在语料里出现才算命中（<= 6 个词元的短问句要求 70%）。
 *
 * 覆盖面守门（每档都判）：只靠一个裸词命中、却对不上问句大部的语料不能赢。「key 过期了」问句里三个词元，
 * 「key 泄露」只认得 key（1/3），「key 过期」认得两个（2/3）——前者赢只是因为它排在语料前面。
 * 拉丁通道按命中的拉丁词个数打分，同为「key + 一个汉字」时问句是 key 过期就该由 key 过期 赢。
 */
export function matchKefu(entries: KbEntry[], raw: string): KbEntry | null {
  const n = norm(raw)
  if (!n) return null
  const nFlat = flat(n)
  const nTokens = new Set(tokenize(n).filter((t) => t.length >= 2))
  // 拉丁词元：纯拉丁词（key、429、ccswitch），或拉丁词 + 一个汉字（invalid、人工）
  const latinTokens = [...nTokens].filter((t) => LATIN_TOKEN_RE.test(t) || LATIN_CJK_RE.test(t))

  const jaccard = (e: KbEntry): number => {
    const eTokens = new Set(e.tokens)
    let inter = 0
    for (const t of nTokens) if (eTokens.has(t)) inter++
    return inter / (nTokens.size + eTokens.size - inter)
  }
  /** 问句覆盖度：问句里的词有多少在语料里。「怎么用 cc」用词重叠很高但覆盖度只有 1/3，不该命中任何一条 */
  const coverage = (e: KbEntry): number => {
    if (nTokens.size < 2) return 0
    const eTokens = new Set(e.tokens)
    let inter = 0
    for (const t of nTokens) if (eTokens.has(t)) inter++
    return inter / nTokens.size
  }
  /** 标题通道：标题的前缀，或含拉丁词标题的子串 */
  const titleHit = (e: KbEntry): boolean => {
    const p = norm(e.q)
    if (p.length < 3) return false
    if (p.startsWith(n) && n.length >= 4) return true
    if (LATIN_TITLE_RE.test(n) && n.length >= 3) return p.includes(n)
    return false
  }
  /**
   * 关键词具体度：命中关键词里有几个字是问句里没有的（换套餐 3 > 换卡 1 > key 0），越小越具体。
   * 与 titleHit 一起决定同分时的先后。
   */
  const kwSpecOf = (e: KbEntry, k: string): number => {
    const charSet = new Set(n.replace(/[^a-z0-9一-鿿]/g, ''))
    return k.length - [...new Set(k)].filter((ch) => charSet.has(ch)).length
  }
  /** 命中词覆盖率：问句里有多少词元能在该语料的词元里找到 */
  const covOf = (e: KbEntry): number => coverage(e)
  /**
   * 拉丁词的认领率：问句里的拉丁词元有多少被这条语料认领。「python sdk 能用吗」里这条语料只认领 python（1/2），
   * 而只有 python 的那条认领率是 1/2 同级、再由 kwSpec（sdk 多个字）取胜——用总覆盖率会把两者都算成 1。
   */
  const latinCovOf = (e: KbEntry): number => {
    if (!latinTokens.length) return 1
    const eTokens = new Set(e.tokens)
    let hit = 0
    for (const t of latinTokens) if (eTokens.has(t)) hit++
    return hit / latinTokens.length
  }
  /** 题面具体度：语料标题 / 关键词有多少字没落在问句里——越小越具体 */
  const specificity = (e: KbEntry): number => {
    const charSet = new Set(n.replace(/[^a-z0-9一-鿿]/g, ''))
    const pool = [e.qFp, ...e.kw, ...e.weak]
    return Math.max(0, ...pool.map((p) => p.length - [...new Set(p)].filter((ch) => charSet.has(ch)).length))
  }

  const scored: Scored[] = []
  for (const e of entries) {
    const spec = specificity(e)
    const cov = covOf(e)
    /** 覆盖面守门：问句超过 3 个词元、这条只认得 1 个时不参选（泛词与标题通道豁免） */
    const coveredEnough = nTokens.size <= 3 || cov >= 0.4
    // 精确标题：问句就是这条语料的 q，分数最高，抢在所有含子串的通道前
    if (e.qFp === n) {
      scored.push({ e, channel: 'exact', score: 1.15, kwSpec: 0, spec, cov: 1 })
      continue
    }
    // 整词通道：关键词里的每个拉丁词元都在问句里（api key 里的 key 不算；key 到期 需要问句出现 key）。
    // 这样「key 到期」不会抢走「key 怎么填」「API Key 怎么用」，而「换 key」仍能命中「key 到期」。
    // 含汉字的关键词要求「拉丁词元 + 紧跟的汉字」这个词元整体都在问句里：只靠 claude 就让
    // 「claude 命令怎么启动」命中问句「怎么接入 Claude Code？」会把接入答成命令排错。
    const latinKw = e.kw.filter((k) => {
      const parts = tokenize(k).filter((t) => LATIN_TOKEN_RE.test(t) || LATIN_CJK_RE.test(t))
      return parts.length > 0 && parts.every((t) => latinTokens.includes(t))
    })
    // 字面通道：只认纯拉丁关键词（apikey、api key、sk-、ccswitch），问句去掉空格后与它相等或互为子串；
    // 含中文的关键词由整词 / 中文子串通道负责，避免「key 泄露」这种短词到处命中
    const literalKw = e.kw.filter(
      (k) => k.length >= 3 && LATIN_TOKEN_RE.test(k) && (nFlat.includes(flat(k)) || flat(k).includes(nFlat)),
    )
    if (latinKw.length || literalKw.length) {
      const isLatin = latinKw.length > 0
      const hitKw = isLatin ? latinKw : literalKw
      const kwSpec = Math.min(...hitKw.map((k) => kwSpecOf(e, k)))
      // 状态码（问句恰好是三位数字）分数最高；字面专名（纯拉丁词，问句含它整串）比整词专名更可信；
      // 整词通道按命中的拉丁词个数加一点分，2 个词（api key）比 1 个词（key）更可信
      const hitCount = isLatin ? new Set(hitKw.flatMap((k) => tokenize(k).filter((t) => LATIN_TOKEN_RE.test(t)))).size : 1
      const score = /^[0-9]{3}$/.test(n) ? 1.2 : isLatin ? 1.05 + 0.02 * Math.min(hitCount - 1, 2) : 1.12
      // 拉丁通道用认领率做守门，问句里带 2 个拉丁词（api key / python sdk）时只认领 1 个的不参选
      const enough = isLatin ? latinCovOf(e) >= 0.6 : cov >= 0.6
      if (coveredEnough && enough) scored.push({ e, channel: isLatin ? 'latin' : 'literal', score, kwSpec, spec, cov })
      continue
    }
    // 中文关键词子串；泛词（裸 key、人工、模型、过期……）已从 kwCjk 剔除
    const cjkHits = e.kwCjk.filter((k) => n.includes(k))
    if (cjkHits.length) {
      const kwSpec = Math.min(...cjkHits.map((k) => kwSpecOf(e, k)))
      const score = 0.9 + 0.1 * Math.min(cjkHits.length - 1, 2) + 0.1 * (jaccard(e) - 0.5)
      if (coveredEnough) scored.push({ e, channel: 'cjk', score, kwSpec, spec, cov })
      continue
    }
    if (titleHit(e)) {
      scored.push({ e, channel: 'title', score: 0.7, kwSpec: 0, spec, cov })
      continue
    }
    // 泛词兜底：开头命中直接用；出现在中间要离得很近（后面最多再跟 3 个字）
    const weakLead = e.weak.find((k) => k.length >= 2 && (n.startsWith(k) || (n.includes(k) && n.length <= k.length + 3)))
    if (weakLead) {
      scored.push({ e, channel: 'weak', score: 0.55, kwSpec: kwSpecOf(e, weakLead), spec, cov })
      continue
    }
    if (nTokens.size >= 2 && e.weak.length && coverage(e) >= 0.6) {
      scored.push({ e, channel: 'weak', score: 0.45 + 0.3 * jaccard(e), kwSpec: 0, spec, cov })
      continue
    }
    // 分词兜底：短问句（<= 6 个词元）要求覆盖度更高，避免「这个套餐适合团队用吗」被凑上来
    if (!SKIP_TOKENS.has(e.id) && nTokens.size >= 2 && cov >= (nTokens.size <= 6 ? 0.7 : 0.6)) {
      scored.push({ e, channel: 'tokens', score: 0.5 + 0.5 * jaccard(e), kwSpec: 0, spec, cov })
    }
  }
  scored.sort(
    (a, b) =>
      CHANNEL_ORDER.indexOf(a.channel) - CHANNEL_ORDER.indexOf(b.channel) ||
      b.score - a.score ||
      a.kwSpec - b.kwSpec ||
      b.cov - a.cov ||
      a.spec - b.spec,
  )
  const best = scored[0]
  if (!best) return null
  const hitGate = n.length > 10 ? 0.62 : 0.45
  return best.channel === 'tokens' && best.score < hitGate ? null : best.e
}