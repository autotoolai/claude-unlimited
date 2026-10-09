/** 简版 imgUrl：CDN 前缀兜底，没有前缀直接返回路径 */
export function imgUrl(path: string, cdn = ''): string {
  const base = (cdn || '').replace(/\/$/, '')
  return base ? `${base}${path.startsWith('/') ? '' : '/'}${path}` : path
}
