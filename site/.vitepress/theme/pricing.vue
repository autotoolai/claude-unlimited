<script setup lang="ts">
/** 套餐定价页：包含什么 / 不包含什么 / 公平使用具体数字 / 退款规则 / 关于价格 / 购买与限速 FAQ。 */
import PageShell from './components/PageShell.vue'
import JsonLd from './components/JsonLd.vue'
import PricingCard from './components/PricingCard.vue'
import CtaBand from './components/CtaBand.vue'
import FaqList from './components/FaqList.vue'
import { faqByCategory } from '../../config/faq'
import { jsonLdPricing, product, siteConfig } from './pages/data'

const purchaseFaq = faqByCategory('purchase')
const limitsFaq = faqByCategory('limits')
</script>

<template>
  <JsonLd id="cu-jsonld-pricing" :json="jsonLdPricing" />

  <PageShell
    slug="pricing"
    title="套餐定价"
    lead="Claude 无限卡只有一种套餐：订阅期内不按 token 计费，Opus / Sonnet / Haiku / Fable 都在同一订阅价内。"
  >
    <PricingCard :product="product" note="最终价格与库存以下单页为准" cta="pricing_main" />

    <h2 id="includes">包含什么</h2>
    <ul>
      <li>订阅期内全部 Claude 模型调用，不按 token 单独计费；</li>
      <li>Claude Code、Cursor、Cline、Roo Code、Aider、Continue、Zed、JetBrains、VS Code，以及官方 Python / TypeScript / Go SDK；</li>
      <li>Anthropic API 的主要能力：流式响应、工具调用、扩展思考、视觉输入、PDF 处理、200k 长上下文；</li>
      <li>Anthropic 兼容端点 + OpenAI 兼容端点（/v1/chat/completions）；</li>
      <li>Anthropic 发布新模型后自动提供新 model identifier，Key 不需要重新购买。</li>
    </ul>

    <h2 id="excludes">不包含什么</h2>
    <p>写清楚边界比包装更重要，以下情况不在套餐范围内：</p>
    <div class="cu-table-wrap">
      <table class="cu-table cu-table--plain">
        <thead>
          <tr><th scope="col">情况</th><th scope="col">说明</th></tr>
        </thead>
        <tbody>
          <tr><th scope="row">生产环境流量</th><td>套餐面向个人开发。上线服务、多用户共享、对外 API 属于生产流量，不在范围内</td></tr>
          <tr><th scope="row">超并发压测</th><td>超过公平使用速率限制（默认 20 并发、60 次/分钟）的压测、扫描、批量抓取</td></tr>
          <tr><th scope="row">二次转卖</th><td>转卖、二次分发 Key，或将 Key 共享给多个用户</td></tr>
          <tr><th scope="row">Anthropic 官方服务</th><td>本卡不提供 claude.ai 网页版、Claude Desktop 等官方产品的订阅权益</td></tr>
        </tbody>
      </table>
    </div>

    <h2 id="fair-use">公平使用：具体数字</h2>
    <p>限速与并发限制是为了保证所有用户稳定访问，不是隐藏的收费阈值。默认值：</p>
    <div class="cu-table-wrap">
      <table class="cu-table cu-table--plain">
        <thead>
          <tr><th scope="col">指标</th><th scope="col">默认值</th><th scope="col">说明</th></tr>
        </thead>
        <tbody>
          <tr><th scope="row">单 Key 并发</th><td>20 路</td><td>可按需申请提升</td></tr>
          <tr><th scope="row">请求速率</th><td>60 次/分钟</td><td>429 时会返回 Retry-After</td></tr>
          <tr><th scope="row">Token 吞吐</th><td>300k token/分钟</td><td>按所有请求合计计算</td></tr>
        </tbody>
      </table>
    </div>
    <p>这些数值对编码、调试、代码审查、文档生成、agent 多步执行等正常个人开发场景通常不构成障碍。触发限速后会等待自动恢复，不额外扣费。数字调整时会公告，完整条款见<a href="/faq#cat-limits">常见问题</a>页的「限速与封号」分类。</p>

    <h2 id="refund">退款规则</h2>
    <p>可以退，但仅限以下情形，需在购买后 <strong>7 个自然日内</strong>提出并提供订单号与卡密尾号：</p>
    <ol>
      <li>卡密未激活、无法兑换；</li>
      <li>兑换后因网关故障导致服务连续不可用超过 24 小时；</li>
      <li>实际提供的模型或能力与本页描述明显不符。</li>
    </ol>
    <p>已激活并正常使用的卡密、以及买多买少这类个人使用习惯，不支持无理由退款。审核结果 3 个工作日内通过你留下的联系方式反馈。</p>

    <h2 id="about-price">关于价格</h2>
    <ul>
      <li>本站不处理支付，下单在第三方发卡站完成，<strong>最终价格与库存以下单页为准</strong>；</li>
      <li>支付成功后分钟级自动发货卡密，不排队、不人工审核；</li>
      <li>有效期从支付成功起算 30 天，到期后访问权限结束，<strong>不自动续费</strong>；</li>
      <li>企业用户需要发票或签合同，请在购买前联系客服确认后再下单。</li>
    </ul>

    <h2 id="faq">购买与限速相关常见问题</h2>
    <FaqList :items="purchaseFaq" :open-first="true" />
    <FaqList :items="limitsFaq" />

    <CtaBand title="看价格不如先看懂无限额度怎么算" />

    <div class="cu-notice">{{ siteConfig.disclaimer }}</div>
  </PageShell>
</template>