<script setup lang="ts">
/**
 * 首页「支持哪些模型」徽标墙：只列 model ID + 复制，点开跳模型广场。
 */
import { modelIds } from '../../../config/models'
import CopyChip from './CopyChip.vue'
</script>

<template>
  <div class="cu-mbadges">
    <span v-for="m in modelIds" :key="m.id" class="cu-mbadge">
      <code>{{ m.id }}</code>
      <CopyChip :text="m.id" label="复制" />
    </span>
  </div>
</template>
