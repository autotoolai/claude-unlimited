import type { HeadConfig } from 'vitepress'

/**
 * 统计埋点的 head 片段。单独成文件是为了让 config.mts 保持一眼能看完 head 里有什么。
 *
 * 两条铁律（都来自 VitePress SSR 的实际行为，踩过就记住）：
 * 1. process.env 在 SSR 子进程里读不到 shell 导出的值，所以 website id / tongji id 这类
 *    「要进产物 HTML 的公开标识」必须内联兜底，同 BAIDU_VERIFY_CODE 的写法；
 * 2. 追踪脚本一律 async + 失败静默：统计挂掉绝不能影响页面。
 *
 * 三个通道的分工：Umami 出行为与转化事件（唯一有自定义事件的通道），百度统计是国内口径的参照系，
 * Cloudflare Web Analytics 在控制台一键开关、零代码，只出量与质，不进这里。
 */

/** Umami Cloud 的 website ID（公开标识，会进 HTML；Umami Cloud 后台 Settings 里取）。留空则整段不注入 */
const umamiWebsiteId = process.env.UMAMI_WEBSITE_ID || '35bc9e45-604c-4641-920e-8cfa48020045'

/** 百度统计站点 ID（hm.baidu.com 后面那串，公开标识，会进 HTML）。留空则整段不注入 */
const baiduTongjiId = process.env.BAIDU_TONGJI_ID || '3ae4fc576a3cfa978bf7592615735bab'

/**
 * 事件桥：把 window.__cuTrack（theme/analytics.ts 挂的点击委托转出来的）同时送进 Umami 与百度。
 * 内联在 head 而不是等 Umami 脚本加载完再绑：即使 Umami 被拦截或加载超时，桥也不会因等待而抛错。
 */
const eventBridge = [
  'try{',
  'window.__cuTrack=function(n,d){',
  'try{window.umami&&window.umami.track(n,d)}catch(e){}',
  'try{window._hmt&&window._hmt.push(["trackEvent","cta",n,String((d&&d.value)||"")])}catch(e){}',
  '}',
  '}catch(e){}',
].join('')

/** Umami 追踪脚本：async 加载 + defer，首帧不阻塞；website id 为空时返回空数组（head 里整段消失） */
export function umamiHead(): HeadConfig[] {
  if (!umamiWebsiteId) return []
  return [
    ['script', { 'data-cu-analytics': 'umami' }, eventBridge],
    [
      'script',
      { src: 'https://cloud.umami.is/script.js', 'data-website-id': umamiWebsiteId, async: 'true', defer: 'true' },
    ],
  ]
}

/** 百度统计脚本：官方代码原文（异步插入 hm.js，s.js 是旧版入口），同样是「统计挂了页面照常」。
 *  hm.js 对无 Referer 的裸请求会返回空体（实测），所以校验时只能断言 src 里带了 id，不能断言内容。 */
export function baiduHead(): HeadConfig[] {
  if (!baiduTongjiId) return []
  return [
    [
      'script',
      {},
      `var _hmt=_hmt||[];(function(){var hm=document.createElement("script");hm.src="https://hm.baidu.com/hm.js?${baiduTongjiId}";var s=document.getElementsByTagName("script")[0];s.parentNode.insertBefore(hm,s)})();`,
    ],
  ]
}
