<script setup lang="ts">
/**
 * 首页（落地页）。只保留首屏 + 购买出口，不承载正文小节：
 * 2026-10-11 从 6 块瘦身到 4 块：删掉「数据条」「为什么选无限额度 + 卖点卡 + 成本对比图」
 * 「多少钱 + 档位网格」三段（定价页与首屏按钮已覆盖），首页只留信任边界与去处。
 * 2026-10-11 再删「从买到用起来四步」「买之前可以先确认」「继续了解」三块，最终只剩首屏：
 * 购买路径见 /guide，退款与限速见 /pricing#faq，知识库与 FAQ 各自有页面。
 * 小节顺序与 components/sections.ts 的 SECTION_NAV.index 一一对应（check_dist.mjs 会逐页断言）。
 */
import PageShell from './components/PageShell.vue'
import JsonLd from './components/JsonLd.vue'
import HomeHero from './components/HomeHero.vue'
import CtaBand from './components/CtaBand.vue'
import {
  jsonLdHome,
  siteConfig,
} from './pages/data'
</script>

<template>
  <JsonLd id="cu-jsonld-home" :json="jsonLdHome" />

  <PageShell slug="index">
    <HomeHero />

    <CtaBand />

  </PageShell>
</template>
