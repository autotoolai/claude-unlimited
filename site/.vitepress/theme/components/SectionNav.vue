<script setup lang="ts">
/** 页内目录：滚动时高亮当前小节（IntersectionObserver），窄屏变成顶部的横向标签条 */
import { onMounted, onUnmounted, ref } from 'vue'

const props = defineProps<{ sections: { id: string; label: string }[] }>()

const active = ref(props.sections[0]?.id || '')
let observer: IntersectionObserver | null = null

onMounted(() => {
  const ids = props.sections.map((s) => s.id)
  const visible = new Map<string, boolean>()
  observer = new IntersectionObserver(
    (entries) => {
      for (const e of entries) visible.set(e.target.id, e.isIntersecting)
      const first = ids.find((id) => visible.get(id))
      if (first) active.value = first
    },
    // 顶部 96px（页头 68 + 导航 64）以下才算进入视口，避免吸顶导航遮住标题
    { rootMargin: '-96px 0px -55% 0px', threshold: 0 },
  )
  for (const id of ids) {
    const el = document.getElementById(id)
    if (el) observer.observe(el)
  }
})

onUnmounted(() => observer?.disconnect())
</script>

<template>
  <aside class="cu-sidenav" aria-label="本页目录">
    <p class="cu-sidenav__title">本页目录</p>
    <ul>
      <li v-for="s in sections" :key="s.id">
        <a :href="'#' + s.id" :class="{ 'is-active': active === s.id }">{{ s.label }}</a>
      </li>
    </ul>
  </aside>
</template>