<script setup lang="ts">
/**
 * 首页。页面外壳（PageShell）提供品牌页头、主导航、右侧页内目录、页脚与两个客服浮标；这里只放正文。
 * H1 在 HomeHero 里（品牌标语），所以不给 PageShell 传 title，避免页面出现两个 H1。
 * 小节顺序与 components/sections.ts 的 SECTION_NAV.index 一一对应（check_dist.mjs 会逐页断言）。
 */
import PageShell from './components/PageShell.vue'
import JsonLd from './components/JsonLd.vue'
import HomeHero from './components/HomeHero.vue'
import StatBar from './components/StatBar.vue'
import FeatureCards from './components/FeatureCards.vue'
import StepFlow from './components/StepFlow.vue'
import PricingCard from './components/PricingCard.vue'
import CompareTable from './components/CompareTable.vue'
import CtaBand from './components/CtaBand.vue'
import FaqList from './components/FaqList.vue'
import {
  TOKEN_COST_ART,
  compareColumns,
  compareRows,
  featureItems,
  flowSteps,
  guideNavItems,
  homeFaq,
  homeStats,
  jsonLdHome,
  partnerCards,
  product,
  siteConfig,
} from './pages/data'
</script>

<template>
  <JsonLd id="cu-jsonld-home" :json="jsonLdHome" />

  <PageShell slug="index">
    <HomeHero />
    <StatBar :metrics="homeStats" />

    <h2 id="why-unlimited">为什么选无限额度，而不是按量计费</h2>
    <p>
      按量计费时，成本随使用量快速波动：长上下文、代码库分析、agent 多步执行，一天下来账单很难预测。
      无限额度把这笔账变成一份固定订阅费——你可以按真实工作需要用 Claude，而不是因为担心费用而缩短上下文、手动裁剪代码。
    </p>

    <FeatureCards :items="featureItems" />

    <figure class="cu-figure cu-figure--wide">
      <div class="cu-figs cu-figs--inline" v-html="TOKEN_COST_ART" />
      <figcaption>同一天的两次调用，按量计费相差 200 倍；订阅期内它们的成本都是同一份订阅费。</figcaption>
    </figure>

    <h2 id="get-started">开始之前</h2>
    <p>买完之后只需要准备两样东西：<strong>买到的卡密</strong>，和 <a href="/guide">五步教程</a>里说的 <strong>CC Switch</strong>（一个不到 10 MB 的配置管理小工具）。兑换完卡密会给你两行信息——网关地址和 API Key，填进工具就能用。</p>
    <p>如果你已经知道手里的 Base URL 和 API Key，可以直接从教程第 3 步「配置 Base URL 和 Key」开始。</p>

    <h2 id="workflow">从买到用起来，只要四步</h2>
    <p>没有复杂的注册流程。付款后拿到卡密，配置两个信息，就能在终端里跑起第一个请求。完整图文步骤见<a href="/guide">使用教程</a>。</p>

    <StepFlow :steps="flowSteps" />

    <h2 id="pricing">套餐</h2>
    <p>当前只有一种套餐：订阅期内 Claude 不限量用，不按 token 额外计费。</p>

    <PricingCard :product="product" note="本站不处理支付，下单在发卡站完成" cta="pricing_card_home" />

    <h2 id="compare">和按量计费、官方订阅有什么区别</h2>
    <div class="cu-compare">
      <p>无限额度把账变成一份固定订阅费，重度使用也不叠加；按量计费随用量线性涨价；官方订阅只能在官方产品里用。</p>
      <p>详细对比见「套餐定价」页。</p>
    </div>

    <CompareTable :columns="compareColumns" :rows="compareRows" caption="详细对比见「套餐定价」页" />

    <h2 id="partners">买、换、配在哪一步</h2>
    <p>链路上的三个平台，分别对应第 1 步、第 2 步和配置工具的下载；点卡片上的按钮直接跳转。</p>

    <div class="cu-cards cu-cards--three">
      <div v-for="p in partnerCards" :key="p.id" class="cu-card">
        <h3>{{ p.name }}</h3>
        <p>{{ p.desc }}</p>
        <a
          v-if="p.ready && p.url"
          class="cu-btn cu-btn--ghost cu-btn--sm"
          :href="p.url"
          target="_blank"
          rel="noopener sponsored nofollow"
          :data-cta="'partner_' + p.id"
          >{{ p.cta }} ↗</a
        >
        <span v-else class="cu-hint">{{ p.pending || '地址待配置' }}</span>
      </div>
    </div>

    <h2 id="guide">使用教程</h2>
    <p>买完之后按「五步总览」走一遍，分钟级就能在终端、VS Code、Cursor 里用上。每一页都有截图。</p>

    <div class="cu-cards cu-cards--two">
      <a v-for="g in guideNavItems" :key="g.url" class="cu-card cu-card--link" :href="g.url">
        <span class="cu-card__no">{{ g.nav }}</span>
        <p>{{ g.desc }}</p>
      </a>
    </div>

    <h2 id="faq">常见问题</h2>
    <p class="cu-more">更多问题见<a href="/faq">常见问题</a>页，或点右下角在线助手直接问；答不上来点「人工客服」复制微信号联系我们。</p>

    <FaqList :items="homeFaq" :default-open="2" />

    <CtaBand />

    <div class="cu-notice">{{ siteConfig.disclaimer }}</div>
  </PageShell>
</template>
