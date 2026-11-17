<script setup lang="ts">
/**
 * 折叠问答。用原生 <details>，每条独立展开/收起；已展开的保持展开，点同一条可收起。
 * 答案里以「- 」开头的连续行合并成一个列表，其余行渲染成段落。
 *
 * 可访问性：details 自带展开/收起语义，这里把 summary 绑成按钮（role="button"，aria-expanded
 * 跟随该条 open），并监听 toggle 事件同步 aria-expanded —— 原生 <summary> 在部分屏幕阅读器里读不出
 * 当前是否已展开。Esc 一次性收起全部，由外层 keydown 处理。
 *
 * 默认展开：defaultOpen 条（0 = 全收起）只影响初始态；openFirst 是 defaultOpen=1 的旧写法别名。
 * 在页面（/faq、内嵌 FAQ）里开，在助手语料里不开——助手走 KbEntry，不经过本组件。
 */
import { ref } from 'vue'
import type { FaqItem } from '../../../config/faq'
import { categoryLabels } from '../../../config/faq'

const props = withDefaults(
  defineProps<{
    items: FaqItem[]
    /** 默认展开前 N 条；0 = 全部收起。只决定初始态，之后各条互不影响 */
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

type AnswerBlock = { type: 'p'; text: string } | { type: 'ul'; items: string[] }

/** 把答案正文拆成段落与合并后的项目符号列表，避免每条 `- ` 各自包一层 <ul> */
function answerBlocks(a: string): AnswerBlock[] {
  const blocks: AnswerBlock[] = []
  let bullets: string[] = []

  const flush = () => {
    if (!bullets.length) return
    blocks.push({ type: 'ul', items: bullets })
    bullets = []
  }

  for (const line of a.split('\n')) {
    if (line.startsWith('- ')) {
      bullets.push(line.slice(2))
      continue
    }
    flush()
    if (line.trim()) blocks.push({ type: 'p', text: line })
  }
  flush()
  return blocks
}

function initialOpenSet(): Set<number> {
  const n = props.defaultOpen || (props.openFirst ? 1 : 0)
  return new Set(Array.from({ length: Math.min(n, props.items.length) }, (_, i) => i))
}

/** 按索引跟踪每条是否展开；点开一条不会连带其它条 */
const openSet = ref<Set<number>>(initialOpenSet())

function isOpen(idx: number) {
  return openSet.value.has(idx)
}

function toggleItem(e: Event, idx: number) {
  const open = (e.currentTarget as HTMLDetailsElement).open
  const next = new Set(openSet.value)
  if (open) next.add(idx)
  else next.delete(idx)
  openSet.value = next
}

function collapseAll() {
  openSet.value = new Set()
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') collapseAll()
}
</script>

<template>
  <div class="cu-faq" @keydown="onKeydown">
    <details
      v-for="(it, i) in items"
      :id="it.id"
      :key="it.id"
      class="cu-faq__item"
      :open="isOpen(i)"
      @toggle="toggleItem($event, i)"
    >
      <summary role="button" :aria-expanded="isOpen(i) ? 'true' : 'false'">
        <span v-if="showCat" class="cu-faq__cat">{{ categoryLabels[it.cat] }}</span>
        <span class="cu-faq__q">{{ it.q }}</span>
      </summary>
      <div class="cu-faq__body">
        <template v-for="(block, bi) in answerBlocks(it.a)" :key="bi">
          <ul v-if="block.type === 'ul'" class="cu-faq__bullets">
            <li v-for="(li, liIdx) in block.items" :key="liIdx">{{ li }}</li>
          </ul>
          <p v-else class="cu-faq__para">{{ block.text }}</p>
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
        <pre v-if="showCode && it.code?.length" class="cu-faq__code cu-scroll-none"><code>{{ it.code.join('\n') }}</code></pre>
      </div>
    </details>
  </div>
</template>
