<script setup lang="ts">
/** 编号步骤条。direction=vertical 时连接线在左侧竖排，移动端自动转竖排。 */
withDefaults(
  defineProps<{
    steps: { title: string; desc: string; code?: string }[]
    direction?: 'horizontal' | 'vertical'
  }>(),
  { direction: 'horizontal' },
)
</script>

<template>
  <ol class="cu-steps" :class="`cu-steps--${direction}`">
    <li v-for="(s, i) in steps" :key="i" class="cu-step">
      <span class="cu-step__no">{{ i + 1 }}</span>
      <div class="cu-step__body">
        <h3>{{ s.title }}</h3>
        <p>{{ s.desc }}</p>
        <pre v-if="s.code" class="cu-step__code"><code>{{ s.code }}</code></pre>
      </div>
    </li>
  </ol>
</template>