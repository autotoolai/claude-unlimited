<script setup lang="ts">
/**
 * 模型广场的单张模型卡：模型名（等宽）+ 复制按钮 + 能力标签 + 推荐角标 + 一段说明。
 */
import type { ModelRow } from '../../../config/models'
import CopyChip from './CopyChip.vue'

defineProps<{ model: ModelRow }>()
</script>

<template>
  <article class="cu-mcard" :class="{ 'cu-mcard--primary': model.pick === 'primary' }">
    <header class="cu-mcard__head">
      <code class="cu-mcard__id">{{ model.id }}</code>
      <CopyChip :text="model.id" />
    </header>
    <p class="cu-mcard__tags">
      <span class="cu-mcard__pick">{{ model.pick === 'primary' ? '推荐' : '备用' }}</span>
      <span v-for="t in model.tags" :key="t" class="cu-mcard__tag">{{ t }}</span>
    </p>
    <p class="cu-mcard__summary">{{ model.summary }}</p>
  </article>
</template>
