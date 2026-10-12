/**
 * 复制到剪贴板，三级兜底：异步剪贴板 API → execCommand('copy') → prompt 手动复制。
 * 原先写在 KefuWidget.vue 里，模型 ID、命令、链接都改成可点复制后抽成公用。
 * 必须在客户端调用（用到 navigator / document）。
 */
export async function copyText(text: string | undefined): Promise<boolean> {
  if (!text) return false
  try {
    // 非 HTTPS / 未授权时 navigator.clipboard 是 undefined，可选链会变成 await undefined 且不抛错，
    // 直接 return true 造成假成功，必须显式判空后走 execCommand 回退
    if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable')
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.cssText = 'position:fixed;opacity:0'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand?.('copy') || false
      ta.remove()
      return ok
    } catch {
      return false
    }
  }
}

/** 复制并按 ok 决定是静默成功还是弹窗让用户手动复制 */
export async function copyTextOrPrompt(text: string | undefined): Promise<boolean> {
  const ok = await copyText(text)
  if (!ok && text) window.prompt('复制失败，请手动选中复制：', text)
  return ok
}
