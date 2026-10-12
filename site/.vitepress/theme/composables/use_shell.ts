/**
 * 外壳共用的浏览器行为：深色模式切换、吸顶栏滚动态、首屏终端扶正、区块入场动画。
 *
 * 深色模式：VitePress 1.6 的 useData() 还没有 isDark / setDark（那是 1.7+ 的 API），
 * 但它已经会把 appearance='dark' 写到 <html> 上、并在站内点击切换时更新它。
 * 这里不再自己维护第二份状态：判断与写入都直接落到 <html class="dark">，
 * 首帧之后的类由 Layout.vue 的 syncInitialDark() 补齐（SSR 阶段没有 JS，先靠 00_base.css 的媒体查询兜底）。
 */
import { nextTick, onMounted, onUnmounted, ref } from 'vue'

/** 当前是否深色：<html> 上的 class 是唯一事实来源 */
export function isDarkNow(): boolean {
  return document.documentElement.classList.contains('dark')
}

/**
 * 深浅色切换：写入 <html class="dark"> 并持久化到 localStorage（键与 VitePress 一致：vitepress-theme-appearance）。
 * 不用 vite:prefers-color-scheme 伪类跳转（那会重载整页），也不引额外依赖。
 */
export function useThemeToggle() {
  const toggle = () => {
    const next = !isDarkNow()
    document.documentElement.classList.toggle('dark', next)
    try {
      localStorage.setItem('vitepress-theme-appearance', next ? 'dark' : 'light')
    } catch {
      /* 隐私模式下 localStorage 可能不可写，忽略即可 */
    }
  }
  return { toggle }
}

/**
 * 吸顶栏滚动态：滚过 8px 给 .cu-brandbar 加 is-scrolled（显出分隔线与投影），回到顶部去掉。
 * rAF 节流，滚动期间不触发布局。
 */
export function useNavScrollState() {
  let raf = 0
  const apply = () => {
    raf = 0
    const scrolled = window.scrollY > 8
    document.querySelectorAll('.cu-brandbar').forEach((el) => el.classList.toggle('is-scrolled', scrolled))
  }
  const onScroll = () => {
    if (raf) return
    raf = requestAnimationFrame(apply)
  }
  onMounted(() => {
    apply()
    window.addEventListener('scroll', onScroll, { passive: true })
  })
  onUnmounted(() => {
    window.removeEventListener('scroll', onScroll)
    if (raf) cancelAnimationFrame(raf)
  })
}

/**
 * 首屏入场：hero 文字块与指标条淡入上浮（.cu-reveal-block → .is-in）。
 * 单独于 useReveal：首屏不滚到视口才播，挂在 nextTick 后直接加 is-in，CSS 里用 --cu-reveal-delay 错开。
 */
export function useHeroReveal() {
  onMounted(() => {
    const targets: [string, number][] = [
      ['.cu-hero__badge', 0],
      ['.cu-hero__title', 0],
      ['.cu-lead', 0.12],
      ['.cu-hero .cu-cta-row', 0.22],
      ['.cu-hero .cu-hint', 0.26],
      ['.cu-trustpills', 0.32],
    ]
    nextTick(() => {
      for (const [sel, delay] of targets) {
        const el = document.querySelector<HTMLElement>(sel)
        if (!el) continue
        el.classList.add('cu-reveal-block')
        el.style.setProperty('--cu-reveal-delay', `${delay}s`)
      }
      requestAnimationFrame(() => {
        for (const [sel] of targets) document.querySelector(sel)?.classList.add('is-in')
      })
    })
  })
}

/**
 * 首屏终端扶正：终端入场时后仰（rotateX 12° / scale .93），随滚动进度扶正（参考站的 stage tilt）。
 * 扶正后完全不加 transform，终端文字才是清晰的栅格化渲染。
 */
export function useStageTilt() {
  let raf = 0
  let el: HTMLElement | null = null
  const tilt = () => {
    raf = 0
    if (!el) return
    const vh = window.innerHeight
    const r = el.getBoundingClientRect()
    const p = Math.min(1, Math.max(0, (vh - r.top) / (vh * 0.85)))
    const deg = (window.innerWidth < 768 ? 8 : 12) * (1 - p)
    const sc = 0.93 + 0.07 * p
    el.style.transform = p >= 0.999 ? '' : `perspective(1600px) rotateX(${deg.toFixed(2)}deg) scale(${sc.toFixed(4)})`
  }
  const onScroll = () => {
    if (!raf) raf = requestAnimationFrame(tilt)
  }
  onMounted(() => {
    el = document.querySelector('.cu-hero__stage')
    tilt()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
  })
  onUnmounted(() => {
    window.removeEventListener('scroll', onScroll)
    window.removeEventListener('resize', onScroll)
    if (raf) cancelAnimationFrame(raf)
  })
}

