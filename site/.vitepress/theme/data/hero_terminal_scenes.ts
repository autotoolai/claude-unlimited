/**
 * 首页首屏演示终端的场景数据 —— 终端每轮播放的内容由此驱动。
 *
 * 约定：
 * - 问句和回答是「演示文案」，不是产品承诺；回答里不出现价格与额度数字，
 *   免得与 config/plans.ts、config/rules.ts 的权威数字漂移。
 * - base 是 Messages API 根地址，继承 config/guide.ts 的 gatewayBaseUrl（后台域名去掉结尾斜杠），
 *   不写死域名；模型 ID 只从 config/models.ts 实测可用的档位里取。
 */
import { gatewayBaseUrl } from '../../../config/guide'
import { modelIds } from '../../../config/models'

/** 模型 ID 取值：只认 modelIds 里存在的，实测列表变了就退回主力模型而不是打错名字 */
const pick = (id: string) => (modelIds.some((m) => m.id === id) ? id : 'claude-opus-5-5')

export interface HeroScene {
  /** 模型 ID，写进请求体 */
  model: string
  /** 用户提问 */
  q: string
  /** 演示回答，一到两句 */
  a: string
}

export const heroScenes: HeroScene[] = [
  {
    model: pick('claude-opus-5-5'),
    q: '帮我规划一次项目重构。',
    a: '先明确目标，再按可验证的小步推进：先补测试锁定行为，再分层替换，每步都跑一次测试再提交。',
  },
  {
    model: pick('claude-sonnet-5'),
    q: '帮我搭一个后端接口。',
    a: '定义路由，连接数据，写完直接测一遍：每个端点先用最小请求验证返回结构，再补错误分支。',
  },
  {
    model: pick('claude-fable-5-1'),
    q: '帮我总结一段想法。',
    a: '这是一个精简的起点：先说清问题，再给结论，最后列出可以立刻动手的下一步。',
  },
]

/** 演示终端用的 Base URL，与教程里的环境变量同源 */
export const heroTerminalBase = gatewayBaseUrl
