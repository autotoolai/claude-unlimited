<script setup lang="ts">
/**
 * 首屏演示终端 —— 一条 curl 请求的回放。
 *
 * 为什么不是把命令打出来就完事：静态命令只能证明「有个 curl」，看不出返回长什么样。
 * 终端里逐字打出请求、亮出 HTTP 状态行、按字符吐出回复、末尾给一行 token 统计，
 * 才是「改完 Base URL 就能用」最有说服力的证据。
 *
 * 三条设计约束（都来自实测，不是拍脑袋）：
 * 1. 命令按词推进，回复按字符推进。命令里的 URL 与 JSON 本来就是整体，逐字母打只会
 *    把一行拖到近一分钟；回复才是要给人读的内容，必须一个字一个字冒出来，
 *    否则一个单词整块出现，视觉上仍是「唰」地跳。
 * 2. 一轮播完先静止 20 秒再重来。首屏演示不需要赶节奏，读不完的一轮等于没播。
 * 3. 不做整块淡出、逐行入场、扫描线、流光带、下坠光点。这一版全删了：
 *    它们叠在一起就是持续闪动，其中逐行入场最致命 —— 行数变化时 v-for 重渲染，
 *    每行动画会反复触发，整块文字在打字全程一直在闪。
 *
 * Base URL 取 config/site.ts 的正式域名，本地预览与线上显示一致，
 * 照着终端里这段代码敲进自己终端是能跑通的。
 *
 * 标签页切到后台时 sleep 把时长放大到 60 秒，等价于冻结。
 */
import { computed, onMounted, onUnmounted, ref } from 'vue'

import {
  heroScenes,
  heroTerminalBase,
  heroCodeLines,
  type HeroScene,
  type TerminalLine,
} from '../data/hero_terminal_scenes'

const base = heroTerminalBase()

const sceneIdx = ref(0)
const live = ref(false) // 是否播放动画（false = 显示静态内容）
/** 每行是 { text, lineClass }：改 text 只会更新 textContent，不会重建节点 */
const lineNodes = ref<TerminalLine[]>([])
const cursorAt = ref(-1) // 光标所在行，-1 表示无光标
const firstTokMs = ref(0)

const scene = computed(() => heroScenes[sceneIdx.value])
const staticScene = heroScenes[0]
const codeLines = (s: HeroScene): TerminalLine[] => heroCodeLines(s, base)

/**
 * 状态行：左边 HTTP 状态，右边这一轮对应的卖点短标签。
 *
 * badge 一直存在于场景数据里却从未被渲染 —— 自动故障切换、SSE 流式、
 * 多模型同一把 Key 这三个差异化卖点，在首页、FAQ、定价页一次都没出现过，
 * 终端是它们唯一的出口。之前白白丢了这个位置。
 */
const statusLine = (text: string, badge?: string): TerminalLine => ({
  text: badge ? `${text} · ${badge}` : text,
  lineClass: 'is-status-line',
})
/** 回复行：竖线引导的正文 */
const replyLine = (text: string): TerminalLine => ({ text, lineClass: 'is-reply-line' })
/** 等待首字行 */
const waitLine = (): TerminalLine => statusLine('已发送 · 等待首字')

/** token 统计行：「▸ 61 tokens · 订阅期内不按 token 计费」 */
const statLine = (tokens: number): TerminalLine => ({
  text: `▸ ${tokens} tokens · 订阅期内不按 token 计费`,
  lineClass: 'is-stat',
})

/**
 * 静态首帧：完整一轮回放（请求代码 + 状态行 + 回复 + 统计）。
 * 挂载前占位、开了系统减少动效、用户手动切标签，都会看到这一帧。
 */
const staticLines = computed<TerminalLine[]>(() => {
  const s = staticScene
  return [...codeLines(s), statusLine('HTTP/2 200', s.badge), replyLine(s.a), statLine(s.tokens)]
})

const lines = computed(() => (live.value ? lineNodes.value : staticLines.value))