/**
 * 区块入场：容器直接子节点整体入场；网格类容器（卡片、步骤、套餐、FAQ）再让它的每个子项依次入场。
 * 用 Web Animations API，动画结束不留内联样式，之后的 hover transform 照常工作。
 * 视口内初始可见的块直接放行，不做入场动画，避免「第一屏先空白再出现」。
 */
const STAGGER_TARGETS = '.cu-cards, .cu-steps, .cu-tcards, .cu-mcards, .cu-faq, .cu-anchor-nav'
const EASE = 'cubic-bezier(.22,1,.36,1)'

export function useReveal(rootSelector = '.cu-page') {
  let observer: IntersectionObserver | null = null
  const enter = (el: Element, i: number) => {
    const kf: Keyframe[] = [
      { opacity: 0, transform: 'translateY(22px)' },
      { opacity: 1, transform: 'none' },
    ]
    el.animate(kf, { duration: 700, delay: Math.min(i, 7) * 55, easing: EASE, fill: 'backwards' })
  }
  const scan = () => {
    const root = document.querySelector(rootSelector)
    if (!root || typeof Element.prototype.animate !== 'function') return
    const blocks = Array.from(root.children).filter(
      (el): el is HTMLElement => el instanceof HTMLElement && !el.classList.contains('cu-page__head'),
    )
    observer?.disconnect()
    observer = new IntersectionObserver(
      (entries) => {
        const entering = entries.filter((e) => e.isIntersecting)
        entering.forEach((e, i) => {
          observer!.unobserve(e.target)
          enter(e.target, i)
          const kids = Array.from(e.target.querySelectorAll(STAGGER_TARGETS)).flatMap((g) => Array.from(g.children))
          kids.forEach((k, j) => enter(k, j))
        })
      },
      { rootMargin: '0px 0px -6% 0px', threshold: 0 },
    )
    blocks.forEach((el) => observer!.observe(el))
  }
  onMounted(() => requestAnimationFrame(scan))
  onUnmounted(() => observer?.disconnect())
}

/**
 * 页内目录的折叠状态：默认展开，用户收起后记在 localStorage，全站（教程 / 后台 / 知识库文章）共享同一个偏好。
 *
 * 状态落在 <html class="cu-toc-collapsed"> 上，原因是它同时影响网格列模板与正文限宽，
 * 而且 <html> 是 PageShell 与 KnowledgeDoc 两个外壳的共同祖先；首帧由 config.mts head 里的内联脚本补上，
 * 本函数挂载后只负责同步 Vue 状态（双向按钮）与窄屏纠正。
 */
const TOC_COLLAPSED_KEY = 'cu-toc-collapsed'
/** 与 01_shell_toc.css 的 1280px 断点一致：≤1280px 目录是横排条，折叠不适用 */
const TOC_WIDE_MQ = '(min-width: 1281px)'

export function useTocCollapse() {
  const collapsed = ref(false)
  let mq: MediaQueryList | null = null

  function apply(v: boolean) {
    collapsed.value = v
    document.documentElement.classList.toggle('cu-toc-collapsed', v)
  }

  onMounted(() => {
    mq = window.matchMedia(TOC_WIDE_MQ)
    // 窄屏一律展开：横排条下若还保留 40px 的折叠轨道，正文会莫名少一列
    let saved = false
    try {
      saved = localStorage.getItem(TOC_COLLAPSED_KEY) === '1'
    } catch {
      saved = false // 隐私模式等读不到的情况，当成展开
    }
    apply(mq.matches && saved)
    const onChange = (e: MediaQueryListEvent) => apply(e.matches && collapsed.value)
    mq.addEventListener('change', onChange)
    onUnmounted(() => {
      mq?.removeEventListener('change', onChange)
      mq = null
    })
  })

  function toggleToc() {
    if (!mq?.matches) return // 窄屏横排条没有折叠概念
    const next = !collapsed.value
    try {
      localStorage.setItem(TOC_COLLAPSED_KEY, next ? '1' : '0')
    } catch {
      /* 隐私模式写不了，忽略：本次会话仍然能折叠 */
    }
    apply(next)
  }

  return { collapsed, toggleToc }
}
