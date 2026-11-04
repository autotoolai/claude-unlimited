/**
 * 规则数据 —— 「套餐边界 / 退款条款 / 对外公平使用口径」的唯一数据源。
 *
 * 约定：
 * - 对外只披露「会话窗口数」，不披露单会话并发路数、RPM、TPM 等工程指标。
 * - 页面表格、FAQ、信任页、llms.txt 都从这里派生，改一处即可。
 * - 不 import ./site：本文件只放常量，faq.ts 与页面组件各自单向依赖它，避免循环引用。
 *
 * ⚠ 与发卡站对齐：
 *   会话窗口、退款以发卡站商品详情 description 为准——发卡站是实际收款方。
 *   详见 docs/plans_sync.md。
 */

/**
 * 公平使用：对外只谈会话窗口。
 * 基础档（天 / 周 / 单窗月卡）同时 1 个会话窗口；双窗 / 三窗以对应套餐为准。
 */
export const limits = {
  /** 基础档同时可用会话数；双窗 / 三窗档以商品页为准 */
  sessions: 1,
} as const

/** 公平使用：对外展示表（信任页 / llms 等）——仅窗口 */
export const limitRows: { label: string; values: [string, string] }[] = [
  { label: '会话窗口', values: [`基础档 ${limits.sessions} 个`, '双窗 / 三窗档见对应套餐'] },
]

/**
 * 公平使用：FAQ / 说明里的项目符号版本。
 * 口径：窗口怎么选 + 子代理正常可用 + 多窗档单开也更从容。
 */
export function limitBullets(): string[] {
  return [
    `- 单窗口（天卡 / 周卡 / 月卡）：同时开 ${limits.sessions} 个会话窗口，一台电脑、一个对话窗口，日常编码够用；`,
    `- 双窗口 / 三窗口月卡：可同时开 2 / 3 个会话窗口；时长与「不按 token 计费」一致，差的是窗口数；`,
    `- 正常使用主会话和子代理不受影响；`,
    `- 双窗 / 三窗不只是能多开——即使只开 1 个窗口，单窗响应也会更从容。`,
  ]
}

/** 套餐边界：不包含什么的四行（定价页规格表的「不包含」列、FAQ「不包含」条目同源） */
export const excludes: { label: string; value: string }[] = [
  { label: '生产环境流量', value: '套餐面向个人开发。上线服务、多用户共享、对外 API 属于生产流量，不在范围内' },
  {
    label: '超范围压测',
    value: '超出个人开发合理范围的压测、扫描、批量抓取',
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
export const refundSummary = '激活 1 小时内不满意可全额退'
