<script setup lang="ts">
/**
 * 在线助手 —— 零后端、零第三方依赖。全站唯一的客服浮标（人工客服浮标已于 2026-10-09 并入本组件）。
 *
 * 数据：config/kefu_bot.ts 在 theme/kefu_items.ts 里构建期预处理成 KbEntry[]（关键词 = 语料手写别名 +
 * FAQ 同 id 条目的 keywords 自动合并，分类标签 + 标题指纹）。匹配逻辑在 theme/kefu_match.ts，
 * 组件只负责渲染；scripts/check_kefu.ts 跑的就是这个 matcher。
 * 运行时：纯前端匹配，无 API、无 loading、无超时；答不上来时 300ms 的「正在输入」只是让回复不显得突兀。
 *
 * 交互：单一对话流（用户右 / 助手左）。开场欢迎语就是助手发的一条普通消息（渲染方式与答案完全一致），
 * 下面跟一行「大家都在问」的快捷问题；面板里不做分类、不做追问——站内已有 /faq 页与知识库，再列一遍只会挤掉答案。
 * 答不上来给「换个说法 + 找到客服」；客服不再有独立面板，点按钮后助手发一张卡（二维码 + 微信号 + 一键复制）。
 */
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import type { KbEntry } from '../../../config/kefu_types'
import { copyTextOrPrompt } from '../utils/copy'
import { matchKefu } from '../kefu_match'

const props = defineProps<{
  entries: KbEntry[]
  contact: { wechatId?: string; wechatQr?: string }
  /** 浮标位置，移动端建议 left */
  position?: 'left' | 'right'
}>()

/** 对话流里的一条消息。bot 是命中语料；fallback 是答不上来；human 是客服卡。 */
type Msg =
  | { kind: 'user'; text: string }
  | { kind: 'bot'; entry: KbEntry }
  | { kind: 'fallback' }
  | { kind: 'human' }

/** 对话记录本地留存：只存可序列化的轻量形态（语料只留 id，渲染时回查 entries），语料一改自动丢掉失效条目。 */
const STORE_KEY = 'cu-kefu-log-v1'

/** 页内任意入口点击时派发，唤起客服面板 */
const OPEN_EVENT = 'cu:kefu-open'
/** 最多保留多少条往返，超出丢最旧的；防止把 localStorage 撑大 */
const LOG_CAP = 60
/** 超过这个小时数视为过期，重新给欢迎语 */
const LOG_TTL_HOURS = 72

type StoredMsg = { k: 'u'; t: string } | { k: 'b'; id: string } | { k: 'f' | 'h' }

const open = ref(false)
/** 面板是不是刚被 cu:kefu-open 唤起的，用来让随后的那一次 document 点击不把它关掉 */
const openedByEvent = ref(false)
const input = ref('')
const log = ref<Msg[]>([])
const typing = ref(false)
const copiedKey = ref('')
const panelEl = ref<HTMLElement | null>(null)
const fabEl = ref<HTMLButtonElement | null>(null)
const inputEl = ref<HTMLInputElement | null>(null)
const scrollTick = ref(0)
/** 待执行的「正在输入」定时器，重置 / 卸载时统一清掉 */
const timers = new Set<number>()

/** 记录是从上次会话恢复的：恢复后不再重复欢迎语与快捷问题；恢复失败则退回全新会话 */
const restored = ref(false)
const entryById = computed(() => new Map(props.entries.map((e) => [e.id, e])))

