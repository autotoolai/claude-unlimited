<script setup lang="ts">
// 自定义 Layout —— 刻意不用 VitePress 默认主题的 Layout（VPApp/VPNav/VPLocalNav/VPSidebar/…），只借它的 VPContent。
// 默认外壳会额外渲染 VPSkipLink 隐藏 H1、VPNavBarTitle 空链接、VPLocalNav 等空节点，本站都不需要；
// 页面自己用 PageShell / KnowledgeDoc 画品牌导航与正文，所以这里退到最薄的一层，只保留 VPContent
// （它负责「把 md 正文按 frontmatter.layout 解析成页面组件」）：
// 1. hash 滚动：VPLocalNav 原本负责锚点跳转，去掉后由这里按 hash 平滑滚动；
// 2. 深色类：深色模式的唯一事实来源是 <html class="dark">（由 composables/use_shell.ts 的切换按钮写入）。
//    首帧没有 JS 时靠 00_base.css 的 @media (prefers-color-scheme: dark) 兜底，避免白闪；
// 3. JSON-LD：页面里的 JsonLd 组件把 JSON 写进注册表，挂载后统一插入 head（见 jsonld_registry.ts）。
import { onMounted, watch } from 'vue'
import { inBrowser, useRoute } from 'vitepress'
// 直接从内部路径拿默认主题的 VPContent（它没有具名/默认导出，只在默认 Layout.vue 里被 import）
import VPContent from 'vitepress/dist/client/theme-default/components/VPContent.vue'
import KnowledgeDoc from './components/KnowledgeDoc.vue'
import { useData } from 'vitepress'

const route = useRoute()
const { frontmatter } = useData()
const isKnowledge = () => frontmatter.value.knowledge === true

/**
 * SSR 首帧之后补一次深色类：VitePress 只在 <html> 上写 appearance 属性，
 * 本站色板读的是 .dark 类，这里根据系统偏好补上，避免挂载瞬间闪一下浅色。
 * 用户手动切换后的状态由 localStorage（vitepress-theme-appearance）决定，不能被这里覆盖。
 */
function syncInitialDark() {
  if (!inBrowser) return
  const saved = (() => {
    try {
      return localStorage.getItem('vitepress-theme-appearance')
    } catch {
      return null
    }
  })()
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  document.documentElement.classList.toggle('dark', saved ? saved === 'dark' : prefersDark)
}

function renderJsonLd() {
  if (typeof document === 'undefined') return
  const registry = globalThis.__cuJsonLd
  if (!registry) return
  // 幂等：首帧保留 body 里那份（爬虫读的就是它），SPA 换页后 body 里那份属于旧页面，连同 head 里旧的
  // 注册表条目一起清掉，再按注册表重建。
  // 不能把判断写反成「注册表为空就返回」：registry 是 globalThis 上的 Map，SPA 换页时会被 keepOnlyCurrentPage
  // 清空后再由新页面的 setup 异步写入，watch 里等 150ms 正是为了等这个写入。若首帧注册表恰好为空就跳过
  // 清理，会把构建期注入的 body 标签删掉，页面上 JSON-LD 归零（这个 bug 已修，别改回去）。
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

/** 清空 JSON-LD 注册表：SPA 跳转时只有新页面的组件会再写自己的条目，旧页面的结构化数据必须移除 */
function keepOnlyCurrentPage() {
  const registry = globalThis.__cuJsonLd
  if (!registry) return
  // body 末尾那一份是构建期写死的，不随路由变，不删就会让旧页面的 JSON-LD 一直留着；
  // head 里那一份由 renderJsonLd 先清后建，这里再清一次不会重复（渲染是同步的）。
  document.querySelectorAll('script[data-cu-jsonld][id^="cu-jsonld-"]').forEach((el) => el.remove())
  for (const id of [...registry.keys()]) registry.delete(id)
}

function scrollToHash() {
  if (!inBrowser || !location.hash) return
  const el = document.getElementById(decodeURIComponent(location.hash.slice(1)))
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

onMounted(() => {
  keepOnlyCurrentPage()
  syncInitialDark()
  renderJsonLd()
  scrollToHash()
})
// SPA 内跳转（点导航 / 列表页 / 相关阅读）时 location 变化，但页面组件的 setup 不会重跑：
// 页面里 <JsonLd /> 只在 setup 里写注册表，所以要在路由变化后等新页面组件渲染完再注入一次；
// 同时本页的 JsonLd 注册表条目也要按页清理（注册表是 globalThis 上的 Map，会跨页累积）。
// 不用 nextTick：组件渲染是异步的，等固定 300ms 即可（JSON-LD 不影响首屏渲染）。
watch(
  () => route.path + (inBrowser ? location.hash : ''),
  async () => {
    keepOnlyCurrentPage()
    await new Promise((r) => setTimeout(r, 300))
    renderJsonLd()
    scrollToHash()
  },
)
</script>

<template>
  <!--
    两分支不能互换：
    - 普通页：<VPContent /> 渲染页面组件（frontmatter.layout），JsonLd 组件的 <slot/> 在里面渲染 markdown 正文；
    - 知识库文章：VPContent 会先渲染 KnowledgeDoc（页面组件）形成环，所以这里直接渲染 KnowledgeDoc，
      KnowledgeDoc 内部用 VitePress 官方的 <Content />（md_content 插槽）渲染 markdown 正文。
    两条分支都只经过一次 VPContent 的 slot 渲染。
  -->
  <KnowledgeDoc v-if="isKnowledge()" />
  <VPContent v-else />
</template>
