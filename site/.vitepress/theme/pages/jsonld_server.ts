/**
 * 路由 -> JSON-LD 的映射，供 config.mts 的 transformHead 在**构建期**写进产物 HTML。
 *
 * 为什么要有这个模块：页面组件里的 <JsonLd> 走全局注册表，由 Layout.vue 在 onMounted 后插进 head，
 * SSR 产物里没有这段脚本。爬虫不执行 JS，看到的就是零结构化数据，FAQ 富摘要、商品卡全部拿不到。
 * 这里把同一份数据在构建期直接输出成 <script type="application/ld+json">，客户端注入保留做降级。
 *
 * 为什么不直接 import .vitepress/theme/pages/data.ts：那份数据模块 import 了 components/sections.ts（Vue 组件文件），
 * config.mts 在 Node 侧加载会拖进 SFC 编译器。下面的构造函数只依赖 config/ 下的纯数据模块。
 *
 * 数据仍以 config/ 为唯一真源：这里不新增任何文案，只把页面组件里那份 JSON 换个地方生成。
 * 两处必须同步——改了 FAQ、教程步骤、模型表或知识库元数据后，跑 `npm run check:jsonld` 比对产物里的 JSON。
 */
import { siteConfig } from '../../../config/site'
import { modelIds } from '../../../config/models'
import { faqItems, faqByCategory } from '../../../config/faq'
import { consoleFaqs } from '../../../config/console'
import { guidePage } from '../../../config/guide'
import { knowledge, knowledgeCategories } from '../../../config/knowledge'
import type { Product } from '../../../config/site'

const BASE = siteConfig.url.replace(/\/+$/, '')

/** 商品（取 featured，与 pages/data.ts 的 product 同一份推导） */
const product: Product = siteConfig.products.find((x) => x.id === siteConfig.featuredProductId) ?? siteConfig.products[0]
const org = { '@type': 'Organization', name: siteConfig.name, url: BASE + '/' }

const faqJsonLd = (items: { q: string; a: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: items.map((it) => ({
    '@type': 'Question',
    name: it.q,
    acceptedAnswer: { '@type': 'Answer', text: it.a.replace(/\n+/g, ' ') },
  })),
})

/** 首页：Organization + WebSite + Product（与 pages/data.ts 的 jsonLdHome 保持一致） */
const jsonLdHome = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'Organization', '@id': BASE + '/#org', name: siteConfig.name, url: BASE, description: siteConfig.description },
    {
      '@type': 'WebSite',
      '@id': BASE + '/#site',
      url: BASE,
      name: siteConfig.name,
      description: siteConfig.description,
      inLanguage: 'zh-CN',
      publisher: { '@id': BASE + '/#org' },
    },
    {
      '@type': 'Product',
      '@id': BASE + '/pricing#product',
      name: product.name,
      description: product.features.join('；'),
      brand: { '@id': BASE + '/#org' },
      offers: {
        '@type': 'Offer',
        url: product.shopUrl,
        priceCurrency: 'CNY',
        price: product.price.replace(/[^\d.]/g, ''),
        availability: 'https://schema.org/InStock',
        seller: { '@id': BASE + '/#org' },
      },
    },
  ],
}

/**
 * /pricing：Product + FAQPage（原 /unlimited 的 FAQ 并入这里）。
 * 购买 + 限速两类 FAQ 必须带上，缺了定价页就拿不到富摘要。
 */
const jsonLdPricing = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Product',
      '@id': BASE + '/pricing#product',
      name: product.name,
      description: product.features.join('；'),
      url: BASE + '/pricing',
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
    faqJsonLd(faqByCategory('limits')),
  ],
}

/** /models：模型 ID 清单 */
const jsonLdModels = {
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
 * /guide：小白教程与高级配置各输出一个 HowTo（与客户端 pages/data.ts 的 jsonLdGuide 同构，
 * 改一边要改另一边；结构化数据里 HowToStep 用小节标题 + lead，正文步骤在 step 里逐条编号）。
 */
function jsonLdGuide() {
  const page = guidePage()
  const rails: { tab: 'novice' | 'pro'; name: string; desc: string }[] = [
    {
      tab: 'novice',
      name: '小白教程',
      desc: '按顺序照做：取 API Key → 装 CC Switch → 一键导入 → 获取并保存模型 → 启用并检测链路 → VS Code 插件 → /model 切换模型。',
    },
    {
      tab: 'pro',
      name: '高级配置',
      desc: '已经有卡密或 API Key：提取 API Key → 手动配置（接口地址 / API Key / 模型名）。',
    },
  ]
  const graph = rails.map((r, i) => ({
    '@type': 'HowTo',
    name: i === 0 ? page.title : r.name,
    description: i === 0 ? page.desc : r.desc,
    step: page.blocks
      .filter((b) => b.tab === r.tab)
      .map((b, j) => ({ '@type': 'HowToStep', position: j + 1, name: b.h2, text: b.lead ?? '' })),
  }))
  return { '@context': 'https://schema.org', '@graph': graph }
}

/** /knowledge 列表页：CollectionPage + ItemList */
function jsonLdKnowledgeIndex() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        name: 'Claude 知识库',
        description: 'Claude Code 用法、原理、成本与报错排查，按四个主题分类查。',
        url: BASE + '/knowledge',
        isPartOf: { '@id': BASE + '/#site' },
        mainEntity: {
          '@type': 'ItemList',
          itemListOrder: 'https://schema.org/ItemListOrderDescending',
          itemListElement: knowledge.map((e, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            url: BASE + '/knowledge/' + e.slug,
            name: e.title,
          })),
        },
      },
    ],
  }
}

/** /knowledge/<slug>：TechArticle + FAQPage */
function jsonLdKnowledgeArticle(slug: string) {
  const e = knowledge.find((k) => k.slug === slug)
  if (!e) return null
  const catName = knowledgeCategories.find((c) => c.cat === e.cat)?.name ?? e.cat
  const graph: Record<string, unknown>[] = [
    {
      '@type': 'TechArticle',
      headline: e.title,
      description: e.desc,
      url: BASE + '/knowledge/' + e.slug,
      datePublished: e.date,
      dateModified: e.updated ?? e.date,
      author: org,
      publisher: org,
      articleSection: catName,
      inLanguage: 'zh-CN',
      ...(e.cover ? { image: BASE + e.cover } : {}),
    },
  ]
  if (e.faq?.length) {
    graph.push({
      '@type': 'FAQPage',
      mainEntity: e.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    })
  }
  return { '@context': 'https://schema.org', '@graph': graph }
}

/**
 * 路由（无前导斜杠、首页为空串）-> JSON-LD 对象。
 * 返回 undefined 表示该路由没有结构化数据，transformHead 就不输出脚本标签。
 */
export function jsonLdForRoute(routePath: string): Record<string, unknown> | undefined {
  if (routePath === '') return jsonLdHome
  if (routePath === 'pricing') return jsonLdPricing
  if (routePath === 'models') return jsonLdModels
  if (routePath === 'faq') return faqJsonLd(faqItems)
  if (routePath === 'console') return faqJsonLd(consoleFaqs)
  if (routePath === 'guide') return jsonLdGuide()
  if (routePath === 'knowledge') return jsonLdKnowledgeIndex()
  if (routePath.startsWith('knowledge/')) return jsonLdKnowledgeArticle(routePath.slice('knowledge/'.length)) ?? undefined
  return undefined
}