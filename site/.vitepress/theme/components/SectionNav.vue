<script setup lang="ts">
/**
 * 页内目录：正文左侧的竖排小节列表，吸顶、当前小节高亮、可折叠收起。
 *
 * 只给长文型页面用（PageShell 传 toc="side" / toc="wide"，或知识库文章页自己传 sections）。
 * 营销页与列表页（首页 / 模型 / 套餐 / 无限额度 / FAQ / 知识库列表）不传 toc，因此不渲染。
 * 样式在 01_shell_toc.css：≥1281px 在正文左侧，≤1280px 变成正文上方的横排标签条（此时隐藏折叠按钮与进度条）。
 *
 * 约束：<aside> 的 class 必须是静态的 `cu-sectionnav cu-sidenav` —— 校验脚本
 * scripts/check_dist.mjs:48 精确匹配这个字符串。折叠态由 <html class="cu-toc-collapsed"> 表达，
 * 不要给 <aside> 加 :class。
 */
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useTocCollapse } from '../composables/use_shell'

export interface TocItem {
  id: string
  label: string
  /** 1 = h2 章，2 = h3 节 */
  level?: number
  /** 分组名：教程页两条轨的分组，由页面过滤后传进来 */
  group?: string
}

const props = defineProps<{ sections: TocItem[] }>()

const active = ref(props.sections[0]?.id || '')
/* 窄屏抽屉：≤1080px 时目录不再是正文上方的横排标签条（21 个条目会把正文整体推近 300px），
   收成一个「本页目录」按钮 + 右侧滑入的浮层。按钮上直接显示当前小节名，用户始终知道自己在哪一节。 */
const drawerOpen = ref(false)
const activeLabel = computed(() => props.sections.find((s) => s.id === active.value)?.label || '')

/* 浮层形态由 <html class="cu-sidenav-drawer-open"> 表达（同 useTocCollapse 挂在 html 上的做法）：
   <aside> 的 class 必须保持静态，check_dist / verify_build 都精确匹配它。
   media query 负责「只在 ≤1080px 才生效」，html 上的类负责「只有打开时才变形」。 */
function openDrawer() {
  drawerOpen.value = true
  document.documentElement.classList.add('cu-sidenav-drawer-open')
  document.documentElement.style.overflow = 'hidden'
}

function closeDrawer() {
  drawerOpen.value = false
  document.documentElement.classList.remove('cu-sidenav-drawer-open')
  document.documentElement.style.overflow = ''
}

function onDrawerKey(e: KeyboardEvent) {
  if (e.key === 'Escape') closeDrawer()
}

onMounted(() => window.addEventListener('keydown', onDrawerKey))
onUnmounted(() => {
  window.removeEventListener('keydown', onDrawerKey)
  document.documentElement.style.overflow = ''
})
const { collapsed, toggleToc } = useTocCollapse()
const progress = ref(0)
let observer: IntersectionObserver | null = null
let raf = 0

onMounted(() => {
  const ids = props.sections.map((s) => s.id)
  const visible = new Map<string, boolean>()
  observer = new IntersectionObserver(
    (entries) => {
      for (const e of entries) visible.set(e.target.id, e.isIntersecting)
      const first = ids.find((id) => visible.get(id))
      if (first) active.value = first
    },
    // 顶部（导航 --cu-nav-h 以下 + 余量）以下才算进入视口，避免吸顶导航遮住标题时判定过早
    { rootMargin: '-100px 0px -55% 0px', threshold: 0 },
  )
  for (const id of ids) {
    const el = document.getElementById(id)
    if (el) observer.observe(el)
  }
  // 阅读进度：整页滚动比例，rAF 节流（写法同 useNavScrollState）
  const onScroll = () => {
    if (raf) return
    raf = requestAnimationFrame(() => {
      raf = 0
      const max = document.documentElement.scrollHeight - window.innerHeight
      progress.value = max > 0 ? Math.min(100, Math.max(0, (window.scrollY / max) * 100)) : 0
    })
  }
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
  onUnmounted(() => window.removeEventListener('scroll', onScroll))
})

onUnmounted(() => observer?.disconnect())

const progressStyle = computed(() => ({ width: `${progress.value.toFixed(1)}%` }))
</script>

<template>
  <!-- 遮罩必须挂在 body 上：它若留在 <aside> 里，会被 aside 的层叠上下文（fixed + z-index 61）困住，
       反过来盖住抽屉里的列表链接，点条目永远点不到。Teleport 到 body 后才是 60 < 61 的正确层级。 -->
  <Teleport to="body">
    <div v-if="drawerOpen" class="cu-sidenav__scrim" @click="closeDrawer" />
  </Teleport>
  <!-- v-if：目录为空就整个不渲染。
       PageShell 只在传了 toc 时才传非空 sections，营销页 / 列表页因此不会有任何目录节点。
       知识库文章页的目录项要等客户端挂载后从正文 h2 读出来，SSR 阶段同样是空 → 跳过，
       产物里没有目录节点是预期结果（KnowledgeDoc.vue 与 check_dist.mjs 都按这个前提写）。 -->
  <aside v-if="sections.length" class="cu-sectionnav cu-sidenav cu-scroll-none" aria-label="本页目录">
    <!-- 窄屏抽屉入口（≥1081px 时被 CSS 隐藏，宽屏形态完全不受影响） -->
    <button class="cu-sidenav__drawer-btn" type="button" :aria-expanded="drawerOpen" @click="openDrawer">
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
        <path d="M2.5 4h11M2.5 8h11M2.5 12h7" />
      </svg>
      <span class="cu-sidenav__drawer-btn-label">本页目录</span>
      <b>{{ activeLabel }}</b>
      <svg class="cu-sidenav__drawer-btn-chev" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M6 3.5 10.5 8 6 12.5" />
      </svg>
    </button>
    <div class="cu-sidenav__head">
      <p class="cu-sidenav__title">本页目录</p>
      <button
        class="cu-sidenav__close"
        type="button"
        aria-label="关闭页内目录"
        @click="closeDrawer"
      >
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
          <path d="M4 4l8 8M12 4l-8 8" />
        </svg>
      </button>
      <button
        class="cu-sidenav__toggle"
        type="button"
        :aria-expanded="!collapsed"
        :aria-label="collapsed ? '展开页内目录' : '收起页内目录'"
        :title="collapsed ? '展开目录' : '收起目录'"
        @click="toggleToc"
      >
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path :d="collapsed ? 'M6 3.5 10.5 8 6 12.5' : 'M10 3.5 5.5 8 10 12.5'" />
        </svg>
      </button>
    </div>
    <div class="cu-sidenav__progress" role="presentation"><i :style="progressStyle" /></div>
    <ul>
      <li v-for="s in sections" :key="s.id">
        <a
          :href="'#' + s.id"
          :class="[{ 'is-active': active === s.id }, { 'cu-sidenav__sub': (s.level ?? 1) > 1 }]"
          :aria-current="active === s.id ? 'true' : undefined"
          @click="drawerOpen && closeDrawer()"
        >{{ s.label }}</a>
      </li>
    </ul>
  </aside>
</template>
