/**
 * 套餐数据 —— 首页档位摘要、套餐定价页、全站 CTA 价格提示的唯一数据源。
 *
 * 约定：
 * - 所有价格、折扣、额度、促销语、退款条款只在本文件出现；组件禁止硬编码。
 * - 下单统一跳 partners.purchase.url（第三方发卡站），档位在发卡站商品页选择，
 *   所以 PlanCard 只带 data-cta 不带独立 URL。
 * - 真实档位确定后只改本文件，不要改组件。
 *
 * ⚠ 价格字段由脚本生成，不要手改（2026-10-10 起）：
 *   id / period / days / price / amount / original / discount / stock
 *   这几个字段由 `npm run sync:plans` 从发卡站 catfk.com 的 JSON 接口拉取后回写，
 *   手改会在下次同步时被覆盖。人工维护区是下面这些文案字段：
 *   features（卖点）、badge（角标）、featured（主推高亮）、cta（按钮文案）、status（上线状态）。
 *   流程与接口细节见 docs/plans_sync.md。
 */

export type PlanGroupId = 'unlimited' | 'cycle' | 'quota'

/**
 * 上线状态。
 * - live：发卡站已有在售商品，价格真实，可下单。
 * - coming-soon：尚未定价或尚未开售，卡片走虚线灰化占位，按钮不可点。
 * 缺省视为 live。
 */
export type PlanStatus = 'live' | 'coming-soon'

export interface PlanGroup {
  id: PlanGroupId,
  /** 组标题，如「无限卡」 */
  name: string,
  /** 一句话说明 */
  desc: string
  /** 组级角标，如「超值」「最低 6 折」 */
  badge?: string
  /** 组是否已上线，默认 live；coming-soon 时胶囊上会带「即将上线」徽标 */
  status?: PlanStatus
}

export interface PlanTier {
  /** 稳定标识，用于 data-cta 埋点：plan_<group>_<id>
   *  在售档位的 id 形如 shop-<goods_key>，与发卡站商品绑定，同步脚本按它匹配回写 */
  id: string,
  /** 发卡站商品全名，同步脚本维护，卡片不直接展示（见 displayName） */
  name: string,
  /** 卡片上展示的短档位名，如「天卡」。人工撰写，同步脚本不覆盖。
   *  缺省回退到 name——但 name 是发卡站的商品名，形如
   *  「fable5.1+opus5.5无限-周卡」，直接当标题会让三张卡几乎一模一样。 */
  displayName?: string,
  /** 有效期文案，如「7 天」 */
  period: string,
  /** 周期天数，页面上「N 天」表述一律用它，不要从 period 字符串里再解析 */
  days: number,
  /** 现价，带 ¥ 或 /次 前缀 */
  price: string,
  /** 现价数字（JSON-LD 用）；未定价档位为 0 */
  amount: number,
  /** 划线原价，现价与原价相同时省略 */
  original?: string
  /** 折扣角标，如「8 折」 */
  discount?: string
  /** 发卡站在售库存。只做数据留档：官网任何位置都不展示库存 */
  stock?: number
  /** 卡内要点，第一行作主描述 */
  features: string[]
  /** 「推荐」「超值」等角标 */
  badge?: string
  /** 是否主推卡（视觉高亮） */
  featured?: boolean
  /** 上线状态，默认 live */
  status?: PlanStatus
  /** 按钮文案，默认「立即订阅」 */
  cta?: string
  /** 档位专属商品页链接（发卡站 /item/<goods_key>）。人工维护，同步脚本不覆盖。
   *  缺省回退到店铺主页 shopUrl()。 */
  shopUrl?: string
}

export interface PromoNote {
  text: string
}

/** 三组套餐：无限卡（不限次数）/ 周期卡（周期重置）/ 额度卡（总额度长期有效） */
export const planGroups: PlanGroup[] = [
  {
    id: 'unlimited',
    name: '无限卡',
    desc: '有效期内不限次数调用 Fable 5.1 与 Opus 5.5，不按 token 计费，不设每日额度上限。适合每天在 Claude Code / Cursor 里干活的人。',
    badge: '不限额度',
  },
  {
    id: 'cycle',
    name: '周期卡',
    desc: '按周期发放固定额度，每个周期自动重置，未用完不累积。适合用量有节奏、不想一次买太多的人。',
    badge: '周期重置',
    status: 'coming-soon',
  },
  {
    id: 'quota',
    name: '额度卡',
    desc: '一次购买固定总额度，在有效期内随用随扣，不按周期清零。适合长期高频使用、想把额度一次备足的人。',
    badge: '长期有效',
    status: 'coming-soon',
  },
]

