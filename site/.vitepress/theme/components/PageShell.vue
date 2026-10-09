<script setup lang="ts">
/**
 * 页面外壳：品牌页头 + 主导航 + 正文列 + 右侧页内目录（滚动高亮）。
 * 四页统一用它，正文靠默认插槽传入；页内目录的标题从 SECTION_NAV 取，保证目录与内容永远同步。
 */
import { computed } from 'vue'
import { siteConfig } from '../../../config/site'
import { kefuItems } from '../kefu_items'
import TabBar from './TabBar.vue'
import SectionNav from './SectionNav.vue'
import BrandLogo from './BrandLogo.vue'
import KefuWidget from './KefuWidget.vue'
import HumanServiceWidget from './HumanServiceWidget.vue'
import SiteFooter from './SiteFooter.vue'
import { SECTION_NAV } from './sections'

const props = defineProps<{
  /** 与文件名一致：index / pricing / unlimited / faq */
  slug: string
  /** 内页传标题（渲染为 H1）；首页不传，H1 在 HomeHero 里 */
  title?: string
  /** 一句话结论，H1 下方的副标题 */
  lead?: string
}>()

const sections = computed(() => SECTION_NAV[props.slug] || [])
const shopUrl = computed(() => siteConfig.products.find((p) => p.id === siteConfig.featuredProductId)?.shopUrl ?? '')
// 助手面板的「人工联系方式」行不再重复展示（改为浮标入口），contact 只传 wechatId 供兜底提示
const kefu = { entries: kefuItems, contact: { wechatId: siteConfig.contact.wechatId }, position: 'right' as const }
</script>

<template>
  <div class="cu-shell">
    <header class="cu-brandbar">
      <div class="cu-brandbar__inner">
        <a class="cu-brand" href="/" aria-label="返回首页">
          <BrandLogo :size="38" />
          <span class="cu-brand__text">
            <strong>{{ siteConfig.name }}</strong>
            <small>Claude API · 固定订阅 · 不按 token 计费</small>
          </span>
        </a>
        <a
          v-if="shopUrl"
          class="cu-navcta"
          :href="shopUrl"
          target="_blank"
          rel="noopener sponsored nofollow"
          data-cta="nav"
          >立即购买</a
        >
      </div>
    </header>

    <TabBar :slug="slug" />

    <div class="cu-shell__body">
      <article class="cu-page">
        <header v-if="title" class="cu-page__head">
          <p class="cu-eyebrow">Claude 无限卡</p>
          <h1>{{ title }}</h1>
          <p v-if="lead" class="cu-page__lead">{{ lead }}</p>
        </header>
        <slot />
      </article>
      <SectionNav v-if="sections.length" :sections="sections" />
    </div>

    <SiteFooter />

    <KefuWidget v-bind="kefu" />
    <HumanServiceWidget />
  </div>
</template>