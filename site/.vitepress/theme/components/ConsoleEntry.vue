<script setup lang="ts">
/**
 * 顶栏「控制台」按钮：落到站内 /console 功能介绍页（SEO / GEO 主场）。
 * 真实后台外链只在 /console 页内主 CTA，组件内不硬编码 partners.console。
 */
const props = withDefaults(defineProps<{ label?: string; size?: 'sm' | 'md'; variant?: 'ghost' | 'solid' }>(), {
  label: '控制台',
  size: 'sm',
  variant: 'ghost',
})
</script>

<template>
  <a
    class="cu-btn"
    :class="['cu-btn--' + props.variant, 'cu-btn--' + props.size, 'cu-console-entry']"
    href="/console"
    data-cta="nav_console"
  >
    {{ props.label }}
  </a>
</template>
