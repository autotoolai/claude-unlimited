<script setup lang="ts">
/**
 * 教程页的轨选择器：贴在 h1 + lead 下方、正文块之前的一条通栏分栏切换。
 *
 * 为什么不复用 SegmentedTabs：教程只有「小白教程 / 高级配置」一个岔路口，是一次性的方向决策，
 * 不是像定价页那样在多个等价视图之间来回横跳。两轨长度差 3 倍（6 节 vs 2 节），等宽小胶囊
 * 会让人以为点过去是等量内容。所以换成两列大块：轨名 + 定位句 + 长度徽标。
 *
 * 与 SegmentedTabs 共用的东西（保留）：
 * - role="tablist" / role="tab" / aria-selected，左右方向键切换。
 * - 只切 hidden 不重挂载，所以 SSR 产物里两条轨的锚点、表格都在（爬虫与 #params 深链依赖这点，
 *   见 GuidePage.vue 顶部注释）。
 *
 * 墨色体系：选中轨用 --cu-contrast 反白，未选轨只留描边 + 弱化文字，不引入彩色。
 */
import { ref } from 'vue'
import type { GuideTab, GuideTabId } from '../../../config/guide'

const props = defineProps<{ tabs: GuideTab[]; activeId: GuideTabId }>()
const emit = defineEmits<{ (e: 'update:activeId', id: GuideTabId): void }>()

const buttons = ref<HTMLButtonElement[]>([])

function select(id: GuideTabId) {
  if (id !== props.activeId) emit('update:activeId', id)
}

function onKeydown(e: KeyboardEvent, i: number) {
  const delta = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
  if (!delta) return
  e.preventDefault()
  const next = (i + delta + props.tabs.length) % props.tabs.length
  const g = props.tabs[next]
  select(g.id)
  buttons.value[next]?.focus()
}
</script>

<template>
  <div class="cu-grails" role="tablist" aria-label="教程路径">
    <button
      v-for="(t, i) in tabs"
      :key="t.id"
      :ref="(el) => { if (el) buttons[i] = el as HTMLButtonElement }"
      type="button"
      role="tab"
      class="cu-grails__item"
      :class="{ 'is-active': t.id === activeId }"
      :aria-selected="t.id === activeId"
      :tabindex="t.id === activeId ? 0 : -1"
      @click="select(t.id)"
      @keydown="onKeydown($event, i)"
    >
      <strong class="cu-grails__name">{{ t.name }}</strong>
      <span v-if="t.desc" class="cu-grails__desc">{{ t.desc }}</span>
      <small v-if="t.meta" class="cu-grails__meta">{{ t.meta }}</small>
    </button>
  </div>
</template>