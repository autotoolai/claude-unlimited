---
layout: page
title: 无限额度
description: Claude 无限额度到底意味着什么。
---

<script setup>
var __cu = { n: 3 }
</script>

<template>
  <div>
    <PageShell slug="unlimited" title="无限额度" lead="一次 1 千 token 和 20 万 token 成本相同。">
      <h2 id="vs-usage">小节一</h2>
      <p>段落</p>
      <StepFlow :steps="__cu.n" />
    </PageShell>
  </div>
</template>