/** 发卡站店铺 token，价格同步脚本的取数入口。改店铺只改这一处。 */
export const shopToken = '2Z0CEP7C'

/** 发卡站店铺主页，无档位专属链接时的兜底购买地址，与同步脚本共用。 */
export const shopUrl = `https://catfk.com/shop/${shopToken}`

/** 按商品 key 拼档位专属商品页地址，与 shopToken 同域。 */
export const itemUrl = (goodsKey: string) => `https://catfk.com/item/${goodsKey}`

/* 无限卡：在售档位，价格字段全部来自发卡站，`npm run sync:plans` 维护。
   id 里的 shop-<goods_key> 是与发卡站商品的绑定键，不要手改。
   卡片里不重复写「无限卡 ·」前缀——分段胶囊与分组描述已经给出了组名。 */
export const unlimitedTiers: PlanTier[] = [
  {
    id: 'shop-vfzavb',
    shopUrl: itemUrl('vfzavb'),
    name: 'fable5.1+opus5.5无限-天卡',
    displayName: '天卡',
    period: '1 天',
    days: 1,
    price: '¥13.5',
    amount: 13.5,
    original: '¥25',
    discount: '5.4 折',
    stock: 1,
    features: [
      '不限次数调用 Fable 5.1 与 Opus 5.5',
      '不按 token 计费，无单次额度上限',
      'Claude Code、Cursor、VS Code 等多端通用',
      '下单后即时激活，密钥长期有效',
    ],
    cta: '立即订阅',
  },
  {
    id: 'shop-1ga80a',
    shopUrl: itemUrl('1ga80a'),
    name: 'fable5.1+opus5.5无限-周卡',
    displayName: '周卡',
    period: '7 天',
    days: 7,
    price: '¥70',
    amount: 70,
    stock: 1,
    features: [
      '不限次数调用 Fable 5.1 与 Opus 5.5',
      '不按 token 计费，无单次额度上限',
      'Claude Code、Cursor、VS Code 等多端通用',
      '下单后即时激活，密钥长期有效',
    ],
    cta: '立即订阅',
  },
  {
    id: 'shop-b8zhn8',
    shopUrl: itemUrl('b8zhn8'),
    name: 'fable5.1+opus5.5无限-月卡',
    displayName: '月卡',
    period: '30 天',
    days: 30,
    price: '¥125',
    amount: 125,
    stock: 1,
    features: [
      '不限次数调用 Fable 5.1 与 Opus 5.5',
      '不按 token 计费，无单次额度上限',
      'Claude Code、Cursor、VS Code 等多端通用',
      '下单后即时激活，密钥长期有效',
    ],
    badge: '最多人选',
    featured: true,
    cta: '立即订阅',
  },
]

/** 周期卡：按周期发放额度，周期结束自动重置。尚未定价，价格字段由同步脚本写「待定」。 */
export const cycleTiers: PlanTier[] = [
  {
    id: 'cycle-monthly',
    name: '月卡',
    period: '30 天',
    days: 30,
    price: '待定',
    amount: 0,
    features: ['每周期固定额度 · 到期重置', '未用完额度不累积到下周期'],
    status: 'coming-soon',
    cta: '暂未开放',
  },
]

/** 额度卡：一次性购买总额度，长期有效。尚未定价，价格字段由同步脚本写「待定」。 */
export const quotaTiers: PlanTier[] = [
  {
    id: 'quota-basic',
    name: '基础额度包',
    period: '365 天',
    days: 365,
    price: '待定',
    amount: 0,
    features: ['总额度一次买足', '有效期内随用随扣，不清零'],
    status: 'coming-soon',
    cta: '暂未开放',
  },
]

/** 促销与活动提示（首页顶部条与定价页共用） */
export const planPromos: PromoNote[] = [
  { text: '本页价格与在售档位同步自发卡站，发卡站是最终准价来源' },
  { text: '周期卡与额度卡尚未定价，开放后会出现在本页并同步更新' },
]

