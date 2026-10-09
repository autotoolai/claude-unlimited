<script setup lang="ts">
/** 教程插图：硬边框 + 图注编号（手册插图风格）。图片静态 import，构建后带 hash 进 /assets/。 */
import getApikey from '../assets/guide/guide_get_apikey.jpg'
import importCcswitch from '../assets/guide/guide_import_ccswitch.jpg'
import ccswitchOpen from '../assets/guide/guide_ccswitch_open.jpg'
import ccswitchModels from '../assets/guide/guide_ccswitch_models.jpg'
import ccswitchSelect from '../assets/guide/guide_ccswitch_select.jpg'
import ccswitchEnable from '../assets/guide/guide_ccswitch_enable.jpg'
import vscodePlugin from '../assets/guide/guide_vscode_plugin.jpg'
import modelFable from '../assets/guide/guide_model_fable.jpg'

defineProps<{
  /** 图片文件名，对应 theme/assets/guide/<file>（见下方表；config/guide.ts 里写文件名） */
  src: string
  label?: string
  caption?: string
}>()

/** 文件名 -> 静态导入 */
const images: Record<string, string> = {
  'guide_get_apikey.jpg': getApikey,
  'guide_import_ccswitch.jpg': importCcswitch,
  'guide_ccswitch_open.jpg': ccswitchOpen,
  'guide_ccswitch_models.jpg': ccswitchModels,
  'guide_ccswitch_select.jpg': ccswitchSelect,
  'guide_ccswitch_enable.jpg': ccswitchEnable,
  'guide_vscode_plugin.jpg': vscodePlugin,
  'guide_model_fable.jpg': modelFable,
}

function url(src: string): string {
  return images[src] ?? src
}
</script>

<template>
  <figure class="cu-shot">
    <img :src="url(src)" :alt="caption || label || '教程截图'" loading="lazy" decoding="async" />
    <figcaption v-if="label || caption">
      <b v-if="label">{{ label }}</b>
      <span>{{ caption }}</span>
    </figcaption>
  </figure>
</template>