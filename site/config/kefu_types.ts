/** 在线助手相关的类型定义。语料来自 config/kefu_bot.ts，人工联系方式来自 config/site.ts 的 contact。 */

/**
 * 人工客服配置：直接引用 config/site.ts 的 SiteConfig['contact']，不要再定义第二份，
 * 两份一旦漂移，面板读到的就是过期字段。
 */
export type { HumanService } from './site'

/** 助手语料条目的类型：由 kefu_items.ts 在构建期从 config/kefu_bot.ts 预处理而来 */
export interface KbEntry {
  id: string
  /** 气泡顶部的问题标题 */
  q: string
  /** 答案正文 */
  a: string
  /** 分类 id（config/kefu_bot.ts 的 KefuBotCategory） */
  cat: string
  /** 分类短名，答案顶部的小标签 */
  catLabel: string
  /** 标题指纹（归一化后的 q）；KefuWidget 用它判断问句是不是原样发回来的某个标题 */
  qFp: string
  links: { text: string; url: string; external?: boolean }[]
  code: string[]
  /** 归一化后的具体关键词（含英文/数字） */
  kw: string[]
  /** 归一化后的纯中文关键词（长度 >= 2），主匹配通道 */
  kwCjk: string[]
  /** 「联系人工客服」类语料：KefuWidget 命中后直接发客服卡，而不是把答案发成一条没有按钮的文本 */
  human?: boolean
  /** 泛词（「key」「人工」这类）：只在没有任何更具体命中时才用来作答，避免裸 key 被「换 Key」抢走 */
  weak: string[]
  /** 分词后的词元（模糊兜底匹配用） */
  tokens: string[]
}
