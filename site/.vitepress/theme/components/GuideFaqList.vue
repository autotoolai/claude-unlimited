<script setup lang="ts">
/**
 * 场景页的常见问题：折叠问答。
 *
 * 与 /faq 页的 FaqList 区别：那一份是全站 FAQ 的列表（带分类标签、关键词匹配），
 * 这一份只渲染当前场景页自己的几条问答，样式复用 .cu-faq 的类，不引入分类概念。
 * 答案第一句是结论（同 config/faq.ts 的写作规范），链接与代码块不在这份里渲染。
 */
defineProps<{ items: { q: string; a: string }[] }>()
</script>

<template>
  <div class="cu-faq">
    <details v-for="(it, i) in items" :key="i" class="cu-faq__item">
      <summary role="button" :aria-expanded="false">
        <span class="cu-faq__q">{{ it.q }}</span>
      </summary>
      <div class="cu-faq__body">
        <p v-for="(para, pi) in it.a.split('\n')" :key="pi" class="cu-faq__para">{{ para }}</p>
      </div>
    </details>
  </div>
</template>
