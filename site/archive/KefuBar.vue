<script setup lang="ts">
/**
 * 教程页首的客服条：一行轻提示 + 两个动作（问在线助手 / 还没下单去购买）。
 *
 * 为什么不把二维码摊在正文第一屏：教程正文已经很密，再压一块带二维码的大卡片会抢走读正文的注意力，
 * 而「客服」本身就是一套问答流程，不是一张图能解决的。改成把在线助手作为主 CTA：
 * 点一下直接唤起右下角同一个面板（派发 cu:kefu-open，由 KefuWidget 监听），
 * 面板里既能问常见问题，说「人工」也会直接给出人工微信二维码和复制按钮，联系方式一步可达。
 *
 * 微信客服只在「急事」作为次要说明出现，不再是这块的主角。
 */
import { siteConfig, partnerUrl } from '../../../config/site'
import CopyChip from './CopyChip.vue'

const contact = siteConfig.contact
const purchaseUrl = partnerUrl('purchase')

/** 与 KefuWidget 里的 OPEN_EVENT 对应；未挂载时静默忽略，按钮退化为无操作 */
function askAssistant() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('cu:kefu-open'))
}
</script>

<template>
  <aside class="cu-kefubar">
    <p class="cu-kefubar__para">
      照着做还是卡住了，或者还没下单想先问一句？点在线助手，需要人工会把客服微信二维码发给你。
    </p>
    <div class="cu-kefubar__actions">
      <button class="cu-btn cu-btn--sm" type="button" data-cta="kefu_open_guide" @click="askAssistant">
        问在线助手
      </button>
      <span class="cu-kefubar__human">
        急事找客服微信
        <code v-if="contact.wechatId" class="cu-kefubar__wechat">{{ contact.wechatId }}</code>
        <CopyChip v-if="contact.wechatId" :text="contact.wechatId" label="复制" />
      </span>
      <a class="cu-kefubar__buy" :href="purchaseUrl" target="_blank" rel="noopener sponsored nofollow">还没下单？去购买 ↗</a>
    </div>
  </aside>
</template>
