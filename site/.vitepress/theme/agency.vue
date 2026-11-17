<script setup lang="ts">
/**
 * Token 代理页：招商说服页。侧重为什么值得做（无押金、复购、副业、教学答疑）。
 * 转化：微信二维码（siteConfig.contact）与心态建议左右并排；备注「代理」；合作细节加微后沟通。
 */
import { computed } from 'vue'
import PageShell from './components/PageShell.vue'
import JsonLd from './components/JsonLd.vue'
import FaqList from './components/FaqList.vue'
import CopyChip from './components/CopyChip.vue'
import { siteConfig } from '../../config/site'
import {
  agencyLead,
  agencyAudiences,
  agencyBenefits,
  agencyMindsets,
  agencyFaqItems,
  jsonLdAgency,
} from './pages/data'

const contact = siteConfig.contact
const hasWechat = computed(() => !!contact.wechatId || !!contact.wechatQr)
</script>

<template>
  <JsonLd id="cu-jsonld-agency" :json="jsonLdAgency" />

  <PageShell
    slug="agency"
    title="Token 代理"
    :lead="agencyLead"
    eyebrow="无押金 · 适合长期副业"
  >
    <div class="cu-agency">
      <h2 id="benefits">为什么值得做</h2>
      <div class="cu-cards cu-agency__grid">
        <div v-for="b in agencyBenefits" :key="b.title" class="cu-card">
          <h3>{{ b.title }}</h3>
          <p>{{ b.desc }}</p>
        </div>
      </div>

      <h2 id="who">适合谁</h2>
      <div class="cu-cards cu-agency__grid">
        <div v-for="a in agencyAudiences" :key="a.title" class="cu-card">
          <h3>{{ a.title }}</h3>
          <p>{{ a.desc }}</p>
        </div>
      </div>

      <h2 id="apply">加微信了解合作</h2>
      <p class="cu-agency__apply-lead">
        扫码或复制微信号添加，备注「代理」。售后与 QQ 群等其它通道见
        <a href="/contact">联系我们</a>。
      </p>
      <div class="cu-agency__apply" :class="{ 'cu-agency__apply--solo': !hasWechat }">
        <div v-if="hasWechat" class="cu-agency__cta">
          <div class="cu-contact__channel">
            <div v-if="contact.wechatQr" class="cu-contact__qr-wrap">
              <img
                class="cu-contact__qr"
                :src="contact.wechatQr"
                alt="客服微信二维码，用微信扫一扫，备注代理"
                width="176"
                height="176"
              />
            </div>
            <div class="cu-contact__meta">
              <p class="cu-contact__channel-title">微信客服</p>
              <p class="cu-contact__channel-desc">扫一扫添加，备注「代理」</p>
              <div v-if="contact.wechatId" class="cu-contact__row">
                <code class="cu-contact__id">{{ contact.wechatId }}</code>
                <CopyChip :text="contact.wechatId" label="复制" cta="agency_copy_wechat" />
              </div>
            </div>
          </div>
        </div>

        <aside class="cu-agency__mindset-panel" aria-label="给代理的心态建议">
          <ol class="cu-agency__mindset">
            <li v-for="(m, i) in agencyMindsets" :key="m.title" class="cu-agency__mindset-item">
              <span class="cu-agency__mindset-no" aria-hidden="true">{{ String(i + 1).padStart(2, '0') }}</span>
              <p class="cu-agency__mindset-text">
                <strong>{{ m.title }}</strong>{{ m.desc }}
              </p>
            </li>
          </ol>
        </aside>
      </div>

      <h2 id="faq">常见问题</h2>
      <FaqList :items="agencyFaqItems" />
    </div>
  </PageShell>
</template>
