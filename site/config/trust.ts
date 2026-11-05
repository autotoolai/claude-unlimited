/**
 * 信任层文案 —— 关于 / 服务条款 / 隐私 三页的唯一数据源。
 *
 * GEO：可核验的主体、退款与数据规则。数字从 config/rules.ts 派生，不手写。
 * 写作：每句可外部核验；空字段写「暂未提供」，不编造。
 */
import { siteConfig, partnerUrl } from './site'
import {
  limits,
  excludes,
  refundSummary,
  refundWindowDays,
} from './rules'
import { shopUrl as purchaseUrl } from './plans'

export interface TrustCard {
  title: string
  body: string
}

export interface TrustSection {
  /** H2 标题 */
  h2: string
  /** 段落 / 列表项。支持内联 [文案](url) */
  items: string[]
  bullets?: boolean
  /** 安全清单样式（勾选列表） */
  checklist?: boolean
}

/** 站点主体与联系方式。三页共用，避免说法不一致。 */
export const operator = {
  company: siteConfig.legal.company,
  icp: siteConfig.legal.icp,
  wechat: siteConfig.contact.wechatId,
  qqGroup: siteConfig.contact.qqGroup,
  email: siteConfig.contact.email,
  consoleUrl: partnerUrl('console'),
  purchaseUrl,
}

function operatorLines(): string[] {
  const out: string[] = []
  out.push(
    operator.company
      ? `运营主体：${operator.company}`
      : '运营主体：暂未在站点公开。Claude 无限卡是一个独立运营的个人开发者项目，不是公司产品。',
  )
  out.push(
    operator.icp
      ? `ICP 备案：${operator.icp}`
      : 'ICP 备案：暂未提供。该站点部署在中国大陆境外服务器上，因此没有中国大陆要求的 ICP 备案。',
  )
  if (operator.email) out.push(`邮件：${operator.email}`)
  else out.push('邮件：暂未提供，请用微信或 QQ 群联系。')
  out.push(
    `管理后台介绍：[rsxermu666.cn](/console)；操作台 [${operator.consoleUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')}](${operator.consoleUrl})（与本站同属一个运营方）`,
  )
  return out
}

/** 关于页三事实卡（对照参考站「短导语 + 三卡」，内容只用可核验事实） */
export const aboutCards: TrustCard[] = [
  {
    title: '我们是谁',
    body: '独立的第三方 API 网关，把 Claude 模型调用按订阅期打包售卖。与 Anthropic 官方无隶属、授权或合作关系；模型能力归 Anthropic，本站只提供调用通道与额度分发。',
  },
  {
    title: '怎么交付',
    body: '购买与支付在第三方发卡站完成；卡密兑换、提取 API Key、查用量在 [rsxermu666.cn 管理后台](/console)。本站只做介绍与答疑，不处理支付、不托管你的资金。',
  },
  {
    title: '边界',
    body: `面向个人开发。${excludes.map((e) => e.label).join('、')}不在范围内。档位、限流数字与退款细则见[套餐定价](/pricing)。`,
  },
]

export const aboutSections: TrustSection[] = [
  {
    h2: '安全与数据',
    checklist: true,
    items: [
      '全站 HTTPS 访问',
      '不设用户账号、不做登录、不设 Cookie 追踪',
      '访问统计只记聚合数据（页面次数、来源、设备类型），不识别个人',
      'API 调用经本网关转发至 Anthropic；浏览器端不存储 API Key',
      '支付信息只在发卡站处理，本站不接触',
      '更细的数据规则见[隐私政策](/privacy)',
    ],
  },
  {
    h2: '运营主体',
    items: operatorLines(),
    bullets: true,
  },
]

