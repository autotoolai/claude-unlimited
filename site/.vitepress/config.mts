import { defineConfig } from 'vitepress'
import type { HeadConfig } from 'vitepress'
import { siteConfig } from '../config/site'
import { knowledge, knowledgeCategories } from '../config/knowledge'
import { publicDirPlugin } from './theme/middleware'
import { baiduHead, umamiHead } from './analytics_snippets'

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
    let path = page.replace(/\.md$/, '').replace(/index$/, '')
    // 目录总览页路由是 /guide、/knowledge（无尾斜杠，public/_redirects 把带斜杠的 301 过来）。
    // 去掉 replace 后的尾斜杠，否则 transformHead 产出的 canonical / og:url 与 sitemap、导航、页脚不一致，
    // 三套 URL 信号互相矛盾，搜索引擎会去收录实际返回 301 的那个地址。
    path = path.replace(/\/$/, '')
    const url = base + (path ? '/' + path : '/')
    const ogImage = `${base}/og/${(path || 'home').replace(/\//g, '_')}.png`
    const head: HeadConfig = [
      ['link', { rel: 'canonical', href: url }],
      ['meta', { property: 'og:url', content: url }],
      ['meta', { property: 'og:image', content: ogImage }],
      ['meta', { name: 'twitter:image', content: ogImage }],
    ]
    // 知识库文章页的 keywords：全站只有 head 里一条全局 keywords 的话，20 篇文章共用同一串词，
    // 对中文 SEO 没有区分度。这里按路由从 config/knowledge.ts 反查该篇的 tags（列表页卡片已渲染这组词），
    // 覆盖掉全局那条。tags 是人工维护的真实搜索词，不是堆砌。
    // 长文页的目录折叠态：首帧就把 <html> 的类补上，避免 SSR 先铺开目录、挂载后再收起的跳动。
    // 同步内联脚本，VitePress 渲染在 <head> 里，样式生效前执行；try/catch 兜住隐私模式下 localStorage 抛异常。
    if (path === 'guide' || path === 'console' || path.startsWith('knowledge/')) {
      head.push([
        'script',
        {},
        'try{if(localStorage.getItem("cu-toc-collapsed")==="1"&&window.matchMedia("(min-width:1281px)").matches)document.documentElement.classList.add("cu-toc-collapsed")}catch(e){}',
      ])
    }
    if (path.startsWith('knowledge/')) {
      const slug = path.slice('knowledge/'.length)
      const meta = knowledge.find((k) => k.slug === slug)
      if (meta?.tags?.length) {
        head.push(['meta', { name: 'keywords', content: meta.tags.join(',') }])
      }
      // 文章页的 og:type 全站默认是 website（config.mts 的 head 里写死了），但文章是 article。
      // og:type 声明错类型会让分享卡片与富媒体结果按网页而非文章处理；发布时间/更新时间同理，
      // 它们和 JSON-LD 里的 datePublished/dateModified 是同一个权威源（config/knowledge.ts）。
      if (meta) {
        head.push(['meta', { property: 'og:type', content: 'article' }])
        head.push(['meta', { property: 'article:published_time', content: meta.date }])
        head.push(['meta', { property: 'article:modified_time', content: meta.updated ?? meta.date }])
        head.push(['meta', { property: 'article:section', content: knowledgeCategories.find((c) => c.cat === meta.cat)?.name ?? meta.cat }])
      }
    }
    return head
  },

  title: siteConfig.name,
  titleTemplate,
  description: siteConfig.description,
  srcDir: 'docs',
  // 知识库文章页在 components/KnowledgeDoc.vue 里用官方的 <Content /> 渲染 markdown 正文（layout: page）。
  // VitePress 只对 themeDir（theme）里的组件解析内置主题别名 'vitepress'，页面组件目录在 srcDir 下不在其中，
  // 直接 import { Content } from 'vitepress' 会在 SSR 阶段报 MODULE_NOT_FOUND（产物里正文整块不渲染）。
  themePackages: [{ name: '@internal/theme-default', root: './.vitepress/theme' }],
  // srcDir 用子目录（而非 '.'）的原因：Vite 5 的依赖预构建在 srcDir='.' 时对顶层的 .md 路由走错分支，
  // 把 /index.md 当 html fallback 返回（text/html），浏览器按 module script 加载时 MIME 报错白屏。
  // 静态资源（favicon.svg / robots.txt / _headers / llms.txt / og/*.png）由 scripts/copy_public.mjs 复制进产物：
  // VitePress 1.6 的 publicDir 按 srcDir 解析（srcDir='docs' -> docs/public），顶层 publicDir 选项又不会被
  // resolveDir 接受，两种配置写法都拿不到 site/public。
  cleanUrls: false, // 产物用 /pricing.html、/guide/index.html；_redirects 把带尾斜杠的旧链接 301 到 .html
  lastUpdated: false,
  // 内部文档不进产物：README 与知识库写作规范不该出现在 sitemap 与线上
  // 内部文档：不进产物，因此也不进 sitemap（gen_sitemap 扫 dist）
  srcExclude: [
    // 内部文档不进产物，因此也不进 sitemap（gen_sitemap 扫 dist）。
    // 这份名单是黑名单，逐个列文件名，新增内部文档一定会漏。真正的兜底在 check_dist.mjs：
    // 它断言「dist 里的每个 html 都必须在 sitemap.xml 里」且「sitemap 里每条都必须在 dist 里」，
    // 所以漏写 srcExclude 会直接让 build 失败，而不是静默产生一个可索引页面。
    'README.md',
    'knowledge_writing_guide.md',
    'knowledge/SOP-写一篇新文章.md',
    'content_structure.md',
    'plans_sync.md',
    'guide_design_spec.md',
    'troubleshooting_guide.md',
  ],
  ignoreDeadLinks: true,
  head: [
    ['link', { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' }],
    // 字体：正文 Inter（拉丁字形）+ 标题 Lora（拉丁衬线，中文回落到思源宋体/宋体）+ JetBrains Mono（代码与终端）。
    // 只加载 latin 子集，中文不由网络字体承载，避免首屏被几百 KB 的 CJK 字体拖住。
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    [
      'link',
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Lora:wght@500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap',
      },
    ],
    ['meta', { name: 'theme-color', content: '#c85a1e' }],
    // 站长平台验证 meta：content 从百度搜索资源平台 / Google Search Console 复制过来填上，
    // 两处都不填时下面会整条跳过（VitePress 会把 content 为 undefined 的 meta 丢掉）。
    // 百度搜索资源平台 -> 站点管理 -> 站点属性 -> 站长平台 -> HTML 标签验证；
    // Google Search Console -> 设置 -> 网址前缀 -> HTML 标签验证。两处都填完再提交 sitemap.xml。
    // 码值直接内联做兜底：vitepress 的 SSR 渲染跑在子进程里，process.env 在那一层拿不到 bash 里 set -a 导出的值，
    // 只靠环境变量会出现「meta 偶尔凭空消失」。换码时改这里（或设同名环境变量覆盖）。
    ['meta', { name: 'baidu-site-verification', content: process.env.BAIDU_VERIFY_CODE || 'fc6022a4ec1c7bb09bfa0e037e3f8496' }],
    ...(process.env.GOOGLE_VERIFY_CODE ? [['meta', { name: 'google-site-verification', content: process.env.GOOGLE_VERIFY_CODE }]] : []),
    ['meta', { name: 'keywords', content: 'claude 无限额度,claude api 无限,claude 无限卡,claude code 国内,claude api 中转' }],
    ['meta', { property: 'og:site_name', content: siteConfig.name }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:title', content: siteConfig.name }],
    ['meta', { name: 'twitter:description', content: siteConfig.description }],
    // 流量统计：Umami 出行为与转化事件，百度统计是国内口径参照（详见 .vitepress/analytics_snippets.ts）
    ...umamiHead(),
    ...baiduHead(),
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
  } as any,
  markdown: {
    lineNumbers: false,
    theme: { light: 'github-light', dark: 'github-dark' },
  },
  vite: {
    // dev 下把 site/public 吐出去：wechat-qr.jpg 这类新增静态文件在 dev 里要能直接访问。
    // 生产不受影响（copy_public.mjs 在 build 时统一拷进 dist），这个插件只在 dev 的 configureServer 生效。
    plugins: [publicDirPlugin()],
    /**
     * 开发期调试用：Vite 客户端把自身的 hmr 状态写进 globalThis.__HMR_INJECTED__ / __VP_HASH_MAP__ 等全局，
     * 生产构建里也会存在（VitePress 会注入 metadata 脚本）。这会让本页在 hydrate 时「服务端 HTML 与客户端
     * 首帧不一致」之外还叠加一类噪音：Vue devtools / VitePress 插件读这些全局。模板里不允许写 script，
     * 所以这里只在 dev 下通过 transformIndexHtml 注入一个清除脚本，正常构建不做任何事。
     */
    // dev 用 41800，preview(serve_dist) 用 41777：两者必须分开，否则浏览器标签还挂在旧 dev/preview 进程上时
    // 你以为在预览新产物、其实看的是旧的。host: true 让局域网与 Tailscale 可访问。
    // 改端口要同步 package.json 的 dev:site（本行对应）+ serve_dist.mjs 的 PORT。
    server: {
      host: true,
      port: 41800,
      strictPort: true,
      // 允许用局域网 IP / Tailscale IP / MagicDNS 名字打开；不加会看到 Vite 的 "This host is not allowed" 白屏。
      // IP 形式 Vite 默认放行（IP 直连不做 host 校验），域名形式必须显式列出。
      allowedHosts: ['.ts.net'],
    },
    build: {
      // 禁止把 WebP/SVG 内联成 data:（易导致裂图 / 超长属性）
      assetsInlineLimit: 0,
    },
    // dev 角标不在这里注入：vitepress dev 会用自己的 vite config 覆盖 transformIndexHtml，
    // 实测 hook 一次都不被调用（2026-10-13）。改由 theme/Layout.vue 按 import.meta.env.DEV 渲染，
    // 产物侧角标由 scripts/serve_dist.mjs 注入。
    // 诊断开关：CUP_HYDRATION_PROBE=1 npm run build 时打开 Vue 生产构建的 hydration 差异详情（打印不一致的元素与 vnode），
    // 排查内容时用，平时留空。它会一并关掉 devtools，避免干扰控制台输出。
    define: process.env.CUP_HYDRATION_PROBE
      ? { __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'true', __VUE_PROD_DEVTOOLS__: 'false' }
      : {},  },
})
