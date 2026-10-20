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
 * 两处必须同步——改了 FAQ、教程步骤、模型表或知识库元数据后，跑 `npm run build`
 * （内含 gen:jsonld 把结构化数据写进产物 + check_dist 断言产物里的 JSON-LD 类型）核对结果。
 */
import { siteConfig } from '../../../config/site'
import { modelIds } from '../../../config/models'
import { faqItems } from '../../../config/faq'
import { consoleFaqs } from '../../../config/console'
import { guidePageBySlug, guidePages } from '../../../config/guide'
import { jsonLdGuideScene, jsonLdGuideIndex } from './guide_jsonld'
import { knowledge, knowledgeCategories } from '../../../config/knowledge'
import { videos } from '../../../config/video_meta'
import { posterUrl, videoUrl } from '../../../config/media_cdn'
import { trustPages, operator } from '../../../config/trust'
import type { Product } from '../../../config/site'

const BASE = siteConfig.url.replace(/\/+$/, '')

/** 商品（取 featured，与 pages/data.ts 的 product 同一份推导） */
const product: Product = siteConfig.products.find((x) => x.id === siteConfig.featuredProductId) ?? siteConfig.products[0]
const org = {
  '@type': 'Organization',
  name: siteConfig.name,
  // legalName 只在 config/site.ts 的 legal.company 真填了才写。编造主体名的信任损害
  // 远大于留空，AI 与搜索引擎都倾向交叉验证主体真实性。
  ...(siteConfig.legal.company ? { legalName: siteConfig.legal.company } : {}),
  url: BASE + '/',
  ...(operator.icp ? { taxID: operator.icp } : {}),
  // sameAs 把官网与公开仓库指认为同一实体的两个入口。搜索引擎据此把两边的信号合并，
  // 而不是当成两份互不相干的站点；反向链接（官网 → GitHub）在 SiteFooter 与 llms.txt。
  sameAs: [siteConfig.sourceRepo.url],
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
 * /pricing：只有 Product。
 * 2026-10-12 起 /pricing 页内不再挂 FAQ 组件，限速与封号规则只在 /faq 维护一份。
 * FAQPage 必须与页面可见内容一致（搜索引擎按「声明了但页面上看不见」判不合格），
 * 所以定价页不输出 FAQPage；/faq 页的 FAQPage 由下面的 faqJsonLd(faqItems) 提供。
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

/** /guide 索引页：CollectionPage + ItemList（5 个客户端） */
function jsonLdGuideIndexPage() {
  return jsonLdGuideIndex()['@graph'] as Record<string, unknown>[]
}

/** /guide/<scene>：一个 HowTo（这条路径怎么做）+ 一个 FAQPage（这个客户端的常见问题） */
function jsonLdGuideScenePage(slug: string) {
  const page = guidePageBySlug(slug)
  if (!page) return undefined
  return jsonLdGuideScene(page)['@graph'] as Record<string, unknown>[]
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


/**
 * 面包屑（2026-10-13 新增）：二级以下页面统一挂一条 BreadcrumbList。
 *
 * 为什么加：GEO 场景下 AI 需要知道「这页在站点里的位置」才敢引用它的层级语境；Search Console 的
 * 富媒体测试也会读面包屑。知识库文章的层级是 首页 > 知识库 > 分类 > 文章，分类从 config/knowledge.ts
 * 推导，不写死。
 */
function breadcrumb(items: { name: string; url: string }[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: BASE + it.url,
    })),
  }
}

/** 全站面包屑：首页 > 当前页。根级页面（首页自己除外）用它。 */
function breadcrumbFor(route: string) {
  const segs = route.split('/')
  const out = [{ name: siteConfig.name, url: '/' }]
  const acc: string[] = []
  for (const s of segs) {
    acc.push(s)
    const url = '/' + acc.join('/')
    let name = s
    if (acc.length === 1 && s === 'knowledge') name = 'Claude 知识库'
    else if (acc.length === 1 && s === 'guide') name = '使用教程'
    // 教程场景页（/guide/cc 等）：用场景短名（Claude Code、Codex…），不要把 slug 片段原文
    // 当面包屑标题——爬虫按可见标题理解层级，'cc' 对人和 AI 都是噪声。
    else if (acc.length === 2 && acc[0] === 'guide') name = guidePages.find((p) => p.slug.slice(1) === acc[1])?.nav ?? s
    else if (acc.length === 1 && s === 'pricing') name = '套餐定价'
    else if (acc.length === 1 && s === 'models') name = '模型广场'
    else if (acc.length === 1 && s === 'faq') name = '常见问题'
    out.push({ name, url })
  }
  return breadcrumb(out)
}

