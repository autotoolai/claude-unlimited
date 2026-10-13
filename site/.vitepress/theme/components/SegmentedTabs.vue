<script setup lang="ts">
/**
 * 分段切换：一排分段胶囊，只展示当前分组的内容。
 *
 * 与 TabBar.vue 的区别：TabBar 是主导航（一排 <a> 链接，与吸顶品牌栏布局耦合），
 * 本组件是页面内的内容切换（role="tablist"），切换的是 slot 内容而不是路由。
 *
 * 用途：定价页切套餐组（config/plans.ts 的 planGroups）、教程页切小白 / 高手两条轨（config/guide.ts 的 guideTabs），
 * 所以 id 是泛型 string，不绑死 PlanGroupId。
 *
 * 用法：
 *   <SegmentedTabs :groups="planGroups" :active-id="activeGroup" @update:active-id="activeGroup = $event">
 *     <template #default="{ activeId }">
 *       <div v-show="activeId === 'unlimited'" id="unlimited">…</div>
 *     </template>
 *   </SegmentedTabs>
 *
 * 面板由父组件用 v-show 控制而不是本组件 v-if，这样切回来时卡片不会重挂载、hover 状态不丢。
 */
import { ref, computed } from 'vue'


/** 胶囊分组：至少要有 id / name / desc，badge 与 status 只有套餐组用得上 */
export interface SegGroup {
  id: string
  name: string
  desc?: string
  badge?: string
  status?: string
}

const props = defineProps<{ groups: SegGroup[]; activeId: string }>()
const emit = defineEmits<{ (e: 'update:activeId', id: string): void }>()

const tabs = ref<HTMLButtonElement[]>([])
const current = computed(() => props.groups.findIndex((g) => g.id === props.activeId))

function select(id: string) {
  if (id !== props.activeId) emit('update:activeId', id)
}

/** 左右方向键在胶囊间移动焦点并切换（标准 tablist 行为） */
function onKeydown(e: KeyboardEvent) {
  const delta = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
  if (!delta) return
  e.preventDefault()
  const next = (current.value + delta + props.groups.length) % props.groups.length
  const g = props.groups[next]
  select(g.id)
  tabs.value[next]?.focus()
}
</script>

<template>
  <div class="cu-seg-wrap">
    <div class="cu-seg cu-scroll-none" role="tablist" :aria-label="groups[0]?.name" @keydown="onKeydown">
      <button
        v-for="(g, i) in groups"
        :key="g.id"
        :ref="(el) => { if (el) tabs[i] = el as HTMLButtonElement }"
        type="button"
        role="tab"
        class="cu-seg__btn"
        :class="{ 'is-active': g.id === activeId }"
        :aria-selected="g.id === activeId"
        :tabindex="g.id === activeId ? 0 : -1"
        @click="select(g.id)"
      >
        {{ g.name }}
        <span v-if="g.badge && g.status !== 'coming-soon'" class="cu-seg__badge">{{ g.badge }}</span>
        <span v-else-if="g.status === 'coming-soon'" class="cu-seg__badge cu-seg__badge--soon">即将上线</span>
      </button>
    </div>
    <p v-if="groups.find((g) => g.id === activeId)?.desc" class="cu-seg__desc">{{ groups.find((g) => g.id === activeId)?.desc }}</p>

    <slot :active-id="activeId" />
  </div>
</template>