/** 从 localStorage 恢复对话流。任何异常（隐私模式、JSON 损坏、语料已删条目）都静默退回空记录。 */
function restoreLog() {
  try {
    const raw = window.localStorage.getItem(STORE_KEY)
    if (!raw) return
    const box = JSON.parse(raw) as { at?: number; log?: StoredMsg[] }
    if (!box || !Array.isArray(box.log) || !box.log.length) return
    if (!box.at || Date.now() - box.at > LOG_TTL_HOURS * 3600_000) {
      window.localStorage.removeItem(STORE_KEY)
      return
    }
    const out: Msg[] = []
    for (const m of box.log) {
      if (m.k === 'u' && typeof m.t === 'string' && m.t) out.push({ kind: 'user', text: m.t })
      else if (m.k === 'b') {
        const e = entryById.value.get(m.id)
        if (e) out.push({ kind: 'bot', entry: e })
      } else if (m.k === 'f') out.push({ kind: 'fallback' })
      else if (m.k === 'h') out.push({ kind: 'human' })
    }
    if (out.length) {
      log.value = out
      restored.value = true
    }
  } catch {
    /* 读不到就当没存过 */
  }
}

/** 把当前对话流写回 localStorage；写失败（配额满、无痕模式）不影响使用 */
function persistLog() {
  if (typeof window === 'undefined') return
  const list = log.value
  if (!list.length) return
  const tail = list.slice(-LOG_CAP)
  const toStored = (m: Msg): StoredMsg => {
    if (m.kind === 'user') return { k: 'u', t: m.text }
    if (m.kind === 'bot') return { k: 'b', id: m.entry.id }
    return m.kind === 'human' ? { k: 'h' } : { k: 'f' }
  }
  const stored: StoredMsg[] = tail.map(toStored)
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify({ at: Date.now(), log: stored }))
  } catch {
    /* 忽略 */
  }
}

const wechatId = computed(() => props.contact.wechatId || '')
const wechatQr = computed(() => props.contact.wechatQr || '')
const hasQr = computed(() => !!wechatQr.value)
const hasHuman = computed(() => !!wechatId.value || hasQr.value)

/**
 * 开场欢迎语：也是一条 KbEntry（id 以 bot- 开头、没挂 faqId，答案写在 config/kefu_bot.ts 的 kefuBotGreeting）。
 * 走同一套渲染路径，样式与后面的答案一致，不再是「一段裸文字 + 一根线」。
 */
const greeting = computed<KbEntry | null>(() => props.entries.find((e) => e.id === 'bot-greeting') ?? null)

/**
 * 开场快捷问题（「大家都在问」）：按语料分类各取标题最短的一条，再按分类顺序排。
 * 不写死列表——语料一改，快捷问题自动跟着变，也不会出现「列表里的问法与语料对不上」的空按钮。
 */
const popular = computed<KbEntry[]>(() => {
  const byCat = new Map<string, KbEntry>()
  for (const e of props.entries) {
    if (e.id === 'bot-greeting') continue
    const cur = byCat.get(e.cat)
    if (!cur || e.q.length < cur.q.length) byCat.set(e.cat, e)
  }
  return [...byCat.values()]
})

/** 答不上来时的引导问题：取前 3 个分类的代表问题 */
const hints = computed<KbEntry[]>(() => popular.value.slice(0, 3))

/** 提交输入框内容：按钮与回车共用一条路径 */
function submit() {
  ask(input.value)
  input.value = ''
}

/**
 * 提问：先记用户问句，再等 300ms 出答案。
 * 这段延迟不是「假装在思考」，而是给用户一个自然的节奏；期间消息流末尾出现三个跳点，
 * 避免「点了发送却什么都没发生」的错觉。
 */
function ask(q: string) {
  const text = String(q ?? '').trim()
  if (!text || typing.value) return
  const hit = matchKefu(props.entries, text)
  log.value.push({ kind: 'user', text })
  typing.value = true
  scrollDown()
  const timer = window.setTimeout(() => {
    timers.delete(timer)
    typing.value = false
    // 「人工 / 转人工 / 联系方式」这类语料命中后直接发客服卡：答案消息里没有任何按钮，
    // 只回一句「点上面的按钮」对用户是死路，明确要人工时必须立即给出二维码。
    if (hit?.human) log.value.push({ kind: 'human' })
    else log.value.push(hit ? { kind: 'bot', entry: hit } : { kind: 'fallback' })
    scrollDown()
  }, 300)
  timers.add(timer)
}

