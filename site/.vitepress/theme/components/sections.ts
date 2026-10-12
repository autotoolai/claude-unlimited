import { guidePages, guideTabs } from '../../../config/guide'
import { knowledgeCategories } from '../../../config/knowledge'

/**
 * 页内目录配置：id 对应 markdown 里的二级标题（slug 化后），加标题时两处一起改。
 *
 * 谁会显示目录由调用方决定，不是这里：
 * - 教程页 PageShell 传 toc="side" → 用 slug "/guide" 这组；
 * - 后台页 PageShell 传 toc="wide" → 用 console 这组；
 * - 知识库文章页目录由 KnowledgeDoc 从正文 h2 客户端读取，不用这张表。
 * 下面 index / models / pricing / faq / knowledge_index 五组是营销页与列表页的，
 * 这些页面已不再显示页内目录，数据留着是为了锚点 id 与页面结构一一对应、好排查。 */
export interface SectionLink {
  id: string
  label: string
  /** 1 = h2 章，2 = h3 节 */
  level?: number
  /** 分组名（教程页的「小白教程」/「高手教程」）：同一 group 的节点放在一起，页面按 group 过滤后再传进来 */
  group?: string
}

export const SECTION_NAV: Record<string, SectionLink[]> = {
  // 首页只剩首屏，没有正文小节
  index: [],
  models: [],
  console: [
    { id: 'features', label: '后台能做什么' },
    { id: 'keys', label: '关键功能细说' },
    { id: 'domain', label: '备用域名' },
    { id: 'faq', label: '后台常见问题' },
  ],
  // 定价页已精简到只剩档位网格，无正文小节（2026-10-12 撤掉 UnlimitedValue 区块与页内 FAQ）
  pricing: [],
  // 与 pages/data.ts 的 faqGroupOrder 一致：商品 → 限速 → 配置 → 接入 → 安全 → 我们
  faq: [
    { id: 'cat-buying', label: '买之前' },
    { id: 'cat-product', label: '关于商品' },
    { id: 'cat-limits', label: '限速与封号' },
    { id: 'cat-setup', label: '使用与配置' },
    { id: 'cat-usage', label: '接入与使用' },
    { id: 'cat-security', label: '数据与安全' },
    { id: 'cat-about', label: '关于我们' },
    { id: 'more', label: '还没解决？' },
  ],
  // 知识库列表页：精选 + 5 个分类小节（分类项由 config/knowledge.ts 的 knowledgeCategories 按 order 派生，加分类只改一处）
  knowledge_index: [
    { id: 'featured', label: '精选文章' },
    ...[...knowledgeCategories]
      .sort((a, b) => a.order - b.order)
      .map((c) => ({ id: `cat-${c.cat}`, label: c.name })),
  ],
  // 教程页：键就是 slug（/guide）。两条轨的小节都在目录里，但按轨分组（group），
  // 页面只把当前轨 + 共用块传给 SectionNav（见 PageShell 的 tocGroup prop），避免锚点指向未渲染的段落。
  ...Object.fromEntries(
    guidePages.map((p) => [
      p.slug,
      [
        ...guideTabs.flatMap((t) =>
          p.blocks.filter((b) => b.tab === t.id).map((b) => ({ id: b.id, label: b.h2, level: 1 as const, group: t.name })),
        ),
        ...p.blocks.filter((b) => !b.tab && b.id !== 'contact').map((b) => ({ id: b.id, label: b.h2, level: 1 as const })),
      ],
    ]),
  ),
}

