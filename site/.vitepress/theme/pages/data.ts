/**
 * 页面共享的静态数据（卖点、步骤、对比表、JSON-LD）。页面组件（index.vue / pricing.vue / faq.vue /
 * PageModels.vue / PageConsole.vue / GuideIndexPage.vue / GuideScenePage.vue / KnowledgeIndex.vue）从这里取数，
 * config/ 里的站点配置、规则数字、FAQ、教程是唯一真源。
 */
import { siteConfig } from '../../../config/site'
import { refundSummary } from '../../../config/rules'
import { modelIds, recommendedIds, modelBrands } from '../../../config/models'
import { planGroups, allTiers, tiersOf, featuredTierOf, entryTier, planPromos, refundNotes } from '../../../config/plans'
import { consoleFeatures, consoleBackupDomains, consoleFaqs } from '../../../config/console'
import type { FaqItem } from '../../../config/faq'
import { jsonLdGuideScene, jsonLdGuideIndex, guideFooterItems } from './guide_jsonld'
import { faqByCategory, faqItems, faqCategories, categoryLabels } from '../../../config/faq'
import type { FaqCategory } from '../../../config/faq'
/** 组件从 pages/data 统一引入这些 config 符号，改这里一处即可 */
export { siteConfig, modelIds, recommendedIds, faqCategories, categoryLabels, faqItems }

/** 模型层级说明表（/models 与 /guide 教程页共用） */
/** 常用 model ID 表 */
export const modelIdRows = modelIds.map((m) => ({ label: m.id, values: [m.tier, m.scene, m.pick === 'primary' ? '推荐添加' : '备用'] }))

export { jsonLdGuideScene, jsonLdGuideIndex }

/** 页脚「教程」列：5 个客户端页 */
export const guideNavItems = guideFooterItems()

/** 购买前要问清的两件事（FAQ 页顶部「买之前」区块用），全部对应 config/faq.ts 里的条目 */
export const buyingQuestions = faqItems.filter((x) => ['cat-limits-speed', 'cat-product-period'].includes(x.id))

/** 商品（取 featured） */
export const product = siteConfig.products.find((x) => x.id === siteConfig.featuredProductId) ?? siteConfig.products[0]

/** 站点绝对地址（JSON-LD 的 @id / url 用） */
const base = siteConfig.url.replace(/\/+$/, '')

/**
 * 首页「买之前可以先确认」信任条：把原先散在定价页、FAQ、页尾的边界信息收成首页一行，
 * 让访客不跳转也能判断风险。数字全部从 config/rules.ts / siteConfig 派生。
 */
export const homeTrustNotes = [
  siteConfig.notice,
  '套餐面向个人开发，不含上线服务、多用户共享与对外 API；生产流量、二次转卖不在范围内。',
  `${refundSummary}。`,
  '有效期内不限次数调用 Fable 5.1 与 Opus 5.5，选 Opus 不额外计费；全部档位与规则见套餐定价。',
]

/** 知识库文章总数：所有「N 篇」文案从这里派生，config/knowledge.ts 增删后不会失真 */
export const knowledgeCount = knowledgeEntries.length

/** 首页「继续了解」条：只做站内索引，不复制任何一页的正文 */
export const homeContinueLinks = [
  { no: '01', title: '支持哪些模型', url: '/models', desc: 'model ID 一览、每张模型卡片能复制完整 model ID。' },
  { no: '02', title: '怎么配置起来', url: '/guide', desc: '先选你在用的客户端：Claude Code、桌面版、Codex、WorkBuddy、Cursor 各一条完整路径，每一步都有真实截图。' },
  { no: '03', title: '知识库', url: '/knowledge', desc: 'Claude Code 用法、原理、成本控制与报错排查，${knowledgeCount} 篇按主题分类。' },
]

export const consoleFaqItems = consoleFaqs as FaqItem[]

const faqJsonLd = (items: { q: string; a: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: items.map((it) => ({
    '@type': 'Question',
    name: it.q,
    acceptedAnswer: { '@type': 'Answer', text: it.a.replace(/\n+/g, ' ') },
  })),
})

/** /faq 页 JSON-LD：全量 */
export const jsonLdFaq = faqJsonLd(faqItems)

/** /console 页 JSON-LD：后台 FAQ */
export const jsonLdConsole = faqJsonLd(consoleFaqs)

/** /models 页 JSON-LD */
export const jsonLdModels = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'Claude 模型与 model ID 一览',
  itemListElement: modelIds.map((m, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: m.id,
    description: `${m.tier} 档：${m.scene}`,
  })),
}

/**
 * /pricing 页 JSON-LD：只有 Product。
 * 2026-10-12 起 /pricing 页内不再挂 FAQ 组件（限速与封号只在 /faq 维护一份），
 * 结构化数据必须与页面可见内容一致，所以这里不输出 FAQPage——
 * 否则等于向搜索引擎声明「页面上有这 4 条问答」，而页面上根本没有。
 * /faq 页自己的 FAQPage 由 jsonLdFaq 提供。
 */
export const jsonLdPricing = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Product',
      '@id': base + '/pricing#product',
      name: product.name,
      description: product.features.join('；'),
      url: base + '/pricing',
      brand: { '@type': 'Brand', name: siteConfig.name },
      offers: {
        '@type': 'Offer',
        url: product.shopUrl,
        priceCurrency: 'CNY',
        price: product.price.replace(/[^\d.]/g, ''),
        availability: 'https://schema.org/InStock',
        seller: { '@type': 'Organization', name: siteConfig.name },
      },
    },
  ],
}

