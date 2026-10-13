<script setup lang="ts">
/** 教程插图：硬边框 + 图注编号（手册插图风格）。图片静态 import，构建后带 hash 进 /assets/。
 *  用不到的图已归档到 archive/guide_images_unused/；新增图要在下面的表里加一行，
 *  否则构建能过但产物里那张图 404（check_dist 会在换图后提醒）。 */
import site from '../assets/guide/guide_site.png'
import ccswitchSite from '../assets/guide/guide_ccswitch_site.png'
import onekeyImport from '../assets/guide/guide_onekey_import.png'
import getModels from '../assets/guide/guide_get_models.png'
import modelList from '../assets/guide/guide_model_list.png'
import saveModels from '../assets/guide/guide_save_models.png'
import enableTest from '../assets/guide/guide_enable_test.png'
import vscodePlugin from '../assets/guide/guide_vscode_plugin.png'
import vscodeSite from '../assets/guide/guide_vscode_site.png'

defineProps<{
  /** 图片文件名，对应 theme/assets/guide/<file>（见下方表；config/guide.ts 里写文件名） */
  src: string
  label?: string
  caption?: string
}>()

/** 文件名 -> 静态导入 */
const images: Record<string, string> = {
  'guide_site.png': site,
  'guide_ccswitch_site.png': ccswitchSite,
  'guide_onekey_import.png': onekeyImport,
  'guide_get_models.png': getModels,
  'guide_model_list.png': modelList,
  'guide_save_models.png': saveModels,
  'guide_enable_test.png': enableTest,
  'guide_vscode_plugin.png': vscodePlugin,
  'guide_vscode_site.png': vscodeSite,
}

function url(src: string): string {
  return images[src] ?? src
}
</script>

<template>
  <figure class="cu-shot">
    <img :src="url(src)" :alt="caption || label || '教程截图'" loading="lazy" decoding="async" />
    <figcaption v-if="label || caption">
      <b v-if="label" class="cu-shot__label">{{ label }}</b>
      <span>{{ caption }}</span>
    </figcaption>
  </figure>
</template>
