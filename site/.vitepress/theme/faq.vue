<script setup lang="ts">
/**
 * FAQ 页：顶部「买之前最关心的 2 个问题」常开 + 按分类展示 config/faq.ts 的全部问答。
 * 页内目录锚点指向各分类；末尾给出教程入口与独立的人工客服联系区块（2026-10 从列表里的一句说明升级为区块）。
 */
import { ref } from 'vue'
import PageShell from './components/PageShell.vue'
import JsonLd from './components/JsonLd.vue'
import FaqList from './components/FaqList.vue'
import { copyTextOrPrompt } from './utils/copy'
import { buyingQuestions, faqGroups, jsonLdFaq, product, siteConfig } from './pages/data'

/** 该分类在「买之前」区块里出现过，就不再重复铺开 */
const topIds = new Set(buyingQuestions.map((q) => q.id))
const rest = faqGroups
  .map((g) => ({ ...g, items: g.items.filter((it) => !topIds.has(it.id)) }))
  .filter((g) => g.items.length)

/** 末尾联系区块的「复制微信号」，三级兜底与助手面板里的复制按钮共用 utils/copy.ts */
const copiedWechat = ref(false)
async function copyWechat() {
  const ok = await copyTextOrPrompt(siteConfig.contact.wechatId)
  copiedWechat.value = ok
  if (ok) setTimeout(() => (copiedWechat.value = false), 2000)
}
</script>

<template>
  <JsonLd id="cu-jsonld-faq" :json="jsonLdFaq" />

  <PageShell
    slug="faq"
    title="常见问题"
    lead="关于商品、配置、接入、限速、数据安全的全部问题。找不到答案可以直接点右下角在线助手，输入关键词会秒回。"
  >
    <h2 id="cat-buying">买之前，先看这两个问题</h2>
    <p class="cu-more">这两条是购买前最常被问到的，直接展开在下面；其余问题按分类收在后面，点问题即可展开。</p>
    <FaqList :items="buyingQuestions" :default-open="2" />

    <section v-for="g in rest" :key="g.cat" class="cu-faq-cat-block">
      <h2 :id="'cat-' + g.cat" class="cu-faq-cat-block__head">
        {{ g.label }}<span>{{ g.items.length }} 条</span>
      </h2>
      <FaqList :items="g.items" />
    </section>

    <h2 id="more">还没解决？</h2>
    <ul>
      <li>卡密兑换、CC Switch 一键导入、模型列表为空——看<a href="/guide">使用教程</a>的「2. 换取 API Key」「3. 一键导入配置」与<a href="/faq#cat-setup">常见问题 · 使用与配置</a>；</li>
      <li>先看本页「限速与封号」与「数据与安全」两节——大多数争议都能在这里定位；</li>
      <li>点右下角<strong>在线助手</strong>，输入关键词（如「429」「Base URL」「一键导入」）会直接给出对应答案；</li>
    </ul>

    <aside class="cu-faq-contact" aria-label="联系人工客服">
      <div class="cu-faq-contact__text">
        <strong>还是没解决？直接找人工客服。</strong>
        <p>微信联系，微信号 <code>{{ siteConfig.contact.wechatId }}</code>。附上<strong>账号标识、报错原文、发生时间</strong>，能显著加快处理。也可以打开右下角的在线助手，面板底部有「联系客服」按钮。</p>
      </div>
      <button
        type="button"
        class="cu-btn cu-btn--ghost cu-btn--sm"
        data-cta="faq_copy_wechat"
        @click="copyWechat"
      >
        {{ copiedWechat ? '已复制' : '复制微信号' }}
      </button>
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
