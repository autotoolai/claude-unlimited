/**
 * 教程正文里的 <a href="..."> 标记渲染成真链接。
 * config/guide.ts 的段落 / 列表里写 HTML 锚点，渲染时转成 <a>：
 * 页内链接保持站内跳转，外链自动 target=_blank + rel="noopener"。
 *
 * 实现顺序：先把锚点整段摘出来放进占位符（连标签文字一起，转义后再放回即可），
 * 再对其余文本做转义，最后把锚点原样放回。转义后 & 变成 &amp;，正则再也找不到 &lt;a，
 * 所以占位符必须用模板里不会出现的控制字符。
 */
const SLOT = '\u0002'

export function renderInline(text: string): string {
  const links: string[] = []
  const rest = text
    .replace(
      /<a href="([\s\S]*?)"(\s+target="_blank")?>([\s\S]*?)<\/a>/g,
      (_m, href: string, ext: string | undefined, label: string) => {
        const rel = ext ? ' rel="noopener"' : ''
        links.push(`<a href="${href}"${ext ?? ''}${rel}>${label}</a>`)
        return SLOT
      },
    )
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return rest.replace(new RegExp(SLOT, 'g'), () => links.shift() ?? '')
}
