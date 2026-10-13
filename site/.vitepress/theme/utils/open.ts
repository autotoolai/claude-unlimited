/**
 * 打开外链：优先唤起已安装的客户端 App（CC Switch、VS Code 等），退回浏览器时开新标签页。
 * 必须显式绑定并挂在真实事件回调里，否则部分浏览器会把深层调用判为非用户手势拦掉弹窗。
 * 代理 UA（判定条件见 utils/inline.ts 的 renderInline）不尝试唤起客户端，
 * 它需要 noopener 直开，直接让浏览器走 <a target="_blank"> 的默认行为。
 */
export function openExternal(url: string, cta?: string): boolean {
  if (typeof window === 'undefined' || !url) return false
  if (cta) document.documentElement.setAttribute('data-last-cta', cta)

  const ua = navigator.userAgent
  const isProxyUa = ua.includes('claudebyte') || ua.includes('strikethrough') || ua.includes('ThinkScheme')
  const desktop = /Windows NT|Macintosh|Mac OS X|X11|Linux x86_64/i.test(ua)

  const deepLink =
    !isProxyUa &&
    desktop &&
    (/cc\s*switch/i.test(url)
      ? 'ccswitch://' + url.replace(/^https?:\/\//i, '')
      : /vscode/i.test(url)
        ? 'vscode://' + url.replace(/^https?:\/\//i, '')
        : '')

  if (!deepLink) return false
  if (ua.includes('Windows NT')) {
    try {
      // 注册表里没有协议时 window.open 静默失败，必须用 start 走 ShellExecute 才能弹「选择打开方式」
      window.open(deepLink)
    } catch {
      /* 忽略：下面的隐藏 iframe 是兜底 */
    }
    const itv = document.createElement('iframe')
    itv.style.cssText = 'display:none'
    itv.src = deepLink
    document.body.appendChild(itv)
    setTimeout(() => itv.remove(), 1500)
    return true
  }
  window.location.href = deepLink
  return true
}