/** 点快捷问题：直接发送这一条语料的标题（它是完整问句，能原样命中自己） */
function askEntry(e: KbEntry) {
  ask(e.q)
}

function toggle() {
  open.value = !open.value
  // 多等一拍再滚：scrollTick 与 log.length 在同一 tick 变化时 watcher 只触发一次，重开面板会停在中间
  if (open.value) nextTick(() => nextTick(() => { scrollDown(); inputEl.value?.focus() }))
  persistLog()
}

function close() {
  open.value = false
}

/** 供页面内其他入口调用：浮标在角落，这里让页面能直接唤起同一个面板 */
function openPanel() {
  if (open.value) return
  openedByEvent.value = true
  toggle()
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && input.value.trim()) submit()
}

function onDocClick(e: MouseEvent) {
  // 由教程页首按钮唤起时，事件本身也是一次 document 点击（点了按钮 = 点在 .cu-kefu 之外），
  // 不跳过的话面板刚打开就被这一次点击关掉
  if (openedByEvent.value) {
    openedByEvent.value = false
    return
  }
  // 浮标与面板都是本组件内部的，路径里任一个命中都不算「点到外部」；面板默认在浮标上方，
  // 在面板里点过复制按钮后再点浮标关闭时，e.target 也可能仍是面板里的旧节点
  const t = e.target as Element
  if (!t.closest('.cu-kefu') && !fabEl.value?.contains(t)) open.value = false
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && open.value) open.value = false
}

/** 复制微信号：clipboard API → execCommand → prompt 手动复制，三级兜底见 utils/copy.ts */
async function copyWechat() {
  const ok = await copyTextOrPrompt(wechatId.value)
  copiedKey.value = ok ? 'wechat' : ''
  setTimeout(() => (copiedKey.value = ''), 2000)
}

/** 「联系客服」= 在对话流里追加一张客服卡（每点一次追加一张，不做状态回显）。source 只用于埋点区分入口 */
function contactHuman(_source: 'foot' | 'fallback' | 'auto' = 'foot') {
  if (!hasHuman.value) return
  log.value.push({ kind: 'human' })
  scrollDown()
}

function reset() {
  timers.forEach((t) => window.clearTimeout(t))
  timers.clear()
  typing.value = false
  log.value = []
  input.value = ''
  copiedKey.value = ''
  restored.value = false
  try {
    window.localStorage.removeItem(STORE_KEY)
  } catch {
    /* 忽略 */
  }
  nextTick(scrollDown)
}

function scrollDown() {
  scrollTick.value++
}

onMounted(() => {
  document.addEventListener('click', onDocClick)
  document.addEventListener('keydown', onKey)
  window.addEventListener(OPEN_EVENT, openPanel)
  restoreLog()
})
onUnmounted(() => {
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('keydown', onKey)
  window.removeEventListener(OPEN_EVENT, openPanel)
  timers.forEach((t) => window.clearTimeout(t))
})

defineExpose({ openPanel })

