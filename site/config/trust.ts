/**
 * 信任层文案（2026-10-13 新增）—— 关于 / 服务条款 / 隐私 三页的唯一数据源。
 *
 * 为什么单独一份：这三页是 GEO 场景下「权威性信号」的主要载体。AI 判断一个小站是否值得引用，
 * 看的就是有没有可核验的主体信息、退款与数据规则写得清不清楚。把它们集中在 config 里，
 * 一是数字（退款窗口、限流）能继续从 config/rules.ts 派生，二是 llms.txt 可以直接引用这份声明。
 *
 * 写作原则：每句话都要能被外部核验或交叉验证，不写形容词与自我评价。
 * 空字段（如未备案的 ICP）显式说明「暂未提供」，不留空、不编造 —— 填错主体信息的信任损害
 * 远大于没有主体信息。
 */
import { siteConfig, partnerUrl } from './site'
import { knowledge } from './knowledge'
import {
  limits,
  limitRows,
  excludes,
  refundSummary,
  refundWindowDays,
  purchaseConditions,
} from './rules'
import { unlimitedTiers, shopUrl as purchaseUrl } from './plans'

/** 公开仓库地址。本页与 /about 的「源码公开」段都指它，改仓库只改 siteConfig.sourceRepo 一处 */
const repo = siteConfig.sourceRepo

/** 知识库篇数从 config/knowledge.ts 派生（CLAUDE.md 规则：数字不许手写进文案） */
const knowledgeCount = String(knowledge.length)

export interface TrustSection {
  /** H2 标题 */
  h2: string
  /** 段落 / 列表项。bullets 为 true 时渲染成列表 */
  items: string[]
  bullets?: boolean
}

/** 站点主体与联系方式。所有页共用同一段，避免三页说法不一致。 */
export const operator = {
  /** 运营主体名称。siteConfig.legal.company 为空时显式说明未提供 */
  company: siteConfig.legal.company,
  /** ICP 备案号 */
  icp: siteConfig.legal.icp,
  wechat: siteConfig.contact.wechatId,
  email: siteConfig.contact.email,
  /** 后台独立站点 */
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
  out.push(operator.icp ? `ICP 备案：${operator.icp}` : 'ICP 备案：暂未提供。该站点部署在中国大陆境外服务器上，因此没有中国大陆要求的 ICP 备案。')
  out.push(`人工客服：微信 ${operator.wechat}（站内右下角在线助手 →「联系人工客服」可一键复制微信号）`)
  out.push(operator.email ? `邮件：${operator.email}` : '邮件：暂未提供，只支持微信联系。')
  out.push(`管理后台：${operator.consoleUrl}（独立站点，与本站同属一个运营方）`)
  return out
}

export const aboutSections: TrustSection[] = [
  {
    h2: '这是谁',
    items: [
      'Claude 无限卡是一个独立的第三方 API 网关服务，把 Claude 模型的调用按订阅期打包售卖：订阅期内调用不按 token 计费，按固定订阅价收费。',
      '本站与 Anthropic 官方没有隶属、授权或合作关系。所有模型能力归 Anthropic 所有，本站只提供调用通道与额度分发。',
      '购买与发卡由第三方发卡站完成，管理后台是另一个独立站点（见上方联系方式）。本站只负责介绍与答疑，不处理支付。',
    ],
  },
  {
    h2: '卖的是什么',
    items: unlimitedTiers.map((t) => `${t.displayName}（${t.period}，${t.price}）：${t.features[0]}`),
    bullets: true,
  },
  {
    h2: '公平使用规则',
    items: [
      '套餐附带有明确的速率限制，不是「无限并发」。具体数字如下，每个数字都可与商品详情核对：',
      ...limitRows.map((r) => `${r.label}：${r.values[0]}（${r.values[1]}）`),
    ],
    bullets: true,
  },
  {
    h2: '不卖给谁',
    items: [
      ...excludes.map((e) => `${e.label}：${e.value}`),
      ...purchaseConditions,
    ],
    bullets: true,
  },
  {
    h2: '源码公开',
    items: [
      `本站的 VitePress 源码与 ${knowledgeCount} 篇知识库文章已在 GitHub 公开（${repo.url}，MIT 许可），可自行核对本站呈现的全部内容与数字。`,
      '开源的只有前端展示层。调用通道、额度分发与服务由本站独立运营，仓库里没有后端代码、密钥或计费逻辑，也不能用于复刻或替代本站服务。',
      '购买、兑换与售后一律以官网与管理后台为准，GitHub 上的 issue 与 discussion 不是购买或客服渠道。',
    ],
  },
  {
    h2: '联系方式',
    items: operatorLines(),
    bullets: true,
  },
]

