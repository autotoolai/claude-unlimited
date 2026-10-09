<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'
import { resolveSiteImage } from '../assets'

const props = defineProps<{
  src: string
  alt?: string
  caption?: string
  priority?: boolean
}>()

const { theme } = useData()
const cdn = computed(() => String((theme.value as any).imgCdn || ''))
const url = computed(() => resolveSiteImage(props.src, cdn.value))
</script>

<template>
  <figure class="cu-figure">
    <img
      :src="url"
      :alt="alt || ''"
      :loading="priority ? 'eager' : 'lazy'"
      :fetchpriority="priority ? 'high' : undefined"
      decoding="async"
      width="960"
      height="540"
    />
    <figcaption v-if="caption">{{ caption }}</figcaption>
  </figure>
</template>