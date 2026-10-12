<script setup lang="ts">
/**
 * 知识库列表页的图文卡：16:9 封面 + 分类标签 + 标题 + 摘要 + 时长。
 * 只给列表页网格用；页尾「相关阅读」继续用 KnowledgeCard.vue（窄卡，塞封面会太重）。
 * 无 cover 的条目（源页面本来就没有配图）自动退化成纯文字卡，body 顶到卡片顶部。
 */
defineProps<{
  card: {
    url: string
    title: string
    /** 短摘要（config/knowledge.ts 的 summary，回落 desc） */
    summary: string
    catName: string
    catShort: string
    minutes: number
    /** 封面图路径；空串表示无图 */
    cover?: string
  }
}>()
</script>

<template>
  <a class="cu-ktile" :href="card.url">
    <span v-if="card.cover" class="cu-ktile__media">
      <img :src="card.cover" :alt="card.title" width="1280" height="720" loading="lazy" decoding="async" />
    </span>
    <span class="cu-ktile__body">
      <span class="cu-ktile__cat">{{ card.catShort }}</span>
      <span class="cu-ktile__title">{{ card.title }}</span>
      <span class="cu-ktile__desc">{{ card.summary }}</span>
      <span class="cu-ktile__foot">{{ card.catName }} · 约 {{ card.minutes }} 分钟</span>
    </span>
  </a>
</template>