export const termsSections: TrustSection[] = [
  {
    h2: '1. 服务性质',
    items: [
      'Claude 无限卡提供的是第三方 API 网关服务，调用的是 Anthropic 的 Claude 模型。本站不是 Anthropic 官方，不出售官方订阅（Claude Pro / Max）。',
      '商品为虚拟服务，购买后以「激活并获得 API Key」为交付完成时点，不涉及实物物流。',
    ],
  },
  {
    h2: '2. 退款规则',
    items: [
      `${refundSummary}。售后申请窗口为购买后 ${refundWindowDays} 天内。`,
      '未激活的卡密可全额退款；激活后超过 1 小时不受理无理由退款。',
      '默认不退：因个人操作问题（配置、模型选择、客户端使用）产生的困扰；虚拟商品无理由退货。',
      '退款以第三方发卡站的商品详情为准——发卡站是实际收款方。站内规则与商品详情不一致时以商品详情为准，详见[套餐定价](/pricing)。',
      '发生服务故障时，请先通过站内联系方式沟通；未先联系即发起支付争议，可能影响处理。',
    ],
  },
  {
    h2: '3. 使用限制',
    items: [
      `单 Key 公平使用上限（基础档）：同时 ${limits.sessions} 个会话窗口、单会话 ${limits.concurrency} 路并发、${limits.rpm} 次/分钟。完整数字与多窗档见[套餐定价](/pricing)。超过上限的请求会被拒绝并返回 Retry-After。`,
      '不得将本服务用于生产环境对外流量、多用户共享、批量抓取、压测或扫描。',
      '不得用于任何违法违规用途。使用者对自己账号下产生的全部调用行为负责。',
    ],
  },
  {
    h2: '4. 免责',
    items: [
      '本网关的可用性、延迟与上游模型服务的稳定性不作保证。上游 Anthropic 的服务调整可能影响调用。',
      '主域名不可达时可切换备用域名，API Key 无需更换。备用域名会通过站内公告发布。',
      '本站不承担因使用或无法使用本服务造成的间接损失，包括业务中断、数据损失。',
    ],
  },
  {
    h2: '5. 条款变更',
    items: [
      '条款变更会在本页更新，并同步记入站内[变更历史](/changelog)。不另行单独通知已购买用户；已购订单按购买时的条款执行。',
    ],
  },
]

export const privacySections: TrustSection[] = [
  {
    h2: '1. 适用范围',
    items: [
      '本政策说明你访问本站（静态介绍站）时，我们如何处理信息。',
      '不适用于 Anthropic、第三方发卡站、以及你自行使用的客户端工具——它们各自有独立政策。',
    ],
  },
  {
    h2: '2. 本站记录什么',
    items: [
      '本站不设用户账号、不做登录、不设 Cookie 追踪。',
      '访问统计只记录聚合数据：页面访问次数、来源渠道、设备类型。不记录能识别到具体个人的信息。',
      '站内代码不加载任何第三方广告脚本。',
    ],
  },
  {
    h2: '3. 调用数据在哪里',
    items: [
      'API 调用发生在本网关与 Anthropic 之间。提示词与模型返回经网关转发，用于完成请求。',
      '本站不在浏览器端存储你的 API Key。CC Switch 等工具导入配置时由该工具本地保存。',
      '网关侧日志用于排查故障与限流；具体留存范围与期限暂未公开。',
    ],
  },
  {
    h2: '4. 第三方',
    items: [
      `购买与支付在第三方发卡站 [${operator.purchaseUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')}](${operator.purchaseUrl}) 完成，本站不接触支付信息。`,
      `API Key 的提取与用量查询在管理后台完成（介绍见 [rsxermu666.cn](/console)，操作台 [${operator.consoleUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')}](${operator.consoleUrl})），该站点属同一运营方。`,
      '页面字体来自 Google Fonts；统计脚本来自 Umami 与百度统计。这些第三方会收到你的 IP 与浏览器信息。',
    ],
    bullets: true,
  },
  {
    h2: '5. 你的选择',
    items: [
      '本站不设 Cookie，不需要同意弹窗。可用浏览器扩展屏蔽第三方统计脚本。',
      '如需删除调用记录、更正或投诉，通过下方联系方式提出。',
    ],
  },
]

const legalNav = [
  { key: 'about', href: '/about', label: '关于我们' },
  { key: 'terms', href: '/terms', label: '服务条款' },
  { key: 'privacy', href: '/privacy', label: '隐私政策' },
] as const

export type TrustPageKey = 'about' | 'terms' | 'privacy'

export const trustPages = {
  about: {
    slug: 'about',
    title: '关于我们',
    lead: '第三方 Claude API 网关：订阅期内不按 token 计费。本站只介绍与答疑，购买在发卡站完成。',
    description:
      'Claude 无限卡关于页：运营主体、交付方式、使用边界与安全做法。与 Anthropic 官方无隶属关系。',
    updatedAt: '' as string,
    cards: aboutCards,
    sections: aboutSections,
    showLimitsNote: false,
  },
  terms: {
    slug: 'terms',
    title: '服务条款',
    lead: '交付时点、退款规则、使用限制、免责范围与条款变更方式。',
    description:
      'Claude 无限卡服务条款：服务性质、退款规则、使用限制、免责范围与条款变更方式。',
    updatedAt: '2026-11-04',
    cards: [] as TrustCard[],
    sections: termsSections,
    showLimitsNote: true,
  },
  privacy: {
    slug: 'privacy',
    title: '隐私政策',
    lead: '本站记录什么、不记录什么，调用数据经过哪些环节。',
    description:
      'Claude 无限卡隐私政策：不设账号与 Cookie，统计只记聚合数据，API 经网关转发，第三方环节说明。',
    updatedAt: '2026-11-04',
    cards: [] as TrustCard[],
    sections: privacySections,
    showLimitsNote: false,
  },
} as const

export { legalNav }
