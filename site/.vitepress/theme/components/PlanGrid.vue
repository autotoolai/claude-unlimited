<script setup lang="ts">
/**
 * 套餐定价页的档位网格：一个小节 = 一个组标题 + 一组档位卡。
 * 卡片在宽屏 3 列、窄屏 1 列；无限卡 5 档在宽屏用 auto-fit 自适应。
 */
import { planGroups, tiersOf, featuredTierOf, type PlanGroupId } from '../../../config/plans'
import PlanCard from './PlanCard.vue'

const props = defineProps<{ groupId: PlanGroupId; showGroupHead?: boolean }>()
const list = tiersOf

/**
 * 列数策略（2026-10-11）：
 * 1–3 档按实际档数铺满一行——三档（天卡 / 周卡 / 月卡）正好一行三列，视觉上是完整的价格阶梯；
 * 4 档及以上固定三列，多出的自动折到下一行，保证宽屏下单卡宽度不小于三列时的宽度。
 * 列数写进 CSS 变量，网格换列规则统一由 16_plans.css 维护。
 */
const colsOf = (id: PlanGroupId) => {
  const n = list(id).length
  return n <= 3 ? n : 3
}
</script>

<template>
  <div class="cu-tgrid-wrap">
    <template v-if="showGroupHead !== false">
      <header class="cu-tgrid-head">
        <h3>{{ planGroups.find((g) => g.id === groupId)?.name }}</h3>
        <span v-if="planGroups.find((g) => g.id === groupId)?.badge" class="cu-tgrid-badge">{{ planGroups.find((g) => g.id === groupId)?.badge }}</span>
      </header>
      <p class="cu-tgrid-desc">{{ planGroups.find((g) => g.id === groupId)?.desc }}</p>
    </template>
    <div class="cu-tgrid" :style="{ '--cu-tgrid-cols': String(colsOf(groupId)) }">
      <PlanCard v-for="t in list(groupId)" :key="t.id" :tier="t" :group-id="groupId" />
    </div>
  </div>
</template>
