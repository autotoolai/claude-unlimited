<script setup lang="ts">
/**
 * 教程页渲染器：把 config/guide.ts 的一页数据渲染成 PageShell 内的正文。
 * 所有教程页共用这一个组件，页面组件（theme/guide_*.vue）只负责把 slug 传进来。
 */
import { computed } from 'vue'
import PageShell from './PageShell.vue'
import JsonLd from './JsonLd.vue'
import GuideSteps from './GuideSteps.vue'
import GuideShot from './GuideShot.vue'
import GuideTerm from './GuideTerm.vue'
import CompareTable from './CompareTable.vue'
import CtaBand from './CtaBand.vue'
import { guidePage, guidePages } from '../../../config/guide'
import { siteConfig } from '../../../config/site'
import { guideNavItems, jsonLdGuide, modelIdRows } from '../pages/data'

const props = defineProps<{ slug: string }>()

/** 目录 slug：/guide/clients → guide_clients，与 SECTION_NAV 的键一一对应 */
const navKey = computed(() => props.slug.replace(/\//g, '_'))
const page = computed(() => guidePage(props.slug))
/** 顶部互链与页尾「接着看」共用 guideNavItems（已按 order 升序），保证各页顺序一致 */
const others = computed(() => guideNavItems.filter((g) => g.url !== props.slug))
const next = computed(() => page.value.next.map((n) => ({ ...n, desc: others.value.find((g) => g.url === n.url)?.desc ?? '' })))
const guideJsonLd = computed(() => jsonLdGuide(page.value))
</script>

<template>
  <JsonLd id="cu-jsonld-guide" :json="guideJsonLd" />

  <PageShell :slug="navKey" :title="page.title" :lead="page.lead" :eyebrow="page.eyebrow">
    <nav class="cu-anchor-nav" aria-label="教程目录">
      <a v-for="p in others" :key="p.url" :href="p.url">{{ p.nav }}</a>
    </nav>

    <template v-for="b in page.blocks" :key="b.id">
      <h2 :id="b.id">{{ b.h2 }}</h2>
      <p v-if="b.lead">{{ b.lead }}</p>
      <p v-for="(t, i) in b.paras || []" :key="i">{{ t }}</p>
      <ul v-if="b.list?.length">
        <li v-for="(t, i) in b.list" :key="i">{{ t }}</li>
      </ul>
      <div v-if="b.notes?.length" class="cu-notes">
        <p v-for="(t, i) in b.notes" :key="i">{{ t }}</p>
      </div>
      <GuideTerm v-for="(c, i) in b.cmd || []" :key="i" :title="c.title" :lines="c.lines" />
      <!-- 模型 ID 表（模型页 / 接入页）：数据来自 config/models.ts -->
      <CompareTable
        v-if="b.id === 'ids'"
        :columns="['层级', '适合场景', '建议']"
        :rows="modelIdRows"
        caption="以 CC Switch「获取模型列表」的实际返回为准"
      />
      <CompareTable v-else-if="b.table" :columns="b.table.columns" :rows="b.table.rows" :caption="b.table.caption" />
      <GuideSteps v-if="b.steps" :steps="b.steps" />
      <GuideShot v-if="b.shot" :src="b.shot.src" :label="b.shot.label" :caption="b.shot.caption" />
      <ul v-if="b.links?.length">
        <li v-for="(l, i) in b.links" :key="i">
          <a :href="l.url" :target="l.external ? '_blank' : undefined" :rel="l.external ? 'noopener sponsored nofollow' : undefined">{{ l.text }}</a>
        </li>
      </ul>
    </template>

    <nav class="cu-next" aria-label="接着看">
      <a v-for="n in next" :key="n.url" :href="n.url">
        <small>接着看</small>
        <strong>{{ n.text }}</strong>
        <span>{{ n.desc }}</span>
      </a>
    </nav>

    <CtaBand title="还没买？看一眼怎么计费" />

    <div class="cu-notice">{{ siteConfig.disclaimer }}</div>
  </PageShell>
</template>
