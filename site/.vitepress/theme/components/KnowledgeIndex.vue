<script setup lang="ts">
/**
 * 知识库列表页：Hero 下的分类胶囊 tab（对标 aiprimetech.io/blog 的 filters）+ 图文卡片网格 + CTA。
 *
 * 关键约定：
 * - tab 的当前分类与 URL 的 ?cat=<KnowledgeCat> 双向同步。VitePress 1.6 的 useRoute()/useRouter()
 *   不暴露 query 与 replace，所以直接用 history.replaceState 改地址（不新增历史记录），再用
 *   useData().page（路由变化时会变）重新读一次 query —— 页脚 /knowledge#cat-<cat> 这类外部导航
 *   也能正确切过来。
 * - 不带 query（'all'）就是全部平铺。SSR 输出的一定是全部文章，SEO 不亏。
 * - 筛选用 v-show 而不是 v-if：所有卡片始终在 DOM 里（check_dist.mjs 的卡片计数断言依赖这一点），
 *   切 tab 不重挂载，封面图不重新请求。
 * - tab 按钮带 id="cat-<cat>"，页脚 /knowledge#cat-<cat> 的锚点链接仍然命中同一位置。
 * - 数据全部来自 pages/data.ts 的 knowledgeCards / knowledgeCategories。
 */
import { computed, onMounted, ref, watch } from 'vue'
import { useData } from 'vitepress'
import PageShell from './PageShell.vue'
import KnowledgeTile from './KnowledgeTile.vue'
import CtaBand from './CtaBand.vue'
import JsonLd from './JsonLd.vue'
import { siteConfig } from '../../../config/site'
import { knowledgeCategories, knowledgeCards, knowledgeCategoryCount, jsonLdKnowledgeIndex } from '../pages/data'

const indexLd = jsonLdKnowledgeIndex()
const { page } = useData()

const cats = [...knowledgeCategories].sort((a, b) => a.order - b.order)
/** tab 列表：第一个是「全部」，后面按 order 排四个分类 */
const tabs = computed(() => [
  { id: 'all', name: '全部', desc: '', count: knowledgeCards.length },
  ...cats.map((c) => ({ id: c.cat as string, name: c.name, desc: c.desc, count: knowledgeCategoryCount(c.cat) })),
])

/** 当前分类；SSR 阶段恒为 'all'，客户端挂载后从 URL 读回 */
const active = ref('all')
const readQuery = () => {
  const q = new URLSearchParams(window.location.search).get('cat')
  active.value = tabs.value.some((t) => t.id === q) ? (q as string) : 'all'
}
onMounted(readQuery)
/** 路由变化时重读（页脚锚点链接、外部直达带 query 的地址） */
watch(page, readQuery)

const activeTab = computed(() => tabs.value.find((t) => t.id === active.value)!)

function select(id: string) {
  if (id === active.value) return
  active.value = id
  const url = new URL(window.location.href)
  if (id === 'all') url.searchParams.delete('cat')
  else url.searchParams.set('cat', id)
  window.history.replaceState(window.history.state, '', url)
}

/* 键盘：左右方向键在胶囊间移动（标准 tablist 行为） */
const tabBtns = ref<HTMLButtonElement[]>([])
function onKeydown(e: KeyboardEvent) {
  const delta = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
  if (!delta) return
  e.preventDefault()
  const i = tabs.value.findIndex((t) => t.id === active.value)
  const next = tabs.value[(i + delta + tabs.value.length) % tabs.value.length]
  select(next.id)
  tabBtns.value[tabs.value.indexOf(next)]?.focus()
}
</script>

<template>
  <JsonLd id="cu-jsonld-knowledge-index" :json="indexLd" />

  <PageShell
    slug="knowledge_index"
    title="Claude 知识库"
    lead="Claude Code 的用法、原理、成本与报错排查，按四个主题分类查。配置与接入见使用教程。"
    eyebrow="知识库"
  >
    <div class="cu-kfilters">
      <div class="cu-seg cu-scroll-none" role="tablist" aria-label="按分类浏览知识库文章" @keydown="onKeydown">
        <button
          v-for="(t, i) in tabs"
          :id="t.id === 'all' ? undefined : 'cat-' + t.id"
          :key="t.id"
          :ref="(el) => { if (el) tabBtns[i] = el as HTMLButtonElement }"
          type="button"
          role="tab"
          class="cu-seg__btn"
          :class="{ 'is-active': t.id === active }"
          :aria-selected="t.id === active"
          :tabindex="t.id === active ? 0 : -1"
          @click="select(t.id)"
        >
          {{ t.name }}
          <span class="cu-kswitcher__count">{{ t.count }}</span>
        </button>
      </div>
      <p v-if="activeTab.desc" class="cu-kfilters__desc">{{ activeTab.desc }}</p>
    </div>

    <div class="cu-kgrid">
      <KnowledgeTile
        v-for="k in knowledgeCards"
        v-show="active === 'all' || k.cat === active"
        :key="k.slug"
        :card="k"
      />
    </div>

    <CtaBand title="还没买？先看套餐怎么算" />

  </PageShell>
</template>