<script setup lang="ts">
/**
 * 商品卡 CTA（购买外链全站唯一出口）。
 * 变体：primary / solid 都走墨底实心（页面上只保留一个视觉重心），ghost 是描边。
 * 尺寸：sm 与导航同高、md 正文默认、lg 首屏与底部行动区。
 * 按钮上不带价格：全站金额只在 /pricing 与首页首屏数据条露出，按钮只负责转化。
 * href 传入时按档位自己的商品页地址跳转（/pricing 的套餐卡），不传则回退店铺主页。
 */
import { computed } from 'vue'
import { shopUrl } from '../../../config/site'

const props = withDefaults(
  defineProps<{
    label?: string
    variant?: 'primary' | 'solid' | 'ghost'
    size?: 'sm' | 'md' | 'lg'
    /** 埋点名，交给 Cloudflare Web Analytics 统计 */
    cta?: string
    /** 覆盖默认店铺主页链接（档位专属商品页） */
    href?: string
  }>(),
  { label: '立即购买', variant: 'primary', size: 'md', cta: 'unknown' },
)

const href = computed(() => props.href || shopUrl())
</script>

<template>
  <a
    class="cu-btn"
    :class="[
      'cu-btn--' + props.variant,
      props.size === 'lg' ? 'cu-btn--lg' : props.size === 'sm' ? 'cu-btn--sm' : 'cu-btn--md',
    ]"
    :href="href"
    target="_blank"
    rel="noopener sponsored nofollow"
    :data-cta="props.cta"
  >
    <span>{{ props.label }}</span>
  </a>
</template>
