<script setup lang="ts">
/**
 * 关键词助手 —— 零后端、零第三方依赖。
 *
 * 数据：config/faq.ts 在 theme/index.ts 里构建期预处理成 KbEntry[]（关键词归一化 + 分词）。
 * 运行时：纯前端子串匹配，无 API、无 loading、无超时。
 * 入口：Layout.vue 的 layout-top 插槽渲染 <GlobalKefu />，每页自动出现。
 */
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import type { KbEntry } from '../../../config/kefu_types'

const props = defineProps<{
  entries: KbEntry[]
  contact: { wechatId?: string }
  /** 浮标位置，移动端建议 left */
  position?: 'left' | 'right'
}>()

const open = ref(false)
const input = ref('')
const answer = ref<KbEntry | null>(null)
const log = ref<{ role: 'user' | 'bot'; text: string }[]>([])
const panelEl = ref<HTMLElement | null>(null)
const inputEl = ref<HTMLInputElement | null>(null)

/** 快捷按钮：每个分类取 1 条代表性问句（优先无代码块），覆盖售前到售后 */
const quick = computed(() => {
  const picked: KbEntry[] = []
  for (const e of props.entries) {
    if (picked.some((x) => x.cat === e.cat)) continue
    picked.push(e)
  }
  return picked.filter((e) => !e.code.length).concat(picked.filter((e) => e.code.length))
})

/** 输入归一化：全角转半角、去空白、小写 */
function norm(s: string): string {
  return s
    .replace(/[！-～]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .replace(/　/g, '')
    .replace(/\s+/g, '')
    .toLowerCase()
}

/** 匹配：完整关键词子串优先，其次关键词分词命中数 */
function match(q: string): KbEntry | null {
  const n = norm(q)
  if (!n) return null
  let best: { e: KbEntry; score: number } | null = null
  for (const e of props.entries) {
    let score = 0
    for (const k of e.kw) if (k && n.includes(k)) score += 10 + k.length
    // 分词兜底：命中若干词元也算相关
    score += e.tokens.filter((t: string) => t.length >= 2 && n.includes(t)).length
    if (score > 0 && (!best || score > best.score)) best = { e, score }
  }
  // 阈值：只有零散单字命中不算
  return best && best.score >= 2 ? best.e : null
}

function push(role: 'user' | 'bot', text: string) {
  log.value.push({ role, text })
}

function ask(q: string) {
  const hit = match(q)
  answer.value = hit
  push('user', q)
  push('bot', hit ? hit.q : '这个问题我暂时答不上来。可以换个说法再问一次，或者直接联系人工。')
  nextTick(() => {
    panelEl.value?.scrollTo({ top: panelEl.value.scrollHeight })
    inputEl.value?.focus()
  })
}

function toggle() {
  open.value = !open.value
  if (open.value) nextTick(() => inputEl.value?.focus())
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && input.value.trim()) {
    ask(input.value.trim())
    input.value = ''
  }
}

function onDocClick(e: MouseEvent) {
  const t = e.target as Element
  if (!t.closest('.cu-kefu')) open.value = false
}

function copy(text: string) {
  navigator.clipboard?.writeText(text)
  push('bot', `已复制：${text}`)
}

function reset() {
  answer.value = null
  log.value = []
}

onMounted(() => document.addEventListener('click', onDocClick))
onUnmounted(() => document.removeEventListener('click', onDocClick))
</script>

<template>
  <div class="cu-kefu" :class="`cu-kefu--${position || 'right'}`">
    <!-- 浮标 -->
    <button class="cu-kefu__fab" type="button" :aria-expanded="open" aria-label="在线助手" @click="toggle">
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <path
          d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H9l-4.2 3.6A.5.5 0 0 1 4 19.2V5.5Z"
          fill="currentColor"
        />
      </svg>
      <span class="cu-kefu__fab-label">{{ open ? '收起' : '在线助手' }}</span>
    </button>

    <!-- 侧滑面板 -->
    <aside v-if="open" class="cu-kefu__panel" role="dialog" aria-label="在线助手">
      <header class="cu-kefu__head">
        <div>
          <strong>在线助手</strong>
          <small>输入问题，秒回。也可以直接点下面的快捷问题。</small>
        </div>
        <button class="cu-kefu__close" type="button" aria-label="关闭" @click="open = false">×</button>
      </header>

      <div ref="panelEl" class="cu-kefu__body">
        <!-- 答案卡 -->
        <div v-if="answer" class="cu-kefu__answer">
          <div class="cu-kefu__answer-cat">{{ answer.catLabel }}</div>
          <h4>{{ answer.q }}</h4>
          <p v-for="(para, i) in answer.a.split('\n')" :key="i">{{ para }}</p>
          <pre v-if="answer.code.length"><code>{{ answer.code.join('\n') }}</code></pre>
          <ul v-if="answer.links.length" class="cu-kefu__links">
            <li v-for="(l, i) in answer.links" :key="i">
              <a
                :href="l.url"
                :target="l.external ? '_blank' : undefined"
                :rel="l.external ? 'noopener sponsored nofollow' : undefined"
              >{{ l.text }}</a>
            </li>
          </ul>
        </div>
        <!-- 首屏：快捷问题 -->
        <div v-else-if="log.length === 0" class="cu-kefu__intro">
          <p>你好，这里是常见问题速答助手。可以问我：</p>
          <ul class="cu-kefu__quick">
            <li v-for="e in quick" :key="e.id">
              <button type="button" @click="ask(e.q)">{{ e.q }}</button>
            </li>
          </ul>
        </div>
        <!-- 对话记录 / 兜底 -->
        <div v-else class="cu-kefu__log">
          <div v-for="(m, i) in log" :key="i" class="cu-kefu__msg" :class="`cu-kefu__msg--${m.role}`">{{ m.text }}</div>
          <div v-if="!answer" class="cu-kefu__fallback">
            <button type="button" @click="reset">重新问</button>
            <a href="/guide/ccswitch#troubleshoot" @click="open = false">看排错清单</a>
          </div>
        </div>
      </div>

      <footer class="cu-kefu__foot">
        <div class="cu-kefu__input">
          <input
            ref="inputEl"
            v-model="input"
            type="text"
            placeholder="输入问题，如「429 怎么办」"
            @keydown="onKeydown"
          />
          <button type="button" @click="input.trim() && (ask(input.trim()), (input = ''))">发送</button>
        </div>
        <div class="cu-kefu__contact">
          <span>人工：</span>
          <span v-if="contact.wechatId" class="cu-kefu__muted">点右下角「人工客服」加微信 {{ contact.wechatId }}</span>
        </div>
      </footer>
    </aside>
  </div>
</template>