<script setup lang="ts">
/**
 * 模型广场（目录页）：只回答「有哪些模型、model ID 是什么」。
 * 2026-10-10 起删掉「三种套餐怎么选」（与首页/定价页重复）与「怎么拿到完整列表」
 * （CC Switch 操作已由使用教程 2.2 与知识库覆盖）。
 * 数据来自 config/models.ts 与 config/faq.ts。
 */
import PageShell from './PageShell.vue'
import JsonLd from './JsonLd.vue'
import ModelCard from './ModelCard.vue'
import CtaBand from './CtaBand.vue'
import { modelBrands, jsonLdModels } from '../pages/data'
import { siteConfig } from '../../../config/site'
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

    <CtaBand title="挑好模型，就差一张卡" />

  </PageShell>
</template>
