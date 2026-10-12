<script setup lang="ts">
/**
 * 通用 CTA 横条，每页底部复用。2026-10-12 起主按钮一律站内跳 /pricing：
 * 发卡站外链只在 /pricing 的套餐卡「立即订阅」上出现，避免用户在任意页面直接被带离官网。
 * 主按钮由 label 控制，默认「查看套餐与价格」；传空字符串则只渲染次级按钮。
 * desc 不传时用默认的计费规则说明。
 * 默认插槽放次级按钮（如教程页的「CC Switch 下载」「管理后台」），不传则不渲染。
 */
withDefaults(
  defineProps<{
    title?: string
    desc?: string
    label?: string
  }>(),
  {
    title: '准备好了就现在接入',
    desc: '',
    label: '查看套餐与价格',
  },
)
</script>

<template>
  <aside class="cu-band">
    <h2>{{ title }}</h2>
    <p v-if="!desc">有效期内不限次数调用 Claude，不按 token 计费。</p>
    <p v-else>{{ desc }}</p>
    <div class="cu-cta-row cu-cta-row--center">
      <a v-if="label" class="cu-btn cu-btn--solid cu-btn--lg" href="/pricing" data-cta="footer_band_to_pricing">{{ label }}</a>
      <slot name="tools" />
    </div>
  </aside>
</template>