/** 首页 JSON-LD */
export const jsonLdHome = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': base + '/#org',
      name: siteConfig.name,
      url: base,
      description: siteConfig.description,
      // 与 jsonld_server.ts 的 org.sameAs 保持一致（两份 JSON-LD 必须同步）
      sameAs: [siteConfig.sourceRepo.url],
    },
    { '@type': 'WebSite', '@id': base + '/#site', url: base, name: siteConfig.name, description: siteConfig.description, inLanguage: 'zh-CN', publisher: { '@id': base + '/#org' } },
    {
      '@type': 'Product',
      '@id': base + '/pricing#product',
      name: product.name,
      description: product.features.join('；'),
      brand: { '@id': base + '/#org' },
      offers: {
        '@type': 'Offer',
        url: product.shopUrl,
        priceCurrency: 'CNY',
        price: product.price.replace(/[^\d.]/g, ''),
        availability: 'https://schema.org/InStock',
        seller: { '@id': base + '/#org' },
      },
    },
  ],
}

/** FAQ 分类顺序：购买 → 商品 → 限速 → 配置 → 接入 → 安全 → 我们 */
export const faqGroupOrder: FaqCategory[] = ['product', 'limits', 'setup', 'usage', 'security', 'about']

export const faqGroups = faqGroupOrder.map((cat) => ({
  cat,
  label: categoryLabels[cat],
  items: faqByCategory(cat),
}))

/* ---------------- 知识库 ---------------- */

import {
  knowledgeEntries,
  knowledgeCategories,
  knowledgeSummary,
  knowledgeBySlug,
  knowledgeCategoryName,
  knowledgeCategoryShort,
  knowledgeCategoryEntries,
  knowledgeCategoryCount,
} from '../../../config/knowledge'
import type { KnowledgeMeta } from '../../../config/knowledge'

const KNOWLEDGE_BASE = siteConfig.url.replace(/\/+$/, '')

/** 知识库文章卡（/knowledge 列表、精选、页尾相关阅读共用；顺序 = knowledge.ts 书写顺序） */
export const knowledgeCards = knowledgeEntries.map((e) => ({
  slug: e.slug,
  url: `/knowledge/${e.slug}`,
  title: e.title,
  summary: knowledgeSummary(e),
  /** 分类 key：列表页按分类分组、精选与卡片徽标都用它 */
  cat: e.cat,
  catName: knowledgeCategories.find((c) => c.cat === e.cat)?.name ?? '',
  catShort: knowledgeCategories.find((c) => c.cat === e.cat)?.short ?? '',
  /** 仅用于 JSON-LD 的 datePublished，页面不展示日期 */
  date: e.date,
  minutes: e.minutes,
  featured: !!e.featured,
  /** 卡片封面图（public/knowledge/<slug>.jpg）；无图的条目为空串，卡片不渲染 media 区 */
  cover: e.cover ?? '',
}))

export const knowledgeFooterCats = knowledgeCategories
  .slice()
  .sort((a, b) => a.order - b.order)
  .map((c) => ({ name: c.name, url: `/knowledge#cat-${c.cat}` }))

/** 文章页 JSON-LD：TechArticle + FAQPage（FAQ 来自 config/knowledge.ts 的 faq[]，与 md「## 常见问题」一致） */
export function jsonLdKnowledge(e: KnowledgeMeta, faq: KnowledgeMeta['faq'] = []) {
  const url = `${KNOWLEDGE_BASE}/knowledge/${e.slug}`
  const catName = knowledgeCategories.find((c) => c.cat === e.cat)?.name ?? e.cat
  const org = { '@type': 'Organization', name: siteConfig.name, url: KNOWLEDGE_BASE + '/' }
  const graph: Record<string, unknown>[] = [
    {
      '@type': 'TechArticle',
      headline: e.title,
      description: e.desc,
      url,
      datePublished: e.date,
      dateModified: e.updated ?? e.date,
      author: org,
      publisher: org,
      articleSection: catName,
      inLanguage: 'zh-CN',
      ...(e.cover ? { image: KNOWLEDGE_BASE + e.cover } : {}),
    },
  ]
  if (faq.length) {
    graph.push({
      '@type': 'FAQPage',
      mainEntity: faq.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    })
  }
  return { '@context': 'https://schema.org', '@graph': graph }
}

/** 列表页 JSON-LD：CollectionPage + ItemList（顺序 = 站内顺序） */
export function jsonLdKnowledgeIndex() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        name: 'Claude 知识库',
        description: 'Claude Code 用法、原理、成本与报错排查，按四个主题分类查。',
        url: `${KNOWLEDGE_BASE}/knowledge`,
        isPartOf: { '@id': `${KNOWLEDGE_BASE}/#site` },
        mainEntity: {
          '@type': 'ItemList',
          itemListOrder: 'https://schema.org/ItemListOrderDescending',
          itemListElement: knowledgeEntries.map((e, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            url: `${KNOWLEDGE_BASE}/knowledge/${e.slug}`,
            name: e.title,
          })),
        },
      },
    ],
  }
}

export { knowledgeBySlug }
export { knowledgeCategories, knowledgeCategoryName, knowledgeCategoryShort, knowledgeCategoryEntries, knowledgeCategoryCount }

/** 套餐、后台相关的导出（/pricing、/console 页直接用） */
export { planGroups, allTiers, tiersOf, featuredTierOf, entryTier, planPromos, refundNotes }
export { consoleFeatures, consoleBackupDomains, consoleFaqs }
export { modelBrands }
