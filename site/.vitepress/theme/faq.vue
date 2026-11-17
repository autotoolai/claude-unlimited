<script setup lang="ts">
/**
 * FAQ 页：顶部「买之前」精选（默认全收起）+ 按分类展示 config/faq.ts 的全部问答。
 * 页内目录锚点指向各分类；末尾「还没解决？」只链到 /contact 人工客服。
 */
import PageShell from './components/PageShell.vue'
import JsonLd from './components/JsonLd.vue'
import FaqList from './components/FaqList.vue'
import { buyingQuestions, faqGroups, jsonLdFaq } from './pages/data'

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
    lead="商品与套餐、开通与配置、日常使用、限速与报错、安全与联系。找不到答案可以直接点右下角在线助手，输入关键词会秒回。"
  >
    <h2 id="cat-buying">买之前，先看这几个问题</h2>
    <p class="cu-more">额度、退款、有效期——买前先把这几条看清；点问题即可展开。</p>
    <FaqList :items="buyingQuestions" />

    <section v-for="g in rest" :key="g.cat" class="cu-faq-cat-block">
      <h2 :id="'cat-' + g.cat">{{ g.label }}</h2>
      <p class="cu-more">{{ g.lead }}</p>
      <FaqList :items="g.items" />
    </section>

    <h2 id="more">还没解决？</h2>
    <aside class="cu-faq-contact" aria-label="联系人工客服">
      <div class="cu-faq-contact__text">
        <strong>上面找不到答案？直接联系人工客服。</strong>
        <p>
          微信、QQ 群与二维码都在<a href="/contact">联系我们</a>页。添加时请备注来意，并附上账号标识、报错原文、发生时间，处理更快。
        </p>
      </div>
      <div class="cu-faq-contact__acts">
        <a class="cu-btn cu-btn--ghost cu-btn--sm" href="/contact" data-cta="faq_to_contact">去联系人工客服</a>
      </div>
    </aside>

    <aside class="cu-band">
      <h2>看完 FAQ 还不确定，先去套餐页挑个档位</h2>
      <p>无限卡订阅期内不按 token 计费，不满意按商品详情页的退款条款处理。</p>
      <div class="cu-cta-row cu-cta-row--center">
        <a class="cu-btn cu-btn--solid cu-btn--lg" href="/pricing" data-cta="faq_band_to_pricing">查看套餐与价格</a>
      </div>
    </aside>

  </PageShell>
</template>
