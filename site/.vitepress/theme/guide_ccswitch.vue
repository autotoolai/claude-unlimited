<script setup lang="ts">
/** 路由壳：教程页正文由 GuidePage.vue 按 config/guide.ts 的 slug 渲染（组件在 theme/index.ts 里注册）。 */
import PageShell from './components/PageShell.vue'
import GuidePage from './components/GuidePage.vue'
</script>

<template>
  <GuidePage slug="/guide/ccswitch" />
</template>
