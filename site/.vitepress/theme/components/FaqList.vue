<script setup lang="ts">
/**
 * 折叠问答。用原生 <details>，零 JS 依赖、深色模式跟随、无障碍属性齐全。
 * 答案里以「- 」开头的行渲染成列表，其余行渲染成段落。
 *
 * 可访问性：details 自带展开/收起语义，这里把 summary 绑成按钮（role="button"，aria-expanded
 * 跟随 open），并监听 toggle 事件同步 aria-expanded —— 原生 <summary> 在部分屏幕阅读器里读不出
 * 当前是否已展开。Esc 收起由外层 keydown 处理；「展开全部 / 收起全部」用一条 ref 状态驱动。
 *
 * 默认展开：defaultOpen 条（0 = 全收起）；openFirst 只是 defaultOpen=1 的旧写法别名。
 * 在页面（/faq、内嵌 FAQ）里开，在助手语料里不开——助手走 KbEntry，不经过本组件。
 */
import { computed, ref } from 'vue'
import type { FaqItem } from '../../../config/faq'
import { categoryLabels } from '../../../config/faq'

const props = withDefaults(
  defineProps<{
    items: FaqItem[]
    /** 默认展开前 N 条；0 = 全部收起 */
    defaultOpen?: number
    /** openFirst 的别名（等价 defaultOpen=1） */
    openFirst?: boolean
    /** 是否在问题前显示分类标签 */
    showCat?: boolean
    /** 是否展示代码块（页面展示，助手不展示） */
    showCode?: boolean
  }>(),
  { defaultOpen: 0, openFirst: false, showCat: false, showCode: true },
)

const openCount = ref(props.defaultOpen || (props.openFirst ? 1 : 0))
function toggleItem(e: Event, idx: number) {
  const open = (e.currentTarget as HTMLDetailsElement).open
  // 手动开一条就把计数挪到它后面，保证「前 N 条展开」这个语义在交互后依然成立
  if (open && idx >= openCount.value) openCount.value = idx + 1
  else if (!open && idx < openCount.value) openCount.value = idx
}
function setAll(open: boolean) {
  openCount.value = open ? props.items.length : 0
}
/** 「收起」只在全展开后还留在页面里：手动收起一条（openCount < 长度但不是 0）时不再显示 */
const allOpen = computed(() => openCount.value >= props.items.length)
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') setAll(false)
}
</script>

<template>
  <div class="cu-faq" @keydown="onKeydown">
    <details
      v-for="(it, i) in items"
      :id="it.id"
      :key="it.id"
      class="cu-faq__item"
      :open="i < openCount"
      @toggle="toggleItem($event, i)"
    >
      <summary role="button" :aria-expanded="i < openCount ? 'true' : 'false'">
        <span v-if="showCat" class="cu-faq__cat">{{ categoryLabels[it.cat] }}</span>
        <span class="cu-faq__q">{{ it.q }}</span>
      </summary>
      <div class="cu-faq__body">
        <template v-for="(para, pi) in it.a.split('\n')" :key="pi">
          <ul v-if="para.startsWith('- ')" class="cu-faq__bullets">
            <li v-for="(li, lj) in para.split('\n')" :key="lj">{{ li.slice(2) }}</li>
          </ul>
          <p v-else-if="para.trim()" class="cu-faq__para">{{ para }}</p>
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
    <p v-if="items.length > 1 && (openCount < items.length || allOpen)" class="cu-faq__more">
      <button type="button" @click="setAll(!allOpen)">{{ allOpen ? '全部收起' : `展开全部 ${items.length} 条` }}</button>
    </p>
  </div>
</template>
