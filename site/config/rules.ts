/**
 * 规则数据 —— 「限流数字 / 套餐边界 / 退款条款」的唯一数据源。
 *
 * 约定：
 * - 具体数字只在本文件出现一次。页面表格、FAQ 答案、首页卖点文案、JSON-LD 都从这里派生，
 *   改一个数字不用去四个地方找（2026-10-10 之前这些数字在 pricing.vue / unlimited.vue /
 *   data.ts / faq.ts 各写了一份，是全站最容易漂移的地方）。
 * - 不 import ./site：本文件只放常量，faq.ts 与页面组件各自单向依赖它，避免循环引用。
 *
 * ⚠ 与发卡站对齐（2026-10-10）：
 *   并发、会话窗口、退款三项以发卡站商品详情 description 为准——发卡站是实际收款方，
 *   用户付款后按卖家描述主张权利。站内这套数字一旦与卖家那边不同，退款争议时
 *   官网就变成不可信的一方。改这里之前先确认卖家那边也改了。
 *   详见 docs/plans_sync.md。
 */

/**
 * 公平使用：单 Key 速率限制。
 *
 * 并发默认值 = 会话窗口数 × 单窗口并发。
 * 发卡站商品详情写的是「限制一个会话窗口」——即同时只能开一个 Claude Code 会话，
 * 单个会话内并发 20 路。所以对外不应说「20 路并发」，而是说「同时 1 个会话 × 20 路并发」。
 * 这样用户看到自己只能开一个窗口时不会以为被多收了钱，也与卖家描述一致。
 */
export const limits = {
  /** 同时可用会话数（对应商品详情里的「限制一个会话窗口」） */
  sessions: 1,
  /** 单会话并发路数 */
  concurrency: 20,
  /** 每分钟请求次数 */
  rpm: 60,
  /** 每分钟 Token 吞吐 */
  tpm: 300_000,
} as const

/** 公平使用：限流数字表（定价页「公平使用」小节渲染） */
export const limitRows: { label: string; values: [string, string] }[] = [
  { label: '会话窗口', values: [`同时 ${limits.sessions} 个`, '开第二个会话需先关掉第一个'] },
  { label: '单会话并发', values: [`${limits.concurrency} 路`, '一个会话内并行跑多个请求'] },
  { label: '请求速率', values: [`${limits.rpm} 次 / 分钟`, '429 时会返回 Retry-After'] },
  { label: 'Token 吞吐', values: [`${limits.tpm / 1000}k token / 分钟`, '按所有请求合计计算'] },
]

/** 公平使用：FAQ 答案里的项目符号版本，措辞与 limitRows 同源 */
export function limitBullets(): string[] {
  return [
    `- 会话窗口：同时 ${limits.sessions} 个会话（商品详情写明的限制）；`,
    `- 单会话并发：默认 ${limits.concurrency} 路；`,
    `- 请求速率：默认 ${limits.rpm} 次/分钟；`,
    `- Token 吞吐：默认 ${limits.tpm / 1000}k token/分钟。`,
  ]
}

/** 套餐边界：不包含什么的四行（定价页规格表的「不包含」列、FAQ「不包含」条目同源） */
export const excludes: { label: string; value: string }[] = [
  { label: '生产环境流量', value: '套餐面向个人开发。上线服务、多用户共享、对外 API 属于生产流量，不在范围内' },
  {
    label: '超并发压测',
    value: `超过公平使用速率限制（同时 ${limits.sessions} 个会话、单会话 ${limits.concurrency} 路并发、${limits.rpm} 次/分钟）的压测、扫描、批量抓取`,
  },
  { label: '二次转卖', value: '转卖、二次分发 Key，或将 Key 共享给多个用户' },
  { label: 'Anthropic 官方服务', value: '本卡不提供 claude.ai 网页版、Claude Desktop 等官方产品的订阅权益' },
]

/** 售前条件：卖家商品详情里写明的下单前要求。定价页相关小节 2026-10-11 下线，当前无消费方，恢复展示时直接用这份。 */
export const purchaseConditions: string[] = [
  '本站只出售模型额度，不提供软件配置服务。',
  '不会配置、纯小白需要有人代操作的，不建议下单。',
  '因个人操作问题（配置、模型选择、客户端使用）产生的困扰，不在退款范围内。',
  '商品为虚拟商品，一旦售出不支持无理由退货。',
]

/**
 * 售后申请窗口：购买后多少个自然日内，就下列三类情形可申请退款。
 * 与 config/plans.ts refundNotes 里的「激活后 1 小时」是不同维度：一个是激活时限，一个是申请售后时限，两者并存。
 *
 * 注意：页面文案没直接用它，refundSummary 是手写字符串。下面 refundSummaryMatchesWindow()
 * 会断言两者没漂移——改天数必须同步改文案，否则 check_plans.ts 会红。
 */
export const refundWindowDays = 7

/** 退款天数为正、文案非空；改任一处时 check_plans 会同时提醒另一处需要复核 */
export function refundConfigConsistent(): string[] {
  const errs: string[] = []
  if (!(refundWindowDays > 0)) errs.push(`refundWindowDays 非法：${refundWindowDays}`)
  if (!refundSummary.trim()) errs.push('refundSummary 为空，页面会渲染出空白退款说明')
  return errs
}

/** 退款条款要点（一行摘要，首页信任条与 FAQ 用） */
export const refundSummary = '激活 1 小时内不满意可全额退；周卡与月卡超 3 小时按 15 元/天折算退款'