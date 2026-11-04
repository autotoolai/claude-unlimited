<script setup lang="ts">
/**
 * 管理后台功能介绍页：讲清后台能做什么、买完怎么上手。
 * 主 CTA 新标签打开 partners.console；用户可见文案不强调「本页只做说明」，
 * rsxermu666 域名只出现在 CTA 主机名与 SEO 层（meta / JSON-LD / keywords）。
 */
import PageShell from './PageShell.vue'
import JsonLd from './JsonLd.vue'
import FaqList from './FaqList.vue'
import CtaBand from './CtaBand.vue'
import { partnerUrl } from '../../../config/site'
import {
  consoleFeatures,
  consoleSteps,
  consoleBackupDomains,
  consoleFaqItems,
  jsonLdConsole,
} from '../pages/data'

const href = partnerUrl('console')
const host = (() => {
  try {
    return new URL(href).hostname
  } catch {
    return href.replace(/^https?:\/\//, '').replace(/\/$/, '')
  }
})()
</script>

<template>
  <JsonLd id="cu-jsonld-console" :json="jsonLdConsole" />

  <PageShell
    slug="console"
    title="管理后台"
    lead="兑换激活码、提取 API Key、一键导入配置、查看用量与公告——买完卡密后要用的能力都在这里。"
    eyebrow="兑换 · 提 Key · 查用量"
  >
    <div class="cu-console-portal">
      <a
        class="cu-console-portal__btn"
        :href="href"
        target="_blank"
        rel="noopener"
        data-cta="console_main"
      >
        <span class="cu-console-portal__action">
          <span class="cu-console-portal__label">进入管理后台</span>
          <span class="cu-console-portal__host">{{ host }}</span>
        </span>
        <span class="cu-console-portal__arrow" aria-hidden="true">↗</span>
      </a>
      <p id="domain" class="cu-console-portal__alt">
        打不开？用备用
        <a
          v-for="d in consoleBackupDomains"
          :key="d"
          :href="'https://' + d"
          target="_blank"
          rel="noopener"
          data-cta="console_backup"
        >{{ d }}</a>
      </p>
    </div>

    <h2 id="steps">买完卡密后怎么走</h2>
    <ol class="cu-console-steps">
      <li v-for="s in consoleSteps" :key="s.n" class="cu-console-step">
        <span class="cu-console-step__n" aria-hidden="true">{{ s.n }}</span>
        <div class="cu-console-step__body">
          <h3 class="cu-console-step__title">{{ s.title }}</h3>
          <p>{{ s.blurb }}</p>
        </div>
      </li>
    </ol>

    <h2 id="features">后台能做什么</h2>
    <div class="cu-cgrid">
      <article v-for="f in consoleFeatures" :key="f.name" class="cu-ccard">
        <div class="cu-ccard__head">
          <span class="cu-ccard__mark">{{ f.mark }}</span>
          <h3 class="cu-ccard__name">{{ f.name }}</h3>
        </div>
        <p class="cu-ccard__blurb">{{ f.blurb }}</p>
      </article>
    </div>

    <h2 id="faq">后台常见问题</h2>
    <FaqList :items="consoleFaqItems" :default-open="0" />

    <CtaBand title="还没有卡密？先看套餐" />
  </PageShell>
</template>
