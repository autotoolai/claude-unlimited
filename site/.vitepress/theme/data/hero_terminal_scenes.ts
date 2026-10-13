/** curl 续行反斜杠：单独一个常量，避免在单引号字符串里写反斜杠被各处工具吃掉 */
/**
 * 首页首屏演示终端的场景数据 —— 终端每轮播放的内容由此驱动。
 *
 * 约定：
 * - 问句和回答是「演示文案」，不是产品承诺；回答里不出现价格与额度数字，
 *   免得与 config/plans.ts、config/rules.ts 的权威数字漂移。
 * - base 是 Messages API 根地址，运行时取当前站点的 origin（生产是
 *   claude-unlimited.aiautotools.com，本地预览是 127.0.0.1），不写死域名；
 *   模型 ID 只从 config/models.ts 实测可用的档位里取。
 * - tokens 是「这一问一答大致会用到多少」的量级，按中文约 1.5 字/token 与英文约 4 字符/token
 *   估的，只给个数量级感，不是实测值。
 * - latency / speed 是演示用的量级，不冒充实测：整段回放（等模型思考 + 逐字吐字）按下面
 *   的字符数推算出来，落在中转站常见的首字延迟区间内。
 * - badge 是这一轮打在状态行里的「卖点」短标签，对应中转站真正的差异化：稳、快、全。
 *   刻意不用价格数字，理由同上。
 */
import { siteConfig } from '../../../config/site'
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
  /** 本次请求的 token 量级 */
  tokens: number
  /** 整段回复的字符数，用来推算延迟量级 */
  chars: number
  /** 状态行右侧的卖点标签 */
  badge: string
}

/** 英文按 4 字符/token 估。终端里全是英文问句与回答，用中文的 1.5 字/token 会高估一倍。 */
const estimateTokens = (text: string) => Math.round(text.length / 4)

const scene = (o: Omit<HeroScene, 'chars' | 'tokens'>): HeroScene => ({
  ...o,
  chars: o.a.length,
  // tokens 不再手写：手写的数字会和文案长度对不上（原来 59 字符写 61 tokens）。
  // 统一按 q + a 的实际字符数算，改文案时数字自动跟着走。
  tokens: estimateTokens(o.q + o.a),
})

export const heroScenes: HeroScene[] = [
  scene({
    model: pick('claude-opus-5-5'),
    q: 'Plan a project.',
    a: 'Start with a clear goal. Build it one small step at a time.',
    badge: '自动故障切换',
  }),
  scene({
    model: pick('claude-sonnet-5-5'),
    q: 'Build an API.',
    a: 'Define your routes, connect your data, and test the result.',
    badge: 'SSE 流式 · 边生成边返回',
  }),
  scene({
    model: pick('claude-fable-5-1'),
    q: 'Summarize an idea.',
    a: 'A simple starting point for your next project.',
    badge: '多模型同一把 Key',
  }),
]

/**
 * 演示终端用的 Base URL：一律显示本站正式域名（config/site.ts 的 canonical），
 * 去掉结尾斜杠。
 *
 * 不再取 location.origin：本地预览会露出 http://127.0.0.1:41777 这种只有开发者
 * 看得懂的地址，而终端里这段代码是要被人照抄进自己终端跑的，必须始终是线上真地址。
 */
export function heroTerminalBase(): string {
  return siteConfig.url.replace(/\/+$/, '')
}

/**
 * 一行代码 = 一个字符串 + 行级语义类。
 *
 * 之前是「节点对象数组」：文字存在对象里，逐字更新靠 n.text = ...，
 * 再由 {{ n.text }} 渲染。实测每 6 秒产生 122 次 childList、0 次 characterData ——
 * 节点在被反复销毁重建，浏览器每帧都当成新内容，于是整块文字一直在闪。
 *
 * 改成字符串后，{{ line.text }} 只走 textContent 更新（characterData），
 * 数组长度与顺序全程不变，DOM 不会被重建，只有当前那一行在变。
 *
 * 行内染色（URL 单独提亮、模型名发光）已放弃：它必须靠逐字符 span 实现，
 * 而逐字符 v-for 每帧都会产生大量节点变更，正是闪动的成因。
 * 参考站的 curl 本来也是整行同色，观感没有损失。
 */
export type TerminalLine = {
  text: string
  /** 行级语义类：is-code / is-status-line / is-reply-line / is-stat */
  lineClass?: string
}

/** 拼一行代码：整行同色，用行级类表达 */
const codeLine = (text: string): TerminalLine => ({ text, lineClass: 'is-code' })

/**
 * 终端里回放的那一条请求：一段 curl，Messages API。
 * 刻意只给这一条、不做多语言标签栏 —— 首屏这块要的是「改一个 Base URL 就能用」，
 * 一条最短最真实的 curl 足够；四个标签把视觉重心从卖点上带走了。
 * 完整可跑的 Python / Node / cURL 示例放在 /guide 页，那里才是放代码的地方。
 */
export function heroCodeLines(s: HeroScene, base: string): TerminalLine[] {
  const m = s.model
  return [
    codeLine(`$ curl ${base}/v1/messages \\`),
    codeLine('  -H "x-api-key: sk-ant-••••••••" \\'),
    codeLine(`  -d '{"model":${m},"stream":true,"max_tokens":256,"messages":[{"role":"user","content":"${s.q}"}]}'`),
  ]
}
