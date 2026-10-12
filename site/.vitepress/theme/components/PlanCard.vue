<script setup lang="ts">
/**
 * 单个档位卡：档位名 + 价格 / 周期 + 卖点 + 购买按钮。
 *
 * 卡片标题用 displayName（人工撰写的短名，如「天卡」）而不是 name。name 是发卡站的
 * 商品全名，形如「fable5.1+opus5.5无限-周卡」，三张卡并排时标题几乎一字不差，
 * 真正决定选择的「7 天 / 30 天」反而是小字。displayName 缺省才回退到 name。
 *
 * 价格右侧跟一个「约 ¥X / 天」徽标，由 amount / days 现算，零维护成本。三个档位摊到每天是
 * 13.5 → 10 → 4.2 元，这个递减阶梯是本页最强的说服点，原先只有总价、读不出来。
 *
 * 周期（1 / 7 / 30 天）提到卡头与档位名同行，而不是拼在价格后面当小字：
 * 三档唯一的差异点就是周期，读者要先看到「越往后越长」再看到钱。
 *
 * 主推卡（featured）不做反白实心，三张卡同底同宽才不会把阶梯读成
 * 「两张便宜的 + 一张很贵的」。层级改由 CSS 承担：顶部 3px 墨色压边 + 更强阴影 + 角标反白。
 * 所以 featured 卡的按钮是实心（primary），非主推是描边（ghost），主次方向与层级一致。
 *
 * 划线原价与折扣角标不再展示：发卡站原价时有时无，展示折扣比例反而让访客以为在等一次促销。
 * original / discount 字段仍由同步脚本维护，只作留档。
 * 下单统一跳发卡站（ExternalCta 取 partners.purchase.url），档位在商品页选择，
 * 所以这里只带 data-cta 埋点，不带独立 URL。
 *
 * 待上线态（status === 'coming-soon'）：虚线边框 + 整体降透明，价格显示「待定」，
 * 不显示均价行（amount 为 0，算出来是 ¥0），按钮换成不可点的 <span>。
 * 这里刻意不用 disabled <button>——那是个可聚焦元素，屏幕阅读器会把它念成一个
 * 「按钮」但点了没反应；纯 span 加 aria-disabled 语义更准。
 */
import { computed } from 'vue'
import type { PlanTier } from '../../../config/plans'
import { isLive } from '../../../config/plans'

const props = withDefaults(
  defineProps<{ tier: PlanTier; groupId?: string }>(),
  { groupId: 'unlimited' },
)

const live = isLive(props.tier)

/** 展示用短名；未配 displayName 时回退到发卡站商品名 */
const displayName = computed(() => props.tier.displayName || props.tier.name)

/** 均价锚点。amount 为 0 说明还没定价，这时不显示，别让「¥0/天」读成真实价格 */
const perDay = computed(() => {
  if (!live || !props.tier.days || props.tier.amount <= 0) return ''
  const v = props.tier.amount / props.tier.days
  // 一天以上的档位保留一位小数才有阶梯感（10.0 / 4.2），一天的就取整
  const text = props.tier.days > 1 ? v.toFixed(1) : String(Math.round(v * 10) / 10)
  return `约 ¥${text} / 天`
})

const ctaVariant = computed(() => (props.tier.featured && live ? 'primary' : 'ghost'))
</script>

<template>
  <article
    class="cu-tcard"
    :class="{ 'cu-tcard--featured': tier.featured && live, 'cu-tcard--soon': !live }"
  >
    <span v-if="tier.badge && live" class="cu-tcard__badge">{{ tier.badge }}</span>
    <span v-else-if="!live" class="cu-tcard__badge cu-tcard__badge--soon">即将上线</span>

    <header class="cu-tcard__head">
      <h3 class="cu-tcard__name">{{ displayName }}</h3>
      <span class="cu-tcard__period">{{ tier.period }}</span>
    </header>

    <p class="cu-tcard__price" :class="{ 'cu-tcard__price--tbd': !live }">
      <strong>{{ tier.price }}</strong>
      <span v-if="perDay" class="cu-tcard__perday">{{ perDay }}</span>
    </p>

    <ul class="cu-tcard__features">
      <li v-for="(f, i) in tier.features" :key="i">{{ f }}</li>
    </ul>

    <div class="cu-tcard__foot">
      <span v-if="!live" class="cu-btn cu-btn--disabled" aria-disabled="true">
        <span>{{ tier.cta || '暂未开放' }}</span>
      </span>
      <ExternalCta
        v-else
        :label="tier.cta || '立即订阅'"
        :href="tier.shopUrl"
        :cta="'plan_' + groupId + '_' + tier.id"
        :variant="ctaVariant"
      />
    </div>
  </article>
</template>
