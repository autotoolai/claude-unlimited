<script setup lang="ts">
/** 通用 CTA 横条，每页底部复用。购买按钮走 ExternalCta */
withDefaults(
  defineProps<{
    title?: string
    desc?: string
    label?: string
  }>(),
  {
    title: '准备好了就现在接入',
    desc: '订阅期内不按 token 计费，改一个 Base URL 加一个 Key 即可接入你现有的工具。不确定合不合适，先看无限额度怎么算。',
    label: '立即购买',
  },
)
</script>

<template>
  <aside class="cu-band">
    <h2>{{ title }}</h2>
    <p>{{ desc }}</p>
    <div class="cu-cta-row cu-cta-row--center">
      <ExternalCta :label="label" variant="solid" size="lg" cta="footer_band" />
      <a class="cu-btn cu-btn--ghost cu-btn--md" href="/pricing">看套餐</a>
    </div>
    <p class="cu-hint cu-hint--center">最终价格与库存以下单页为准</p>
  </aside>
</template>