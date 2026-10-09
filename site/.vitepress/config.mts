import { defineConfig } from 'vitepress'
import { siteConfig } from '../config/site'

/**
 * 站点形态：营销页（首页 / 套餐定价 / 无限额度 / 常见问题）+ 教程页（使用教程总览 / 模型与切换 / 接入与模型 / CC Switch），
 * 外壳统一由 theme/components/PageShell.vue 渲染，页面正文在 theme/pages/*.vue。docs/ 下的 md 只是带 frontmatter 的路由壳。
 * 默认主题的导航栏、页脚、搜索、目录侧栏全部关闭（nav=[]、sidebar=false、asides=[]、footer=false、
 * siteTitle=false、logo=''）；默认外壳的空节点干脆不渲染（Layout.vue 只用 VPContent）。
 */
export const SITE_URL = siteConfig.url.replace(/\/+$/, '')

const titleTemplate = process.env.NODE_ENV === 'production' ? ':title | Claude 无限卡' : 'site'

export default defineConfig({
  lang: 'zh-CN',
  /**
   * canonical / og:url / og:image / twitter:image 统一从 config/site.ts 的 url 生成，改域名只改一处。
   * 不用 frontmatter 里的 {{ }} 模板：VitePress 不渲染 frontmatter head 的模板表达式，会原样输出成死链。
   */
  transformHead({ page }) {
    const base = SITE_URL
    const path = page.replace(/\.md$/, '').replace(/index$/, '')
    const url = base + (path ? '/' + path : '/')
    const ogImage = `${base}/og/${path || 'home'}.png`
    return [
      ['link', { rel: 'canonical', href: url }],
      ['meta', { property: 'og:url', content: url }],
      ['meta', { property: 'og:image', content: ogImage }],
      ['meta', { name: 'twitter:image', content: ogImage }],
    ]
  },
  title: siteConfig.name,
  titleTemplate,
  description: siteConfig.description,
  srcDir: 'docs',
  // srcDir 用子目录（而非 '.'）的原因：Vite 5 的依赖预构建在 srcDir='.' 时对顶层的 .md 路由走错分支，
  // 把 /index.md 当 html fallback 返回（text/html），浏览器按 module script 加载时 MIME 报错白屏。
  // 静态资源（favicon.svg / robots.txt / _headers / llms.txt / og/*.png）由 scripts/copy_public.mjs 复制进产物：
  // VitePress 1.6 的 publicDir 按 srcDir 解析（srcDir='docs' -> docs/public），顶层 publicDir 选项又不会被
  // resolveDir 接受，两种配置写法都拿不到 site/public。
  cleanUrls: false, // 产物用 /pricing.html、/guide/index.html；_redirects 把带尾斜杠的旧链接 301 到 .html
  lastUpdated: false,
  srcExclude: ['README.md'],
  ignoreDeadLinks: true,
  head: [
    ['link', { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' }],
    ['meta', { name: 'theme-color', content: '#c85a1e' }],
    ['meta', { name: 'keywords', content: 'claude 无限额度,claude api 无限,claude 无限卡,claude code 国内,claude api 中转' }],
    ['meta', { property: 'og:site_name', content: siteConfig.name }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:title', content: siteConfig.name }],
    ['meta', { name: 'twitter:description', content: siteConfig.description }],
  ],
  themeConfig: {
    // 页面外壳自带 logo、站名、导航、页内目录与声明，这里全部关掉默认外壳
    logo: '',
    siteTitle: false,
    nav: [],
    sidebar: false,
    socialLinks: [],
    asides: [],
    footer: false,
    externalLinkIcon: true,
    editLink: false,
    lastUpdated: false,
    docFooter: { prev: false, next: false },
    notFound: {
      title: '页面不存在',
      quote: '你要找的页面可能已经移动或从未存在。回到首页，或看看常见问题。',
      linkText: '返回首页',
      linkLabel: '返回首页',
    },
    // 自定义字段（主题组件读取）
    imgCdn: '', // 二期接 R2 时填自定义域，如 https://img.example.com；留空则回落打包资源
    kefuPosition: 'right', // 移动端由 CSS 自动避让
    shopUrl: siteConfig.products[0]?.shopUrl ?? '',
    // 人工客服浮标位置：'bottom-right' | 'bottom-left'；移动端一律并排底部（CSS 处理）
    humanServicePosition: 'bottom-right' as const,
  } as any,
  markdown: {
    lineNumbers: false,
    theme: { light: 'github-light', dark: 'github-dark' },
  },
  vite: {
    /**
     * 开发期调试用：Vite 客户端把自身的 hmr 状态写进 globalThis.__HMR_INJECTED__ / __VP_HASH_MAP__ 等全局，
     * 生产构建里也会存在（VitePress 会注入 metadata 脚本）。这会让本页在 hydrate 时「服务端 HTML 与客户端
     * 首帧不一致」之外还叠加一类噪音：Vue devtools / VitePress 插件读这些全局。模板里不允许写 script，
     * 所以这里只在 dev 下通过 transformIndexHtml 注入一个清除脚本，正常构建不做任何事。
     */
    // dev 用 5199：5173/5174/5175 常被其它项目占用；host: true 让局域网可访问
    server: {
      host: true,
      port: 5199,
      strictPort: true,
      // 允许用局域网 IP / Tailscale IP / MagicDNS 名字打开；不加会看到 Vite 的 "This host is not allowed" 白屏。
      // IP 形式 Vite 默认放行（IP 直连不做 host 校验），域名形式必须显式列出。
      allowedHosts: ['.ts.net'],
    },
    build: {
      // 禁止把 WebP/SVG 内联成 data:（易导致裂图 / 超长属性）
      assetsInlineLimit: 0,
    },
  },
})
