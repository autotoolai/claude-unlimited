<script setup lang="ts">
/**
 * 样片播放器。
 *
 * 为什么不用 markdown 里写死的裸 <video src="/videos/x.mp4">：markdown 里的静态 src 会被
 * Vite 的资源解析当模块处理，mp4 解析不了就直接构建失败。所以地址必须走 Vue 绑定
 * （:src），模板表达式不会被 Vite 静态分析成资源模块，产物里能落成真实的 src 属性。
 *
 * 为什么同时保留 data-src：部分旧产物 / 降级渲染路径仍按 data-src 取；两者同值不冲突。
 *
 * poster 是给爬虫与首帧视觉用的（2026-10-13 新增）：产物里 <video> 没有 poster 时，
 * 搜索引擎与 AI 抓取器取不到视频缩略图，VideoObject 的 thumbnailUrl 也会指空。
 * 首帧图由 scripts/gen_video_poster.sh 从 mp4 第 1 秒抽出，放在 public/videos/poster/。
 */
const props = defineProps<{src: string; caption?: string}>()

/** /videos/v1.mp4 -> /videos/poster/v1.jpg（与 scripts/gen_video_poster.sh 的输出路径一致） */
const poster = props.src.replace(/^\/videos\//, '/videos/poster/').replace(/\.mp4$/, '.jpg')
</script>

<template>
  <figure class="video-shot">
    <video
      controls
      preload="metadata"
      playsinline
      :src="src"
      :data-src="src"
      :poster="poster"
      width="100%"
    ></video>
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
