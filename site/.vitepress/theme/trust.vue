<script setup lang="ts">
/**
 * 关于我们（含服务条款与隐私）。正文来自 config/trust.ts。
 * 版式跟首页 / 联系页同一套营销规范：居中分节头 + 满宽 cu-cards，无侧栏。
 */
import PageShell from './components/PageShell.vue'
import { aboutPage } from '../../config/trust'

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
  <PageShell :slug="aboutPage.slug" :title="aboutPage.title" :lead="aboutPage.lead">
    <div class="cu-legal">
      <p v-if="aboutPage.updatedAt" class="cu-legal__updated">更新日期：{{ aboutPage.updatedAt }}</p>

      <section
        v-for="block in aboutPage.blocks"
        :id="block.id"
        :key="block.id"
        class="cu-legal__block"
        :class="{ 'cu-legal__block--bare': !block.h2 }"
      >
        <h2 v-if="block.h2">{{ block.h2 }}</h2>
        <p v-if="block.lead">{{ block.lead }}</p>

        <div v-if="block.facts?.length" class="cu-cards">
          <article v-for="f in block.facts" :key="f.label" class="cu-card">
            <h3>{{ f.label }}</h3>
            <p>
              <template v-for="(part, j) in parseInline(f.body)" :key="j">
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
        </div>

        <div v-if="block.subsections?.length" class="cu-cards cu-cards--two">
          <article
            v-for="sub in block.subsections"
            :key="sub.h3"
            class="cu-card"
          >
            <h3>{{ sub.h3 }}</h3>
            <ul v-if="sub.bullets" class="cu-legal__bullets">
              <li v-for="(it, j) in sub.items" :key="j">
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
              <p v-for="(it, j) in sub.items" :key="j">
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
          </article>
        </div>

      </section>
    </div>
  </PageShell>
</template>
