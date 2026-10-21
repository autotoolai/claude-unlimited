<script setup lang="ts">
/**
 * 页面外壳：单行吸顶品牌导航（logo + 链接 + 主题切换 + 后台 + 购买 CTA + 声明）
 * + 正文 + 页脚与助手。
 *
 * 结构说明：
 * - 导航合并为一行，滚动后加 .is-scrolled 才显分隔线与投影（use_shell.ts）。
 * - 页内目录由 toc prop 决定，默认没有（营销页与列表页不传）。
 *   toc="side" 是教程页的窄列（46rem），toc="wide" 是后台页的宽列（54rem，卡网格要 3 列）；
 *   两者都是「正文 + 右侧目录」两列，与知识库文章页（KnowledgeDoc.vue 传 variant="side"）同一套骨架。
 * - 区块入场动画与导航滚动态统一放在 composables/use_shell.ts，供 KnowledgeDoc.vue 复用。
 */
import { computed } from 'vue'
import { siteConfig, featuredProduct } from '../../../config/site'
import { kefuItems } from '../kefu_items'
import TabBar from './TabBar.vue'
import SectionNav from './SectionNav.vue'
import BrandLogo from './BrandLogo.vue'
import KefuWidget from './KefuWidget.vue'
import SiteFooter from './SiteFooter.vue'
import ConsoleEntry from './ConsoleEntry.vue'
import ExternalCta from './ExternalCta.vue'
import { SECTION_NAV } from './sections'
import { useThemeToggle, useNavScrollState, useReveal } from '../composables/use_shell'

const props = defineProps<{
  /** 与文件名一致：index / pricing / unlimited / faq / guide_* */
  slug: string
  /** 内页传标题（渲染为 H1）；首页不传，H1 在 HomeHero 里 */
  title?: string
  /** 一句话结论，H1 下方的副标题 */
  lead?: string
  /** H1 上方的短标签；不传用品牌名（教程页传 config/guide.ts 的 eyebrow） */
  eyebrow?: string
  /**
   * 页内目录：不传（默认）= 不显示，只有长文页才开。
   * 'side' 窄列长读（教程场景页），'wide' 宽列（后台页的 3 列卡网格）。
   * 目录数据仍来自 sections.ts 的 SECTION_NAV[slug]。
   */
  toc?: 'side' | 'wide'
  /**
   * 窄列正文但没有页内目录（教程索引页）。
   * 与 toc 的区别：toc 会渲染左侧目录并把外壳撑成两列，narrow 只有窄列那一列。
   * 两者互斥：toc 在场时 narrow 忽略。
   */
  narrow?: boolean
}>()

const sections = computed(() => {
  return props.toc ? SECTION_NAV[props.slug] || [] : []
})
const eyebrow = computed(() => props.eyebrow || siteConfig.name)
const shopUrl = computed(() => featuredProduct().shopUrl)

// 全站唯一浮标：在线助手。人工客服不再是独立浮标，而是在面板里点「联系人工客服」后由助手发卡。
const kefu = { entries: kefuItems, contact: siteConfig.contact, position: 'right' as const }

const { toggle } = useThemeToggle()
useNavScrollState()
useReveal()
</script>

<template>
  <div class="cu-shell">
    <header class="cu-brandbar">
      <div class="cu-brandbar__inner">
        <a class="cu-brand" href="/" aria-label="返回首页">
          <BrandLogo :size="38" />
          <span class="cu-brand__text">
            <strong>{{ siteConfig.name }}</strong>
          </span>
        </a>

        <TabBar :slug="slug" />

        <div class="cu-navtools">
          <ConsoleEntry class="cu-tabs__console" />
          <button
            class="cu-navtoggle"
            type="button"
            aria-label="切换深浅色模式"
            title="切换深浅色模式"
            @click="toggle"
          >
            <svg
              class="cu-icon-moon"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
            <svg
              class="cu-icon-sun"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
            </svg>
          </button>
          <ExternalCta v-if="shopUrl" class="cu-tabs__cta" size="sm" cta="nav" />
        </div>
      </div>
    </header>

    <div
      class="cu-shell__body"
      :class="{ 'cu-shell__body--reading': !!toc, 'cu-shell__body--narrow': narrow && !toc, 'cu-guide-wrap': slug.replace(/^\//, '').startsWith('guide'), 'cu-shell__body--no-toc': !sections.length }"
    >
      <!-- 目录在正文之前：宽屏是左侧一列，窄屏塌成抽屉（靠 DOM 顺序，不靠 order）。
           variant="guide"：教程页目录形态（压顶部留白、去进度条），与知识库文章页分开。 -->
      <SectionNav :sections="sections" variant="guide" />
      <div class="cu-shell__inner" :class="toc ? `cu-shell__inner--reading${toc === 'wide' ? ' cu-shell__inner--wide' : ''}` : ''">
        <article class="cu-page">
          <header v-if="title" class="cu-page__head">
            <p class="cu-eyebrow">{{ eyebrow }}</p>
            <h1>{{ title }}</h1>
            <p v-if="lead" class="cu-page__lead">{{ lead }}</p>
          </header>
          <slot />
        </article>
      </div>
    </div>

    <SiteFooter />

    <KefuWidget v-bind="kefu" />
  </div>
</template>
