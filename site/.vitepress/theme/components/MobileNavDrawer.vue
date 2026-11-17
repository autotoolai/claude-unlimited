<script setup lang="ts">
/**
 * 窄屏（≤820px）主导航入口：菜单按钮 + 右侧抽屉。
 * 宽屏不渲染交互（CSS 隐藏按钮；抽屉关闭态不进 DOM）。
 * 抽屉内承载：主导航链接、控制台、主题切换（顶栏窄屏只留 品牌 | 菜单 | 购买）。
 */
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vitepress'
import { navItems } from '../../../config/site'
import ConsoleEntry from './ConsoleEntry.vue'
import { useThemeToggle } from '../composables/use_shell'

const props = defineProps<{ slug?: string }>()
const route = useRoute()
const links = computed(() => [{ text: '首页', link: '/' }, ...navItems])
const open = ref(false)
const { toggle } = useThemeToggle()

const current = computed(() => {
  if (!props.slug) return ''
  const s = props.slug.replace(/^\/+/, '')
  if (s === 'knowledge' || s === 'knowledge_index' || s.startsWith('knowledge_')) return '/knowledge'
  return '/' + s.replace(/_/g, '/')
})
const isActive = (link: string) =>
  link === current.value ? true : link === '/' ? route.path === '/' : route.path.startsWith(link)

function setOpen(next: boolean) {
  open.value = next
  document.documentElement.classList.toggle('cu-nav-drawer-open', next)
  document.documentElement.style.overflow = next ? 'hidden' : ''
}

function openDrawer() {
  setOpen(true)
}
function closeDrawer() {
  setOpen(false)
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') closeDrawer()
}

watch(
  () => route.path,
  () => {
    if (open.value) closeDrawer()
  },
)

onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  document.documentElement.classList.remove('cu-nav-drawer-open')
  document.documentElement.style.overflow = ''
})
</script>

<template>
  <button
    class="cu-nav-menu"
    type="button"
    aria-label="打开站点导航"
    :aria-expanded="open"
    @click="openDrawer"
  >
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
      <path d="M2.5 4h11M2.5 8h11M2.5 12h11" />
    </svg>
  </button>

  <Teleport to="body">
    <div v-if="open" class="cu-nav-drawer__scrim" @click="closeDrawer" />
    <aside v-if="open" class="cu-nav-drawer" aria-label="站点导航">
      <div class="cu-nav-drawer__head">
        <p class="cu-nav-drawer__title">导航</p>
        <button class="cu-nav-drawer__close" type="button" aria-label="关闭站点导航" @click="closeDrawer">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </button>
      </div>
      <nav class="cu-nav-drawer__links">
        <a
          v-for="n in links"
          :key="n.link"
          class="cu-nav-drawer__link"
          :class="{ 'is-active': isActive(n.link) }"
          :href="n.link"
          :aria-current="isActive(n.link) ? 'page' : undefined"
          @click="closeDrawer"
        >{{ n.text }}</a>
      </nav>
      <div class="cu-nav-drawer__tools">
        <ConsoleEntry class="cu-nav-drawer__console" />
        <button
          class="cu-navtoggle cu-nav-drawer__theme"
          type="button"
          aria-label="切换深浅色模式"
          title="切换深浅色模式"
          @click="toggle"
        >
          <svg class="cu-icon-moon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
          <svg class="cu-icon-sun" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </svg>
        </button>
      </div>
    </aside>
  </Teleport>
</template>
