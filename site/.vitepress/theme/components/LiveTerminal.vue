<script setup lang="ts">
/**
 * 首屏演示终端 —— 一次真实的 /v1/messages 调用在终端里回放。
 *
 * 为什么不是把四行命令打出来就完事：静态命令只能证明「有个 curl」，看不出返回长什么样。
 * 这里每轮都是真的向网关发一个 max_tokens 64 的请求，终端里逐字打出命令，
 * 拿到 HTTP 200 与模型原文后按词流式显示，最后给一行 token 统计。
 *
 * 三层保障，任一层不成立都不会让用户看到空白终端：
 *   1. SSR 首帧就是一份完整静态内容（第一节场景的 curl + 状态行 + 回复），
 *      搜索引擎与无 JS 环境读到的就是这段；
 *   2. 挂载后先探测网关可达（5 秒超时），不可达就保留静态内容不动；
 *   3. 单轮请求失败不重试到死，把那一行改成连接失败，不再假装成功。
 *
 * 动画只在 prefers-reduced-motion: no-preference 时播放；标签页切到后台时 sleep 会
 * 把时长放大到 60 秒，等价于冻结。
 */
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { heroScenes, heroTerminalBase } from '../data/hero_terminal_scenes'

/** 一个输出节点：kind 决定样式，text 是已显示出来的内容 */
type NodeKind = 'cmd' | 'flag' | 'str' | 'status' | 'reply' | 'stat' | 'error'
interface Node {
  kind: NodeKind
  text: string
}

const live = ref(false) // 是否播放动画（false = 显示静态内容）
const lineNodes = ref<Node[][]>([]) // 每行一组节点，行内可换行
const cursorAt = ref(-1) // 光标所在行，-1 表示无光标
const statText = ref('')

const staticScene = heroScenes[0]

const node = (kind: NodeKind, text: string): Node => ({ kind, text })
const cmd = (t: string) => node('cmd', t)
const flag = (t: string) => node('flag', t)
const str = (t: string) => node('str', t)

/** 请求体：短 prompt 让回复稳定在几句话内；max_tokens 64 够用且不浪费订阅额度 */
function requestBody(s: { model: string; q: string }): string {
  return JSON.stringify({ model: s.model, max_tokens: 64, messages: [{ role: 'user', content: s.q }] })
}

/** 静态首帧：第一节场景的完整回放，SSR 就能看到 */
const staticLines = computed<Node[][]>(() => [
  [cmd('$'), cmd(' curl '), str(`${heroTerminalBase}/v1/messages`), cmd(' \\')],
  [flag('  -H '), str('"x-api-key: sk-ant-••••••••"'), cmd(' \\'), flag('  -H '), str('"anthropic-version: 2023-06-01"')],
  [flag('  -d '), str(`'${requestBody(staticScene)}'`)],
  [node('status', 'HTTP/2 200')],
  [node('reply', staticScene.a)],
])

const lines = computed(() => (live.value ? lineNodes.value : staticLines.value))
const shownStat = computed(() => (live.value ? statText.value : ''))

const sleep = (ms: number) => {
  const wait = document.visibilityState === 'visible' ? ms : 60_000
  return new Promise((r) => setTimeout(r, wait))
}

let cancelled = false

/** 逐字补完某行的某个节点，尾随光标；done 在该节点打完后调用（用于接下一段） */
async function fill(lineIdx: number, nodeIdx: number, text: string, done?: () => void) {
  const target = lineNodes.value[lineIdx]?.[nodeIdx]
  if (!target) return
  cursorAt.value = lineIdx
  let i = 0
  while (i < text.length && !cancelled) {
    i += 2 + Math.floor(Math.random() * 4)
    target.text = text.slice(0, i)
    await sleep(14 + Math.random() * 22)
  }
  if (!cancelled) done?.()
}

/** 流式显示回复：按词推进，遇句读停顿久一点，读起来像在思考 */
async function stream(lineIdx: number, text: string) {
  const target = lineNodes.value[lineIdx]?.[0]
  if (!target) return
  cursorAt.value = lineIdx
  const words = text.match(/\S+\s*|\s+/g) ?? [text]
  for (const w of words) {
    if (cancelled) return
    target.text += w
    const pause = /[。；，？！,.]\s*$/.test(w) ? 120 + Math.random() * 140 : 0
    await sleep(26 + Math.random() * 40 + pause)
  }
}

