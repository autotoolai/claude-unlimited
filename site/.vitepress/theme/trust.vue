<script setup lang="ts">
/**
 * 信任层页面（关于 / 服务条款 / 隐私）。
 * 正文来自 config/trust.ts；根类用 cu-legal，避免与首页 .cu-trust 两列网格撞车。
 */
import { computed } from 'vue'
import { useData } from 'vitepress'
import PageShell from './components/PageShell.vue'
import LegalContact from './components/LegalContact.vue'
import { trustPages, legalNav, type TrustPageKey } from '../../config/trust'
import { limits } from '../../config/rules'

const { frontmatter } = useData()
const pageKey = computed(() => String(frontmatter.value.trustKey || '') as TrustPageKey)
const page = computed(() => {
  const key = pageKey.value
  const p = trustPages[key]
  if (!p) throw new Error(`frontmatter.trustKey=${key} 在 config/trust.ts 的 trustPages 里不存在`)
  return p
})

/** 把 [文案](url) 拆成文本 / 链接片段，避免 v-html */
type InlinePart = { t: 'text'; v: string } | { t: 'a'; v: string; href: string }
function parseInline(text: string): InlinePart[] {
  const re = /\[([^\]]+)\]\(([^)]+)\)/g
  const out: InlinePart[] = []
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ t: 'text', v: text.slice(last, m.index) })
    out.push({ t: 'a', v: m[1], href: m[2] })
    last = m.index + m[0].length
  }
  if (last < text.length) out.push({ t: 'text', v: text.slice(last) })
  return out.length ? out : [{ t: 'text', v: text }]
}

function isExternal(href: string) {
  return /^https?:\/\//.test(href)
}
</script>

<template>
  <PageShell :slug="page.slug" :title="page.title" :lead="page.lead">
    <div class="cu-legal">
      <nav class="cu-legal__nav" aria-label="法律页面">
        <template v-for="(n, i) in legalNav" :key="n.key">
          <span v-if="i > 0" class="cu-legal__nav-sep" aria-hidden="true">·</span>
          <span v-if="n.key === pageKey" class="cu-legal__nav-cur" aria-current="page">{{ n.label }}</span>
          <a v-else :href="n.href">{{ n.label }}</a>
        </template>
      </nav>

      <p v-if="page.updatedAt" class="cu-legal__updated">更新日期：{{ page.updatedAt }}</p>

      <section v-if="page.cards.length" class="cu-legal__cards" aria-label="要点">
        <article v-for="c in page.cards" :key="c.title" class="cu-legal__card">
          <h2>{{ c.title }}</h2>
          <p>
            <template v-for="(part, j) in parseInline(c.body)" :key="j">
              <a
                v-if="part.t === 'a'"
                :href="part.href"
                :target="isExternal(part.href) ? '_blank' : undefined"
                :rel="isExternal(part.href) ? 'noopener' : undefined"
              >{{ part.v }}</a>
              <template v-else>{{ part.v }}</template>
            </template>
          </p>
        </article>
      </section>

      <section v-for="(s, i) in page.sections" :key="s.h2" class="cu-legal__sec">
        <h2 :id="`s-${i}`">{{ s.h2 }}</h2>
        <ul v-if="s.checklist" class="cu-legal__check">
          <li v-for="(it, j) in s.items" :key="j">
            <template v-for="(part, k) in parseInline(it)" :key="k">
              <a
                v-if="part.t === 'a'"
                :href="part.href"
                :target="isExternal(part.href) ? '_blank' : undefined"
                :rel="isExternal(part.href) ? 'noopener' : undefined"
              >{{ part.v }}</a>
              <template v-else>{{ part.v }}</template>
            </template>
          </li>
        </ul>
        <ul v-else-if="s.bullets">
          <li v-for="(it, j) in s.items" :key="j">
            <template v-for="(part, k) in parseInline(it)" :key="k">
              <a
                v-if="part.t === 'a'"
                :href="part.href"
                :target="isExternal(part.href) ? '_blank' : undefined"
                :rel="isExternal(part.href) ? 'noopener' : undefined"
              >{{ part.v }}</a>
              <template v-else>{{ part.v }}</template>
            </template>
          </li>
        </ul>
        <template v-else>
          <p v-for="(it, j) in s.items" :key="j">
            <template v-for="(part, k) in parseInline(it)" :key="k">
              <a
                v-if="part.t === 'a'"
                :href="part.href"
                :target="isExternal(part.href) ? '_blank' : undefined"
                :rel="isExternal(part.href) ? 'noopener' : undefined"
              >{{ part.v }}</a>
              <template v-else>{{ part.v }}</template>
            </template>
          </p>
        </template>
      </section>

      <LegalContact />

      <p v-if="page.showLimitsNote" class="cu-legal__note">
        本页限流数字与站内其它页面同源（基础档：{{ limits.sessions }} 个会话窗口、单会话
        {{ limits.concurrency }} 路并发、{{ limits.rpm }} 次/分钟）。改动以站内公告与商品详情为准。
      </p>
    </div>
  </PageShell>
