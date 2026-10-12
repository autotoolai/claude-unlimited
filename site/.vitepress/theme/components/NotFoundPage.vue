<script setup lang="ts">
/**
 * 404 页：除了返回入口，也挂上在线助手浮标 —— 找不到页面的用户往往正是最需要客服的人，
 * 2026-10 之前这里是全站唯一没有浮标的页面。
 */
import { siteConfig } from '../../../config/site'
import { kefuItems } from '../kefu_items'

const kefu = { entries: kefuItems, contact: siteConfig.contact, position: 'right' as const }
</script>

<template>
  <main class="cu-shell">
    <div class="cu-page">
      <div class="cu-404">
        <p class="cu-eyebrow">404</p>
        <h1>页面不存在</h1>
        <p class="cu-page__lead">你要找的页面可能已经移动或从未存在。回到首页，或看看使用教程与常见问题。</p>
        <div class="cu-cta-row">
          <a class="cu-btn cu-btn--primary cu-btn--md" href="/">返回首页</a>
          <a class="cu-btn cu-btn--ghost cu-btn--md" href="/guide">使用教程</a>
          <a class="cu-btn cu-btn--ghost cu-btn--md" href="/faq">常见问题</a>
        </div>
        <KefuWidget :entries="kefu.entries" :contact="kefu.contact" :position="kefu.position" />
      </div>
    </div>
  </main>
</template>