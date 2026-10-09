/**
 * 站点配置 —— 全站唯一「合作 / 商品 / 联系方式 / 法务」入口。
 *
 * 约定：
 * - 所有平台地址（购买、兑换、CC Switch 下载）只在 partners 里出现，组件内禁止硬编码。
 * - 商品购买按钮的 URL 从 products[].shopUrl 取（= partners.purchase.url）。
 * - 客服浮标二维码、微信号、QQ、QQ 群从 contact 取；字段留空时组件自动降级为「复制号码」。
 * - 改价格 / 名称 / 周期只改本文件一处。
 *
 * TODO（上线前必须替换，见 README「上线前必须确认」）：
 * - R1 正式主域名 url
 * - R2 商品名称 / 价格 / 周期的最终文案
 * - R3 客服微信号 / 微信二维码 / QQ / QQ 群 / 邮箱
 * - R4 运营主体与 ICP 备案号
 */

export interface Partner {
  /** 稳定标识：组件里按 id 取，不写死 URL */
  id: 'purchase' | 'activation' | 'ccswitch'
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
  price: string
  period: string
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
  qq: string
  qqGroup: string
  email: string
  hours: string
}

export interface SiteConfig {
  name: string
  tagline: string
  description: string
  /** 正式域名，构建期用于 canonical / sitemap / OG。TODO R1 */
  url: string
  /** 合作平台地址：购买 / 兑换 / CC Switch */
  partners: Partner[]
  nav: NavItem[]
  stats: { value: string; label: string }[]
  products: Product[]
  featuredProductId: string
  contact: HumanService
  legal: { icp?: string; company?: string }
  /** 页脚固定声明 */
  disclaimer: string
}

export const siteConfig: SiteConfig = {
  name: 'Claude 无限卡',
  tagline: '一个 Key，Claude 不限量用',
  description:
    'Claude 无限卡官网：订阅期内 Claude API 不按 token 计费，支持 Claude Code、Cursor、Cline 等主流工具。本站只做介绍与答疑，购买跳转第三方发卡站。',
  url: 'https://claude-unlimited-site.pages.dev',

  partners: [
    {
      id: 'purchase',
      name: '购买与发卡',
      desc: '选规格 → 付款 → 自动发货卡密。本站不处理支付，下单与支付都在这里完成。',
      url: 'https://catfk.com/shop/VDR8ZBW9',
    },
    {
      id: 'activation',
      name: '卡密兑换与 API Key',
      desc: '输入买到的卡密兑换额度，并在同一页查看网关地址（Base URL）与 API Key；页面里还有「一键导入配置」按钮，能直接导入 CC Switch。',
      url: '',
    },
    {
      id: 'ccswitch',
      name: 'CC Switch 官方下载',
      desc: 'CC Switch 是一个约 8 MB 的 Windows/macOS 小工具，用它管理 Claude Code、Codex、Gemini 的 API 供应商配置，支持一键导入与链路检测。下载后全部保持默认安装即可。',
      url: 'https://ccswitch.io/',
      kind: 'tool',
    },
  ],

  nav: [
    { text: '套餐定价', link: '/pricing', enabled: true },
    { text: '无限额度', link: '/unlimited', enabled: true },
    { text: '使用教程', link: '/guide', enabled: true },
    { text: '常见问题', link: '/faq', enabled: true },
    { text: '文章库', link: '/articles', enabled: false },
    { text: '关于我们', link: '/about', enabled: false },
  ],

  stats: [
    { value: '10+', label: '主流客户端开箱即用' },
    { value: '0', label: '按 token 计费' },
    { value: '200k', label: '单次上下文上限' },
    { value: '5 分钟', label: '从买到接入' },
  ],

  products: [
    {
      id: 'claude-unlimited-standard',
      name: 'Claude 无限卡',
      price: '¥298',
      period: '30 天',
      shopUrl: 'https://catfk.com/shop/VDR8ZBW9',
      highlighted: true,
      features: [
        '订阅期内不按 token 计费，Opus / Sonnet / Fable 通用',
        '一个 Key 通吃 Claude Code、Cursor、Cline、Aider 等主流工具',
        '支持流式输出、工具调用、扩展思考、视觉输入、长上下文',
        '买完即用，不排队、不审核，5 分钟内跑起第一请求',
      ],
    },
  ],
  featuredProductId: 'claude-unlimited-standard',

  // TODO R3：换成真实联系方式。二维码图片放 site/docs/assets/ 或 public/，填这里的文件名。
  contact: {
    wechatId: 'bn23923',
    wechatQr: '',
    qq: '1351315',
    qqGroup: '1193964',
    email: '',
    hours: '每天 9:00 – 22:00',
  },

  legal: {
    icp: '', // TODO R4 ICP 备案号（如有）
    company: '', // TODO R4 运营主体名称
  },

  disclaimer:
    '本站为第三方 API 网关服务，与 Anthropic 无隶属关系、未获其背书。Claude 与 Anthropic 为 Anthropic, Inc. 的商标。本站不处理支付与账号，商品信息与最终价格以下单页为准。',
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