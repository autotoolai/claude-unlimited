<script setup lang="ts">
/**
 * 教程场景页（/guide/cc、/guide/desktop…）：一条完整路径，从换 Key 到检测链路。
 *
 * 页内结构：页头 → 场景切换条 → 一句话答案 → 小节流 → 常见问题 → 相关阅读 → 页尾。
 * 小节的编号与图注编号由 config/guide.ts 的 guideBlocks() 统一生成，组件不参与计算。
 */
import { computed } from 'vue'
import { useData } from 'vitepress'
import PageShell from './PageShell.vue'
import JsonLd from './JsonLd.vue'
import GuideSceneNav from './GuideSceneNav.vue'
import GuideBlockBody from './GuideBlockBody.vue'
import GuideFaqList from './GuideFaqList.vue'
import CtaBand from './CtaBand.vue'
import { guidePageByScene, guideBlocks } from '../../../config/guide'
import { partnerUrl } from '../../../config/site'
import { jsonLdGuideScene } from '../pages/data'
import type { GuideSceneId } from '../../../config/guide'

const { frontmatter } = useData()
const scene = computed(() => String(frontmatter.value.scene) as GuideSceneId)
const page = computed(() => guidePageByScene(scene.value))
const blocks = computed(() => (page.value ? guideBlocks(page.value) : []))
</script>

<template>
  <template v-if="page">
    <JsonLd id="cu-jsonld-guide-scene" :json="jsonLdGuideScene(page)" />

    <PageShell
      :slug="page.slug"
      toc="side"
      :title="page.title"
      :lead="page.lead"
      :eyebrow="page.eyebrow"
    >
      <GuideSceneNav :current="scene" />

      <!-- 一句话答案：结论式独立成段，是被 AI 搜索直接引用的那一段 -->
      <p class="cu-guide-answer">{{ page.answer }}</p>

      <section class="cu-guide-rail">
        <GuideBlockBody v-for="b in blocks" :key="b.id" :block="b" />
      </section>

      <h2 id="faq" class="cu-guide-h2">常见问题</h2>
      <GuideFaqList :items="page.faq" />

      <h2 id="related" class="cu-guide-h2">相关阅读</h2>
      <ul class="cu-guide-links">
        <li v-for="(r, i) in page.related" :key="i">
          <a :href="r.url">{{ r.text }}</a>
        </li>
      </ul>

      <nav class="cu-next" aria-label="接着看">
        <a v-for="n in page.next" :key="n.url" :href="n.url">
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
</template>
