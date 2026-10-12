/**
 * 站点配置 —— 全站唯一「合作 / 商品 / 联系方式 / 法务」入口。
 *
 * 约定：
 * - 所有平台地址（购买、兑换、CC Switch 下载）只在 partners 里出现，组件内禁止硬编码。
 * - 商品购买按钮的 URL 从 products[].shopUrl 取（= partners.purchase.url）。
 * - 客服浮标二维码、微信号从 contact 取；二维码留空时组件自动降级为「复制微信号」。
 * - 改价格 / 名称 / 周期只改本文件一处；周期天数 days 与首屏承诺 promise 也在这里，页面不另写。
 *
 * TODO（上线前必须替换，见 README「上线前必须确认」）：
 * - R1 正式主域名 url
 * - R2 商品名称 / 价格 / 周期的最终文案
 * - R3 客服微信号 / 微信二维码 / 邮箱
 * - R4 运营主体与 ICP 备案号
 *
 * 文案约定：页面上任何「N 天」「分钟级」表述都从 products[].days / products[].promise 派生，
 * 不在组件或 config/faq.ts 里再写一遍；改价格或周期只改本文件。
 */

import { entryTier, entryTierDays, shopUrl as purchaseUrl } from './plans'

export interface Partner {
  /** 稳定标识：组件里按 id 取，不写死 URL */
  id: 'purchase' | 'console' | 'ccswitch'
  name: string
  /** 站点用途的一句话说明，教程页直接显示 */
  desc: string
  url: string
  /** 工具类链接（CC Switch 下载）给按钮而不是新窗口跳转说明 */
  kind?: 'tool'
}

export interface Product {
  id: string
  name: string
  /** 展示价，带 ¥ 前缀（JSON-LD 的 price 由它去掉非数字字符得到） */
  price: string
  /** 展示周期，如「30 天」 */
  period: string
  /** 周期天数：页面上所有「N 天」表述都从这里派生，避免散落各处的硬编码 */
  days: number
  /** 首屏承诺语（描述性，不写具体分钟数）；正文、按钮下提示、OG 图统一用它 */
  promise: string
  /** 购买落地页（第三方发卡站） */
  shopUrl: string
  features: string[]
  highlighted?: boolean
}

export interface NavItem {
  text: string
  link: string
  /** 二期 / 三期页面先不挂，等页面上线后再开 */
  enabled?: boolean
}

/** 人工客服二维码（configurable：留空时面板显示占位并只提供「复制号码」） */
export interface HumanService {
  wechatId: string
  wechatQr: string
  email: string
}

export interface SiteConfig {
  name: string
  tagline: string
  /** tagline 按短语切分后的数组：首页 H1 逐词上浮入场用（不改变 tagline 本身） */
  taglinePhrases: string[]
  description: string
  /** 正式域名，构建期用于 canonical / sitemap / OG。TODO R1 */
  url: string
  /** 合作平台地址：购买 / 兑换 / CC Switch */
  partners: Partner[]
  nav: NavItem[]
  products: Product[]
  featuredProductId: string
  contact: HumanService
  legal: { icp?: string; company?: string }
  /** 全站提示语（Hero 按钮下方、公告位） */
  notice: string
}

