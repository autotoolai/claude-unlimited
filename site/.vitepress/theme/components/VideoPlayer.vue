<script setup lang="ts">
/**
 * 样片播放器。
 * 为什么不用裸 <video src>：markdown 里的 src 会被构建器当资源模块解析，mp4 解析不了就直接构建失败；
 * 用组件把地址放进 data 属性再交给浏览器，既不过构建管线，SSR 侧也没有 document 依赖。
 */
defineProps<{src: string; caption?: string}>()
</script>

<template>
  <figure class="video-shot">
    <video controls preload="metadata" playsinline :data-src="src" width="100%"></video>
    <figcaption v-if="caption">{{ caption }}</figcaption>
  </figure>
</template>

<style scoped>
.video-shot {
  margin: 20px 0 28px;
}
.video-shot video {
  display: block;
  max-width: 960px;
  width: 100%;
  border-radius: 12px;
  background: #f3f1ea;
}
.video-shot figcaption {
  margin-top: 10px;
  font-size: 13px;
  color: #8f8d85;
  line-height: 1.6;
}
</style>
