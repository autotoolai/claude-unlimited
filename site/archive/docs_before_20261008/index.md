---
layout: page
title: 首页
description: Claude 无限卡：固定订阅价，订阅期内 Claude API 不按 token 计费。支持 Claude Code、Cursor、Cline 等全部主流工具，改一个 Base URL 加一个 Key 即可接入。
---

<script setup>
var __cu = { n: 1 }
</script>

<template>
  <div>
    <PageShell slug="index">
      <h2 id="why-unlimited">小节一</h2>
      <p>段落</p>
      <StatBar :metrics="__cu.n" />
      <CtaBand />
    </PageShell>
  </div>
</template>
