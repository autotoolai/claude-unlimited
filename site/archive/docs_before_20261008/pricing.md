---
layout: page
title: 套餐定价
description: Claude 无限卡套餐内容与价格：订阅期内不按 token 计费，支持 Opus / Sonnet / Haiku / Fable。包含与不包含、公平使用、退款规则一次说清。
---

<script setup>
var __cu = { n: 2 }
</script>

<template>
  <div>
    <PageShell slug="pricing" title="套餐定价" lead="订阅期内不按 token 计费。">
      <PricingCard :product="__cu.n" cta="pricing_main" />
      <h2 id="includes">小节一</h2>
      <p>段落</p>
    </PageShell>
  </div>
</template>