/** 一次真实请求：返回状态行、回复原文与 token 数；网络或 HTTP 错误抛错 */
async function call(s: { model: string; q: string }): Promise<{ status: string; text: string; tokens: number }> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 20_000)
  try {
    const res = await fetch(`${heroTerminalBase}/v1/messages`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': 'sk-ant-site-demo',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({ model: s.model, max_tokens: 64, messages: [{ role: 'user', content: s.q }] }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    const text = (json.content ?? []).map((c: { text?: string }) => c.text ?? '').join('').trim()
    const tokens = (json.usage?.input_tokens ?? 0) + (json.usage?.output_tokens ?? 0)
    return { status: 'HTTP/2 200', text, tokens }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * 网关可达性探测：5 秒超时，超时或网络错都视为不可达。
 * /v1/models 没有 Key 也返回 401，那恰恰说明域名活着，所以任何 HTTP 响应都算可达。
 */
async function reachable(): Promise<boolean> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 5000)
  try {
    await fetch(`${heroTerminalBase}/v1/models`, { signal: ctrl.signal, cache: 'no-store' })
    return true
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}

/** 回放一节场景：命令打字 → 等待 → 状态行 → 回复流式 → token 统计 */
async function scene(s: (typeof heroScenes)[number]) {
  const body = requestBody(s)
  lineNodes.value = [
    [cmd('$'), cmd(' curl '), str(`${heroTerminalBase}/v1/messages`), cmd(' \\')],
    [flag('  -H '), str(''), cmd(' \\'), flag('  -H '), str('')],
    [flag('  -d '), str(''), cmd(' \\')],
    [node('status', '')],
    [node('reply', '')],
  ]
  statText.value = ''

  await fill(0, 2, `${heroTerminalBase}/v1/messages`)
  await fill(1, 1, '"x-api-key: sk-ant-••••••••"')
  await fill(1, 4, '"anthropic-version: 2023-06-01"')
  await fill(2, 1, `'${body}'`)
  lineNodes.value[2][2].text = ''
  cursorAt.value = -1
  await sleep(420)

  let out: Awaited<ReturnType<typeof call>> | null = null
  try {
    out = await call(s)
  } catch {
    /* 失败就落到下面那行提示，不重试到死 */
  }
  if (cancelled) return false
  if (!out) {
    lineNodes.value[3][0] = node('error', 'HTTP/… 连接失败，网关暂时不可达')
    return false
  }
  lineNodes.value[3][0] = node('status', out.status)
  await sleep(260)
  await stream(4, out.text || s.a)
  statText.value = out.tokens ? `本次请求 ${out.tokens} tokens · 订阅期内不按 token 计费` : ''
  cursorAt.value = -1
  return true
}

async function play() {
  for (let i = 0; !cancelled; i++) {
    const ok = await scene(heroScenes[i % heroScenes.length])
    if (cancelled || !ok) return
    await sleep(4200)
    document.querySelector<HTMLElement>('.cu-term__body')?.classList.add('cu-term__fading')
    await sleep(320)
    document.querySelector<HTMLElement>('.cu-term__body')?.classList.remove('cu-term__fading')
    lineNodes.value = []
    cursorAt.value = -1
    await sleep(200)
  }
}

onMounted(async () => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  if (!(await reachable()) || cancelled) return
  // 终端滚进视口再播，否则动画在看不见的地方跑完
  const box = document.querySelector('.cu-hero__term')
  if (!box) return
  const io = new IntersectionObserver(
    async (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return
      io.disconnect()
      await sleep(600)
      live.value = true
      await play()
    },
    { threshold: 0.25 },
  )
  io.observe(box)
})

onUnmounted(() => {
  cancelled = true
})
</script>

<template>
  <div class="cu-hero__term" aria-hidden="true" tabindex="-1">
    <div class="cu-term__bar">
      <i /><i /><i />
      <span>Messages API · 真实请求</span>
      <em class="cu-term__live"><b />{{ live ? '演示中' : '已连接' }}</em>
    </div>
    <div class="cu-term__body">
      <noscript>
        <p class="cu-term__line">
          <span class="cu-term__prompt">$</span><span class="cu-term__node is-cmd">curl</span>
          <span class="cu-term__node is-str">"{{ heroTerminalBase }}/v1/messages"</span>
          -H <span class="cu-term__node is-str">"x-api-key: sk-ant-••••••••"</span>
          -H <span class="cu-term__node is-str">"anthropic-version: 2023-06-01"</span>
          -d <span class="cu-term__node is-str">'{"model":"{{ staticScene.model }}","max_tokens":64,"messages":[...]}'</span>
        </p>
        <p class="cu-term__line"><span class="cu-term__node is-status">HTTP/2 200</span></p>
        <p class="cu-term__line cu-term__reply-line">{{ staticScene.a }}</p>
      </noscript>
      <template v-for="(row, i) in lines" :key="i">
        <p class="cu-term__line" :class="{ 'cu-term__reply-line': row[0]?.kind === 'reply' }">
          <span
            v-for="(n, j) in row"
            :key="j"
            :class="`cu-term__node is-${n.kind}`"
          >{{ n.text }}</span>
          <i v-if="live && cursorAt === i" class="cu-term__cur" />
        </p>
      </template>
      <p v-if="shownStat" class="cu-term__line cu-term__stat">
        <span class="cu-term__comment"># </span><span class="cu-term__cost">{{ shownStat }}</span>
      </p>
    </div>
  </div>
</template>