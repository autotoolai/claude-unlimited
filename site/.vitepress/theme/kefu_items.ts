/**
 * 助手语料索引：由 config/kefu_bot.ts 在构建期预处理（关键词归一化 + 粗粒度分词 + 分类标签 + 标题指纹）。
 * 运行时由 KefuWidget 做多通道匹配，无后端、无第三方依赖。
 *
 * 单独成文件的原因：PageShell 和 KnowledgeDoc 两处都要挂 KefuWidget，放一处避免两套逻辑漂移；
 * 同时把「预处理」与「渲染」分开，KefuWidget 里只留匹配与渲染，不碰数据加工。
 *
 * 关键词来源 = kefu_bot.ts 手写别名 + config/faq.ts 同 id 条目的 keywords（kefuBotKeywords），
 * 所以 FAQ 页新增关键词时助手自动跟着认。
 */
import { faqById, kefuBotCategoryLabels, kefuBotEntries, kefuBotKeywords, kefuNorm, type KefuBotCategory } from '../../config/kefu_bot'
import type { KbEntry } from '../../config/kefu_types'

const STOP = new Set([
  '的', '了', '吗', '呢', '吧', '是', '在', '和', '与', '有', '我', '你', '它', '们', '要', '会',
  '怎么', '什么', '如何', '为什么', '哪些', '多少', '可以', '能不能', '是不是', '支持',
  'a', 'an', 'the', 'is', 'are', 'to', 'of', 'in', 'on', 'and', 'or', 'how', 'what',
])

/** 全角转半角 + 折叠空白 + 小写（与 config/kefu_bot.kefuNorm 一致） */
function norm(s: string): string {
  return kefuNorm(s)
}

/** 标题指纹：归一化后只留中英文数字，用于判断「这条问句是不是原样发回来的某个标题 / 追问」 */
function fingerprint(q: string): string {
  return norm(q).replace(/[^a-z0-9一-鿿]/g, '')
}

/**
 * 粗粒度分词：中文 2 字滑窗 + 单字，英文数字按词；拉丁词后面紧跟的汉字算一个整体（「claude 命令」= claude + 命令）。
 * 合并拉丁词与汉字是关键：否则整词通道里「claude 命令」只剩 claude，「怎么接入 Claude Code？」会被
 * 误判成问 claude 命令，连「claude 命令找不到」也命中不了。KefuWidget 的匹配用同一套规则（见 kefu_match.ts）。
 */
export function tokenize(s: string): string[] {
  const out: string[] = []
  const re = /[a-z0-9]+|[一-鿿]+/g
  let m: RegExpExecArray | null
  while ((m = re.exec(s))) {
    const seg = m[0]
    if (/^[a-z0-9]+$/.test(seg)) {
      if (!STOP.has(seg) && seg.length > 1) out.push(seg)
      // 拉丁词后面紧跟的汉字，合成一个词元交给整词通道用（2 字中文本身不做滑窗，避免词元表爆炸）
      const rest = s.slice(m.index + seg.length)
      const cjk = /^[一-鿿]+/.exec(rest)
      if (cjk && seg.length > 1) out.push(seg + cjk[0].slice(0, 2))
    } else {
      for (let i = 0; i < seg.length - 1; i++) out.push(seg.slice(i, i + 2))
      for (const ch of seg) if (!STOP.has(ch)) out.push(ch)
    }
  }
  return [...new Set(out)]
}

/**
 * 泛词表：这些词单独出现时说不清用户想问什么（key 可能是「Key 怎么填」「换 Key」「Key 泄露」……），
 * 只在没有更具体命中时才用来作答。名单只登记判定用，真正写在哪里是 config/kefu_bot.ts 的 keywords。
 */
/**
 * 单字关键词（模型 / 限速 / 内存 …）一并在泛词表里剔除：中文子串通道会把它命中到所有含该字的问句，
 * 「你们能开发游戏吗」里带「发」这种问题同理，宁可走分词兜底也不要硬答。
 */
const WEAK_KEYWORDS = new Set([
  'key', // 裸 key：可能是「Key 怎么填」「换 Key」「Key 泄露」
  'sdk',
  'cc',
  '安装',
  '没反应',
  '模型',
  '过期',
  '到期',
  '不能用',
  '限制',
  '换卡',
  '续费',
  '联系',
  '人工',
  // 「key + 汉字」归一化后没有空格的组合：问句里出现「换 key」就会产生 key到期 / key泄露 这样的词元
  'key怎么填',
  'key到期',
  'key过期',
  'key过期了',
  'key丢失',
  'key被盗',
  'key泄露',
  'key泄露了',
  'key无效',
  '怎么填',
])

const catLabelOf = (cat: string): string => kefuBotCategoryLabels[cat as KefuBotCategory] ?? cat

/** 合并后的语料：答案 / 链接 / 代码一律来自 FAQ（config/kefu_bot.ts 里没有这些字段），并算出指纹 */
const merged = kefuBotEntries.map((it) => {
  // 一条语料可以回答多个 FAQ（extraFaqIds）：答案取主条目 faqId，其余只用于合并关键词
  const faq = it.faqId ? faqById[it.faqId] : undefined
  return {
    ...it,
    keywords: kefuBotKeywords(it),
    human: it.human === true,
    a: faq?.a ?? it.a ?? '',
    links: faq?.links ?? [],
    code: faq?.code ?? [],
    qFp: fingerprint(it.q),
    catLabel: catLabelOf(it.cat),
  }
})

export const kefuItems: KbEntry[] = merged.map((it) => {
  const weakSet = new Set(it.keywords.filter((k) => WEAK_KEYWORDS.has(k)))
  return {
    id: it.id,
    q: it.q,
    a: it.a,
    cat: it.cat,
    catLabel: it.catLabel,
    qFp: it.qFp,
    links: it.links,
    code: it.code,
    /** 「联系人工客服」类语料：KefuWidget 命中后直接发客服卡 */
    human: it.human,
    /** 归一化后的具体关键词（泛词已剔除）；拉丁 / 数字词走整词通道，纯中文走子串通道 */
    kw: it.keywords.filter((k) => k && !weakSet.has(k)),
    /** 泛词：只在兜底时用 */
    weak: it.keywords.filter((k) => k && weakSet.has(k)),
    // kwCjk 只留纯中文且 >= 2 字的关键词：含空格的（key 到期、key 泄露）走拉丁 / 字面通道，否则
    // 「key 泄露」里的「泄露」会把「key 怎么填」也拉进来；单字与泛词留给分词 / 泛词通道
    kwCjk: it.keywords.filter((k) => k.length >= 2 && !/\s/.test(k) && /[一-鿿]/.test(k) && !weakSet.has(k)),
    tokens: tokenize(`${it.q} ${it.keywords.join(' ')} ${it.a.slice(0, 60)}`).filter((t) => t.length >= 2),
  }
})

/** FAQ 里存在、但语料还没收录的条目（写回 kefu_bot.ts 加一条 bot-*；faqId 缺失时这个集合非空） */
const coveredFaqIds = new Set(merged.flatMap((e) => [e.faqId, ...(e.extraFaqIds ?? [])].filter(Boolean)))
export const kefuUncoveredFaqIds: string[] = Object.keys(faqById).filter((id) => !coveredFaqIds.has(id))