// 客户端渲染后只要标签页一直可见，动画就一直在跑，不等终端滚进视口：
// 终端就在首屏下半部分，很多人不会往下滚，等 IntersectionObserver 是看不到效果的。
const tabVisible = ref(typeof document === 'undefined' ? true : document.visibilityState === 'visible')
const onVisibility = () => {
  tabVisible.value = document.visibilityState === 'visible'
}
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', onVisibility)
}
const animating = computed(() => live.value && !instant.value && tabVisible.value && typeof window !== 'undefined')

/**
 * 所有等待的唯一入口。
 *
 * 注意这里【不能】对 instant 模式返回 0：instant 只该压掉「逐字打字」这层动画，
 * 一旦把回合之间的停留也压成 0，打开了系统「减少动效」的用户就会看到
 * 终端一秒闪完一轮又立刻重来，完全没有停留 —— 正好是这个模式本该避免的刺眼效果。
 * 所以这里只处理标签页可见性（后台放大到 60 秒，等价冻结），时序本身保持原样。
 */
const sleep = (ms: number) => {
  const wait = typeof document !== 'undefined' && document.visibilityState !== 'visible' ? 60_000 : ms
  return new Promise((r) => setTimeout(r, wait))
}

/** 演示用的首字延迟量级（毫秒）：内容越长等越久，落在中转站常见区间内，不冒充实测 */
const heroLatency = (s: HeroScene) => 900 + Math.min(900, s.chars * 12)

/**
 * 系统「减少动效」开关。
 *
 * 原来这里是直接 return 永不播放，结果这类用户打开首页看到的是一具静止的终端，
 * 跟还能动态打字时相比就像功能坏了 —— 实际是偏好设置被当成了故障。
 * 现在改成照常轮播，只是把逐字节奏压成瞬时：每一轮仍会换场景、换回复，
 * 只是不再有字符一个一个冒出来。CSS 层的动画仍由 prefers-reduced-motion 自己关掉。
 */
const reduceMotion =
  typeof window === 'undefined' ? { matches: true } : window.matchMedia('(prefers-reduced-motion: reduce)')
/** 瞬时模式：不做逐字动画，跳过所有字符级 sleep */
const instant = ref(reduceMotion.matches)

let cancelled = false
/** 用户是否主动停过（切标签、点复制）；停过后自动播放永久停止 */
let autoStopped = false

/** 停止自动播放：停循环、还原静态首帧 */
function stopAuto() {
  autoStopped = true
  cancelled = true
  live.value = false
  cursorAt.value = -1
  firstTokMs.value = 0
}

/** 流式显示回复：逐字符推进，直接改这一行的 text（只触发 textContent 更新） */
async function stream(lineIdx: number, text: string) {
  const target = lineNodes.value[lineIdx]
  if (!target) return
  cursorAt.value = lineIdx
  if (instant.value) {
    target.text = text
    await sleep(0)
    return
  }
  // 每步 1 字符、32~50ms（约 25 字符/秒）；标点处停 110~210ms。
  for (let i = 1; i <= text.length; i++) {
    if (cancelled) return
    target.text = text.slice(0, i)
    await sleep(/[.,;:!?]/.test(text[i - 1]) ? 110 + Math.random() * 100 : 32 + Math.random() * 18)
  }
}

/**
 * 回放一轮：请求代码按词打出（每行末尾留回车符）→ 「已发送 · 等待首字」→ 状态行
 * → 回复逐字符 → token 统计。
 *
 * 每行独立一个 { text, lineClass } 对象，只改 text 不动数组结构：
 * Vue 只会 patch 文本节点，不会销毁重建 DOM 元素 —— 这是消除整块闪动的关键。
 */