watch([open, scrollTick, () => log.value.length, typing], async ([isOpen]) => {
  if (!isOpen) return
  await nextTick()
  const el = panelEl.value
  if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
})
</script>
<template>
  <div class="cu-kefu" :class="`cu-kefu--${position || 'right'}`">
    <!-- 浮标 -->
    <button
      ref="fabEl"
      class="cu-kefu__fab"
      type="button"
      data-cta="kefu_open"
      :aria-expanded="open"
      aria-label="在线助手"
      @click="toggle"
    >
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <path
          d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H9l-4.2 3.6A.5.5 0 0 1 4 19.2V5.5Z"
          fill="currentColor"
        />
      </svg>
      <span class="cu-kefu__fab-label">{{ open ? '收起' : '在线助手' }}</span>
    </button>

    <!-- 侧滑面板：SSR 不渲染（v-if），浮标本身是 SSR 产物里唯一被构建门禁断言的节点 -->
    <aside v-if="open" class="cu-kefu__panel" role="dialog" aria-label="在线助手">
      <header class="cu-kefu__head">
        <div class="cu-kefu__avatar" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path
              d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H9l-4.2 3.6A.5.5 0 0 1 4 19.2V5.5Z"
              fill="currentColor"
            />
          </svg>
        </div>
        <div class="cu-kefu__title">
          <strong>在线助手</strong>
          <small>机器人先答，也可以找真人</small>
        </div>
        <button
          v-if="log.length"
          class="cu-kefu__icon-btn"
          type="button"
          title="重新开始"
          aria-label="重新开始"
          @click="reset"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <path d="M12 5V2L7 6l5 4V7a5.5 5.5 0 1 1-5.5 5.5H5A7 7 0 1 0 12 5Z" fill="currentColor" />
          </svg>
        </button>
        <button class="cu-kefu__icon-btn" type="button" aria-label="关闭" @click="close">
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <path d="m6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12 19 17.6 17.6 19 12 13.4 6.4 19 5 17.6 10.6 12 5 6.4Z" fill="currentColor" />
          </svg>
        </button>
      </header>

      <div ref="panelEl" class="cu-kefu__body cu-scroll-none" role="log" aria-live="polite" aria-label="对话记录">
        <!-- 开场：欢迎语（助手的一条消息）+ 快捷问题；恢复了上次记录就不重复出场 -->
        <div v-if="greeting && !restored" class="cu-kefu__msg cu-kefu__msg--bot">
          <div class="cu-kefu__answer">
            <span class="cu-kefu__tag">{{ greeting.catLabel }}</span>
            <p v-for="(para, j) in greeting.a.split('\n')" :key="j" class="cu-kefu__para">{{ para }}</p>
          </div>
        </div>
        <ul v-if="popular.length && !restored" class="cu-kefu__popular" aria-label="快捷问题">
          <li v-for="e in popular" :key="e.id">
            <button type="button" class="cu-kefu__chip" data-cta="kefu_chip" @click="askEntry(e)">{{ e.q }}</button>
          </li>
        </ul>

        <!-- 对话流 -->
        <div v-for="(m, i) in log" :key="i" class="cu-kefu__msg" :class="`cu-kefu__msg--${m.kind}`">
          <!-- 用户的问句 -->
          <div v-if="m.kind === 'user'" class="cu-kefu__bubble--user">{{ m.text }}</div>

          <!-- 答不上来：换个说法 + 找到客服 -->
          <template v-else-if="m.kind === 'fallback'">
            <div class="cu-kefu__answer">
              <span class="cu-kefu__tag">助手</span>
              <p class="cu-kefu__para">
                这个我暂时答不上来。换个更具体的说法（比如带上「429」「换 Key」「Base URL」这样的词）我再试一次，
                或者在<a href="/faq">常见问题</a>里找找。
              </p>
            </div>
            <ul v-if="hints.length" class="cu-kefu__hints">
              <li v-for="e in hints" :key="e.id">
                <button type="button" class="cu-kefu__hint" @click="askEntry(e)">{{ e.q }}</button>
              </li>
            </ul>
            <div class="cu-kefu__acts">
              <button
                v-if="hasHuman"
                type="button"
                class="cu-kefu__btn cu-kefu__btn--primary cu-kefu__btn--sm"
                data-cta="kefu_human_fallback"
                @click="contactHuman('fallback')"
              >
                联系客服
              </button>
              <a class="cu-kefu__btn cu-kefu__btn--sm" href="/faq">全部常见问题</a>
            </div>
          </template>

          <!-- 客服卡：二维码 + 微信号 + 一键复制（只留微信） -->
          <template v-else-if="m.kind === 'human'">
            <div class="cu-kefu__answer">
              <span class="cu-kefu__tag">客服</span>
              <p class="cu-kefu__para">微信扫一扫添加，或复制微信号后搜索添加。联系时请附上账号标识、报错原文、发生时间，处理更快。</p>
            </div>
            <div class="cu-kefu__human-body">
              <span v-if="hasQr" class="cu-kefu__qr-wrap">
                <img
                  class="cu-kefu__qr"
                  :src="wechatQr"
                  alt="客服微信二维码，用微信扫一扫"
                  width="140"
                  height="140"
                />
              </span>
              <div class="cu-kefu__human-side">
                <span class="cu-kefu__human-label">客服微信号</span>
                <code class="cu-kefu__wechat">{{ wechatId || '—' }}</code>
                <button
                  v-if="wechatId"
                  type="button"
                  class="cu-kefu__btn cu-kefu__btn--primary cu-kefu__btn--block"
                  :aria-label="copiedKey === 'wechat' ? '微信号已复制' : '一键复制微信号'"
                  data-cta="kefu_copy_wechat"
                  @click="copyWechat"
                >
                  <svg v-if="copiedKey !== 'wechat'" viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
                    <path d="M9 2h9a1 1 0 0 1 1 1v14h-2V4H9V2Zm-3 4h9a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Zm0 2v12h9V8H6Z" fill="currentColor" />
                  </svg>
                  <svg v-else viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
                    <path d="m9.6 16.2-3.8-3.8L4.4 13.8l5.2 5.2L19.6 9l-1.4-1.4-8.6 8.6Z" fill="currentColor" />
                  </svg>
                  {{ copiedKey === 'wechat' ? '已复制' : '一键复制' }}
                </button>
              </div>
            </div>
          </template>

          <!-- 助手答案 -->
          <template v-else>
            <div class="cu-kefu__answer">
              <span class="cu-kefu__tag">{{ m.entry.catLabel }}</span>
              <p class="cu-kefu__q">{{ m.entry.q }}</p>
              <template v-for="(para, j) in m.entry.a.split('\n')" :key="j">
                <ul v-if="para.startsWith('- ')" class="cu-kefu__list">
                  <li :key="para">{{ para.slice(2) }}</li>
                </ul>
                <p v-else-if="para.trim()" class="cu-kefu__para">{{ para }}</p>
              </template>
            </div>
            <pre v-if="m.entry.code.length" class="cu-kefu__code cu-scroll-none"><code>{{ m.entry.code.join('\n') }}</code></pre>
            <ul v-if="m.entry.links.length" class="cu-kefu__links">
              <li v-for="(l, j) in m.entry.links" :key="j">
                <a
                  :href="l.url"
                  :target="l.external ? '_blank' : undefined"
                  :rel="l.external ? 'noopener sponsored nofollow' : undefined"
                >{{ l.text }}</a>
              </li>
            </ul>
          </template>
        </div>

        <!-- 「正在输入」三个跳点 -->
        <div v-if="typing" class="cu-kefu__msg cu-kefu__msg--typing" aria-hidden="true">
          <div class="cu-kefu__typing"><i /><i /><i /></div>
        </div>
      </div>

      <footer class="cu-kefu__foot">
        <div class="cu-kefu__input">
          <input
            ref="inputEl"
            v-model="input"
            type="text"
            placeholder="输入你的问题，如「429 怎么办」"
            aria-label="输入问题"
            @keydown="onKeydown"
          />
          <button type="button" aria-label="发送" :disabled="!input.trim() || typing" @click="submit">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path d="m3 20 18-8L3 4v5.5l11 2.5-11 2.5V20Z" fill="currentColor" />
            </svg>
          </button>
        </div>
        <!-- 常驻人工出口：不依赖「先失败一次」也不需要用户猜「人工」这个词 -->
        <div v-if="hasHuman" class="cu-kefu__exit">
          <p class="cu-kefu__exit-text">没解决？找人工客服，附上报错原文处理更快</p>
          <button
            type="button"
            class="cu-kefu__btn cu-kefu__btn--sm"
            data-cta="kefu_human_foot"
            @click="contactHuman('foot')"
          >
            联系客服
          </button>
        </div>
      </footer>
    </aside>
  </div>
</template>