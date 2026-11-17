<script setup lang="ts">
/**
 * 信任页共用联系区块：只链到 /contact 主场，不复制微信号与二维码正文。
 */
import { operator } from '../../../config/trust'

const consoleHost = operator.consoleUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')
</script>

<template>
  <aside class="cu-faq-contact" aria-label="联系我们">
    <div class="cu-faq-contact__text">
      <strong>联系我们</strong>
      <p>
        微信、QQ 群与二维码见<a href="/contact">联系我们</a>页；添加时请备注来意。也可打开右下角在线助手 →「联系客服」。管理后台：
        <a :href="operator.consoleUrl" target="_blank" rel="noopener">{{ consoleHost }}</a>
      </p>
    </div>
    <div class="cu-faq-contact__acts">
      <a class="cu-btn cu-btn--ghost cu-btn--sm" href="/contact" data-cta="legal_to_contact">去联系我们</a>
    </div>
  </aside>
</template>
