/**
 * 四页共享的静态数据（卖点、步骤、对比表、JSON-LD）。页面组件（index.vue / pricing.vue / unlimited.vue / faq.vue）
 * 从这里取数，config/ 里的站点配置与 FAQ 是唯一真源。
 */
import { siteConfig, partner } from '../../../config/site'
import { modelIds, tierRows, recommendedIds, modelCommand, modelSwitchCommand } from '../../../config/models'
import { guidePages } from '../../../config/guide'
import type { GuidePage } from '../../../config/guide'
import { faqByCategory, faqItems, faqCategories, categoryLabels } from '../../../config/faq'
import { TOKEN_COST_ART } from '../components/sections'

export { TOKEN_COST_ART }

/** 模型层级说明表（/unlimited 与 /guide/models 共用） */
export const modelTierRows = tierRows.map((t) => ({ label: t.tier, values: [t.desc] }))

/** 常用 model ID 表 */
export const modelIdRows = modelIds.map((m) => ({ label: m.id, values: [m.tier, m.scene, m.pick === 'primary' ? '推荐添加' : '备用'] }))

/** 教程页 JSON-LD：有步骤块的页面输出 HowTo / HowToStep */
export function jsonLdGuide(page: GuidePage) {
  const steps = page.blocks.flatMap((b) => b.steps ?? [])
  const graph = steps.length
    ? [
        {
          '@type': 'HowTo',
          name: page.title,
          description: page.desc,
          step: steps.map((s, i) => ({ '@type': 'HowToStep', position: i + 1, name: s.title, text: s.body.join(' ') })),
        },
      ]
    : []
  return { '@context': 'https://schema.org', '@graph': graph }
}

/** 教程导航（总览页内嵌） */
export const guideNavItems = guidePages.map((g) => ({ title: g.title, nav: g.nav, url: g.slug, desc: g.desc }))

/** 合作平台卡片（首页「合作与兑换」用） */
export const partnerCards = [
  { ...partner('purchase'), cta: '去购买', kind: 'shop' as const },
  { ...partner('activation'), cta: '去兑换', kind: 'activation' as const },
  { ...partner('ccswitch'), cta: '去下载', kind: 'tool' as const },
]

export { siteConfig, modelIds, tierRows, recommendedIds, modelCommand, modelSwitchCommand }

export const featureItems = [
  { title: '不按 token 计费', desc: '订阅期内每次调用都包含在订阅价里，无论消耗 1 千还是 20 万 token。', icon: 'icon-usage' },
  { title: '主流工具开箱即用', desc: 'Claude Code、Cursor、Cline、Roo Code、Aider、Continue、Zed 等，改 Base URL 和 Key 即可。', icon: 'icon-connect' },
  { title: '不换 Key 就能用新模型', desc: 'Anthropic 发布新版模型后只需改 model ID，Key 不需要重新生成或重新购买。', icon: 'icon-connect' },
  { title: 'API 能力完整透传', desc: '流式输出、工具调用、扩展思考、视觉输入、200k 长上下文均按 Anthropic API 同样方式提供。', icon: 'icon-usage' },
  { title: '限速宽松并公开数字', desc: '单 Key 默认 20 路并发、60 次/分钟，不会因为用得多被停，只拦滥用。', icon: 'icon-fair' },
  { title: '买完即用无排队', desc: '支付后分钟级拿到卡密并激活，不需要人工审核、等待名单或 usage review。', icon: 'icon-fair' },
]

export const buySteps = [
  { title: '下单拿卡密', desc: '在发卡站完成付款，系统自动发货卡密，通常分钟级到账。' },
  { title: '兑换成额度', desc: '用卡密在你的账号下兑换 API 额度，即刻生效。' },
  { title: '配置 Base URL 和 Key', desc: '在 Claude Code 或编辑器里填两个环境变量，指向网关地址与你的 Key。' },
  { title: '正常用', desc: '像用官方 Key 一样调用。后续模型升级只改 model ID，Key 不用换。' },
]

export const setupSteps = [
  { title: '填 Base URL', desc: 'Anthropic SDK 和 Claude Code 填根地址（不带 /v1）；OpenAI SDK、Cursor、LangChain 填带 /v1 的地址。', code: 'ANTHROPIC_BASE_URL=<网关根地址>' },
  { title: '填 API Key', desc: '兑换额度后签发的 Key，等同于官方 Key 的用法。', code: 'ANTHROPIC_API_KEY=<你的 Key>' },
  { title: '跑第一个请求', desc: '在终端或 IDE 里发一个简单问题确认连通，即可正常使用。' },
]

export const compareColumns = ['Claude 无限卡', '按量计费 API', '官方订阅']
export const compareRows = [
  { label: '计费方式', values: ['固定订阅价，不按 token', '按百万输入/输出 token 计费', '固定月费，但仅限官方客户端'] },
  { label: '成本可预测性', values: ['高，用多少都是一份订阅费', '低，重度使用账单波动大', '高，但只能在官方产品里用'] },
  { label: '接入方式', values: ['Base URL + Key，可接入任意兼容工具', '同样是 Base URL + Key', '只能在 claude.ai / 官方 App 使用'] },
  { label: '超额后', values: ['触发公平使用限速，不额外扣费', '继续按 token 计费', '等待额度窗口重置'] },
]

export const product = siteConfig.products[0]

export const homeFaq = [
  ...faqByCategory('product').slice(0, 3),
  ...faqByCategory('purchase').slice(0, 2),
  faqByCategory('limits')[0],
]

export const faqGroups = faqCategories.map((cat) => ({
  cat,
  label: categoryLabels[cat],
  items: faqItems.filter((x) => x.cat === cat),
}))

const base = siteConfig.url.replace(/\/+$/, '')

export const jsonLdHome = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'Organization', '@id': base + '/#org', name: siteConfig.name, url: base, description: siteConfig.description, disclaimer: siteConfig.disclaimer },
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

export const jsonLdPricing = {
  '@context': 'https://schema.org',
  '@type': 'Product',
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
}

const faqJsonLd = (items: { q: string; a: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: items.map((it) => ({
    '@type': 'Question',
    name: it.q,
    acceptedAnswer: { '@type': 'Answer', text: it.a.replace(/\n+/g, ' ') },
  })),
})

export const jsonLdUnlimited = faqJsonLd([...faqByCategory('product'), ...faqByCategory('usage')])
export const jsonLdFaq = faqJsonLd(faqItems)
