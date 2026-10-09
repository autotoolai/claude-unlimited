<script setup lang="ts">
/** 品牌标记：橙底方块 + 白色「无限」符号（∞ 化简成两个开口方块），与 favicon 同源 */
defineProps<{ size?: number }>()
</script>

<template>
  <svg :width="size || 36" :height="size || 36" viewBox="0 0 40 40" role="img" :aria-label="'Claude 无限卡'" class="cu-logo">
    <rect width="40" height="40" rx="9" fill="currentColor" />
    <g fill="none" stroke="#FFF6EC" stroke-width="3.2" stroke-linecap="round">
      <path d="M6.5 15.5h8.5a4 4 0 0 1 0 8H8.5" />
      <path d="M33.5 24.5H25a4 4 0 0 1 0-8h6.5" />
    </g>
  </svg>
</template>