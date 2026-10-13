/**
 * 流量统计的事件桥：把全站 [data-cta] 点击同时送进 Umami 与百度统计。
 *
 * 为什么用「全局委托」而不是逐个组件埋点：
 * 全站转化点（导航购买按钮、套餐卡、客服浮标）早就各自带 data-cta 属性，一个 document 级监听即可全覆盖，
 * 以后新增按钮只要带上 data-cta 就自动进统计，不必改这里，也不必在组件里 import 本模块。
 *
 * 为什么挂在 globalThis：VitePress 1.6 把用户主题当外部模块处理，同一 import 会在 theme chunk 与页面 chunk
 * 各打一份副本，模块级单例在 SSR/浏览器两端拿到的不是同一个对象（与 jsonld_registry.ts 同因）。
 *
 * 两个通道都必须「静默失败」：Umami 在美境、百度偶发抽风，统计挂掉绝不能影响页面交互，全部 try/catch 包死。
 */
declare global {
  interface Window {
    /** Umami 追踪脚本加载后才有；未加载时上报静默丢弃 */
    umami?: { track: (name: string, data?: Record<string, unknown>) => void }
    /** 百度统计基础库 */
    _hmt?: unknown[][]
    /** head 里内联的事件桥，供任意组件手工补报非点击类事件 */
    __cuTrack?: (name: string, data?: Record<string, unknown>) => void
  }
}

/** SSR 阶段没有 document，所有上报函数先过这一关 */
const inBrowserRef = typeof document !== 'undefined'

/** 单个事件的上下文：足够回答「谁在哪点了什么」，不带任何可识别个人的信息 */
interface TrackPayload {
  page?: string
  referrer?: string
  [key: string]: unknown
}

function payloadOf(data?: TrackPayload): Record<string, unknown> {
  if (!inBrowserRef) return {}
  const ref = document.referrer || ''
  return {
    page: location.pathname + location.search,
    // 只记来源站点，不记完整来源 URL（后者可能带用户自己的搜索词或会话参数）
    ...(ref ? { referrer: safeRefHost(ref) } : {}),
    ...(data ?? {}),
  }
}

/** 来源只留主机名，去掉 www. 与路径 */
function safeRefHost(ref: string): string {
  try {
    return new URL(ref).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

/** 送 Umami。脚本没加载完（被拦截 / 加载慢）时这次事件就丢了，不排队重试 —— 统计不值得拖累首屏 */
function sendUmami(name: string, data?: TrackPayload) {
  try {
    window.umami?.track(name, payloadOf(data))
  } catch {
    /* 统计失败静默 */
  }
}

/** 送百度统计。事件名与 Umami 共用 data-cta 值，分类固定为 cta */
function sendBaidu(name: string, data?: TrackPayload) {
  try {
    window._hmt?.push(['trackEvent', 'cta', name, String(data?.value ?? '')])
  } catch {
    /* 统计失败静默 */
  }
}

/** 对外暴露的手工上报入口：给非点击类事件（页内搜索、Tab 切换等）用 */
export function track(name: string, data?: TrackPayload) {
  sendUmami(name, data)
  sendBaidu(name, data)
}

/**
 * 装一次全站点击委托。由 Layout.vue 在 onMounted 调用，只装一次。
 * 用捕获阶段监听：客服浮标等组件可能在自己的 handler 里 stopPropagation，
 * 放在冒泡阶段会漏掉那部分点击。
 */
export function installClickTracking() {
  if (!inBrowserRef || (window as { __cuClickTrack?: boolean }).__cuClickTrack) return
  ;(window as { __cuClickTrack?: boolean }).__cuClickTrack = true
  document.addEventListener(
    'click',
    (e) => {
      try {
        const el = (e.target as HTMLElement | null)?.closest?.('[data-cta]')
        const name = el?.getAttribute('data-cta')
        if (!name) return
        const page = location.pathname
        sendUmami(name, { page, referrer: safeRefHost(document.referrer || '') || undefined })
        sendBaidu(name, { page })
      } catch {
        /* 统计失败静默 */
      }
    },
    true,
  )
  // head 内联的桥也指向这里，组件里 window.__cuTrack?.() 即可手工补报
  window.__cuTrack = track
}

export {}
