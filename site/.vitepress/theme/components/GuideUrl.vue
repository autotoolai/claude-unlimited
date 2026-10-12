<script setup lang="ts">
/**
 * 教程里的网址行：明文网址（可点开）+ 一键复制 + 可选的打开按钮。
 * 买家要在另一个工具里手填 Base URL，隐藏在按钮后面没法抄，所以网址必须显示出来。
 * 复制走 utils/copy.ts（剪贴板 API → execCommand → prompt 三级兜底），只��客户端触发。
 */
import { computed } from 'vue'
import CopyChip from './CopyChip.vue'

const props = withDefaults(
  defineProps<{ url: string; label?: string; /** 域名后面的路径，如 /openai；纯域名时省略 */ path?: string }>(),
  { label: '', path: '' },
)

/** 复制与显示都去掉结尾斜杠，`https://a.cn/` 和 `https://a.cn` 是同一个地址 */
const clean = computed(() => props.url.replace(/\/+$/, ''))
const host = computed(() => clean.value.replace(/^https?:\/\//, ''))
const shown = computed(() => host.value + props.path)
</script>

<template>
  <div class="cu-urlrow">
    <a
      class="cu-urlrow__url"
      :href="clean"
      target="_blank"
      rel="noopener sponsored nofollow"
      :title="'打开 ' + clean"
      >{{ shown }}</a
    >
    <CopyChip :text="clean" label="复制网址" />
    <a v-if="label" class="cu-urlrow__open" :href="clean" target="_blank" rel="noopener sponsored nofollow"
      >{{ label }} ↗</a
    >
  </div>
</template>
