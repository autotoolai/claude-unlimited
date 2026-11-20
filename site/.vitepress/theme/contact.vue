<script setup lang="ts">
/**
 * 联系我们页：联系信息唯一主场。微信 / QQ 二维码与可复制号码来自 siteConfig.contact。
 * 售后、代理、商务共用同一通道；添加时备注来意。不接在线聊天插件。
 * 版式跟营销页一致：通道卡与场景卡铺满 --cu-wrap，不再收成窄列居中。
 */
import { computed } from 'vue'
import PageShell from './components/PageShell.vue'
import CopyChip from './components/CopyChip.vue'
import { siteConfig } from '../../config/site'
import JsonLd from './components/JsonLd.vue'
import { jsonLdContact } from './pages/data'

const contact = siteConfig.contact
const hasWechat = computed(() => !!contact.wechatId || !!contact.wechatQr)
const hasQq = computed(() => !!contact.qqGroup || !!contact.qqGroupQr)
const dual = computed(() => hasWechat.value && hasQq.value)

const scenes = [
  {
    title: '售后与技术',
    desc: '卡密、兑换、限速与报错；附账号与报错原文处理更快。',
  },
  {
    title: '代理与渠道',
    desc: '希望做 Token 代理或渠道分发，先看代理页说明，添加时备注「代理」。',
    link: { text: 'Token 代理', url: '/agency' },
  },
  {
    title: '商务与合作',
    desc: '商务洽谈、资源置换与其他合作意向，添加时备注「商务」。',
  },
]
</script>

<template>
  <JsonLd id="cu-jsonld-contact" :json="jsonLdContact" />
  <PageShell
    slug="contact"
    title="联系我们"
    lead="欢迎售后咨询、商务合作与渠道洽谈。扫码或复制微信号添加，备注来意即可。"
  >
    <div class="cu-contact">
      <div class="cu-contact__channels" :class="{ 'cu-contact__channels--dual': dual }">
        <div v-if="hasWechat" class="cu-contact__channel">
          <div v-if="contact.wechatQr" class="cu-contact__qr-wrap">
            <img
              class="cu-contact__qr"
              :src="contact.wechatQr"
              alt="客服微信二维码，用微信扫一扫"
              width="176"
              height="176"
            />
          </div>
          <div class="cu-contact__meta">
            <p class="cu-contact__channel-title">微信客服</p>
            <p class="cu-contact__channel-desc">扫一扫添加，或复制微信号搜索添加</p>
            <div v-if="contact.wechatId" class="cu-contact__row">
              <code class="cu-contact__id">{{ contact.wechatId }}</code>
              <CopyChip :text="contact.wechatId" label="复制" cta="contact_copy_wechat" />
            </div>
          </div>
        </div>

        <div v-if="hasQq" class="cu-contact__channel">
          <div v-if="contact.qqGroupQr" class="cu-contact__qr-wrap">
            <img
              class="cu-contact__qr"
              :src="contact.qqGroupQr"
              alt="QQ 群二维码，用 QQ 扫一扫加群"
              width="176"
              height="176"
            />
          </div>
          <div class="cu-contact__meta">
            <p class="cu-contact__channel-title">QQ 交流群</p>
            <p class="cu-contact__channel-desc">扫一扫加群，或复制群号搜索加入</p>
            <div v-if="contact.qqGroup" class="cu-contact__row">
              <code class="cu-contact__id">{{ contact.qqGroup }}</code>
              <CopyChip :text="contact.qqGroup" label="复制" cta="contact_copy_qq_group" />
            </div>
          </div>
        </div>
      </div>

      <section class="cu-contact__scenes" aria-labelledby="contact-scenes">
        <h2 id="contact-scenes">可以找我们做什么</h2>
        <div class="cu-cards cu-contact__scene-grid">
          <div v-for="s in scenes" :key="s.title" class="cu-card">
            <h3>{{ s.title }}</h3>
            <p>{{ s.desc }}</p>
            <p v-if="s.link" class="cu-contact__scene-link">
              <a :href="s.link.url">{{ s.link.text }} →</a>
            </p>
          </div>
        </div>
      </section>
    </div>
  </PageShell>
</template>
