<script setup lang="ts">
/**
 * 顶栏「控制台」外链按钮：独立 SPA，新标签页打开。
 * URL 从 config/site.ts 的 partners.console 取，组件内不硬编码。
 */
import { computed } from 'vue'
import { partnerUrl } from '../../../config/site'

const props = withDefaults(defineProps<{ label?: string; size?: 'sm' | 'md'; variant?: 'ghost' | 'solid' }>(), {
  label: '控制台',
  size: 'sm',
  variant: 'ghost',
})
const href = computed(() => partnerUrl('console'))
</script>

<template>
  <a
    v-if="href"
    class="cu-btn"
    :class="['cu-btn--' + props.variant, 'cu-btn--' + props.size, 'cu-console-entry']"
    :href="href"
    target="_blank"
    rel="noopener"
    data-cta="nav_console"
  >
    {{ label }} ↗
  </a>
</template>
