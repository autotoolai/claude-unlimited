<script setup lang="ts">
/**
 * 教程页渲染器：把 config/guide.ts 的一页数据渲染成 PageShell 内的正文。
 * 教程只有 /guide 一页，页面组件（theme/guide_index.vue）直接用它，不再传 slug。
 *
 * 结构：分段切换（小白 / 高手两条轨）→ 两条轨共用的「常见问题排查」→ 接着看 → 页尾 CTA。
 * 两条轨用 SegmentedTabs（role="tablist"，方向键可切换），面板由 v-show 控制，切回来时不重挂载。
 */
import { ref } from 'vue'
import PageShell from './PageShell.vue'
import JsonLd from './JsonLd.vue'
import GuideSteps from './GuideSteps.vue'
import GuideShot from './GuideShot.vue'
import GuideUrl from './GuideUrl.vue'
import GuideTerm from './GuideTerm.vue'
import SegmentedTabs from './SegmentedTabs.vue'
import CompareTable from './CompareTable.vue'
import CtaBand from './CtaBand.vue'
import { guidePage, guideTabs, type GuideBlock, type GuideTabId } from '../../../config/guide'
import { siteConfig, partnerUrl } from '../../../config/site'
import { jsonLdGuide, modelIdRows } from '../pages/data'
import { renderInline } from '../utils/inline'

const page = guidePage()
const guideJsonLd = jsonLdGuide(page)

/** 当前轨；不带 tab 的块（常见问题排查）在两条轨下面都显示 */
const activeTab = ref<GuideTabId>('novice')

/** 某块在当前轨下是否渲染：不带 tab 的是共用块 */
function visible(b: GuideBlock, tab: string): boolean {
  return !b.tab || b.tab === tab
}

const railBlocks = page.blocks.filter((b) => b.tab)
const sharedBlocks = page.blocks.filter((b) => !b.tab && b.id !== 'contact')
</script>

<template>
  <JsonLd id="cu-jsonld-guide" :json="guideJsonLd" />

  <PageShell slug="/guide" toc="side" :toc-group="activeTab === 'novice' ? '小白教程' : '高手教程'" :title="page.title" :lead="page.lead" :eyebrow="page.eyebrow">
    <SegmentedTabs :groups="guideTabs" :active-id="activeTab" @update:active-id="activeTab = $event as GuideTabId">
      <template #default="{ activeId }">
        <!-- 两条轨都渲染，只切 hidden：只渲染当前轨的话，SSR 产物里没有另一轨的锚点与表格，
             页内目录锚点校验、爬虫抓取和「/guide#params 直达高手教程」都会失效。 -->
        <section v-for="tab in guideTabs" :key="tab.id" class="cu-guide-rail" :hidden="tab.id !== activeId">
          <template v-for="b in railBlocks" :key="b.id">
            <div v-if="visible(b, tab.id)">
              <h2 :id="b.id">{{ b.h2 }}</h2>
              <p v-if="b.kicker" class="cu-step-kicker">{{ b.kicker }}</p>
              <p v-if="b.lead" v-html="renderInline(b.lead)" />
              <p v-for="(t, i) in b.paras || []" :key="i" v-html="renderInline(t)" />
              <ul v-if="b.list?.length">
                <li v-for="(t, i) in b.list" :key="i" v-html="renderInline(t)" />
              </ul>
              <div v-if="b.notes?.length" class="cu-notes">
                <p v-for="(t, i) in b.notes" :key="i" v-html="renderInline(t)" />
              </div>
              <GuideTerm v-for="(c, i) in b.cmd || []" :key="i" :title="c.title" :lines="c.lines" />
              <CompareTable v-if="b.table" :columns="b.table.columns" :rows="b.table.rows" :caption="b.table.caption" />
              <!-- 参数速查表之后的模型 ID 对照表（数据来自 config/models.ts，以「获取模型列表」实际返回为准） -->
              <CompareTable
                v-if="b.id === 'params'"
                :columns="['层级', '适合场景', '建议']"
                :rows="modelIdRows"
                caption="以 CC Switch「获取模型列表」的实际返回为准"
              />
              <GuideSteps v-if="b.steps" :steps="b.steps" />
              <GuideUrl v-if="b.url" :url="b.url.href" :path="b.url.path" :label="b.url.label" />
              <GuideShot v-if="b.shot" :src="b.shot.src" :label="b.shot.label" :caption="b.shot.caption" />
              <div v-if="b.cta?.length" class="cu-cta-row">
                <a
                  v-for="(l, i) in b.cta"
                  :key="i"
                  class="cu-btn cu-btn--ghost cu-btn--sm"
                  :href="l.url"
                  :target="l.external ? '_blank' : undefined"
                  :rel="l.external ? 'noopener sponsored nofollow' : undefined"
                  >{{ l.text }}</a
                >
              </div>
              <ul v-if="b.links?.length">
                <li v-for="(l, i) in b.links" :key="i">
                  <a :href="l.url" :target="l.external ? '_blank' : undefined" :rel="l.external ? 'noopener sponsored nofollow' : undefined">{{ l.text }}</a>
                </li>
              </ul>
            </div>
          </template>
        </section>
      </template>
    </SegmentedTabs>

    <template v-for="b in sharedBlocks" :key="b.id">
      <h2 :id="b.id">{{ b.h2 }}</h2>
      <p v-if="b.lead" v-html="renderInline(b.lead)" />
      <p v-for="(t, i) in b.paras || []" :key="i" v-html="renderInline(t)" />
      <ul v-if="b.list?.length">
        <li v-for="(t, i) in b.list" :key="i" v-html="renderInline(t)" />
      </ul>
      <div v-if="b.notes?.length" class="cu-notes">
        <p v-for="(t, i) in b.notes" :key="i" v-html="renderInline(t)" />
      </div>
      <GuideTerm v-for="(c, i) in b.cmd || []" :key="i" :title="c.title" :lines="c.lines" />
      <CompareTable v-if="b.table" :columns="b.table.columns" :rows="b.table.rows" :caption="b.table.caption" />
      <GuideSteps v-if="b.steps" :steps="b.steps" />
      <GuideUrl v-if="b.url" :url="b.url.href" :path="b.url.path" :label="b.url.label" />
              <GuideShot v-if="b.shot" :src="b.shot.src" :label="b.shot.label" :caption="b.shot.caption" />
      <ul v-if="b.links?.length">
        <li v-for="(l, i) in b.links" :key="i">
          <a :href="l.url" :target="l.external ? '_blank' : undefined" :rel="l.external ? 'noopener sponsored nofollow' : undefined">{{ l.text }}</a>
        </li>
      </ul>
    </template>

    <nav class="cu-next" aria-label="接着看">
      <a v-for="n in page.next" :key="n.url" :href="n.url">
        <small>接着看</small>
        <strong>{{ n.text }}</strong>
      </a>
    </nav>

    <CtaBand title="还没上手？">
      <template #tools>
        <a class="cu-btn cu-btn--ghost cu-btn--md" :href="partnerUrl('ccswitch')" target="_blank" rel="noopener sponsored nofollow">CC Switch 下载 ↗</a>
        <a class="cu-btn cu-btn--ghost cu-btn--md" :href="partnerUrl('console')" target="_blank" rel="noopener">管理后台 ↗</a>
      </template>
    </CtaBand>
  </PageShell>
</template>
