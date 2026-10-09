<script setup lang="ts">
/**
 * 主导航条：首页 + 已启用的导航项 + 右侧「立即购买」CTA。
 * CTA 走 ExternalCta（全站购买链接的唯一出口），size="sm" 保持与导航同高。
 */
import { computed } from 'vue'
import { useRoute } from 'vitepress'
import { navItems, featuredProduct } from '../../../config/site'

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
      <ExternalCta v-if="shopUrl" class="cu-tabs__cta" size="sm" cta="nav" />
    </div>
  </nav>
</template>
