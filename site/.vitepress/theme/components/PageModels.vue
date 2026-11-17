<script setup lang="ts">
/**
 * 模型广场（目录页）：只回答「有哪些模型、model ID 是什么」。
 * 模型卡片之后挂「关于模型」精选 FAQ（config/faq.ts 的 modelsFaqItems），
 * 全文主场仍在 /faq；场景页操作答疑不在这里重复。
 */
import PageShell from './PageShell.vue'
import JsonLd from './JsonLd.vue'
import ModelCard from './ModelCard.vue'
import FaqList from './FaqList.vue'
import CtaBand from './CtaBand.vue'
import { modelBrands, jsonLdModels, modelsFaqItems } from '../pages/data'
</script>

<template>
  <JsonLd id="cu-jsonld-models" :json="jsonLdModels" />

  <PageShell
    slug="models"
    title="模型广场"
    :lead="`所有档位都含在同一份订阅里，不按 token 计费。点模型名旁的「复制」，拿到完整 model ID。填进 CC Switch、Claude Code 或 Cursor 就能直接用。`"
    eyebrow="不按 token 计费 · 切换档位不加价"
  >

    <section v-for="g in modelBrands" :key="g.brand" :aria-label="g.brand + ' 模型'">
      <h3>{{ g.brand }} · {{ g.count }} 个常用模型</h3>
      <div class="cu-mcards">
        <ModelCard v-for="m in g.models" :key="m.id" :model="m" />
      </div>
    </section>

    <h2 id="faq">关于模型</h2>
    <p>
      选模型、切模型、列表为空时常见问法；更多见<a href="/faq">常见问题</a>。
    </p>
    <FaqList :items="modelsFaqItems" />

    <CtaBand title="挑好模型，就差一张卡" />

  </PageShell>
</template>
