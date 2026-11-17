/**
 * 信任层文案 ——「关于我们」单页的唯一数据源（含服务条款与隐私）。
 *
 * GEO：可核验的主体、退款与数据规则。数字从 config/rules.ts 派生，不手写。
 * 写作：每句可外部核验；未公开的信息直接说清，不编造。
 * /terms、/privacy 已 301 并入本页锚点 #terms / #privacy。
 */
import { siteConfig, partnerUrl } from './site'

const sourceRepoUrl = siteConfig.sourceRepo.url
import {
  excludes,
  refundSummary,
  refundWindowDays,
  limits,
} from './rules'
import { shopUrl as purchaseUrl } from './plans'

export interface TrustFact {
  label: string
  body: string
}

export interface TrustBlock {
  /** 页内锚点 id */
  id: string
  /** 侧栏 / 顶栏导航文案 */
  nav: string
  /** 区块 H2；空字符串则不渲染标题（首屏事实卡不重复「我们是谁」） */
  h2: string
  /** 可选导语 */
  lead?: string
  /** 「我们是谁」事实行 */
  facts?: TrustFact[]
  /** 小节（服务条款 / 隐私用） */
  subsections?: { h3: string; items: string[]; bullets?: boolean }[]
  /** 运营主体等简单列表 */
  items?: string[]
  bullets?: boolean
}

/** 站点主体与联系方式。隐私条款、JSON-LD、LegalContact 共用。 */
export const operator = {
  company: siteConfig.legal.company,
  icp: siteConfig.legal.icp,
  wechat: siteConfig.contact.wechatId,
  qqGroup: siteConfig.contact.qqGroup,
  email: siteConfig.contact.email,
  consoleUrl: partnerUrl('console'),
  purchaseUrl,
}

const whoFacts: TrustFact[] = [
  {
    label: '定位',
    body: '独立的第三方 API 网关，把 Claude 模型调用按订阅期打包售卖。模型能力归 Anthropic，本站只提供调用通道与额度分发。',
  },
  {
    label: '交付',
    body: '购买与支付在第三方发卡站完成；卡密兑换、提取 API Key、查用量在 [rsxermu666.cn 管理后台](/console)。本站只做介绍与答疑，不处理支付、不托管资金。',
  },
  {
    label: '实体',
    body: `文档站、管理后台 rsxermu666.cn 与公开源码仓库属同一运营体系（JSON-LD Organization.sameAs 互指）。源码：[${sourceRepoUrl.replace(/^https?:\/\//, '')}](${sourceRepoUrl})。运营主体名称未对外公示时不编造。`,
  },
  {
    label: '边界',
    body: `面向个人开发。${excludes.map((e) => e.label).join('、')}不在范围内。档位与退款细则见[套餐定价](/pricing)。`,
  },
]

const termsSubsections: TrustBlock['subsections'] = [
  {
    h3: '服务性质',
    items: [
      'Claude 无限卡是第三方 API 网关，调用 Anthropic 的 Claude 模型。本站不是 Anthropic 官方，不出售官方订阅（Claude Pro / Max）。',
      '商品为虚拟服务，以「激活并获得 API Key」为交付完成时点，不涉及实物物流。',
    ],
  },
  {
    h3: '退款规则',
    items: [
      `${refundSummary}。售后申请窗口为购买后 ${refundWindowDays} 天内。`,
      '未激活的卡密可全额退款；激活后超过 1 小时不受理无理由退款。',
      '因个人操作问题（配置、模型选择、客户端使用）产生的困扰，以及虚拟商品无理由退货，默认不退。',
      '发生服务故障时，请先通过[联系我们](/contact)沟通；未先联系即发起支付争议，可能影响处理。',
    ],
  },
  {
    h3: '使用限制',
    items: [
      `基础档同时可用 ${limits.sessions} 个会话窗口；双窗 / 三窗以对应套餐为准。完整口径见[套餐定价](/pricing)。`,
      '不得用于生产环境对外流量、多用户共享、批量抓取、压测或扫描。',
      '不得用于任何违法违规用途。使用者对自己账号下产生的全部调用行为负责。',
    ],
  },
  {
    h3: '免责',
    items: [
      '网关可用性、延迟与上游模型稳定性不作保证；Anthropic 的服务调整可能影响调用。',
      '主域名不可达时可切换备用域名，API Key 无需更换；备用域名经站内公告发布。',
      '本站不承担因使用或无法使用本服务造成的间接损失，包括业务中断、数据损失。',
    ],
  },
]

const privacySubsections: TrustBlock['subsections'] = [
  {
    h3: '适用范围',
    items: [
      '本政策说明你访问本站（静态介绍站）时，我们如何处理信息。',
      '不适用于 Anthropic、第三方发卡站、以及你自行使用的客户端工具——它们各自有独立政策。',
    ],
  },
  {
    h3: '本站记录什么',
    items: [
      '不设用户账号、不做登录、不设 Cookie 追踪。',
      '访问统计只记聚合数据：页面访问次数、来源渠道、设备类型；不记录能识别到具体个人的信息。',
      '站内代码不加载任何第三方广告脚本。全站 HTTPS。',
    ],
  },
  {
    h3: '调用数据在哪里',
    items: [
      'API 调用经本网关转发至 Anthropic；提示词与模型返回用于完成请求。',
      '浏览器端不存储 API Key。CC Switch 等工具导入配置时由该工具本地保存。',
      '网关侧日志用于排查故障与限流；具体留存范围与期限暂未公开。',
      '支付信息只在发卡站处理，本站不接触。',
    ],
  },
  {
    h3: '第三方与你的选择',
    bullets: true,
    items: [
      `购买与支付在第三方发卡站 [${operator.purchaseUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')}](${operator.purchaseUrl}) 完成。`,
      `API Key 提取与用量查询在管理后台（介绍见 [rsxermu666.cn](/console)，操作台 [${operator.consoleUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')}](${operator.consoleUrl})），属同一运营方。`,
      '本站不设 Cookie，不需要同意弹窗。可用浏览器扩展屏蔽第三方统计脚本。',
    ],
  },
]

/** 页内导航（锚点滚动，不再拆成多页） */
export const legalNav = [
  { id: 'who', label: '我们是谁' },
  { id: 'terms', label: '服务条款' },
  { id: 'privacy', label: '隐私政策' },
] as const

export const aboutBlocks: TrustBlock[] = [
  {
    id: 'who',
    nav: '我们是谁',
    h2: '',
    facts: whoFacts,
  },
  {
    id: 'terms',
    nav: '服务条款',
    h2: '服务条款',
    lead: '交付时点、退款、使用限制与免责范围。',
    subsections: termsSubsections,
  },
  {
    id: 'privacy',
    nav: '隐私政策',
    h2: '隐私政策',
    lead: '本站记录什么、调用数据经过哪些环节。',
    subsections: privacySubsections,
  },
]

export const aboutPage = {
  slug: 'about',
  title: '关于我们',
  lead: '第三方 Claude API 网关：订阅期内不按 token 计费。本站只介绍与答疑，购买在发卡站完成。',
  description:
    'Claude 无限卡关于页：交付方式、服务条款与隐私政策。与 Anthropic 官方无隶属关系。',
  updatedAt: '2026-11-13',
  blocks: aboutBlocks,
} as const

/** JSON-LD / 旧引用兼容：仅保留 about */
export const trustPages = {
  about: aboutPage,
} as const

export type TrustPageKey = keyof typeof trustPages
