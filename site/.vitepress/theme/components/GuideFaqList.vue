<script setup lang="ts">
/**
 * 场景页的常见问题：折叠问答。每条用原生 details，独立展开/收起。
 *
 * 与 /faq 页的 FaqList 区别：那一份是全站 FAQ 的列表（带分类标签、关键词匹配），
 * 这一份只渲染当前场景页自己的几条问答，样式复用 .cu-faq 的类，不引入分类概念。
 * 答案第一句是结论（同 config/faq.ts 的写作规范），链接与代码块不在这份里渲染。
 */
defineProps<{ items: { q: string; a: string }[] }>()

function syncAria(e: Event) {
  const d = e.currentTarget as HTMLDetailsElement
  d.querySelector('summary')?.setAttribute('aria-expanded', String(d.open))
}

function onKeydown(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  const root = e.currentTarget as HTMLElement
  root.querySelectorAll<HTMLDetailsElement>('details.cu-faq__item').forEach((d) => {
    d.open = false
    d.querySelector('summary')?.setAttribute('aria-expanded', 'false')
  })
}
</script>

<template>
  <div class="cu-faq" @keydown="onKeydown">
    <details v-for="(it, i) in items" :key="i" class="cu-faq__item" @toggle="syncAria">
      <summary role="button" aria-expanded="false">
        <span class="cu-faq__q">{{ it.q }}</span>
      </summary>
      <div class="cu-faq__body">
        <p
          v-for="(para, pi) in it.a.split('\n').filter((x) => x.trim())"
          :key="pi"
          class="cu-faq__para"
        >{{ para }}</p>
      </div>
    </details>
  </div>
</template>
