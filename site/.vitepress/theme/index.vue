<script setup lang="ts">
/**
 * 首页（落地页）：首屏讲清价值，下方摊开决策材料——档位价 + 买前 FAQ。
 * 2026-10-11 曾瘦到只剩首屏；2026-11-05 起恢复「套餐摘要 + 买之前 FAQ」，
 * 正文仍不搬家：PlanGrid / FaqList 复用定价页与 FAQ 页同一数据源，脚注链回主场页。
 * 小节顺序与 components/sections.ts 的 SECTION_NAV.index 一一对应（check_dist.mjs 会逐页断言）。
 */
import PageShell from './components/PageShell.vue'
import JsonLd from './components/JsonLd.vue'
import HomeHero from './components/HomeHero.vue'
import PlanGrid from './components/PlanGrid.vue'
import FaqList from './components/FaqList.vue'
import CtaBand from './components/CtaBand.vue'
import {
  featuredFaqItems,
  jsonLdHome,
} from './pages/data'
</script>

<template>
  <JsonLd id="cu-jsonld-home" :json="jsonLdHome" />

  <PageShell slug="index">
    <HomeHero />

    <h2 id="plans">套餐与价格</h2>
    <p>
      有效期内不限次数调用 Fable 5.2 与 Opus 5.5，不按 token 计费；差别主要在时长与同时可开几个会话窗口。
      边界与退款细则见<a href="/pricing">套餐定价</a>。
    </p>
    <PlanGrid group-id="unlimited" :show-group-head="false" />

    <h2 id="faq">买之前先确认</h2>
    <p>
      下单前最常问的几条；完整分类与更多细节见<a href="/faq">常见问题</a>。
    </p>
    <FaqList :items="featuredFaqItems" />

    <CtaBand />

  </PageShell>
</template>
