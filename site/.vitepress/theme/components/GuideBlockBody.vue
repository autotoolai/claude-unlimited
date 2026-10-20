<script setup lang="ts">
/**
 * 教程小节渲染器：渲染一个已装配的小节。
 *
 * 「已装配」= config/guide.ts 的 guideBlocks() 已经做过三件事：合并共享块正文、
 * 给 H2 加页内序号、给截图加图注编号。组件只负责渲染，不做任何编号计算。
 *
 * 槽位顺序与 docs/guide_design_spec.md 一致：h2 → lead → 段落 → 列表 → 提示 →
 * 命令块 → 表格 → 步骤 → 网址行 → 插图 → 按钮 → 链接。
 */
import { renderInline } from '../utils/inline'
import GuideSteps from './GuideSteps.vue'
import GuideShot from './GuideShot.vue'
import GuideUrl from './GuideUrl.vue'
import GuideTerm from './GuideTerm.vue'
import CompareTable from './CompareTable.vue'
import type { GuideBlockResolved } from '../../../config/guide'

defineProps<{ block: GuideBlockResolved }>()
</script>

<template>
  <div class="cu-guide-block">
    <h2 :id="block.id">{{ block.h2 }}</h2>
    <p v-if="block.lead" class="cu-guide-lead" v-html="renderInline(block.lead)" />
    <p v-for="(t, i) in block.paras || []" :key="i" class="cu-guide-para" v-html="renderInline(t)" />
    <ul v-if="block.list?.length">
      <li v-for="(t, i) in block.list" :key="i" v-html="renderInline(t)" />
    </ul>
    <div v-if="block.notes?.length" class="cu-notes">
      <p v-for="(t, i) in block.notes" :key="i" v-html="renderInline(t)" />
    </div>
    <GuideTerm v-for="(c, i) in block.cmd || []" :key="i" :title="c.title" :lines="c.lines" />
    <CompareTable
      v-if="block.table"
      :columns="block.table.columns"
      :rows="block.table.rows"
      :caption="block.table.caption"
      :label-col="block.table.labelCol"
    />
    <GuideSteps v-if="block.steps" :steps="block.steps" :block-id="block.id" />
    <GuideUrl v-if="block.url" :url="block.url.href" :path="block.url.path" :label="block.url.label" />
    <GuideShot
      v-if="block.shot"
      class="cu-step-block__shot"
      :src="block.shot.src"
      :label="block.shot.label"
      :caption="block.shot.caption"
      :zoom="block.shot.zoom"
    />
    <div v-if="block.cta?.length" class="cu-cta-row">
      <a
        v-for="(l, i) in block.cta"
        :key="i"
        class="cu-btn cu-btn--ghost cu-btn--sm"
        :href="l.url"
        :target="l.external ? '_blank' : undefined"
        :rel="l.external ? 'noopener sponsored nofollow' : undefined"
        >{{ l.text }}</a
      >
    </div>
    <ul v-if="block.links?.length" class="cu-guide-links">
      <li v-for="(l, i) in block.links" :key="i">
        <a
          :href="l.url"
          :target="l.external ? '_blank' : undefined"
          :rel="l.external ? 'noopener sponsored nofollow' : undefined"
          >{{ l.text }}</a
        >
      </li>
    </ul>
  </div>
</template>
