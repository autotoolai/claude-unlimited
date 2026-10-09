<script setup lang="ts">
/**
 * 人工客服浮标 + 联系方式面板。
 *
 * 数据全部来自 config/site.ts 的 contact（微信号 / 二维码 / QQ / QQ 群 / 邮箱）与 partners
 * （兑换页地址）。二维码路径留空时不渲染占位框，改成「先复制微信号」的引导——空占位框会让
 * 用户以为客服还没准备好。组件不硬编码任何联系方式或平台地址。
 */
import { computed, ref } from 'vue'
import { siteConfig, partnerUrl, activationReady } from '../../../config/site'

const c = computed(() => siteConfig.contact)
const open = ref(false)
const copied = ref('')
const activation = computed(() => partnerUrl('activation'))
const hasQr = computed(() => !!c.value.wechatQr)
const hasWechat = computed(() => !!c.value.wechatId)
const hasQq = computed(() => !!c.value.qq)
const hasGroup = computed(() => !!c.value.qqGroup)
const hasEmail = computed(() => !!c.value.email)
const anyContact = computed(() => hasWechat.value || hasQq.value || hasGroup.value || hasEmail.value)

/**
 * 复制：优先用异步剪贴板 API（需要安全上下文 / 权限），失败时退回 execCommand('copy')，
 * 再失败就选中文本并提示手动复制——不能因为浏览器拒绝剪贴板就把按钮做成死的。
 */
async function copy(text: string, label: string) {
  if (!text) return
  try {
    await navigator.clipboard?.writeText(text)
    copied.value = label
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.cssText = 'position:fixed;opacity:0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand?.('copy')
    ta.remove()
    copied.value = ok ? label : '复制失败，请手动选中'
  }
  setTimeout(() => (copied.value = ''), 2000)
}
</script>

<template>
  <div class="cu-human">
    <aside v-if="open" class="cu-human__panel" role="dialog" aria-label="人工客服">
      <header class="cu-human__head">
        <div>
          <strong>人工客服</strong>
          <small>{{ c.hours }}</small>
        </div>
        <button class="cu-human__close" type="button" aria-label="关闭" @click="open = false">×</button>
      </header>
      <div class="cu-human__body">
        <p class="cu-human__hint">在线助手答不上来时，直接复制微信号或 QQ 联系我们；报故障请附上账号标识与报错截图。</p>

        <img v-if="hasQr" class="cu-human__qr" :src="c.wechatQr" alt="客服微信二维码" />

        <p v-if="hasWechat" class="cu-human__name">
          微信 <span>{{ c.wechatId }}</span>
          <button type="button" class="cu-human__copy" @click="copy(c.wechatId, '微信号')">
            {{ copied === '微信号' ? '已复制' : '复制微信号' }}
          </button>
        </p>

        <div class="cu-human__acts">
          <button v-if="hasQq" type="button" class="cu-btn cu-btn--ghost cu-btn--sm" @click="copy(c.qq, 'QQ')">
            {{ copied === 'QQ' ? '已复制' : '复制' }} QQ {{ c.qq }}
          </button>
          <button v-if="hasGroup" type="button" class="cu-btn cu-btn--ghost cu-btn--sm" @click="copy(c.qqGroup, 'QQ 群')">
            复制 QQ 群 {{ c.qqGroup }}
          </button>
          <button v-if="hasEmail" type="button" class="cu-btn cu-btn--ghost cu-btn--sm" @click="copy(c.email, '邮箱')">
            {{ copied === '邮箱' ? '已复制' : '复制' }}邮箱
          </button>
        </div>

        <p v-if="!anyContact" class="cu-human__hint">联系方式配置中。</p>
        <p v-if="activationReady() && activation" class="cu-human__hint">
          <a class="cu-human__link" :href="activation" target="_blank" rel="noopener sponsored nofollow">卡密还没兑换？去兑换页 →</a>
        </p>
      </div>
    </aside>

    <button class="cu-human__fab" type="button" :aria-expanded="open" aria-label="联系人工客服" @click="open = !open">
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path
          fill="currentColor"
          d="M9.2 3.6C4.8 3.6 1.2 7.1 1.2 11.4c0 2.4 1.2 4.5 3.1 5.9l-.8 3 3.3-1.6c.8.2 1.6.4 2.4.4h.6a7 7 0 0 1-.2-1.6c0-4 3.6-7.3 8.1-7.3h.6C17.6 6.2 13.8 3.6 9.2 3.6Zm-2.6 3a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm5.2 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z"
        />
      </svg>
      <span>人工客服</span>
    </button>
  </div>
</template>
