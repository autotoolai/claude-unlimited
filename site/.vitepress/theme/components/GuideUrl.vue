<script setup lang="ts">
/**
 * 教程里的网址行：一块整块可点的外链卡（左键 / 触摸 / 键盘都能打开），不再提供复制按钮。
 * 复制只对高手轨手填 Base URL 有意义，而整卡可点、网址明文常驻，本身就能拖选选中，
 * 再挂一个复制胶囊只是把这一块撑成三个控件。点击走 utils/open.ts（代理 UA 用 noopener 直开，
 * 其余环境先尝试 App 客户端，再退回新标签页），埋点仍记 copy_url，便于与后台功能说明页共用同一指标。
 */
import { computed } from 'vue'
import { openExternal } from '../utils/open'

const props = withDefaults(
  defineProps<{ url: string; label?: string; /** 域名后面的路径，如 /openai；纯域名时省略 */ path?: string }>(),
  { label: '', path: '' },
)

/** 复制与显示都去掉结尾斜杠，`https://a.cn/` 和 `https://a.cn` 是同一个地址 */
const clean = computed(() => props.url.replace(/\/+$/, ''))
const host = computed(() => clean.value.replace(/^https?:\/\//, ''))
const shown = computed(() => host.value + props.path)

function onClick(ev: MouseEvent) {
  // 允许用户按住拖选明文网址或用中键 / cmd+点在新标签打开，别劫持这些原生行为
  if (ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return
  ev.preventDefault()
  openExternal(clean.value, 'copy_url')
}
</script>

<template>
  <a
    class="cu-linkbox"
    :href="clean"
    target="_blank"
    rel="noopener sponsored nofollow"
    data-cta="copy_url"
    @click="onClick"
  >
    <span class="cu-linkbox__mark" aria-hidden="true">↗</span>
    <span class="cu-linkbox__text">
      <span v-if="label" class="cu-linkbox__label">{{ label }}</span>
      <span class="cu-linkbox__url">{{ shown }}</span>
    </span>
  </a>
</template>
