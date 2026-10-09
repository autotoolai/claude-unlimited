/**
 * 助手语料：由 config/faq.ts 在构建期预处理（关键词归一化 + 粗粒度分词）。
 * 运行时由 KefuWidget 做纯前端子串匹配，无后端、无第三方依赖。
 *
 * 单独成文件的原因：Layout.vue 和 markdown 内联 <KefuWidget> 两处都要用它，
 * 放一处避免两套逻辑漂移。
 */
import { faqItems, categoryLabels } from '../../config/faq'
import type { KbEntry } from '../../config/kefu_types'

const STOP = new Set([
  '的', '了', '吗', '呢', '吧', '是', '在', '和', '与', '有', '我', '你', '它', '们', '要', '会',
  '怎么', '什么', '如何', '为什么', '哪些', '多少', '可以', '能不能', '是不是', '支持',
  'a', 'an', 'the', 'is', 'are', 'to', 'of', 'in', 'on', 'and', 'or', 'how', 'what',
])

/** 全角转半角 + 折叠空白 + 小写 */
function norm(s: string): string {
  return s
    .replace(/[！-～]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .replace(/　/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

/** 粗粒度分词：中文 2 字滑窗 + 单字，英文数字按词 */
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

export const kefuItems: KbEntry[] = faqItems.map((it: (typeof faqItems)[number]) => ({
  id: it.id,
  q: it.q,
  a: it.a,
  cat: it.cat,
  catLabel: categoryLabels[it.cat],
  links: it.links ?? [],
  code: it.code ?? [],
  kw: it.keywords.map(norm).filter(Boolean),
  tokens: tokenize(`${it.q} ${it.keywords.join(' ')} ${it.a.slice(0, 60)}`),
}))