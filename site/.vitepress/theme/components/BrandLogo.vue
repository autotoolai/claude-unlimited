<script setup lang="ts">
/**
 * 品牌标记：品牌橙底方块 + 米白「无限」符号（∞ 化简成两个开口方块）。
 *
 * 本文件由 `tsx scripts/gen_logo.ts` 生成，请勿手改。
 * 几何与配色来自 config/logo.ts，与标签页 favicon 完全同源，
 * 且不跟随深浅色模式变化 —— 深色模式下 currentColor 会让底色接近纸色而看不见。
 */
defineProps<{ size?: number }>()
</script>

<template>
  <svg
    :width="size || 36"
    :height="size || 36"
    viewBox="0 0 40 40"
    role="img"
    aria-label="Claude 无限卡"
    class="cu-logo"
  >
    <rect width="40" height="40" rx="9" fill="#C85A1E" />
    <g fill="none" stroke="#FFF6EC" stroke-width="3.2" stroke-linecap="round">
    <path d="M6.5 15.5h8.5a4 4 0 0 1 0 8H8.5" />
    <path d="M33.5 24.5H25a4 4 0 0 1 0-8h6.5" />
    </g>
  </svg>
</template>
