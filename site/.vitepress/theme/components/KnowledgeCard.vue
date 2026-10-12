<script setup lang="ts">
/** 文章列表卡：分类徽标 + 标题 + 摘要 + 时长。列表页与相关推荐共用；页面不展示日期，date 字段只进 JSON-LD。 */
defineProps<{
  card: {
    url: string
    title: string
    /** 短摘要（config/knowledge.ts 的 summary，回落 desc） */
    summary: string
    catName: string
    catShort: string
    /** 仅用于 JSON-LD 的 datePublished，卡片不展示 */
    date: string
    minutes: number
  }
}>()
</script>

<template>
  <a class="cu-kcard" :href="card.url">
    <span class="cu-kcard__top">
      <span class="cu-kcard__badge">{{ card.catShort }}</span>
    </span>
    <span class="cu-kcard__title">{{ card.title }}</span>
    <span class="cu-kcard__desc">{{ card.summary }}</span>
    <span class="cu-kcard__meta">{{ card.catName }} · 约 {{ card.minutes }} 分钟</span>
  </a>
</template>