</template>

<style scoped>
/* 压掉 .cu-page h2 的居中大衬线，法律页按阅读列左对齐 */
.cu-legal {
  max-width: 44rem;
  margin-inline: auto;
}

.cu-legal__nav {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem 0.5rem;
  margin: 0 0 1.25rem;
  font-size: 0.88rem;
  color: var(--cu-muted);
}

.cu-legal__nav a {
  color: var(--cu-ink-2);
  text-decoration: none;
}

.cu-legal__nav a:hover {
  color: var(--cu-ink);
  text-decoration: underline;
}

.cu-legal__nav-cur {
  color: var(--cu-ink);
  font-weight: 600;
}

.cu-legal__nav-sep {
  color: var(--cu-line-strong);
}

.cu-legal__updated {
  margin: 0 0 1.5rem;
  font-size: 0.82rem;
  color: var(--cu-muted);
  text-align: left !important;
}

.cu-legal__cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.85rem;
  margin: 0 0 2rem;
}

.cu-legal__card {
  padding: 1.1rem 1.15rem;
  border: 1px solid var(--cu-line);
  border-radius: var(--cu-r-md);
  background: var(--cu-card);
}

.cu-legal__card h2 {
  margin: 0 0 0.45rem !important;
  font-family: inherit !important;
  font-size: 0.98rem !important;
  font-weight: 700 !important;
  letter-spacing: 0 !important;
  line-height: 1.4 !important;
  text-align: left !important;
  color: var(--cu-ink);
}

.cu-legal__card p {
  margin: 0 !important;
  max-width: none !important;
  font-size: 0.86rem;
  line-height: 1.7;
  text-align: left !important;
  color: var(--cu-ink-2);
}

.cu-legal__sec {
  margin-bottom: 1.75rem;
}

.cu-legal__sec h2 {
  margin: 0 0 0.65rem !important;
  font-family: inherit !important;
  font-size: 1.15rem !important;
  font-weight: 600 !important;
  letter-spacing: 0 !important;
  line-height: 1.35 !important;
  text-align: left !important;
  color: var(--cu-ink);
}

.cu-legal__sec p,
.cu-legal__sec li {
  font-size: 0.95rem;
  line-height: 1.85;
  color: var(--cu-ink-2);
}

.cu-legal__sec p {
  margin: 0 0 0.65rem !important;
  max-width: none !important;
  text-align: left !important;
  color: var(--cu-ink-2) !important;
}

.cu-legal__sec ul {
  margin: 0;
  padding-left: 1.2rem;
}

.cu-legal__sec li {
  margin-bottom: 0.4rem;
}

.cu-legal__check {
  list-style: none;
  padding-left: 0 !important;
}

.cu-legal__check li {
  position: relative;
  padding-left: 1.55rem;
  margin-bottom: 0.55rem;
}

.cu-legal__check li::before {
  content: '✓';
  position: absolute;
  left: 0;
  color: var(--cu-ink);
  font-weight: 700;
}

.cu-legal__sec a,
.cu-legal__card a {
  color: var(--cu-ink);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.cu-legal__note {
  margin-top: 0.5rem;
  padding-top: 1.1rem;
  border-top: 1px solid var(--cu-line);
  font-size: 0.8rem;
  color: var(--cu-muted);
  line-height: 1.7;
  text-align: left !important;
  max-width: none !important;
}

@media (max-width: 800px) {
  .cu-legal__cards {
    grid-template-columns: 1fr;
  }
}
</style>
