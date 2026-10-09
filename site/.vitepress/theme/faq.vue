<script setup lang="ts">
/**
 * FAQ 页：顶部一排「买之前最关心的 5 个问题」常开 + 按分类展示 config/faq.ts 的全部问答。
 * 页内目录锚点指向各分类；末尾给出教程与人工客服入口。
 */
import PageShell from './components/PageShell.vue'
import JsonLd from './components/JsonLd.vue'
import FaqList from './components/FaqList.vue'
import ExternalCta from './components/ExternalCta.vue'
import { buyingQuestions, faqGroups, jsonLdFaq, product, siteConfig } from './pages/data'

/** 该分类在「买之前」区块里出现过，就不再重复铺开 */
const topIds = new Set(buyingQuestions.map((q) => q.id))
const rest = faqGroups
  .map((g) => ({ ...g, items: g.items.filter((it) => !topIds.has(it.id)) }))
  .filter((g) => g.items.length)
</script>

<template>
  <JsonLd id="cu-jsonld-faq" :json="jsonLdFaq" />

  <PageShell
    slug="faq"
    title="常见问题"
    lead="关于商品、购买、配置、接入、限速、数据安全的全部问题。找不到答案可以直接点右下角在线助手，输入关键词会秒回。"
  >
    <h2 id="cat-buying">买之前，先看这五个问题</h2>
    <p class="cu-more">这几条是购买前最常被问到的，直接展开在下面；其余问题按分类收在后面，点问题或「展开全部」都能看。</p>
    <FaqList :items="buyingQuestions" :default-open="5" />

    <section v-for="g in rest" :key="g.cat" class="cu-faq-cat-block">
      <h2 :id="'cat-' + g.cat" class="cu-faq-cat-block__head">
        {{ g.label }}<span>{{ g.items.length }} 条</span>
      </h2>
      <FaqList :items="g.items" />
    </section>

    <h2 id="more">还没解决？</h2>
    <ul>
      <li>卡密兑换、CC Switch 一键导入、模型列表为空——看<a href="/guide">使用教程</a>的「五步总览」与<a href="/guide/ccswitch#troubleshoot">排错清单</a>；</li>
      <li>先看<a href="/pricing#fair-use">公平使用</a>与<a href="/pricing#refund">退款规则</a>两节——大多数争议都能在这里定位；</li>
      <li>点右下角<strong>在线助手</strong>，输入关键词（如「429」「Base URL」「退款」「一键导入」）会直接给出对应答案；</li>
      <li>仍未解决，点右下角<strong>人工客服</strong>复制微信号 {{ siteConfig.contact.wechatId }} 或 QQ {{ siteConfig.contact.qq }}；联系人工时请附上<strong>账号标识、报错原文、发生时间</strong>，能显著加快处理。</li>
    </ul>

    <aside class="cu-band">
      <h2>看完 FAQ 还不确定，先按 ¥{{ product.price.replace(/[^\d.]/g, '') }} / {{ product.period }} 试一周期</h2>
      <p>只有一种套餐，订阅期内不按 token 计费，不满意按「退款规则」处理。</p>
      <div class="cu-cta-row cu-cta-row--center">
        <ExternalCta label="立即购买" variant="solid" size="lg" cta="faq_band" />
        <a class="cu-btn cu-btn--ghost cu-btn--md" href="/pricing">看套餐包含什么</a>
      </div>
      <p class="cu-hint cu-hint--center">最终价格与库存以下单页为准</p>
    </aside>

    <div class="cu-notice">{{ siteConfig.disclaimer }}</div>
  </PageShell>
</template>
