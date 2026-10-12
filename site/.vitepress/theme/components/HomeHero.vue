<script setup lang="ts">
/**
 * 首页首屏：居中排布的大标题 + 一句话价值 + 双 CTA + 提示 + 信任短句 + 接入演示终端。
 * 标题逐词从遮罩里上浮（cu-hero__w / cu-hero__i，动画在 02_hero.css），终端随机体扶正
 * （useStageTilt）。终端本体在 LiveTerminal.vue：挂载后真的向网关发一次 /v1/messages，
 * 逐字打出命令、回放状态行与回复，无 JS 时退到静态首帧。
 * H1 按短语分词（siteConfig.taglinePhrases），不改文案本身。
 */
import { siteConfig } from '../../../config/site'
import ExternalCta from './ExternalCta.vue'
import LiveTerminal from './LiveTerminal.vue'
import { useStageTilt, useHeroReveal } from '../composables/use_shell'

useStageTilt()
useHeroReveal()
</script>

<template>
  <section class="cu-hero">
    <div class="cu-hero__inner">
      <p class="cu-hero__badge">
        <span class="cu-hero__badge-dot" />
        Claude API · 固定订阅 · 不按 token 计费
      </p>
      <h1 class="cu-hero__title">
        <span v-for="(w, i) in siteConfig.taglinePhrases" :key="i" class="cu-hero__w"><span class="cu-hero__i" :style="{ '--i': i }">{{ w }}</span></span>
      </h1>
      <p class="cu-lead">
        {{ siteConfig.name }}：订阅期内调用 Claude 不按 token 计费，用多少都是同一份订阅价。无论你是在 Claude Code 里
        重构整个项目、用 Cursor 读长代码库，还是让 agent 自动执行多步任务，都不必再盯着用量仪表盘。改一个 Base URL
        加一个 Key 即可接入你现有的工具和 SDK。
      </p>
      <div class="cu-cta-row cu-cta-row--center">
        <ExternalCta label="立即购买" variant="primary" size="lg" cta="hero_primary" />
        <a class="cu-btn cu-btn--ghost cu-btn--lg" href="/pricing">看档位与价格</a>
      </div>
      <div class="cu-hero__stage">
        <LiveTerminal />
      </div>
    </div>
  </section>
</template>