<script setup lang="ts">
/** 教程用终端块：标题栏 + 命令/说明，等宽字体，可横向滚动。 */
defineProps<{ title?: string; lines: string[] }>()
</script>

<template>
  <div class="cu-term">
    <div class="cu-term__bar"><i /><i /><i /><span>{{ title || 'Terminal' }}</span></div>
    <pre><code>{{ lines.join('\n') }}</code></pre>
  </div>
</template>