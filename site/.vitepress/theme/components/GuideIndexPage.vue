<script setup lang="ts">
/**
 * 教程索引页（/guide）：选客户端。
 *
 * 这一页只回答一个问题：你打算用哪一种方式跑 Claude。选完进对应场景页，
 * 那里有从换 Key 到检测链路的完整步骤。旧的 /guide#锚点 也在这一页做兼容跳转
 * （guideLegacyAnchors，见 config/guide.ts）——fragment 不上服务器，只能客户端处理。
 *
 * 版式：跟套餐页、模型页同一套营销页外壳（满宽 1140px、页头居中），
 * 场景卡用模型页 .cu-mcard 的度量。具体见 docs/guide_design_spec.md。
 *
 * 2026-10-21：删掉页头下那块居中的答案框（.cu-guide-answer），页头下只留一段话。
 * 「做什么」与「选哪条路」合成一段，跟套餐页的引导语一个位置。
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

  <!-- 页头下的那段话就是一句话答案（config/guide.ts 的 guideIndex.answer）：
       原来它另起一块居中的答案框，下面又跟着 5 张卡片，框里的内容跟卡片标题重复。
       2026-10-21 起合并成页头副标题，版式跟套餐页一致（居中、限宽、无框），
       同一句话同时喂 llms-full.txt 与 JSON-LD 的 description。 -->
  <PageShell slug="/guide" :title="index.title" :lead="index.answer" :eyebrow="index.eyebrow">
    <h2 id="pick-client" class="cu-guide-index__label">{{ cards.length }} 条路径</h2>

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
