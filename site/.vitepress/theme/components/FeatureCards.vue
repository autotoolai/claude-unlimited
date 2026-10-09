<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'
import { resolveSiteImage } from '../assets'

const props = defineProps<{
  items: { title: string; desc: string; icon?: string }[]
}>()

const { theme } = useData()
const cdn = computed(() => String((theme.value as any).imgCdn || ''))
const resolved = computed(() =>
  props.items.map((item) => ({
    ...item,
    iconUrl: item.icon ? resolveSiteImage(item.icon, cdn.value) : '',
  })),
)
</script>

<template>
  <div class="cu-cards">
    <article v-for="(item, i) in resolved" :key="i" class="cu-card">
      <img
        v-if="item.iconUrl"
        class="cu-card__icon"
        :src="item.iconUrl"
        width="40"
        height="40"
        alt=""
        loading="lazy"
      />
      <h3><span class="cu-card__no">{{ i + 1 }}</span>{{ item.title }}</h3>
      <p>{{ item.desc }}</p>
    </article>
  </div>
</template>