/** 退款与售后说明（定价页「退款规则」小节） */
export const refundNotes: string[] = [
  '未激活、未收取任何费用的订单，全额退款。',
  '天卡：激活 1 小时内不满意可全额退款；过期不退。',
  '周卡：激活 1 小时内不满意可全额退款；超过 3 小时按已激活的 15 元/天折算后退款。',
  '月卡：激活 1 小时内不满意可全额退款；超过 3 小时按已激活的 15 元/天折算后退款。',
  '虚拟商品售出后不支持无理由退货，因个人操作问题（配置、模型选择、客户端使用）产生的困扰不在退款范围内。',
]

/** 最低档无限卡，供全站 CTA 与首屏价格提示使用 */
export const entryTier = unlimitedTiers[0]

/** 全部档位，JSON-LD 与价格对比用 */
export const allTiers: { group: PlanGroup; tier: PlanTier }[] = [
  ...unlimitedTiers.map((tier) => ({ group: planGroups[0], tier })),
  ...cycleTiers.map((tier) => ({ group: planGroups[1], tier })),
  ...quotaTiers.map((tier) => ({ group: planGroups[2], tier })),
]

export function planGroup(id: PlanGroupId): PlanGroup {
  return planGroups.find((g) => g.id === id) ?? planGroups[0]
}

export function tiersOf(id: PlanGroupId): PlanTier[] {
  if (id === 'unlimited') return unlimitedTiers
  if (id === 'cycle') return cycleTiers
  return quotaTiers
}

/** 每组的主推档位：优先 featured，否则第一档 */
export function featuredTierOf(id: PlanGroupId): PlanTier {
  const list = tiersOf(id)
  return list.find((t) => t.featured) ?? list[0]
}

/** 档位是否在售（在售 = 未标记 coming-soon） */
export function isLive(tier: PlanTier): boolean {
  return tier.status !== 'coming-soon'
}

/**
 * 最低档的「金额 + 周期」成对取值。需要同时展示价格和周期的位置必须用这个对象，
 * 不要分别取 price 与 period，否则会拼出跨档的假套餐（历史事故：周卡价配月卡周期）。
 */
export const priceSummary = { price: entryTier.price, period: entryTier.period }

/** 最低档的周期天数，供 site.ts 的 products[].days 用，避免写死天数造成跨档错配 */
export const entryTierDays = entryTier.days

/**
 * 一致性校验，供构建时调用：确保价格与周期不会跨档错配、每组都有档位、
 * 在售档位必须真有钱、未上线档位不许挂划线价。
 * 返回错误列表，空数组表示通过。
 */
export function planConsistencyErrors(): string[] {
  const errors: string[] = []
  const byId = new Map<string, PlanTier[]>()
  for (const { group, tier } of allTiers) {
    byId.set(group.id, [...(byId.get(group.id) ?? []), tier])
    // price 串里如果带周期（如「¥0.049 / 次」），必须与该档位的 period 一致
    const m = tier.price.match(/\/\s*(.+)$/)
    // 「/ 次」是计费单位不是周期，只有以「天」结尾的时间单位才拿去和 period 比
    if (m && /天$/.test(m[1].trim()) && m[1].trim() !== tier.period) {
      errors.push(`${group.name} · ${tier.name}：price「${tier.price}」里的周期与 period「${tier.period}」不一致`)
    }
    // 原价不能比现价低
    const now = Number(tier.amount)
    const orig = tier.original ? Number(tier.original.replace(/[^\d.]/g, '')) : null
    if (orig !== null && orig < now) {
      errors.push(`${group.name} · ${tier.name}：划线原价 ${tier.original} 低于现价 ${tier.price}`)
    }
    if (isLive(tier)) {
      // 在售档位必须有真实价格，否则会把「待定」当成 ¥0 写进 JSON-LD
      if (!(tier.amount > 0)) {
        errors.push(`${group.name} · ${tier.name}：在售档位 amount 必须大于 0，当前 ${tier.amount}`)
      }
      if (!tier.days || tier.days < 1) {
        errors.push(`${group.name} · ${tier.name}：在售档位 days 必须为正整数，当前 ${tier.days}`)
      }
    } else {
      // 没定价就不该有划线价与折扣角标，否则会误导
      if (tier.original) {
        errors.push(`${group.name} · ${tier.name}：未上线档位不应有划线原价 ${tier.original}`)
      }
      if (tier.discount) {
        errors.push(`${group.name} · ${tier.name}：未上线档位不应有折扣角标 ${tier.discount}`)
      }
    }
  }
  for (const g of planGroups) {
    if (!(byId.get(g.id)?.length)) errors.push(`套餐组「${g.name}」没有任何档位`)
  }
  return errors
}
