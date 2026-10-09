import { guidePages } from '../../../config/guide'

/** 页内目录配置：id 对应 markdown 里的二级标题（slug 化后），加标题时两处一起改 */
export interface SectionLink {
  id: string
  label: string
}

export const SECTION_NAV: Record<string, { id: string; label: string }[]> = {
  // 顺序与 index.vue 正文一致：首屏 → 为什么 → 开始之前 → 四步 → 套餐 → 对比 → 平台 → 教程 → FAQ
  index: [
    { id: 'why-unlimited', label: '为什么选无限额度' },
    { id: 'get-started', label: '开始之前' },
    { id: 'workflow', label: '从买到用起来' },
    { id: 'pricing', label: '套餐' },
    { id: 'compare', label: '和按量计费的区别' },
    { id: 'partners', label: '买、换、配在哪一步' },
    { id: 'guide', label: '使用教程' },
    { id: 'faq', label: '常见问题' },
  ],
  pricing: [
    { id: 'includes', label: '包含什么' },
    { id: 'excludes', label: '不包含什么' },
    { id: 'fair-use', label: '公平使用' },
    { id: 'refund', label: '退款规则' },
    { id: 'about-price', label: '关于价格' },
    { id: 'faq', label: '常见问题' },
  ],
  unlimited: [
    { id: 'vs-usage', label: '和按量计费差在哪' },
    { id: 'models', label: '支持哪些模型' },
    { id: 'capabilities', label: '支持哪些能力' },
    { id: 'fair-use', label: '公平使用' },
    { id: 'setup', label: '怎么开始配置' },
    { id: 'faq', label: '常见问题' },
  ],
  // 与 pages/data.ts 的 faqGroupOrder 一致：购买 → 商品 → 限速 → 配置 → 接入 → 安全 → 我们
  faq: [
    { id: 'cat-buying', label: '买之前' },
    { id: 'cat-purchase', label: '购买与支付' },
    { id: 'cat-product', label: '关于商品' },
    { id: 'cat-limits', label: '限速与封号' },
    { id: 'cat-setup', label: '使用与配置' },
    { id: 'cat-usage', label: '接入与使用' },
    { id: 'cat-security', label: '数据与安全' },
    { id: 'cat-about', label: '关于我们' },
    { id: 'more', label: '还没解决？' },
  ],
  // 教程页：键是 slug 把 / 换成 _（/guide/clients → guide_clients），目录项由 config/guide.ts 的 blocks 生成
  ...Object.fromEntries(
    guidePages.map((p) => [p.slug.replace(/\//g, '_'), p.blocks.map((b) => ({ id: b.id, label: b.h2 }))]),
  ),
}

/** 浅色底 + 暖色线的水平柱状图：一次调用 1 千 token 与 20 万 token，费用都只有一条线 */
export const TOKEN_COST_ART = `
<svg viewBox="0 0 640 260" role="img" aria-label="一次调用 1 千 token 与 20 万 token，按量计费费用相差 200 倍，订阅内两者都等于一份订阅费">
  <g font-family="ui-monospace, Consolas, monospace" font-size="12" fill="#6C6459">
    <text x="0" y="58">1 千 token · 一次提问</text>
    <text x="0" y="208">20 万 token · 长代码库分析</text>
  </g>
  <g fill="#CFC8BB">
    <rect x="180" y="40" width="12" height="24" rx="2" />
    <rect x="180" y="190" width="412" height="24" rx="2" />
  </g>
  <g fill="#C85A1E">
    <rect x="180" y="40" width="12" height="174" rx="2" />
    <rect x="180" y="190" width="12" height="24" rx="2" />
  </g>
  <g font-family="ui-monospace, Consolas, monospace" font-size="12" fill="#6C6459">
    <text x="620" y="60" text-anchor="end">¥ 0.0026</text>
    <text x="620" y="210" text-anchor="end">¥ 0.53</text>
  </g>
  <g font-family="inherit" font-size="13" fill="#403A33">
    <text x="180" y="252">按量计费：费用随 token 量线性增长</text>
    <text x="420" y="252" fill="#C85A1E">订阅内：两条都是同一份订阅费</text>
  </g>
</svg>`