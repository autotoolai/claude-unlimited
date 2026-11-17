<script setup lang="ts">
/**
 * 套餐定价页（决策页）：回答「多少钱、买的是什么、边界在哪」。
 * 档位网格之后挂「选套餐常问」精选 FAQ（config/faq.ts 的 pricingFaqItems），
 * 全文主场仍在 /faq；限速类条目不整类搬家，只抽与下单决策相关的几条。
 * 价格与额度全部来自 config/plans.ts。
 */
import PageShell from './components/PageShell.vue'
import JsonLd from './components/JsonLd.vue'
import PlanGrid from './components/PlanGrid.vue'
import FaqList from './components/FaqList.vue'
import { modelIds, recommendedIds } from '../../config/models'
import { jsonLdPricing, pricingFaqItems } from './pages/data'

/**
 * 档位名从 config/models.ts 派生：文案里不再手写模型名单。
 * 只取 recommendedIds（pick=primary）而不是全量 modelIds：模型广场会列出网关实际可用的全部档位，
 * 但商品详情只承诺 Fable 5.1 与 Opus 5.5。定价页是下单页，列全量属于过度承诺。
 */
const tierNames = modelIds.filter((m) => recommendedIds.includes(m.id)).map((m) => m.tier).join('、')
</script>

<template>
  <JsonLd id="cu-jsonld-pricing" :json="jsonLdPricing" />

  <PageShell
    slug="pricing"
    title="套餐定价"
    :lead="`有效期内不按 token 计费：${tierNames} 都在同一订阅价内，选 Opus 不另买卡、不另加价。下面按天/周/月选档；买完到管理后台提 Key 即可。`"
  >
    <PlanGrid group-id="unlimited" :show-group-head="false" />

    <h2 id="faq">选套餐常问</h2>
    <p>
      下单前最常卡的几条；完整分类与更多细节见<a href="/faq">常见问题</a>。
    </p>
    <FaqList :items="pricingFaqItems" :default-open="2" />

  </PageShell>
</template>
