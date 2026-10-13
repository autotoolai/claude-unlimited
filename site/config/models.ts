/**
 * 模型与 ID 配置 —— 模型广场、使用教程与 FAQ 共用的唯一数据源。
 *
 * 权威来源：2026-10-13 对 https://rsxermu666.cn/v1/models 的实测快照
 * （scripts/fetch_upstream_models.py，存于 config/models_upstream.json），
 * 并对 claude-sonnet-5-5、claude-haiku-5-5 补了 /v1/messages 逐模型调用实测。
 * 实测结论见下方注释。
 *
 * 实测确认的三件事，官网表述都以此为准：
 *
 * 1. 普通 ID（不带 -thinking）本身就会自动思考。claude-opus-4-7 连打三次推理题，
 *    两次返回 thinking 块，思考 571 字符。所以官网只展示普通 ID，
 *    说明里注明「自动思考」即可，不需要列出 thinking 变体。
 *
 * 2. `-thinking` 后缀与 `(1M)` 后缀都不用展示：
 *    - thinking 变体表现最差，claude-opus-4-6-thinking 与 claude-opus-5-5
 *      三档预算测试全部 ERR，一思考就失败。
 *    - `(1M)` 是虚标。claude-sonnet-4-6 (1M) 实测上限 262144，与普通档相同。
 *      /v1/models 标的 context_window=1000000 不可信。
 *
 * 3. 思考深度可调只对少数模型成立（claude-opus-4-7-thinking / claude-opus-4-8 /
 *    claude-haiku-4-5），普通 ID 里只有 claude-opus-4-7 在实测中确认。
 *    多数模型传 thinking 参数不生效，甚至传 disabled 反而出现 thinking 块。
 *
 * 网关不回显归一化后的模型名，每个 ID 原样返回，且 claude-opus-5 与 claude-opus-5-5
 * 是否指向同一权重无法从外部确认，因此只保留实测稳定的 claude-opus-5-5。
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
  /** 所属品牌，模型广场按品牌分组用 */
  brand: string
  /** 能力标签，卡片上以胶囊展示 */
  tags: string[]
  /** 模型广场卡片上的一段说明：定位、适用人群 */
  summary: string
}

/** 实测验证时间，用于在页脚标注 */
export const verifiedAt = '2026-10-13'


export const modelIds: ModelRow[] = [
  {
    id: 'claude-fable-5-1',
    tier: 'Fable 5.1',
    scene: '速度与质量均衡，日常编码主力',
    pick: 'primary',
    brand: 'Claude',
    tags: ['自适应思考', '长期自主 Agent', '高阶软件工程', '高性价比多模态', '极限推理预算'],
    summary:
      'Fable 5.1 极限推理档位，拉满思考预算，支持多路径并行推演与交叉复盘，推理准确率拉满，耗时更高，专为零容错硬核难题、高风险终审决策设计。日常编码与文档任务同样够用，速度与质量最均衡，不确定用什么时从它开始。',
  },
  {
    id: 'claude-opus-5-5',
    tier: 'Opus 5.5',
    scene: '复杂推理、架构设计、深度代码分析',
    pick: 'primary',
    brand: 'Claude',
    tags: ['原生全模态', '复杂软件工程任务', '代码生成', '专业知识工作'],
    summary:
      'Claude Opus 5.5 是 Anthropic 于 2026 年 9 月 22 日发布的模型，面向长期软件工程、自主 Agent 和专业知识工作。始终开启的自适应思考能力，实测三次调用全部成功，稳定性优于同代其它档位，适合长代码库分析、跨文件重构与方案终审。',
  },
  {
    id: 'claude-fable-5',
    tier: 'Fable 5',
    scene: '上一代主力，轻量任务更快',
    pick: 'backup',
    brand: 'Claude',
    tags: ['自适应思考', '长期自主 Agent', '高阶软件工程', '高性价比多模态', '极限推理预算'],
    summary:
      'Fable-5 极限推理档位，拉满思考预算，支持多路径并行推演与交叉复盘，推理准确率拉满，耗时更高。可用模型里响应最快的一档，轻量任务上比 Fable 5.1 更省时间；思考强度固定不可调，需按预算调节思考量时改用 Opus 4.7 或 4.8。',
  },
  {
    id: 'claude-sonnet-5-5',
    tier: 'Sonnet 5.5',
    scene: '质量与速度的中间档',
    pick: 'backup',
    brand: 'Claude',
    tags: ['自适应思考', '全栈编码能力', '专业多模态解析', '百万上下文'],
    summary:
      'Sonnet 5.5 是 2026 年 9 月 28 日发布的当前最强 Sonnet，1M 上下文、128K 最大输出，支持图文输入与工具调用，Adaptive Thinking 默认启用、无需配置。相比上一代 Sonnet 5 输出生成快 30% 以上，多步工具调用与终端任务基准提升明显，是编码和大多数生产任务的默认档：量大但不复杂的批量改动、样板代码、整仓上下文分析都适合它。',
  },
  {
    id: 'claude-opus-4-8',
    tier: 'Opus 4.8',
    scene: '需要手动调节思考深度的复杂任务',
    pick: 'backup',
    brand: 'Claude',
    tags: ['深度思考推理', '多路径交叉验证', '全链路复盘纠错', '高精度编码推理', '严格安全策略'],
    summary:
      'Opus-4.8 的高阶思考档位，内置长链路深度思考过程，对复杂任务自动分步拆解、中途自检纠错，推理准确率与稳定性优于标准版。实测中少数思考深度真的能调的模型：调低预算思考会明显变短，调高则变长，适合长代码推理这类需要控制思考量的场景。',
  },
  {
    id: 'claude-opus-4-7',
    tier: 'Opus 4.7',
    scene: '需要手动调节思考深度的复杂任务',
    pick: 'backup',
    brand: 'Claude',
    tags: ['深度思考推理', '多路径交叉验证', '全链路复盘纠错', '高精度编码推理', '标准安全合规'],
    summary:
      'Opus-4.7 的极限思考档位，拉满全局思考预算，支持多方案并行推演与全流程复盘校验，推理精度为 4.7 系列天花板，响应耗时显著增加。实测确认思考深度可调，不传预算、1024、8192 三档思考长度依次递增，普通 ID 自带思考，也可再按预算细调。',
  },
]

/** 建议添加的两个模型 */
export const recommendedIds = modelIds.filter((m) => m.pick === 'primary').map((m) => m.id)

/** 模型广场用：按品牌分组，组内推荐档在前 */
export const modelBrands: { brand: string; count: number; models: ModelRow[] }[] = (() => {
  const map = new Map<string, ModelRow[]>()
  for (const m of modelIds) {
    if (!map.has(m.brand)) map.set(m.brand, [])
    map.get(m.brand)!.push(m)
  }
  return [...map.entries()].map(([brand, models]) => ({
    brand,
    count: models.length,
    models: [...models].sort((a, b) => (a.pick === b.pick ? 0 : a.pick === 'primary' ? -1 : 1)),
  }))
})()
