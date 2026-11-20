/**
 * 页面共享的静态数据（卖点、步骤、对比表、JSON-LD）。页面组件（index.vue / pricing.vue / faq.vue /
 * PageModels.vue / PageConsole.vue / GuideIndexPage.vue / GuideScenePage.vue / KnowledgeIndex.vue）从这里取数，
 * config/ 里的站点配置、规则数字、FAQ、教程是唯一真源。
 */
import { siteConfig } from '../../../config/site'
import { refundSummary } from '../../../config/rules'
import { modelIds, recommendedIds, modelBrands } from '../../../config/models'
import { planGroups, allTiers, tiersOf, featuredTierOf, entryTier, planPromos, refundNotes } from '../../../config/plans'
import { consoleFeatures, consoleBackupDomains, consoleFaqs, consoleSteps } from '../../../config/console'
import {
  agencyPageTitle,
  agencyLead,
  agencyAudiences,
  agencyBenefits,
  agencyMindsets,
  agencyFaqs,
} from '../../../config/agency'
import type { FaqItem } from '../../../config/faq'
import { jsonLdGuideScene, jsonLdGuideIndex } from './guide_jsonld'
import {
  faqByCategory,
  faqItems,
  faqCategories,
  categoryLabels,
  categoryLeads,
  buyingQuestions,
  pricingFaqItems,
  modelsFaqItems,
  guideFaqItems,
} from '../../../config/faq'
import type { FaqCategory } from '../../../config/faq'
/** 组件从 pages/data 统一引入这些 config 符号，改这里一处即可 */
export {
  siteConfig,
  modelIds,
  recommendedIds,
  faqCategories,
  categoryLabels,
  faqItems,
  buyingQuestions,
  pricingFaqItems,
  modelsFaqItems,
  guideFaqItems,
}

/** 模型层级说明表（/models 与 /guide 教程页共用） */
/** 常用 model ID 表 */
export const modelIdRows = modelIds.map((m) => ({ label: m.id, values: [m.tier, m.scene, m.pick === 'primary' ? '推荐添加' : '备用'] }))

export { jsonLdGuideScene, jsonLdGuideIndex }

/** 首页「买之前先确认」与 /faq 顶部同一份；全文主场仍在 /faq */
export const featuredFaqItems = buyingQuestions

/** 商品（取 featured） */
export const product = siteConfig.products.find((x) => x.id === siteConfig.featuredProductId) ?? siteConfig.products[0]

/** 站点绝对地址（JSON-LD 的 @id / url 用） */
const base = siteConfig.url.replace(/\/+$/, '')
const consolePartnerUrl = siteConfig.partners.find((p) => p.id === 'console')?.url ?? ''
/** 与 jsonld_server.ts 的 orgSameAs 保持一致 */
const orgSameAs = [siteConfig.sourceRepo.url, ...(consolePartnerUrl ? [consolePartnerUrl] : [])]

/**
 * 首页「买之前可以先确认」信任条：把原先散在定价页、FAQ、页尾的边界信息收成首页一行，
 * 让访客不跳转也能判断风险。数字全部从 config/rules.ts / siteConfig 派生。
 */
export const homeTrustNotes = [
  siteConfig.notice,
  '套餐面向个人开发，不含上线服务、多用户共享与对外 API；生产流量、二次转卖不在范围内。',
  `${refundSummary}。`,
  '有效期内不限次数调用 Fable 5.2 与 Opus 5.5，选 Opus 不额外计费；全部档位与规则见套餐定价。',
]

/** 知识库文章总数：所有「N 篇」文案从这里派生，config/knowledge.ts 增删后不会失真 */
export const knowledgeCount = knowledgeEntries.length

/** 首页「继续了解」条：只做站内索引，不复制任何一页的正文 */
export const homeContinueLinks = [
  { no: '01', title: '支持哪些模型', url: '/models', desc: 'model ID 一览、每张模型卡片能复制完整 model ID。' },
  { no: '02', title: '怎么配置起来', url: '/guide', desc: '先选你用的那一种：Claude Code 插件（VS Code / Cursor）、CLI（终端）、桌面版、Codex、WorkBuddy、Cursor 各一条完整路径，每一步都有真实截图。' },
  { no: '03', title: '知识库', url: '/knowledge', desc: 'Claude Code 用法、原理、成本控制与报错排查，${knowledgeCount} 篇按主题分类。' },
]

export const consoleFaqItems = consoleFaqs as FaqItem[]
export const agencyFaqItems = agencyFaqs as FaqItem[]

const faqJsonLd = (items: { q: string; a: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: items.map((it) => ({
    '@type': 'Question',
    name: it.q,
    acceptedAnswer: { '@type': 'Answer', text: it.a.replace(/\n+/g, ' ') },
  })),
})

