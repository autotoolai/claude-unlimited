/** 人工客服 / 助手相关的类型定义。运行时数据分别来自 config/site.ts（contact）与 config/faq.ts（语料）。 */

/** 人工客服配置（config/site.ts 的 contact） */
export interface HumanService {
  /** 微信号，面板里「复制」按钮用它 */
  wechatId: string
  /** 微信二维码图片路径（docs/assets/ 或 public/ 下的文件名），留空时面板显示占位 */
  wechatQr: string
  qq: string
  qqGroup: string
  email: string
  /** 服务时间提示语 */
  hours: string
}

/** 助手语料条目的类型 */
export interface KbEntry {
  id: string
  q: string
  a: string
  cat: string
  catLabel: string
  links: { text: string; url: string; external?: boolean }[]
  code: string[]
  /** 归一化后的完整关键词（子串匹配用） */
  kw: string[]
  /** 分词后的词元（模糊兜底匹配用） */
  tokens: string[]
}