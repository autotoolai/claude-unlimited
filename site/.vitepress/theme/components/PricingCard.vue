<script setup lang="ts">
import type { Product } from '../../../config/site'

withDefaults(
  defineProps<{
    product: Product
    featured?: boolean
    ctaLabel?: string
    note?: string
    cta?: string
  }>(),
  { ctaLabel: '立即购买', note: '', cta: 'pricing_card' },
)
</script>

<template>
  <article class="cu-price-card" :class="{ 'cu-price-card--featured': product.highlighted || featured }">
    <header class="cu-price-card__head">
      <p class="cu-price-card__name">{{ product.name }}</p>
      <p class="cu-price-card__price">
        <strong>{{ product.price }}</strong><span>{{ product.period }}</span>
      </p>
      <ul class="cu-price-card__features">
        <li v-for="(f, i) in product.features" :key="i">{{ f }}</li>
      </ul>
    </header>
    <ExternalCta :label="ctaLabel" :cta="cta" size="lg" />
    <p v-if="note" class="cu-price-card__note">{{ note }}</p>
  </article>
</template>