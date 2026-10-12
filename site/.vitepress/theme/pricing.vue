<script setup lang="ts">
/**
 * 套餐定价页（决策页）：回答「多少钱、买的是什么、边界在哪」。
 * 2026-10-11 精简版：暂时只展示无限额度卡，分组切换胶囊（周期卡 / 额度卡）与
 * 「购买后怎么用 / 包含什么 / 不包含什么 / 公平使用 / 和按量计费差在哪 / 关于价格」已下线，
 * 等这两类卡真实定价上线后再按需恢复。
 * 同日再次精简：价格同步说明、跳转提示、「退款规则」整节一并下线，页面只留档位网格与常见问题。
 * 同日第三次精简：「购买与支付」FAQ 分类整体下线，本页 FAQ 只保留「限速与封号」。
 * 首屏不再重复「选择套餐」小标题，套餐要点全部收进 lead，网格直接接在说明之后。
 * 2026-10-12 曾在档位网格与 FAQ 之间插入 UnlimitedValue 区块（结论两条 + 用法场景 + 免责），
 * 同日按页面精简决定撤回：本页只回答「有哪些档位、多少钱、点了买什么」，其余疑虑一律去 /faq 查。
 * 页内不再挂 FAQ 组件——限速、429、封号规则都在 /faq 的「限速与封号」分类里，只有一份维护。
 * 价格与额度全部来自 config/plans.ts。
 */
import PageShell from './components/PageShell.vue'
import JsonLd from './components/JsonLd.vue'
import PlanGrid from './components/PlanGrid.vue'
import { modelIds, recommendedIds } from '../../config/models'
import { jsonLdPricing, siteConfig } from './pages/data'

/**
 * 档位名从 config/models.ts 派生：文案里不再手写模型名单。
 * 手写过一次就会随上游更新漂移（曾出现 pricing 页写「Sonnet、Haiku」而商品实际只有 Fable 与 Opus）。
 *
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
    :lead="`付一次钱，在有效期内想用多少用多少：${tierNames} 全部可用，不按 token 计费，也不自动续费。`"
  >
    <PlanGrid group-id="unlimited" :show-group-head="false" />

  </PageShell>
</template>
