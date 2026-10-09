// 自定义 Layout —— 刻意不用 VitePress 默认主题的 Layout（VPApp/VPNav/VPLocalNav/VPSidebar/…），只借它的 VPContent。
// 默认外壳会额外渲染 VPSkipLink 隐藏 H1、VPNavBarTitle 空链接、VPLocalNav 等空节点，本站都不需要；
// 四个页面自己用 PageShell 画品牌页头与正文，所以这里退到最薄的一层，只保留 VPContent
// （它负责「把 md 正文按 frontmatter.layout 解析成页面组件」）：
// 1. hash 滚动：VPLocalNav 原本负责锚点跳转，去掉后由这里按 hash 平滑滚动；
// 2. 深色类：VitePress 1.6 没有组件把 isDark 写回 html.dark，custom.css 里的 .dark 变量组因此不生效；
// 3. JSON-LD：页面里的 JsonLd 组件把 JSON 写进注册表，挂载后统一插入 head（见 jsonld_registry.ts）。
<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { inBrowser, useData } from 'vitepress'
// 直接从内部路径拿默认主题的 VPContent（它没有具名/默认导出，只在默认 Layout.vue 里被 import）
import VPContent from 'vitepress/dist/client/theme-default/components/VPContent.vue'

const { isDark } = useData()

function syncDark(el?: Element | null) {
  if (!inBrowser) return
  document.documentElement.classList.toggle('dark', isDark.value)
  el?.classList.toggle('dark', isDark.value)
}

function renderJsonLd() {
  if (typeof document === 'undefined') return
  const registry = globalThis.__cuJsonLd
  if (!registry) return
  document.head.querySelectorAll('script[data-cu-jsonld]').forEach((el) => el.remove())
  registry.forEach((json, id) => {
    const el = document.createElement('script')
    el.type = 'application/ld+json'
    el.id = id
    el.setAttribute('data-cu-jsonld', '')
    el.textContent = json
    document.head.appendChild(el)
  })
}

function scrollToHash() {
  if (!inBrowser || !location.hash) return
  const el = document.getElementById(decodeURIComponent(location.hash.slice(1)))
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

onMounted(() => {
  renderJsonLd()
  syncDark(document.querySelector('.cu-shell'))
  scrollToHash()
})
watch(() => location.pathname + location.hash, () => {
  renderJsonLd()
  syncDark(document.querySelector('.cu-shell'))
  scrollToHash()
})
watch(isDark, () => syncDark(document.querySelector('.cu-shell')))
</script>

<template>
  <VPContent />
</template>
