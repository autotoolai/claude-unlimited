<script setup lang="ts">
/**
 * 教程里的网址行：明文网址（可点开）+ 一键复制 + 可选的打开按钮。
 * 买家要在另一个工具里手填 Base URL，隐藏在按钮后面没法抄，所以网址必须显示出来。
 * 复制走 utils/copy.ts（剪贴板 API → execCommand → prompt 三级兜底），只在客户端触发。
 *
 * copy=false：只显示明文网址与打开链接，不给复制按钮。用于「点开型」地址
 * （官网、管理后台）——小白去那儿是点按钮操作，复制网址对他没有用；
 * 复制只留给高手轨手填 Base URL 的场景（见 config/guide.ts 的 link.copy）。
 * data-cta="copy_url" 是转化埋点标记，后台功能说明页的备用域名复制按钮也用它，
 * 不要把这里的复制从整个站里删掉（scripts/check_analytics.mjs 会断言全站至少一处）。
 */
import { computed } from 'vue'
import CopyChip from './CopyChip.vue'

const props = withDefaults(
  defineProps<{ url: string; label?: string; /** 域名后面的路径，如 /openai；纯域名时省略 */ path?: string; /** 是否显示复制按钮，默认 true；点开型地址传 false */ copy?: boolean }>(),
  { label: '', path: '', copy: true },
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
    <CopyChip v-if="copy" :text="clean" label="复制网址" cta="copy_url" />
    <a v-if="label" class="cu-urlrow__open" :href="clean" target="_blank" rel="noopener sponsored nofollow"
      >{{ label }} ↗</a
    >
  </div>
</template>
