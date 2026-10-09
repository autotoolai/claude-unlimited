<script setup lang="ts">
/** 商品卡 CTA（购买外链全站唯一出口）。变体：primary 橙底、solid 墨底、ghost 描边；large 加大到 56px */
import { computed } from 'vue'
import { shopUrl, featuredProduct } from '../../../config/site'

const props = withDefaults(
  defineProps<{
    label?: string
    variant?: 'primary' | 'solid' | 'ghost'
    size?: 'md' | 'lg'
    /** 埋点名，交给 Cloudflare Web Analytics 统计 */
    cta?: string
  }>(),
  { label: '立即购买', variant: 'primary', size: 'md', cta: 'unknown' },
)

const href = computed(() => shopUrl())
const price = computed(() => featuredProduct().price + ' / 30 天')
</script>

<template>
  <a
    class="cu-btn"
    :class="['cu-btn--' + props.variant, props.size === 'lg' ? 'cu-btn--lg' : 'cu-btn--md']"
    :href="href"
    target="_blank"
    rel="noopener sponsored nofollow"
    :data-cta="props.cta"
  >
    <span>{{ props.label }}</span>
    <small v-if="variant !== 'ghost'" class="cu-btn__price">{{ price }}</small>
  </a>
</template>