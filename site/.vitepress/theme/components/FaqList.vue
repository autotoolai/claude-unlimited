<script setup lang="ts">
/**
 * 折叠问答。用原生 <details>，零 JS 依赖、深色模式跟随、无障碍属性齐全。
 * 答案里以「- 」开头的行渲染成列表，其余行渲染成段落。
 */
import type { FaqItem } from '../../../config/faq'
import { categoryLabels } from '../../../config/faq'

withDefaults(
  defineProps<{
    items: FaqItem[]
    openFirst?: boolean
    /** 是否在问题前显示分类标签 */
    showCat?: boolean
    /** 是否展示代码块（页面展示，助手不展示） */
    showCode?: boolean
  }>(),
  { openFirst: false, showCat: false, showCode: true },
)
</script>

<template>
  <div class="cu-faq">
    <details v-for="(it, i) in items" :id="it.id" :key="it.id" class="cu-faq__item" :open="openFirst && i === 0">
      <summary>
        <span v-if="showCat" class="cu-faq__cat">{{ categoryLabels[it.cat] }}</span>
        {{ it.q }}
      </summary>
      <div class="cu-faq__body">
        <template v-for="(para, pi) in it.a.split('\n')" :key="pi">
          <ul v-if="para.startsWith('- ')" class="cu-faq__bullets">
            <li v-for="(li, lj) in para.split('\n')" :key="lj">{{ li.slice(2) }}</li>
          </ul>
          <p v-else class="cu-faq__para">{{ para }}</p>
        </template>
        <ul v-if="it.links?.length" class="cu-faq__links">
          <li v-for="(l, li) in it.links" :key="li">
            <a
              :href="l.url"
              :target="l.external ? '_blank' : undefined"
              :rel="l.external ? 'noopener sponsored nofollow' : undefined"
            >{{ l.text }}</a>
          </li>
        </ul>
        <pre v-if="showCode && it.code?.length" class="cu-faq__code"><code>{{ it.code.join('\n') }}</code></pre>
      </div>
    </details>
  </div>
</template>