/** @graph 内嵌的 FAQPage 节点（无 @context）；条目必须与页内可见 FaqList 一致 */
const faqPageNode = (items: { q: string; a: string }[]) => ({
  '@type': 'FAQPage',
  mainEntity: items.map((it) => ({
    '@type': 'Question',
    name: it.q,
    acceptedAnswer: { '@type': 'Answer', text: it.a.replace(/\n+/g, ' ') },
  })),
})

/** /faq 页 JSON-LD：全量 */
export const jsonLdFaq = faqJsonLd(faqItems)

/** /console 页 JSON-LD：WebPage（功能介绍 + rsxermu666 关联）+ FAQPage */
export const jsonLdConsole = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      name: '管理后台 · rsxermu666.cn',
      description:
        'rsxermu666.cn 是 Claude 无限卡官方管理后台：兑换激活码、提取 API Key、一键导入配置、查看用量与公告。',
      url: base + '/console',
      inLanguage: 'zh-CN',
      isPartOf: { '@id': base + '/#site' },
      about: { '@id': base + '/#org' },
      ...(consolePartnerUrl ? { significantLink: consolePartnerUrl } : {}),
    },
    faqPageNode(consoleFaqs),
  ],
}

/** /agency 页 JSON-LD：WebPage + FAQPage（Token 代理 / rsxermu666 代理 主场） */
export const jsonLdAgency = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      name: agencyPageTitle,
      description: agencyLead,
      url: base + '/agency',
      inLanguage: 'zh-CN',
      isPartOf: { '@id': base + '/#site' },
      about: { '@id': base + '/#org' },
    },
    faqPageNode(agencyFaqs),
  ],
}

/** /models 页 JSON-LD：ItemList + 页内精选 FAQPage */
export const jsonLdModels = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'ItemList',
      name: 'Claude 模型与 model ID 一览',
      itemListElement: modelIds.map((m, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: m.id,
        description: `${m.tier} 档：${m.scene}`,
      })),
    },
    faqPageNode(modelsFaqItems),
  ],
}

/**
 * /pricing 页 JSON-LD：Product + 页内精选 FAQPage。
 * 精选条目见 config/faq.ts 的 pricingFaqItems；限速全文主场仍在 /faq。
 */
export const jsonLdPricing = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Product',
      '@id': base + '/pricing#product',
      name: product.name,
      alternateName: 'Claude 无限续杯',
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
    faqPageNode(pricingFaqItems),
  ],
}

/**
 * /contact 页 JSON-LD：WebPage + ContactPoint。
 *
 * 与 jsonld_server.ts 的 contact / changelog 分支同步（两份必须一致）。
 * 变更历史页没有客户端组件（正文就是 markdown），只由构建期注入，这里不重复定义。
 */
export const jsonLdContact = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      name: '联系我们',
      description:
        'Claude 无限卡的售后、技术支持、代理与商务合作联系方式：微信客服 ren_mo_mo 与 QQ 交流群，添加时备注来意。',
      url: base + '/contact',
      inLanguage: 'zh-CN',
      isPartOf: { '@id': base + '/#site' },
      about: { '@id': base + '/#org' },
    },
    {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      ...(siteConfig.contact.wechatId ? { telephone: siteConfig.contact.wechatId } : {}),
      ...(siteConfig.contact.qqGroup ? { contactOption: siteConfig.contact.qqGroup } : {}),
      ...(siteConfig.contact.email ? { email: siteConfig.contact.email } : {}),
      availableLanguage: ['zh-CN'],
      url: base + '/contact',
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
      alternateName: 'Claude 无限续杯',
      url: base,
      description: siteConfig.description,
      // 与 jsonld_server.ts 的 orgSameAs 保持一致（两份 JSON-LD 必须同步）
      sameAs: orgSameAs,
    },
    { '@type': 'WebSite', '@id': base + '/#site', url: base, name: siteConfig.name, description: siteConfig.description, inLanguage: 'zh-CN', publisher: { '@id': base + '/#org' } },
    {
      '@type': 'Product',
      '@id': base + '/pricing#product',
      name: product.name,
      alternateName: 'Claude 无限续杯',
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
    // 首页可见的 5 条「买之前先确认」FAQ 必须在 schema 里同源出现（与 jsonld_server.ts 同步）
    faqPageNode(buyingQuestions),
  ],
}

/** FAQ 分类顺序：商品 → 开通 → 日常 → 报错 → 安全联系（与 config/faq.ts 的 faqCategories 一致） */
export const faqGroupOrder: FaqCategory[] = ['product', 'setup', 'usage', 'limits', 'safety']

export const faqGroups = faqGroupOrder.map((cat) => ({
  cat,
  label: categoryLabels[cat],
  lead: categoryLeads[cat],
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
export { consoleFeatures, consoleBackupDomains, consoleFaqs, consoleSteps }
export {
  agencyPageTitle,
  agencyLead,
  agencyAudiences,
  agencyBenefits,
  agencyMindsets,
  agencyFaqs,
}
export { modelBrands }
