<script setup lang="ts">
/**
 * 对比表。单元格默认是纯文本（转义输出），只有写成 <a href="...">…</a> 的会变成真链接
 * —— 走 utils/inline.ts 的 renderInline，与教程正文同一套规则，避免各处转义口径不一致。
 */
import { renderInline } from '../utils/inline'

defineProps<{
  columns: string[]
  rows: { label: string; values: string[]; highlight?: boolean }[]
  caption?: string
}>()
</script>

<template>
  <div class="cu-table-wrap cu-scroll-none">
    <table class="cu-table">
      <caption v-if="caption" class="cu-table__caption" v-html="renderInline(caption)" />
      <thead>
        <tr>
          <th scope="col" class="cu-table__label">对比项</th>
          <th v-for="(c, i) in columns" :key="i" scope="col" :class="{ 'is-highlight': i === 0 }">{{ c }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(r, ri) in rows" :key="ri">
          <th scope="row" class="cu-table__label" v-html="renderInline(r.label)" />
          <td v-for="(v, i) in r.values" :key="i" :class="{ 'is-highlight': i === 0 || r.highlight }" v-html="renderInline(v)" />
        </tr>
      </tbody>
    </table>
  </div>
</template>
