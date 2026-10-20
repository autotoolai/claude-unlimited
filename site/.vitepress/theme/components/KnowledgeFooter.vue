<script setup lang="ts">
/** 文章页尾：相关推荐（3 张卡）+ CTA + 声明。由 KnowledgeDoc 在正文之后渲染（与正文同宽的单列容器内）。日期与时长已在正文上方展示，这里不再重复。 */
import { computed } from 'vue'
import { useRoute } from 'vitepress'
import KnowledgeCard from './KnowledgeCard.vue'
import CtaBand from './CtaBand.vue'
import { siteConfig } from '../../../config/site'
import { knowledgeCards, knowledgeBySlug, knowledgeCategoryEntries } from '../pages/data'

const route = useRoute()
const slug = computed(() => route.path.replace(/^\/(knowledge|drafts)\/?/, '').replace(/^_draft-/, '').replace(/\/index\.html$/, '').replace(/\.html$/, '').replace(/\/$/, ''))
const article = computed(() => knowledgeBySlug(slug.value))
const card = computed(() => knowledgeCards.find((k) => k.slug === slug.value))

/** 相关推荐：related 里的 3 篇，没配就取同分类最新 3 篇（排除自己） */
const related = computed(() => {
  const rel = (article.value?.related ?? []).map((s) => knowledgeCards.find((k) => k.slug === s)).filter(Boolean) as typeof knowledgeCards
  if (rel.length) return rel.slice(0, 3)
  return knowledgeCategoryEntries(article.value?.cat as never).filter((k) => k.slug !== slug.value).slice(0, 3).map((k) => knowledgeCards.find((c) => c.slug === k.slug)!).filter(Boolean)
})

/**
 * 草稿页（41802 预览端口）的页尾：草稿不在 config/knowledge.ts 里，没有自己的 related，
 * 也没有卡片可跳（KnowledgeCard 的 href 指向 /knowledge/<slug>，那在预览端口能打开已发布文章）。
 * 草稿期不需要「相关阅读」——它还没发布，相关推荐得等 related 定稿。改成一条返回草稿列表的链接。
 */
const isDraft = computed(() => !card.value)
</script>

<template>
  <div class="cu-kfoot cu-kfoot--draft" v-if="isDraft">
    <p class="cu-kfoot__draftback"><a href="/drafts/">← 回到草稿列表</a>　草稿未发布，不显示相关阅读与购买入口。</p>
  </div>

  <div class="cu-kfoot" v-else-if="card">
    <nav v-if="related.length" class="cu-krelated" aria-label="相关阅读">
      <h2>相关阅读</h2>
      <div class="cu-cards cu-cards--three">
        <KnowledgeCard v-for="r in related" :key="r.slug" :card="r" />
      </div>
    </nav>

    <CtaBand title="还没买？先看套餐怎么算" />

  </div>
</template>
