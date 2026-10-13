<script setup lang="ts">
/**
 * 信任层页面（关于 / 服务条款 / 隐私）—— 2026-10-13 新增。
 *
 * 为什么值得单独一个组件而不是三份 md：三页共用同一套外壳、同一份联系方式派生，
 * 且正文全部来自 config/trust.ts。GEO 场景下这三页是「权威性信号」的主要载体，
 * 写成可核验的句子比写成排版自由的 markdown 更可控，也不会出现三页说法不一致。
 *
 * 正文不写回 markdown（site/CLAUDE.md 硬规则）：页面正文在 .vitepress/theme/*.vue。
 */
import { computed } from 'vue'
import { useData } from 'vitepress'
import PageShell from './components/PageShell.vue'
import { trustPages } from '../../config/trust'
import { limits } from '../../config/rules'

// 一个组件服三页：frontmatter 里写 trustKey: about|terms|privacy，比注册三个 layout 少两处改动点。
const { frontmatter } = useData()
const page = computed(() => {
  const key = String(frontmatter.value.trustKey || '')
  const p = (trustPages as Record<string, (typeof trustPages)[keyof typeof trustPages]>)[key]
  if (!p) throw new Error(`frontmatter.trustKey=${key} 在 config/trust.ts 的 trustPages 里不存在`)
  return p
})
</script>

<template>
  <PageShell :slug="page.slug" :title="page.title" :lead="page.lead" :eyebrow="page.eyebrow">
    <div class="cu-trust">
      <section v-for="(s, i) in page.sections" :key="s.h2" class="cu-trust__sec">
        <h2 :id="`s-${i}`">{{ s.h2 }}</h2>
        <ul v-if="s.bullets">
          <li v-for="(it, j) in s.items" :key="j">{{ it }}</li>
        </ul>
        <p v-for="(it, j) in s.bullets ? [] : s.items" :key="j">{{ it }}</p>
      </section>
      <p class="cu-trust__note">
        本页数字与站内其它页面同源（限流 {{ limits.sessions }} 个会话窗口、单会话 {{ limits.concurrency }} 路并发、
        {{ limits.rpm }} 次/分钟）。改动以站内公告与商品详情为准。
      </p>
    </div>
  </PageShell>
</template>

<style scoped>
.cu-trust {
  max-width: 46rem;
}
.cu-trust__sec {
  margin-bottom: 30px;
}
.cu-trust__sec h2 {
  font-size: 19px;
  margin-bottom: 10px;
  line-height: 1.4;
}
.cu-trust__sec p,
.cu-trust__sec li {
  font-size: 15px;
  line-height: 1.85;
  color: var(--cu-text, #4a4843);
}
.cu-trust__sec p {
  margin-bottom: 10px;
}
.cu-trust__sec ul {
  margin: 0;
  padding-left: 20px;
}
.cu-trust__sec li {
  margin-bottom: 6px;
}
.cu-trust__note {
  margin-top: 36px;
  padding-top: 18px;
  border-top: 1px solid var(--cu-line, #e6e3da);
  font-size: 13px;
  color: #8f8d85;
  line-height: 1.7;
}
</style>
