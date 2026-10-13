<script setup lang="ts">
/**
 * 知识库文章页的外壳：单行品牌导航（与 PageShell 相同）+ 单列阅读容器（正文 / 页内目录两列）+ 页尾（相关阅读 / 上下篇 / CTA）+ 助手。
 * 由 Layout.vue 在 frontmatter.knowledge === true 时渲染；正文来自 markdown（frontmatter layout: page，VPDoc 的 page 分支）。
 * H1 与正文由 <Content /> 渲染（layout: page → VPDoc 的 page 分支：只有 .vp-doc，没有原生 aside）；
 * 页内目录复用 SectionNav；目录项在客户端挂载后从正文的 h2[id] 读取（SSR 阶段不可用，见 config.mts 的 themePackages 注释），样式与其它页面一致。
 */
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { Content, useRoute } from 'vitepress'
// 正文用 VitePress 官方的 <Content />（插槽）渲染 markdown：知识库文章写 layout: page，走 VPDoc 的 page 分支，
// 只有 .vp-doc 没有原生 aside，右侧目录由下面的 SectionNav 提供。
import { siteConfig, featuredProduct } from '../../../config/site'
import { kefuItems } from '../kefu_items'
import TabBar from './TabBar.vue'
import BrandLogo from './BrandLogo.vue'
import KefuWidget from './KefuWidget.vue'
import ConsoleEntry from './ConsoleEntry.vue'
import ExternalCta from './ExternalCta.vue'
import SiteFooter from './SiteFooter.vue'
import SectionNav from './SectionNav.vue'
import JsonLd from './JsonLd.vue'
import KnowledgeFooter from './KnowledgeFooter.vue'
import { jsonLdKnowledge, knowledgeBySlug, knowledgeCategoryShort } from '../pages/data'
import { useThemeToggle, useNavScrollState, useReveal } from '../composables/use_shell'

const route = useRoute()
const slug = computed(() => route.path.replace(/^\/knowledge\/?/, '').replace(/\/index\.html$/, '').replace(/\.html$/, '').replace(/\/$/, ''))
const article = computed(() => knowledgeBySlug(slug.value))
const jsonLd = computed(() => (article.value ? jsonLdKnowledge(article.value, article.value.faq) : null))

const kefu = { entries: kefuItems, contact: siteConfig.contact, position: 'right' as const }
const shopUrl = computed(() => featuredProduct().shopUrl)

const { toggle } = useThemeToggle()
useNavScrollState()
useReveal('.cu-page--doc')

// 页内目录：SSR 阶段不可靠（见 .vitepress/config.mts 的 themePackages 注释），改在客户端挂载后从 DOM 的 h2 生成。
// SectionNav 自己会 observe 这些 id 触发高亮；目录为空时它不渲染（v-if="sections.length"）。
const sections = ref<{ id: string; label: string }[]>([])

/**
 * 常见问题：正文 md 里不写 FAQ 小节，折叠卡片由组件挂在正文之后（与 /pricing 的 FaqList 同一套样式）。
 * 做法：SSR 时输出一个空的 <section id="cu-kdoc-faq">，客户端挂载 / 切换路由后把正文里的「常见问题」h2
 * （如果作者写了）连同折叠卡片一起搬进这个 section；页内目录对应项由 readHeadings() 读这个 section。
 */
const faqItems = computed(() => article.value?.faq ?? [])

