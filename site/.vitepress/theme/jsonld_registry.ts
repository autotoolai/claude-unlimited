/**
 * JSON-LD 注册表：页面里的 <JsonLd id="cu-jsonld-<slug>" :json="jsonLd" /> 把序列化后的 JSON 写进来，
 * Layout.vue 在客户端挂载后把每条渲染成 head 里的 ld+json 脚本。
 *
 * 为什么用注册表而不是页面组件直接写 head：页面组件 setup 与 Layout 的挂载顺序不保证，
 * 先写注册表、再由唯一的 Layout 落 head，就不会漏；路由切换后同页组件重渲染，Layout 也随之重挂载。
 *
 * 挂在 globalThis 上而不是普通模块导出：VitePress 1.6 把用户主题当外部模块处理，同一 import 会在
 * theme chunk 与页面 chunk 里各打一份副本，Layout 与页面拿到的不是同一个 Map（SSR bundle 里甚至没保留
 * 这个模块，直接引用是未定义标识符）。globalThis 在 SSR 与浏览器两端都是单例。
 */
const registry = new Map<string, string>()

declare global {
  // eslint-disable-next-line no-var
  var __cuJsonLd: Map<string, string>
}

globalThis.__cuJsonLd = registry

export const jsonLdRegistry = registry
