/*
 * JSON-LD 注入器：把 id -> JSON 字符串写进全局注册表，由 Layout.vue 在客户端挂载后
 * 统一渲染成 head 里的 ld+json 脚本。
 *
 * 踩过的坑（三个方案都不能用）：
 * 1. 在模板里直接写 ld+json 脚本：Vue 编译器报
 *    "Tags with side effect (script and style) are ignored in client component templates"，
 *    SSR 时被忽略、dev 下直接 500 白屏。
 * 2. frontmatter 的 head 里写 ['script', { type, innerHTML }]：VitePress 把 innerHTML 当普通字符串，
 *    产物里出现「ld+json 脚本里写 [object Object]」。
 * 3. import { createElement } from 'vue'：SSR 构建用 vue.runtime，导不出它；
 *    import { useHead } from 'vitepress'：客户端入口 dist/client/index.js 也没有这个导出。
 *
 * 4. 【已修】组件的 template 曾写成 `<span style="display:none"></span>`，它替换了 <slot/>；页面组件
 *    （如 KnowledgeDoc）把这个组件放在 markdown 正文渲染的位置（VPDoc/Content 通过默认插槽渲染内容），
 *    整篇正文因此被吃掉——产物里只剩外壳与元信息，没有 vp-doc / h1 / h2。现在 template 是 `<slot />`，
 *    放在正文位置的组件不再吞内容。
 *
 * 最终做法：页面组件只把 JSON 写进注册表（jsonld_registry.ts），由 Layout.vue 在客户端挂载后统一注入；
 * SPA 内跳转时由 Layout.vue 的路由 watch 清空注册表、等新页面组件 setup 写入后重新注入。
 * SSR 阶段 Layout 的 onMounted 不会执行，所以产物 HTML 里没有这段脚本，
 * 客户端补齐后 DOM 里是完整的——这是可接受的降级，比在模板里写脚本稳定得多。
 */
<script setup lang="ts">
// 注册表挂在 globalThis（见 jsonld_registry.ts 注释：普通模块导出会被 VitePress 打成多份副本）
const registry = (globalThis as any).__cuJsonLd as Map<string, string>

// json 允许传对象或已序列化的字符串；页面里传的是对象，统一在这里序列化
const props = defineProps<{ id: string; json: string | Record<string, unknown> }>()

registry.set(props.id, typeof props.json === 'string' ? props.json : JSON.stringify(props.json))
</script>

<!-- 保留 slot：页面组件默认把 markdown 正文（VPDoc/Content）渲染进默认插槽，JsonLd 组件被放在正文渲染位置时不能吃掉它 -->
<template><slot /></template>