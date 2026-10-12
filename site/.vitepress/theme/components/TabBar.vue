<script setup lang="ts">
/**
 * 主导航链接组：首页 + 已启用的导航项 + 右侧「进入后台」。
 * 它不再自带外壳容器，而是被 PageShell / KnowledgeDoc 放进品牌行（.cu-tabs）里，
 * 与 logo、声明、主题切换、购买 CTA 共同构成单行吸顶导航。
 * slug 由外壳传入（guide_index、knowledge_xxx 等），用于当前项高亮；不传时退回按路径前缀判断。
 * 购买按钮走 ExternalCta（全站购买链接的唯一出口），size="sm" 保持与导航同高。
 */
import { computed } from 'vue'
import { useRoute } from 'vitepress'
import { navItems } from '../../../config/site'

const props = defineProps<{ slug?: string }>()
const route = useRoute()
const links = computed(() => [{ text: '首页', link: '/' }, ...navItems])

/** 页内 slug 的导航项文本：guide_index → /guide，knowledge_index → /knowledge，knowledge_xxx → /knowledge/<slug> */
const current = computed(() => {
  if (!props.slug) return ''
  // slug 允许带前导斜杠（GuidePage 传的是 "/guide"），先剥掉再拼，否则会得到 "//guide" 永不命中
  const s = props.slug.replace(/^\/+/, '')
  if (s === 'knowledge' || s === 'knowledge_index' || s.startsWith('knowledge_')) return '/knowledge'
  return '/' + s.replace(/_/g, '/')
})
const isActive = (link: string) => (link === current.value ? true : link === '/' ? route.path === '/' : route.path.startsWith(link))
</script>

<template>
  <nav class="cu-tabs" aria-label="主导航">
    <div class="cu-tabs__inner cu-scroll-none">
      <a
        v-for="n in links"
        :key="n.link"
        class="cu-tabs__link"
        :class="{ 'is-active': isActive(n.link) }"
        :href="n.link"
        :aria-current="isActive(n.link) ? 'page' : undefined"
        >{{ n.text }}</a
      >
    </div>
  </nav>
</template>
