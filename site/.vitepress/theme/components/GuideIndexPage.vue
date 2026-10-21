<script setup lang="ts">
/**
 * 教程索引页（/guide）：选客户端。
 *
 * 这一页只回答一个问题：你在哪个客户端里用 Claude。选完进对应场景页，
 * 那里有从换 Key 到检测链路的完整步骤。旧的 /guide#锚点 也在这一页做兼容跳转
 * （guideLegacyAnchors，见 config/guide.ts）——fragment 不上服务器，只能客户端处理。
 */
import { onMounted } from 'vue'
import PageShell from './PageShell.vue'
import JsonLd from './JsonLd.vue'
import CtaBand from './CtaBand.vue'
import { guideIndex, guideSceneCards, guideLegacyAnchors } from '../../../config/guide'
import { partnerUrl } from '../../../config/site'
import { jsonLdGuideIndex } from '../pages/data'

const index = guideIndex

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

  <PageShell slug="/guide" narrow :title="index.title" :lead="index.lead" :eyebrow="index.eyebrow">
    <!-- 一句话答案：与 5 个场景页同一个来源（config/guide.ts 的 guideIndex.answer），
         这样索引页的答案、JSON-LD 里的 description、llms-full.txt 里的那句是同一句话，不会各说各的 -->
    <p class="cu-guide-answer">{{ index.answer }}</p>

    <h2 id="pick-client" class="cu-guide-h2">选一个你用的客户端</h2>
    <p class="cu-guide-lead">
      每条路都是从换取 API Key 开始，到检测链路结束。跟着做就行，不用先懂原理。
    </p>

    <div class="cu-cards cu-cards--two cu-guide-scene-cards">
      <a
        v-for="c in guideSceneCards()"
        :key="c.id"
        class="cu-card cu-card--link cu-guide-scene-card"
        :href="c.url"
      >
        <h3>{{ c.title }}</h3>
        <p>{{ c.desc }}</p>
        <small class="cu-guide-scene-card__meta">{{ c.meta }}</small>
      </a>
    </div>

    <nav class="cu-next" aria-label="接着看">
      <a v-for="n in index.next" :key="n.url" :href="n.url">
        <small>接着看</small>
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
