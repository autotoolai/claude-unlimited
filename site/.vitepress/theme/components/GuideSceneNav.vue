<script setup lang="ts">
/**
 * 场景切换条：教程页顶部的一排链接，5 个客户端互跳。
 *
 * 是链接不是 tab：这 5 个是 5 个独立页面（各自有独立 URL 与 SEO meta），
 * 不是同一页面的几个视图，所以用 <a> 与 aria-current，不套 tablist 语义。
 * （原来那条「小白教程 / 高级配置」是同页切换，才是 tab。）
 */
import { guideSceneCards } from '../../../config/guide'

defineProps<{ current: string }>()
</script>

<template>
  <nav class="cu-guide-scenes" aria-label="切换客户端教程">
    <a
      v-for="c in guideSceneCards()"
      :key="c.id"
      class="cu-guide-scenes__item"
      :class="{ 'is-current': c.id === current }"
      :href="c.url"
      :aria-current="c.id === current ? 'page' : undefined"
      >{{ c.title }}</a
    >
  </nav>
</template>
