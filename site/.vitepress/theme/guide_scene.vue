<script setup lang="ts">
/**
 * 路由壳：教程场景页（/guide/cc、/guide/desktop…），正文由 GuideScenePage.vue 渲染。
 * 场景 id 从 frontmatter 读（构建期常量，SSR 与客户端取值一致）。
 */
import GuideScenePage from './components/GuideScenePage.vue'
</script>

<template>
  <GuideScenePage />
</template>
