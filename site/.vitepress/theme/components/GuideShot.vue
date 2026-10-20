<script setup lang="ts">
/**
 * 教程插图：硬边框 + 图注编号（手册插图风格）。图片静态 import，构建后带 hash 进 /assets/。
 *  用不到的图已归档到 archive/guide_images_unused/；新增图要在下面的表里加一行，
 *  否则构建能过但产物里那张图 404（check_dist 会在换图后提醒）。
 *
 *  zoom：密集界面图（表单、面板）在 544px 宽的版心里看不清，
 *  这些图渲染成可点的链接，点开在浏览器里看原图（站内没有灯箱组件，不为一个图注去造一个）。
 */
import site from '../assets/guide/guide_site.png'
import ccswitchSite from '../assets/guide/guide_ccswitch_site.png'
import onekeyImport from '../assets/guide/guide_onekey_import.png'
import getModels from '../assets/guide/guide_get_models.png'
import modelList from '../assets/guide/guide_model_list.png'
import saveModels from '../assets/guide/guide_save_models.png'
import enableTest from '../assets/guide/guide_enable_test.png'
import vscodePlugin from '../assets/guide/guide_vscode_plugin.png'
import vscodeSite from '../assets/guide/guide_vscode_site.png'

// 新增的 24 张（截图取自卖家腾讯文档，缩到 1200px 宽的 WebP）
import ccswitchProviderRoute from '../assets/guide/guide_ccswitch_provider_route.webp'
import ccswitchRouteSettings from '../assets/guide/guide_ccswitch_route_settings.webp'
import codexCatalog from '../assets/guide/guide_codex_catalog.webp'
import codexInUse from '../assets/guide/guide_codex_in_use.webp'
import codexLinkOk from '../assets/guide/guide_codex_link_ok.webp'
import codexModelMapping from '../assets/guide/guide_codex_model_mapping.webp'
import codexModelPicker from '../assets/guide/guide_codex_model_picker.webp'
import codexProviderForm from '../assets/guide/guide_codex_provider_form.webp'
import codexProviderList from '../assets/guide/guide_codex_provider_list.webp'
import codexProviderNeedRoute from '../assets/guide/guide_codex_provider_need_route.webp'
import codexProviderType from '../assets/guide/guide_codex_provider_type.webp'
import codexUpstreamFormat from '../assets/guide/guide_codex_upstream_format.webp'
import desktopCowork from '../assets/guide/guide_desktop_cowork.webp'
import desktopDownload from '../assets/guide/guide_desktop_download.webp'
import desktopLinkOk from '../assets/guide/guide_desktop_link_ok.webp'
import desktopProviderForm from '../assets/guide/guide_desktop_provider_form.webp'
import desktopProviderPicker from '../assets/guide/guide_desktop_provider_picker.webp'
import desktopProviderPreset from '../assets/guide/guide_desktop_provider_preset.webp'
import desktopVmError from '../assets/guide/guide_desktop_vm_error.webp'
import desktopVmFeatures from '../assets/guide/guide_desktop_vm_features.webp'
import desktopVmSearch from '../assets/guide/guide_desktop_vm_search.webp'
import workbuddyAddModel from '../assets/guide/guide_workbuddy_add_model.webp'
import workbuddyInUse from '../assets/guide/guide_workbuddy_in_use.webp'
import workbuddyModelPicker from '../assets/guide/guide_workbuddy_model_picker.webp'

defineProps<{
  /** 图片文件名，对应 theme/assets/guide/<file>（见下方表；config/guide.ts 里写文件名） */
  src: string
  label?: string
  caption?: string
  /** 密集界面图：渲染成可点开的链接，点开看原图 */
  zoom?: boolean
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
  'guide_ccswitch_provider_route.webp': ccswitchProviderRoute,
  'guide_ccswitch_route_settings.webp': ccswitchRouteSettings,
  'guide_codex_catalog.webp': codexCatalog,
  'guide_codex_in_use.webp': codexInUse,
  'guide_codex_link_ok.webp': codexLinkOk,
  'guide_codex_model_mapping.webp': codexModelMapping,
  'guide_codex_model_picker.webp': codexModelPicker,
  'guide_codex_provider_form.webp': codexProviderForm,
  'guide_codex_provider_list.webp': codexProviderList,
  'guide_codex_provider_need_route.webp': codexProviderNeedRoute,
  'guide_codex_provider_type.webp': codexProviderType,
  'guide_codex_upstream_format.webp': codexUpstreamFormat,
  'guide_desktop_cowork.webp': desktopCowork,
  'guide_desktop_download.webp': desktopDownload,
  'guide_desktop_link_ok.webp': desktopLinkOk,
  'guide_desktop_provider_form.webp': desktopProviderForm,
  'guide_desktop_provider_picker.webp': desktopProviderPicker,
  'guide_desktop_provider_preset.webp': desktopProviderPreset,
  'guide_desktop_vm_error.webp': desktopVmError,
  'guide_desktop_vm_features.webp': desktopVmFeatures,
  'guide_desktop_vm_search.webp': desktopVmSearch,
  'guide_workbuddy_add_model.webp': workbuddyAddModel,
  'guide_workbuddy_in_use.webp': workbuddyInUse,
  'guide_workbuddy_model_picker.webp': workbuddyModelPicker,
}

function url(src: string): string {
  return images[src] ?? src
}
</script>

<template>
  <figure class="cu-shot">
    <a v-if="zoom" :href="url(src)" target="_blank" rel="noopener">
      <img :src="url(src)" :alt="caption || label || '教程截图'" loading="lazy" decoding="async" />
    </a>
    <img v-else :src="url(src)" :alt="caption || label || '教程截图'" loading="lazy" decoding="async" />
    <figcaption v-if="label || caption">
      <b v-if="label" class="cu-shot__label">{{ label }}</b>
      <span>{{ caption }}</span>
    </figcaption>
  </figure>
</template>
