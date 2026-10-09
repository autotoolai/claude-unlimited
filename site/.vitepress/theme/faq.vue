<script setup lang="ts">
/** FAQ 页：按分类展示 config/faq.ts 的全部问答，页内目录锚点指向各分类；末尾给出教程与人工客服入口。 */
import PageShell from './components/PageShell.vue'
import JsonLd from './components/JsonLd.vue'
import FaqList from './components/FaqList.vue'
import { faqGroups, jsonLdFaq, siteConfig } from './pages/data'
</script>

<template>
  <JsonLd id="cu-jsonld-faq" :json="jsonLdFaq" />

  <PageShell
    slug="faq"
    title="常见问题"
    lead="关于商品、购买、配置、接入、限速、数据安全的全部问题。找不到答案可以直接点右下角在线助手，输入关键词会秒回。"
  >
    <nav class="cu-anchor-nav" aria-label="问题分类">
      <a v-for="g in faqGroups" :key="g.cat" :href="'#cat-' + g.cat">{{ g.label }}（{{ g.items.length }}）</a>
      <a href="#more">还没解决？</a>
    </nav>

    <section v-for="g in faqGroups" :id="'cat-' + g.cat" :key="g.cat" class="cu-faq-cat-block">
      <h2>{{ g.label }}</h2>
      <FaqList :items="g.items" />
    </section>

    <h2 id="more">还没解决？</h2>
    <ul>
      <li>卡密兑换、CC Switch 一键导入、模型列表为空——看<a href="/guide">使用教程</a>的「五步总览」与<a href="/guide/ccswitch#troubleshoot">排错清单</a>；</li>
      <li>先看<a href="/pricing#fair-use">公平使用</a>与<a href="/pricing#refund">退款规则</a>两节——大多数争议都能在这里定位；</li>
      <li>点右下角<strong>在线助手</strong>，输入关键词（如「429」「Base URL」「退款」「一键导入」）会直接给出对应答案；</li>
      <li>仍未解决，点右下角<strong>人工客服</strong>扫微信二维码，或在助手面板里复制 QQ {{ siteConfig.contact.qq || '' }}；联系人工时请附上<strong>账号标识、报错原文、发生时间</strong>，能显著加快处理。</li>
    </ul>

    <div class="cu-notice">{{ siteConfig.disclaimer }}</div>
  </PageShell>
</template>