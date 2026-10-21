<script setup lang="ts">
/**
 * 教程索引页（/guide）：选客户端。
 *
 * 这一页只回答一个问题：你在哪个客户端里用 Claude。选完进对应场景页，
 * 那里有从换 Key 到检测链路的完整步骤。旧的 /guide#锚点 也在这一页做兼容跳转
 * （guideLegacyAnchors，见 config/guide.ts）——fragment 不上服务器，只能客户端处理。
 *
 * 版式：跟套餐页、模型页同一套营销页外壳（满宽 1140px、页头居中），
 * 场景卡用模型页 .cu-mcard 的度量。具体见 docs/guide_design_spec.md。
 */
import { computed, onMounted } from 'vue'
import PageShell from './PageShell.vue'
import JsonLd from './JsonLd.vue'
import CtaBand from './CtaBand.vue'
import { guideIndex, guideSceneCards, guideLegacyAnchors } from '../../../config/guide'
import { partnerUrl } from '../../../config/site'
import { jsonLdGuideIndex } from '../pages/data'

const index = guideIndex
const cards = computed(() => guideSceneCards())

/** 旧锚点兼容：/guide#models 这类老链接跳到新场景页的同名小节 */
onMounted(() => {
  const hash = decodeURIComponent(window.location.hash.replace(/^#/, ''))
  if (!hash) return
  const target = guideLegacyAnchors[hash]
  if (target) window.location.replace(target)
})
</script>

<template>
  <JsonLd id="cu-jsonld-guide-index" :json="jsonLdGuideIndex()" />

  <PageShell slug="/guide" :title="index.title" :lead="index.lead" :eyebrow="index.eyebrow">
    <!-- 一句话答案：与 5 个场景页同一个来源（config/guide.ts 的 guideIndex.answer），
         这样索引页的答案、JSON-LD 里的 description、llms-full.txt 里的那句是同一句话，不会各说各的。
         样式见 shell_extra.css 的「教程索引页」段：居中的结论条（不是场景页那种左侧墨条）。 -->
    <p class="cu-guide-answer">{{ index.answer }}</p>

    <h2 id="pick-client" class="cu-guide-index__label">{{ cards.length }} 个客户端</h2>

    <div class="cu-guide-scene-cards">
      <a
        v-for="c in cards"
        :key="c.id"
        class="cu-guide-scene-card"
        :class="{ 'cu-guide-scene-card--wide': c.wide }"
        :href="c.url"
      >
        <h3>{{ c.title }}</h3>
        <p>{{ c.desc }}</p>
        <small class="cu-guide-scene-card__meta">{{ c.meta }}</small>
      </a>
    </div>

    <h2 class="cu-guide-index__label">接着看</h2>
    <nav class="cu-next" aria-label="接着看">
      <a v-for="n in index.next" :key="n.url" :href="n.url">
        <strong>{{ n.text }}</strong>
      </a>
    </nav>

    <CtaBand title="还没上手？">
      <template #tools>
        <a class="cu-btn cu-btn--ghost cu-btn--md" :href="partnerUrl('ccswitch')" target="_blank" rel="noopener sponsored nofollow" data-cta="guide_ccswitch">CC Switch 下载 ↗</a>
        <a class="cu-btn cu-btn--ghost cu-btn--md" :href="partnerUrl('console')" target="_blank" rel="noopener" data-cta="guide_console">管理后台 ↗</a>
      </template>
    </CtaBand>
  </PageShell>
</template>
