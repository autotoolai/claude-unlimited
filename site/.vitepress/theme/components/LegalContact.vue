<script setup lang="ts">
/**
 * 信任页共用联系区块：对齐 FAQ 的 cu-faq-contact，微信/QQ 可复制，后台可点。
 */
import { ref } from 'vue'
import { siteConfig } from '../../../config/site'
import { operator } from '../../../config/trust'
import { copyTextOrPrompt } from '../utils/copy'

const copiedKey = ref<'wechat' | 'qq' | ''>('')
async function copyContact(key: 'wechat' | 'qq', text: string) {
  if (!text) return
  const ok = await copyTextOrPrompt(text)
  copiedKey.value = ok ? key : ''
  if (ok) setTimeout(() => (copiedKey.value = ''), 2000)
}

const consoleHost = operator.consoleUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')
</script>

<template>
  <aside class="cu-faq-contact" aria-label="联系我们">
    <div class="cu-faq-contact__text">
      <strong>联系我们</strong>
      <p>
        微信 <code>{{ siteConfig.contact.wechatId }}</code>
        <template v-if="siteConfig.contact.qqGroup">
          ，或 QQ 群 <code>{{ siteConfig.contact.qqGroup }}</code>
        </template>
        。也可打开右下角在线助手 →「联系客服」。管理后台：
        <a :href="operator.consoleUrl" target="_blank" rel="noopener">{{ consoleHost }}</a>
      </p>
    </div>
    <div class="cu-faq-contact__acts">
      <button
        type="button"
        class="cu-btn cu-btn--ghost cu-btn--sm"
        data-cta="legal_copy_wechat"
        @click="copyContact('wechat', siteConfig.contact.wechatId)"
      >
        {{ copiedKey === 'wechat' ? '已复制' : '复制微信号' }}
      </button>
      <button
        v-if="siteConfig.contact.qqGroup"
        type="button"
        class="cu-btn cu-btn--ghost cu-btn--sm"
        data-cta="legal_copy_qq_group"
        @click="copyContact('qq', siteConfig.contact.qqGroup)"
      >
        {{ copiedKey === 'qq' ? '已复制' : '复制 QQ 群号' }}
      </button>
    </div>
  </aside>
</template>