/** 「更新于 YYYY-MM-DD」，仅当 updated 与 date 不同才出现。没改过就不显示，避免暗示全部都是新内容。 */
const updatedLabel = computed(() => {
  const a = article.value
  if (!a || !a.updated || a.updated === a.date) return ''
  return `更新于 ${a.updated}`
})
const FAQ_HEADING = '常见问题'
const norm = (t: string) => (t || '').replace(/[​-‍﻿]/g, '').replace(/\s*#+$/, '').trim()

function mountFaq() {
  const section = document.querySelector('.cu-page--doc > section#cu-kdoc-faq') as HTMLElement | null
  if (!section) return
  const body = section.previousElementSibling as HTMLElement | null // .vp-doc
  section.replaceChildren()
  if (!body || !faqItems.value.length) return
  // 作者若在正文里手写了「## 常见问题」（旧文章），把那个 h2 摘出来当区块标题
  const h2 = [...body.querySelectorAll('h2')].find((h) => norm(h.textContent) === FAQ_HEADING) ?? null
  if (h2) h2.remove()
  const heading = document.createElement('h2')
  heading.textContent = FAQ_HEADING
  heading.id = 'cu-kdoc-faq-heading'
  const details = document.createElement('div')
  details.className = 'cu-faq'
  for (const [i, it] of faqItems.value.entries()) {
    const d = document.createElement('details')
    d.className = 'cu-faq__item'
    d.id = `cu-kdoc-faq-${i}`
    d.open = i === 0
    const summary = document.createElement('summary')
    summary.setAttribute('role', 'button')
    summary.setAttribute('aria-expanded', String(i === 0))
    const q = document.createElement('span')
    q.className = 'cu-faq__q'
    q.textContent = it.q
    summary.append(q)
    const bodyEl = document.createElement('div')
    bodyEl.className = 'cu-faq__body'
    for (const para of it.a.split('\n')) {
      if (!para.trim()) continue
      if (para.startsWith('- ')) {
        const ul = document.createElement('ul')
        ul.className = 'cu-faq__bullets'
        for (const item of para.split('\n').filter((x) => x.startsWith('- '))) {
          const li = document.createElement('li')
          li.textContent = item.slice(2)
          ul.append(li)
        }
        bodyEl.append(ul)
      } else {
        const p = document.createElement('p')
        p.className = 'cu-faq__para'
        p.textContent = para
        bodyEl.append(p)
      }
    }
    d.append(summary, bodyEl)
    details.append(d)
  }
  section.append(heading, details)
}

function readHeadings() {
  const article_ = document.querySelector('.cu-page--doc') as HTMLElement | null
  if (!article_) return
  // 正文 h2 在 .vp-doc 下的 main 里（layout: page 也保留 main）；h2 里带 VitePress 的 header-anchor（零宽字符），
  // 直接取第一个文本节点才是标题本身；末尾的 # 号也去掉。「常见问题」在正文外的 FAQ 区块里，单独补进去。
  sections.value = [...article_.querySelectorAll('.vp-doc h2[id]'), ...article_.querySelectorAll('.cu-kdoc__faq h2[id]')]
    .map((h) => ({ id: h.id, label: (h.firstChild?.textContent || h.textContent || '').trim() }))
}
// 目录与 FAQ 都在客户端挂载 / 切换路由后处理，FAQ 插入完要再等一拍才能读到新的 h2 列表
onMounted(() => nextTick(() => { mountFaq(); nextTick(readHeadings) }))
watch(() => route.path, () => nextTick(() => { mountFaq(); nextTick(readHeadings) }))
</script>

<template>
  <div class="cu-shell cu-shell--knowledge">
    <header class="cu-brandbar">
      <div class="cu-brandbar__inner">
        <a class="cu-brand" href="/" aria-label="返回首页">
          <BrandLogo :size="38" />
          <span class="cu-brand__text">
            <strong>{{ siteConfig.name }}</strong>
          </span>
        </a>

        <TabBar slug="knowledge" />

        <div class="cu-navtools">
          <ConsoleEntry class="cu-tabs__console" />
          <button
            class="cu-navtoggle"
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
          <ExternalCta v-if="shopUrl" class="cu-tabs__cta" size="sm" cta="nav" />
        </div>
      </div>
    </header>

    <div class="cu-shell__body cu-shell__body--reading">
      <!-- 目录在正文之前：宽屏是左侧一列，≤1280px 塌成正文上方的横排条（靠 DOM 顺序，不靠 order） -->
      <SectionNav :sections="sections" variant="knowledge" />
      <!-- --reading 修饰类：把正文列限宽到 46rem（教程页同款），单列回落时由 01_shell_toc.css 解除 -->
      <div class="cu-shell__inner cu-shell__inner--reading">
        <article class="cu-page cu-page--doc">
          <!-- JsonLd 只往注册表写数据（由 Layout.vue 在客户端挂载后插入 head），它保留 slot 所以放在元信息行之前不影响正文 -->
          <JsonLd v-if="jsonLd" id="cu-jsonld-knowledge" :json="jsonLd" />
          <div class="cu-kdoc__meta" v-if="article">
            <a class="cu-kdoc__crumb" href="/knowledge">知识库</a>
            <span class="cu-kdoc__badge">{{ knowledgeCategoryShort(article.cat) }}</span>
            <span>约 {{ article.minutes }} 分钟</span>
            <!-- 时效信号（2026-10-13 新增）：只在真改过（updated != date）时显示。
                 列表页卡片继续不显示日期（视觉噪音），但文章页给一个「更新于」——
                 GEO 场景下 AI 判断内容是否过期看的就是页面上可见的更新信号，
                 只写进 JSON-LD 的 dateModified 对人类读者不可见。 -->
            <span v-if="updatedLabel">{{ updatedLabel }}</span>
          </div>
          <!-- markdown 正文：VPDoc 的 page 分支（layout: page），只有 .vp-doc 没有原生 aside -->
          <!-- markdown 正文。VitePress 直接把 <table> 塞进 .vp-doc，表格本身就是 overflow-x: auto 的滚动容器，
               宽表会画出丑滚动条，窄屏时还会撑破阅读列。这里给 .vp-doc 挂 .cu-scroll-wrap：
               所有内滚容器（表格、代码块、嵌套表格）都继承它 → 统一不画轨道；.vp-doc 本身没有 overflow，定位不受影响。 -->
          <div class="vp-doc cu-scroll-wrap">
            <Content />
          </div>
          <!-- 「常见问题」折叠卡片：SSR 时空，客户端由 mountFaq() 把 h2 与 details 填进来（内容来自 knowledge.ts 的 faq[]）。
               正文里不写 FAQ 小节，页内目录的对应项由 readHeadings() 从这里补进去。 -->
          <section id="cu-kdoc-faq" class="cu-kdoc__faq" aria-label="常见问题"></section>
        </article>
        <KnowledgeFooter />
      </div>
    </div>

    <SiteFooter />

    <KefuWidget v-bind="kefu" />
  </div>
</template>
