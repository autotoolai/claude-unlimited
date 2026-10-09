<script setup lang="ts">
/** 主导航条：首页 + 已启用的导航项 + 「立即购买」CTA。数据来自 config/site.ts 的 nav 与 products。 */
import { computed } from 'vue'
import { useRoute } from 'vitepress'
import { siteConfig, navItems, featuredProduct } from '../../../config/site'

const route = useRoute()
const links = computed(() => [{ text: '首页', link: '/' }, ...navItems])
const shopUrl = computed(() => featuredProduct().shopUrl)
const isActive = (link: string) => (link === '/' ? route.path === '/' : route.path.startsWith(link))
</script>

<template>
  <nav class="cu-tabs" aria-label="主导航">
    <div class="cu-tabs__inner">
      <a
        v-for="n in links"
        :key="n.link"
        class="cu-tabs__link"
        :class="{ 'is-active': isActive(n.link) }"
        :href="n.link"
        :aria-current="isActive(n.link) ? 'page' : undefined"
        >{{ n.text }}</a
      >
      <a
        v-if="shopUrl"
        class="cu-btn cu-btn--primary cu-btn--sm cu-tabs__cta"
        :href="shopUrl"
        target="_blank"
        rel="noopener sponsored nofollow"
        data-cta="nav"
        >立即购买</a
      >
    </div>
  </nav>
</template>