<script setup lang="ts">
import { renderInline } from '../utils/inline'

/**
 * 教程步骤块：左侧衬线序号 + 细线分隔，右侧正文（段落 / 要做的事 / 提示 / 命令 / 截图）。
 * 数据来自 config/guide.ts 的 GuideStep[]，页面组件不写死步骤内容。
 */
import GuideShot from './GuideShot.vue'
import GuideTerm from './GuideTerm.vue'
import GuideUrl from './GuideUrl.vue'
import type { GuideStep } from '../../../config/guide'

defineProps<{ steps: GuideStep[]; /** 序号起始（默认 1） */ start?: number }>()
</script>

<template>
  <ol class="cu-steps-block">
    <li v-for="(s, i) in steps" :key="s.title" class="cu-step-block">
      <span class="cu-step-block__no" aria-hidden="true">{{ (start ?? 1) + i }}</span>
      <div class="cu-step-block__body">
        <h3>{{ s.title }}</h3>
        <p v-for="(p, j) in s.body" :key="j" v-html="renderInline(p)" />
        <p v-if="s.do" class="cu-step-block__do"><span class="cu-step-block__do-label">要做的事</span><span v-html="renderInline(s.do)" /></p>
        <ul v-if="s.tips?.length" class="cu-step-block__tips">
          <li v-for="(t, j) in s.tips" :key="j" v-html="renderInline(t)" />
        </ul>
        <GuideUrl v-if="s.url" :url="s.url.href" :path="s.url.path" :label="s.url.label" />
        <GuideTerm v-if="s.cmd" :lines="s.cmd" />
        <GuideShot v-if="s.shot" class="cu-step-block__shot" :src="s.shot.src" :label="s.shot.label" :caption="s.shot.caption" />
      </div>
    </li>
  </ol>
</template>
