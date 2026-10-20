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
 * poster 是给爬虫与首帧视觉用的：产物里 <video> 没有 poster 时，搜索引擎与 AI 抓取器取不到
 * 视频缩略图，VideoObject 的 thumbnailUrl 也会指空。首帧图由 scripts/gen_video_poster.sh
 * 从 mp4 第 1 秒抽出，放在 public/videos/poster/。
 *
 * versions：同一支片子的多个迭代版本。用来做「第一轮 / 第二轮 / 终版」的过程对照——
 * 只传 src 时不渲染切换控件，行为与从前完全一致。
 */
import {computed, ref} from 'vue'
import {posterUrl, videoUrl} from '../../../config/media_cdn'

interface Version {
  /** 版本标签，如「第一轮」 */
  label: string
  /** public/videos/ 下的文件名 */
  src: string
  /** 这个版本证明了什么，显示在 figcaption */
  note?: string
}

const props = defineProps<{src: string; caption?: string; versions?: Version[]}>()

const versions = computed<Version[]>(() =>
  props.versions && props.versions.length > 1 ? props.versions : [],
)
const current = ref(0)

const active = computed(() => versions.value[current.value] ?? {src: props.src, label: ''})
const source = computed(() => videoUrl(active.value.src))
const poster = computed(() => posterUrl(active.value.src))
const note = computed(() => active.value.note ?? props.caption)

const videoEl = ref<HTMLVideoElement | null>(null)
function pick(i: number) {
  current.value = i
  // 换源后回到开头，否则浏览器会按进度映射继续播
  requestAnimationFrame(() => {
    videoEl.value?.load()
  })
}
</script>

<template>
  <figure class="video-shot">
    <video
      ref="videoEl"
      controls
      preload="metadata"
      playsinline
      :src="source"
      :data-src="source"
      :poster="poster"
      width="100%"
    ></video>
    <div v-if="versions.length" class="video-versions">
      <button
        v-for="(v, i) in versions"
        :key="v.src"
        type="button"
        class="video-version"
        :class="{ 'video-version--on': i === current }"
        @click="pick(i)"
      >{{ v.label }}</button>
    </div>
    <figcaption v-if="note">{{ note }}</figcaption>
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
.video-versions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}
.video-version {
  font-family: var(--vp-font-family-base);
  font-size: 13px;
  line-height: 1;
  padding: 7px 14px;
  border-radius: 999px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
}
.video-version:hover {
  color: var(--vp-c-text-1);
  border-color: var(--vp-c-divider);
}
.video-version--on {
  color: var(--vp-c-bg);
  background: var(--vp-c-text-1);
  border-color: var(--vp-c-text-1);
}
.video-shot figcaption {
  margin-top: 10px;
  font-size: 13px;
  color: #8f8d85;
  line-height: 1.6;
}
</style>
