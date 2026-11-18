/**
 * 营销页 per-page keywords —— 首页 / 定价 / 模型广场的唯一 tags 真源。
 *
 * 由 config.mts 的 transformHead 按路由注入 meta keywords，覆盖全局那一串。
 * 约定与 consoleTags / agencyTags 相同：只放用户真会搜的词，不堆砌；
 * 购买意图复合词（opus/fable 无限卡）主场在 /pricing，/models 只挂型号与 ID。
 */

/** 首页：品牌 + 续杯/中转口语别名（转化仍链定价） */
export const homeTags: string[] = [
  'claude 无限卡',
  'claude 无限额度',
  'claude api 无限',
  'claude无限续杯',
  'claude 无限续杯',
  'claude code 国内',
  'claude api 中转',
]

/** 套餐定价：购买意图主场（模型×产品复合词只挂这里） */
export const pricingTags: string[] = [
  'claude 无限卡价格',
  'claude 无限卡 多少钱',
  'claude 无限卡 月卡',
  'opus 无限卡',
  'opus无限卡',
  'claude opus 无限卡',
  'opus 5.5 无限卡',
  'fable 无限卡',
  'fable无限卡',
  'claude fable 无限卡',
  'fable 5.2 无限卡',
  'fable 5.1 无限卡',
  'sonnet 无限卡',
  'claude 不按 token 计费',
]

/** 模型广场：型号与 model ID（购买仍指定价） */
export const modelsTags: string[] = [
  'claude opus 5.5',
  'claude fable 5.2',
  'claude fable 5.1',
  'claude sonnet 5.5',
  'opus 模型 id',
  'fable 模型 id',
  'claude-opus-5-5',
  'claude-fable-5-2',
  'claude-fable-5-1',
  'claude 无限卡 模型',
]
