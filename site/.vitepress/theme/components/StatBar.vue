<script setup lang="ts">
defineProps<{ metrics: { value: string; label: string }[] }>()
</script>

<template>
  <dl class="cu-stats">
    <div v-for="(m, i) in metrics" :key="i" class="cu-stat">
      <dd>{{ m.value }}</dd>
      <dt>{{ m.label }}</dt>
    </div>
  </dl>
</template>