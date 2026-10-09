import iconUsage from './icon-usage.svg'
import iconConnect from './icon-connect.svg'
import iconFair from './icon-fair.svg'

/** 打包资源兜底（Vite 静态导入，带 hash） */
export const siteImages = {
  'icon-usage': iconUsage,
  'icon-connect': iconConnect,
  'icon-fair': iconFair,
} as const
export type SiteImageKey = keyof typeof siteImages

/** R2 图床上的文件名；新增图需在此登记 key -> 文件名 */
const r2Filenames: Record<string, string> = {
  'icon-usage': 'icon-usage.svg',
  'icon-connect': 'icon-connect.svg',
  'icon-fair': 'icon-fair.svg',
}

/**
 * 图片 URL：配置了 imgCdn 走 R2（<cdn>/site/images/<文件名>），否则回落打包资源。
 * 约定：新图上传到 R2 的 site/images/ 下并登记到 r2Filenames。
 */
export function resolveSiteImage(key: string, cdn = ''): string {
  const base = (cdn || '').replace(/\/$/, '')
  const remote = r2Filenames[key]
  if (base && remote) return base + '/site/images/' + remote
  const bundled = (siteImages as Record<string, string>)[key]
  if (bundled) return bundled
  const clean = key.replace(/^\//, '')
  return base ? base + '/' + clean : '/images/' + clean
}