export const siteConfig: SiteConfig = {
  name: 'Claude 无限卡',
  tagline: '一个 Key，Claude 不限量用',
  taglinePhrases: ['一个 Key，', 'Claude', '不限量用'],
  description:
    'Claude 无限卡官网：订阅期内 Claude API 不按 token 计费，支持 Claude Code、Cursor、Cline 等主流工具。本站只做介绍与答疑，购买跳转第三方发卡站。',
  url: 'https://claude-unlimited.aiautotools.com',  // 自定义域（Pages 域 claude-unlimited-site.pages.dev 仍可访问）

  partners: [
    {
      id: 'purchase',
      name: '购买与发卡',
      desc: '选规格 → 付款 → 自动发货卡密，下单与支付都在发卡站完成。',
      url: purchaseUrl,
    },
    {
      id: 'console',
      name: '管理后台',
      desc: '独立的后台页面：兑换卡密、提取 API Key、一键导入配置、查用量与公告。买完卡密后的所有操作都在这里完成。',
      url: 'https://rsxermu666.cn/',
    },
    {
      id: 'ccswitch',
      name: 'CC Switch 官方下载',
      desc: 'CC Switch 是一个约 8 MB 的 Windows/macOS 小工具，用它管理 Claude Code、Codex、Gemini 的 API 供应商配置，支持一键导入与链路检测。下载后全部保持默认安装即可。',
      url: 'https://ccswitch.io/',
      kind: 'tool',
    },
  ],

  // 主导航只放「内容页」：模型广场 / 套餐定价 / 使用教程 / 知识库。
  // 无限额度已并入套餐定价；管理后台是外部站点，页头「进入后台」按钮与页脚「服务」列已有入口。
  nav: [
    { text: '模型广场', link: '/models', enabled: true },
    { text: '套餐定价', link: '/pricing', enabled: true },
    { text: '使用教程', link: '/guide', enabled: true },
    { text: '知识库', link: '/knowledge', enabled: true },
  ],


  /**
   * 主推商品。展示价与周期从 config/plans.ts 的最低档（无限卡周卡）派生，
   * 真实档位与价格只改 plans.ts 一处；features 供 JSON-LD Product 描述使用。
   * 页面上的多档展示走 plans.ts，不走这里。
   */
  products: [
    {
      id: 'claude-unlimited-card',
      name: 'Claude 无限卡',
      price: entryTier.price,
      period: entryTier.period,
      // 天数从最低档派生，不写死：价格与周期每次同步发卡站都会变，
      // 写死 7 天会出现「¥13.5 起 / 最低 1 天档」但 JSON-LD 标 7 天的跨档错配。
      days: entryTierDays,
      promise: '买完即用，分钟级跑起第一请求',
      shopUrl: purchaseUrl,
      highlighted: true,
      features: [
        '有效期内不限次数调用，不按 token 计费，Fable 5.1 与 Opus 5.5 通用',
        '一个 Key 通吃 Claude Code、Cursor、Cline、Aider 等主流工具',
        '支持流式输出、工具调用、扩展思考、视觉输入、长上下文',
        '买完即用，不排队、不审核，分钟级拿到卡密并激活',
      ],
    },
  ],
  featuredProductId: 'claude-unlimited-card',

  // 联系方式（二维码图片放 site/public/，填以 / 开头的路径）。全站唯一数据源：在线助手的「联系人工客服」卡
  // 直接读这里，人工客服浮标已于 2026-10-09 撤掉。
  contact: {
    wechatId: 'ren_mo_mo',
    // 纯码图，由 scripts/crop_wechat_qr.py 从 public/wechat-qr.jpg（手机截图）裁出；整张截图保留作底稿
    wechatQr: '/wechat-qr-code.png',
    email: '',
  },

  legal: {
    icp: '', // TODO R4 ICP 备案号（如有）
    company: '', // TODO R4 运营主体名称
  },

  notice: '支付后分钟级自动发货卡密，不排队、不人工审核。',
}

/** 取当前主推商品；组件用它渲染购买按钮 */
export function featuredProduct(): Product {
  const p = siteConfig.products.find((x) => x.id === siteConfig.featuredProductId)
  if (!p) throw new Error(`featuredProductId=${siteConfig.featuredProductId} 在 products 中不存在`)
  return p
}

/** 购买落地页 URL（ExternalCta / TabBar 唯一取值来源） */
export function shopUrl(): string {
  return featuredProduct().shopUrl
}

/** 合作平台地址（id 稳定，URL 集中在这里） */
export function partnerUrl(id: Partner['id']): string {
  return siteConfig.partners.find((p) => p.id === id)?.url ?? ''
}

export function partner(id: Partner['id']): Partner {
  return siteConfig.partners.find((p) => p.id === id) ?? { id, name: '', desc: '', url: '' }
}

/** 已启用的导航项；TabBar 在此基础上补一个「首页」 */
export const navItems: NavItem[] = siteConfig.nav.filter((n) => n.enabled !== false)