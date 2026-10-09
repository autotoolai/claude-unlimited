<script setup lang="ts">
defineProps<{
  columns: string[]
  rows: { label: string; values: string[]; highlight?: boolean }[]
  caption?: string
}>()
</script>

<template>
  <div class="cu-table-wrap">
    <table class="cu-table">
      <caption v-if="caption" class="cu-table__caption">{{ caption }}</caption>
      <thead>
        <tr>
          <th scope="col" class="cu-table__label">对比项</th>
          <th v-for="(c, i) in columns" :key="i" scope="col" :class="{ 'is-highlight': i === 0 }">{{ c }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(r, ri) in rows" :key="ri">
          <th scope="row" class="cu-table__label">{{ r.label }}</th>
          <td v-for="(v, i) in r.values" :key="i" :class="{ 'is-highlight': i === 0 || r.highlight }">{{ v }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
