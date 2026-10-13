<script setup lang="ts">
/**
 * 对比表。单元格默认是纯文本（转义输出），只有写成 <a href="...">…</a> 的会变成真链接
 * —— 走 utils/inline.ts 的 renderInline，与教程正文同一套规则，避免各处转义口径不一致。
 */
import { renderInline } from '../utils/inline'

/**
 * 单元格里的换行：values 里带 \n 的渲染成多行（用 <br>），其余走 renderInline。
 * renderInline 会把 < 转义掉，所以要先把换行摘成占位符再渲染，最后换回 <br>。
 * 用途：排错表一格里塞几个动作时（见 config/guide.ts 的 errors 表 429 行），
 * 拆成多行比用分号连排更好读——读者能逐条看清做哪个、按什么顺序。
 */
function cell(v: string): string {
  if (!v.includes('\n')) return renderInline(v)
  // 每一段各自过一遍 renderInline（转义 + 锚点成链），再用 <br> 连接；
  // <br> 是我们自己拼的，不在 renderInline 的输入里，不会被转义。
  return v
    .split('\n')
    .map((p) => renderInline(p))
    .join('<br>')
}

defineProps<{
  columns: string[]
  rows: { label: string; values: string[]; highlight?: boolean }[]
  caption?: string
  /** 首列表头，默认「对比项」；字段对照、报错对照这类表传自己的名字（如「字段」「报错」） */
  labelCol?: string
}>()
</script>

<template>
  <div class="cu-table-wrap cu-scroll-none">
    <table class="cu-table">
      <caption v-if="caption" class="cu-table__caption" v-html="renderInline(caption)" />
      <thead>
        <tr>
          <th scope="col" class="cu-table__label">{{ labelCol || '对比项' }}</th>
          <th v-for="(c, i) in columns" :key="i" scope="col" :class="{ 'is-highlight': i === 0 }">{{ c }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(r, ri) in rows" :key="ri">
          <th scope="row" class="cu-table__label" v-html="renderInline(r.label)" />
          <td v-for="(v, i) in r.values" :key="i" :class="{ 'is-highlight': i === 0 || r.highlight }" v-html="cell(v)" />
        </tr>
      </tbody>
    </table>
  </div>
</template>
