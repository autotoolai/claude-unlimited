<script setup lang="ts">
/**
 * 草稿列表页：只出现在预览端口（41802），线上没有这个页面。
 *
 * 由 content/knowledge/scripts/preview.mjs 生成 preview/drafts/index.md：frontmatter 里写
 * layout: draft_index 与 drafts 数组（每篇的 slug / title / desc / cat / state / 体检摘要），
 * 正文只放一句说明。数据走 frontmatter 数组而不是正文里的 JSON 脚本块：VitePress 用 gray-matter 解析
 * frontmatter，数组是原生 YAML，SSR 就能渲染出卡片，不需要客户端读 DOM。
 *
 * 外壳与 KnowledgeDoc 同款：品牌导航 + 主题切换 + 页尾。不带客服助手与购买 CTA —— 草稿阶段不测转化，
 * 预览端口的点击不该进转化统计。
 */
import { computed } from 'vue'
import { useData } from 'vitepress'
import { siteConfig, featuredProduct } from '../../../config/site'
import { knowledgeCategories } from '../../../config/knowledge'
import TabBar from './TabBar.vue'
import BrandLogo from './BrandLogo.vue'
import ExternalCta from './ExternalCta.vue'
import SiteFooter from './SiteFooter.vue'
import { useThemeToggle, useNavScrollState } from '../composables/use_shell'

const { frontmatter } = useData()

interface DraftRow {
  slug: string
  title: string
  desc: string
  cat: string
  kicker: string
  h2: number
  answer: boolean
  source: boolean
  review: boolean
  published: boolean
  issues: string[]
}

const rows = computed<DraftRow[]>(() => (frontmatter.value.drafts as DraftRow[] | undefined) ?? [])
const catName = (cat: string) => knowledgeCategories.find((c) => c.cat === cat)?.name || cat || '未分类'
const ok = (r: DraftRow) => r.issues.length === 0

const { toggle } = useThemeToggle()
useNavScrollState()
const shopUrl = computed(() => featuredProduct().shopUrl)
</script>

<template>
  <div class="cu-shell cu-shell--knowledge cu-shell--drafts">
    <header class="cu-brandbar">
      <div class="cu-brandbar__inner">
        <a class="cu-brand" href="/" aria-label="返回首页">
          <BrandLogo :size="38" />
          <span class="cu-brand__text">
            <strong>{{ siteConfig.name }}</strong>
          </span>
        </a>

        <TabBar slug="knowledge" />

        <div class="cu-navtools">
          <button class="cu-navtoggle" type="button" aria-label="切换深浅色模式" title="切换深浅色模式" @click="toggle">
            <svg class="cu-icon-moon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
            <svg class="cu-icon-sun" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4 1.4" />
            </svg>
          </button>
          <ExternalCta v-if="shopUrl" class="cu-tabs__cta" size="sm" cta="nav" />
        </div>
      </div>
    </header>

    <div class="cu-shell__body cu-shell__body--reading">
      <div class="cu-shell__inner cu-shell__inner--reading">
        <article class="cu-page cu-page--doc">
          <h1>草稿</h1>

          <p class="cu-drafts__lede">这里放还没发布的文章。确认要发了，再放进知识库。线上看不到这一页的内容。</p>

          <p v-if="!rows.length" class="cu-drafts__empty">
            现在还没有草稿。把写好的文章放进 <code>content/knowledge/drafts/</code>，它就会出现在这里。
          </p>

          <div v-else class="cu-cards cu-cards--three">
            <a v-for="r in rows" :key="r.slug" class="cu-kcard cu-dcard" :href="`/knowledge/${r.slug}.html`">
              <span class="cu-kcard__top">
                <span class="cu-kcard__badge">{{ catName(r.cat) }}</span>
                <span class="cu-dcard__flag" :class="{ 'is-ok': ok(r) }">{{ ok(r) ? '可以发' : `${r.issues.length} 处待改` }}</span>
              </span>
              <span class="cu-kcard__title">{{ r.title }}</span>
              <span class="cu-kcard__desc">{{ r.desc }}</span>
              <span class="cu-kcard__meta">
                {{ catName(r.cat) }}<template v-if="r.h2"> · {{ r.h2 }} 节</template>
              </span>
              <span class="cu-dcard__files">
                <span :class="{ 'is-on': r.source }">素材卡</span>
                <span :class="{ 'is-on': r.review }">预览记录</span>
                <span v-if="r.published" class="cu-dcard__warn">线上已有同名文章</span>
              </span>
              <ul v-if="r.issues.length" class="cu-dcard__issues">
                <li v-for="i in r.issues" :key="i">{{ i }}</li>
              </ul>
            </a>
          </div>

          <h2>接下来怎么做</h2>
          <ul class="cu-drafts__how">
            <li>改文章只改 <code>content/knowledge/drafts/</code> 里那一份，这里会自己刷新。</li>
            <li>每篇最好配一个 <code>.source.md</code>（素材出处）和一个 <code>.review.md</code>（改了什么、审过没有），卡片上会显示这两份在不在。</li>
            <li>决定发布时跑 <code>npm run publish:article -- --slug=&lt;slug&gt;</code>，它会告诉你接下来跑哪几条命令。</li>
            <li>发布前想去真实站点看一眼，在 <a href="http://localhost:41800/knowledge">41800 知识库</a> 打开对应文章。</li>
          </ul>
        </article>
      </div>
    </div>

    <SiteFooter />
  </div>
</template>