export const termsSections: TrustSection[] = [
  {
    h2: '服务性质',
    items: [
      'Claude 无限卡提供的是第三方 API 网关服务，调用的是 Anthropic 的 Claude 模型。本站不是 Anthropic 官方，不出售官方订阅（Claude Pro / Max）。',
      '商品为虚拟服务，购买后以「激活并获得 API Key」为交付完成时点，不涉及实物物流。',
    ],
  },
  {
    h2: '退款规则',
    items: [
      refundSummary + `。售后申请窗口为购买后 ${refundWindowDays} 天内。`,
      '未激活的卡密全额退款；激活后超过 1 小时不受理无理由退款。',
      '退款以第三方发卡站的商品详情描述为准 —— 发卡站是实际收款方，站内规则与商品详情不一致时以商品详情为准。',
      '因个人操作问题（配置、模型选择、客户端使用）产生的困扰不在退款范围内。',
      '虚拟商品不支持无理由退货。',
    ],
  },
  {
    h2: '使用限制',
    items: [
      `单 Key 的速率上限为：${limitRows.map((r) => `${r.label} ${r.values[0]}`).join('，')}。超过上限的请求会被拒绝并返回 Retry-After。`,
      '不得将本服务用于生产环境对外流量、多用户共享、批量抓取、压测或扫描。',
      '不得用于任何违法违规用途。使用者对自己账号下产生的全部调用行为负责。',
    ],
  },
  {
    h2: '免责',
    items: [
      '本网关的可用性、延迟与上游模型服务的稳定性不作保证。上游 Anthropic 的服务调整可能影响调用。',
      '主域名不可达时可切换备用域名，API Key 无需更换。备用域名会通过站内公告发布。',
      '本站不承担因使用或无法使用本服务造成的间接损失，包括业务中断、数据损失。',
    ],
  },
  {
    h2: '条款变更',
    items: [
      '条款变更会在本页更新，并同步记入站内变更历史。不另行单独通知已购买用户，已购订单按购买时的条款执行。',
    ],
  },
  {
    h2: '联系方式',
    items: operatorLines(),
    bullets: true,
  },
]

export const privacySections: TrustSection[] = [
  {
    h2: '本站记录什么',
    items: [
      '本站是静态页面，不设用户账号、不做登录、不设 Cookie 追踪。',
      '访问统计只记录聚合数据：页面访问次数、来源渠道、设备类型。不记录任何能识别到具体个人的信息。',
      '站内代码不加载任何第三方广告脚本。',
    ],
  },
  {
    h2: '调用数据在哪里',
    items: [
      'API 调用发生在本网关与 Anthropic 官方之间。你的提示词与模型返回经过网关转发，用于完成请求。',
      '本站不在浏览器端存储你的 API Key。CC Switch 导入配置时由该工具本地保存。',
      '网关侧的日志用于排查故障与限流，具体留存范围与期限暂未公开。',
    ],
  },
  {
    h2: '第三方',
    items: [
      `购买与支付在第三方发卡站 ${purchaseUrl} 完成，本站不接触支付信息。`,
      `API Key 的提取与用量查询在管理后台 ${operator.consoleUrl} 完成，该站点属同一运营方。`,
      '页面字体来自 Google Fonts，统计脚本来自 Umami 与百度统计。这些第三方会收到你的 IP 与浏览器信息。',
    ],
    bullets: true,
  },
  {
    h2: '你的选择',
    items: [
      '不使用浏览器的 Cookie 屏蔽功能即可避免第三方统计。本站不设 Cookie，不需要同意弹窗。',
      '如需删除你的调用记录、更正或投诉，通过下方联系方式提出。',
    ],
  },
  {
    h2: '联系方式',
    items: operatorLines(),
    bullets: true,
  },
]

/** 三页的元数据，供页面组件与 JSON-LD 使用 */
export const trustPages = {
  about: {
    slug: 'about',
    title: '关于我们',
    eyebrow: '信任层',
    lead: '这个站点是谁在运营、卖的是什么、卖给了谁、有哪些限制，一次说清。',
    description: 'Claude 无限卡关于页：运营主体、联系方式、售卖内容、公平使用规则数字、明确不卖给谁。与 Anthropic 官方无隶属关系。',
    sections: aboutSections,
  },
  terms: {
    slug: 'terms',
    title: '服务条款',
    eyebrow: '信任层',
    lead: '退款规则、使用限制、免责范围与条款变更方式。',
    description: 'Claude 无限卡服务条款：服务性质、退款规则、公平使用限制数字、免责范围与条款变更方式。',
    sections: termsSections,
  },
  privacy: {
    slug: 'privacy',
    title: '隐私政策',
    eyebrow: '信任层',
    lead: '本站记录什么、不记录什么，调用数据经过哪些环节。',
    description: 'Claude 无限卡隐私政策：本站不设账号与 Cookie，统计只记录聚合数据，API 调用经网关转发，第三方环节有哪些。',
    sections: privacySections,
  },
} as const
