<script setup lang="ts">
/** 首页首屏。CTA 统一走 ExternalCta（URL 从 config/site.ts 取），本组件不硬编码 shopUrl */
import { siteConfig } from '../../../config/site'
</script>

<template>
  <section class="cu-hero">
    <div class="cu-hero__inner">
      <div class="cu-hero__copy">
        <p class="cu-eyebrow">Claude API · 固定订阅 · 不按 token 计费</p>
        <h1>{{ siteConfig.tagline }}</h1>
        <p class="cu-lead">
          {{ siteConfig.name }}：订阅期内调用 Claude 不再按 token 单独计费。无论你是在 Claude Code 里重构整个项目、
          用 Cursor 读长代码库，还是让 agent 自动执行多步任务，成本都只是那一份订阅价。改一个 Base URL 加一个 Key
          即可接入你现有的工具和 SDK。
        </p>
        <div class="cu-cta-row">
          <ExternalCta label="立即购买" variant="primary" size="lg" cta="hero_primary" />
          <a class="cu-btn cu-btn--ghost cu-btn--md" href="/unlimited">了解无限额度</a>
        </div>
        <p class="cu-hint">买完即用，不排队不审核，5 分钟内跑起第一请求。最终价格以下单页为准。</p>
      </div>
      <div class="cu-hero__art">
        <svg viewBox="0 0 440 330" role="img" aria-label="一个 Key 通吃多个客户端的示意图">
          <g class="cu-art-node">
            <rect x="146" y="134" width="148" height="62" rx="14" fill="var(--cu-accent)" />
            <text x="220" y="160" text-anchor="middle" font-size="14" font-weight="700" fill="#FFF6EC" font-family="ui-monospace, Consolas, monospace">sk-ant-••••</text>
            <text x="220" y="180" text-anchor="middle" font-size="11" fill="#F6D9BF">一个 Key 通吃</text>
          </g>
          <g class="cu-art-node">
            <rect x="20" y="40" width="108" height="36" rx="9" fill="var(--cu-card)" stroke="var(--cu-line-strong)" />
            <text x="74" y="62" text-anchor="middle" font-size="12" fill="var(--cu-ink-2)" font-family="inherit">Claude Code</text>
            <rect x="20" y="254" width="108" height="36" rx="9" fill="var(--cu-card)" stroke="var(--cu-line-strong)" />
            <text x="74" y="276" text-anchor="middle" font-size="12" fill="var(--cu-ink-2)" font-family="inherit">Cursor</text>
            <rect x="312" y="40" width="108" height="36" rx="9" fill="var(--cu-card)" stroke="var(--cu-line-strong)" />
            <text x="366" y="62" text-anchor="middle" font-size="12" fill="var(--cu-ink-2)" font-family="inherit">Cline</text>
            <rect x="312" y="254" width="108" height="36" rx="9" fill="var(--cu-card)" stroke="var(--cu-line-strong)" />
            <text x="366" y="276" text-anchor="middle" font-size="12" fill="var(--cu-ink-2)" font-family="inherit">Python / Go SDK</text>
            <rect x="166" y="12" width="108" height="36" rx="9" fill="var(--cu-card)" stroke="var(--cu-line-strong)" />
            <text x="220" y="34" text-anchor="middle" font-size="12" fill="var(--cu-ink-2)" font-family="inherit">Aider</text>
            <rect x="166" y="282" width="108" height="36" rx="9" fill="var(--cu-card)" stroke="var(--cu-line-strong)" />
            <text x="220" y="304" text-anchor="middle" font-size="12" fill="var(--cu-ink-2)" font-family="inherit">Roo Code · Continue</text>
          </g>
          <g class="cu-art-link" stroke="var(--cu-accent)" stroke-width="1.5" stroke-dasharray="4 4" fill="none">
            <path d="M74 76v18c0 18 14 36 34 40h38" />
            <path d="M366 76v18c0 18-14 36-34 40h-38" />
            <path d="M220 48v86" />
            <path d="M74 254v-18c0-18 14-36 34-40h38" />
            <path d="M366 254v-18c0-18-14-36-34-40h-38" />
            <path d="M220 282v-86" />
          </g>
        </svg>
      </div>
    </div>
  </section>
</template>