---
layout: page
title: 常见问题
description: Claude 无限卡全量常见问题。
---

<script setup>
var __cu = { n: 4 }
</script>

<template>
  <div>
    <PageShell slug="faq" title="常见问题" lead="找不到答案可以直接点右下角在线助手。">
      <h2 id="cat-product">小节一</h2>
      <FaqList :items="__cu.n" />
      <div class="cu-notice">{{ __cu.n }}</div>
    </PageShell>
  </div>
</template>
