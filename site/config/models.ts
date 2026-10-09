/**
 * 模型与 ID 配置 —— 「无限额度」「模型与切换」「接入与模型」三页与 FAQ 共用的唯一数据源。
 *
 * 数据来源：卖家教程站整理出的可用模型 ID（https://wx.bbyy.site/）。
 * 网关实际可用的 model ID 以 CC Switch「获取模型列表」返回的结果为准；本表只做「常见搭配」的参考，
 * 不做「只有这些能用」的承诺，页面上也会这么写。
 */

export interface ModelRow {
  /** model ID，直接填进 CC Switch / Claude Code */
  id: string
  /** 展示层级名 */
  tier: string
  /** 适合场景（一句话） */
  scene: string
  /** 推荐优先级：primary 常用、backup 备用 */
  pick: 'primary' | 'backup'
}

export interface TierRow {
  tier: string
  desc: string
}

export const modelIds: ModelRow[] = [
  { id: 'claude-opus-4-8', tier: 'Opus', scene: '复杂推理、架构设计、深度代码分析', pick: 'primary' },
  { id: 'claude-sonnet-5', tier: 'Sonnet', scene: '速度与质量均衡，日常编码主力', pick: 'primary' },
  { id: 'claude-fable-5', tier: 'Fable', scene: '创意表达、叙事与风格化内容', pick: 'primary' },
  { id: 'claude-opus-5', tier: 'Opus', scene: 'Opus 最新版，复杂任务优先尝试', pick: 'backup' },
  { id: 'claude-opus-4-7', tier: 'Opus', scene: 'Opus 上一版，备用', pick: 'backup' },
  { id: 'claude-opus-4-6', tier: 'Opus', scene: 'Opus 上一版，备用', pick: 'backup' },
]

/** 层级说明（与 /unlimited 页面一致） */
export const tierRows: TierRow[] = [
  { tier: 'Opus', desc: '最复杂的推理、架构设计、深度代码分析、系统迁移方案、多约束决策' },
  { tier: 'Sonnet', desc: '速度与质量最均衡，日常编码、代码解释、测试生成、PR review、文档编写' },
  { tier: 'Haiku', desc: '响应最快，轻量任务、批量分类、简单改写、短文本处理、低延迟交互' },
  { tier: 'Fable', desc: '偏创意表达、叙事和风格化内容' },
]

/** 建议添加的三个模型 */
export const recommendedIds = modelIds.filter((m) => m.pick === 'primary').map((m) => m.id)

/** Claude Code 里切换模型用的命令 */
export const modelCommand = '/model'

/** 切到指定模型的示例 */
export function modelSwitchCommand(id: string): string {
  return `${modelCommand} ${id}`
}