async function round(s: HeroScene) {
  cancelled = false
  const code = codeLines(s)
  const nCode = code.length
  lineNodes.value = code.map((l) => ({ text: '', lineClass: l.lineClass }))
  cursorAt.value = -1
  firstTokMs.value = 0

  for (let r = 0; r < nCode && !cancelled; r++) {
    cursorAt.value = r
    const line = lineNodes.value[r]
    const full = code[r].text
    let i = 0
    while (i < full.length && !cancelled) {
      // 每步 1 字符、13~28ms（约 45 字符/秒），命令三行约 230 字符 ≈ 5 秒。
      // 试过 110~210ms 要 35 秒、180~340ms 要 56 秒，都会让命令段喧宾夺主。
      i += 1
      line.text = full.slice(0, i)
      await sleep(13 + Math.random() * 15)
    }
    line.text = full
    // 打完一行按回车：光标不跳行，直接落到行尾的 ⏎ 上，和真实终端一致。
    // 瞬时模式不加回车符：那层装饰正是减少动效用户不想要的。
    if (!instant.value) {
      line.text += ' ⏎'
      await sleep(100)
    }
  }
  if (cancelled) return
  cursorAt.value = -1

  // —— 等待首字：真实中转站这段有 1～3 秒，必须给可见反馈，否则看起来像卡死 ——
  lineNodes.value.push(waitLine())
  const ttft = heroLatency(s)
  await sleep(ttft)
  if (cancelled) return
  firstTokMs.value = ttft

  // 状态行覆盖掉等待行（同一行原地改文字，不新增行）
  const statusIdx = nCode
  lineNodes.value[statusIdx] = statusLine('HTTP/2 200', s.badge)
  await sleep(230)
  // 回复行必须先建好再流式：stream() 只往已存在的行上写，行不存在会静默跳过，
  // 终端就会「打完命令 → 状态行 → 直接跳到 token 统计」，中间少一整段正文。
  lineNodes.value.push(replyLine(''))
  await stream(nCode + 1, s.a)
  if (cancelled) return
  lineNodes.value.push(statLine(s.tokens))
  cursorAt.value = -1
}

async function play() {
  for (let i = 0; !autoStopped; i++) {
    sceneIdx.value = i % heroScenes.length
    await round(heroScenes[sceneIdx.value])
    if (autoStopped) return
    // 回合之间静止 20 秒 —— 阅读时间。
    //
    // sleep 早前会在「减少动效」模式下返回 0ms，导致这类用户看到整轮 2 秒闪完
    // 又立刻重来、完全读不到内容。现在 sleep 不再压时长，回合节奏对所有人一致。
    await sleep(20000)
    if (autoStopped) return
    // 淡出只作用在正文区（.cu-term__body），标题栏不跟着淡。
    // 之前淡的是整块容器，那是全页最大的一块，每轮淡一次就是「整页闪一下」。
    document.querySelector<HTMLElement>('.cu-term__body')?.classList.add('cu-term__fading')
    await sleep(320)
    if (autoStopped) return
    document.querySelector<HTMLElement>('.cu-term__body')?.classList.remove('cu-term__fading')
    await sleep(200)
  }
}

onMounted(async () => {
  await sleep(1200) // 让首帧完整内容先亮出来，再切到动画版
  live.value = true
  await play()
})

onUnmounted(() => {
  autoStopped = true
  cancelled = true
  if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisibility)
})
</script>

<template>
  <ClientOnly>
    <div class="cu-hero__term">
      <div class="cu-term__bar">
        <i /><i /><i />
        <span>terminal</span>
        <em class="cu-term__live"><b />DEMO</em>
      </div>
      <div class="cu-term__body">
        <!--
          每行一个文本节点整体交给 Vue 渲染，text 由 text.slice 逐帧变化。
          不用逐字符 v-for：那样每帧都会产生大量 DOM 节点变更，
          实测正是那种写法导致整块文字持续闪动。
        -->
        <p v-for="(line, i) in lines" :key="i" class="cu-term__line" :class="line.lineClass">
          {{ line.text }}<i v-if="animating && cursorAt === i" class="cu-term__cur" />
        </p>
      </div>
    </div>
  </ClientOnly>
</template>