/** VideoObject：让 public/videos 下的 mp4 对爬虫可见（产物里 <video> 只有 data-src，读不到）。 */
function videoObjectsFor(page: string) {
  return videos
    .filter((v) => v.page === page)
    .map((v) => ({
      '@type': 'VideoObject',
      name: v.description.split('：')[0],
      description: v.description,
      contentUrl: videoUrl(v.src),
      thumbnailUrl: `${BASE}${posterUrl(v.src)}`,
      uploadDate: v.uploadDate,
      duration: v.duration,
      inLanguage: 'zh-CN',
      isFamilyFriendly: true,
    }))
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
  // 面包屑：首页 > 知识库 > 分类 > 文章（复用上面已算好的 catName，不重复声明）
  graph.push(
    breadcrumb([
      { name: siteConfig.name, url: '/' },
      { name: 'Claude 知识库', url: '/knowledge' },
      ...(catName ? [{ name: catName, url: `/knowledge#${e.cat}` }] : []),
      { name: e.title, url: '/knowledge/' + e.slug },
    ]),
  )
  graph.push(...videoObjectsFor(e.slug))
  return { '@context': 'https://schema.org', '@graph': graph }
}

/**
 * 路由（无前导斜杠、首页为空串）-> JSON-LD 对象。
 * 返回 undefined 表示该路由没有结构化数据，transformHead 就不输出脚本标签。
 */
export function jsonLdForRoute(routePath: string): Record<string, unknown> | undefined {
  if (routePath === '') return jsonLdHome
  if (routePath.startsWith('knowledge/')) return jsonLdKnowledgeArticle(routePath.slice('knowledge/'.length)) ?? undefined
  // 其余根级页面：原对象扁平（@type + 字段），统一包成 @graph 并补一条面包屑。
  // 包 @graph 而不是往原对象塞字段，是为了让 gen_jsonld 的「按 @graph 读类型」逻辑对所有页面一致。
  // switch 而不是嵌套三元：knowledge 分支要剥掉外层 @graph（只留 CollectionPage），
  // 嵌套三元里塞这个操作类型收不拢，且读起来比 switch 难查。
  let flat: Record<string, unknown> | undefined
  // 教程场景页：/guide/<scene>。必须放在 switch 之前——switch 是精确匹配，
  // case 'guide' 命中不了 'guide/cc'，漏在这里的场景页会一路走到 default 拿到 undefined，
  // 产物里既没有 HowTo 也没有 FAQPage（构建不报错，只是爬虫看不到结构化数据）。
  if (routePath.startsWith('guide/')) {
    const slug = '/guide/' + routePath.slice('guide/'.length)
    const graph = jsonLdGuideScenePage(slug)
    // 未知场景返回 undefined：宁可这一页没有结构化数据，也不要塞一个 '@graph': undefined 的空壳
    if (!graph) return undefined
    flat = { '@graph': graph }
  }
  switch (routePath) {
    case 'pricing':
      flat = jsonLdPricing
      break
    case 'models':
      flat = jsonLdModels
      break
    case 'faq':
      flat = faqJsonLd(faqItems)
      break
    case 'console':
      flat = faqJsonLd(consoleFaqs)
      break
    case 'guide':
      flat = { '@graph': jsonLdGuideIndexPage() }
      break
    case 'knowledge':
      flat = { '@graph': (jsonLdKnowledgeIndex()['@graph'] as Record<string, unknown>[]).slice(0, 1) }
      break
    default: {
      const tp = trustPages[routePath as keyof typeof trustPages]
      if (tp) {
        flat = {
          '@type': 'WebPage',
          name: tp.title,
          description: tp.description,
          url: BASE + '/' + routePath,
          inLanguage: 'zh-CN',
          isPartOf: { '@id': BASE + '/#site' },
          about: { '@id': BASE + '/#org' },
        }
      }
    }
  }
  if (!flat) return undefined
  const graph: Record<string, unknown>[] = Array.isArray(flat['@graph'])
    ? (flat['@graph'] as unknown[]).map((x) => x as Record<string, unknown>)
    : [{ ...flat }]
  graph.push(breadcrumbFor(routePath))
  return { '@context': 'https://schema.org', '@graph': graph }
}