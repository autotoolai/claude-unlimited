/**
 * 品牌标记「无限」符号的唯一数据源。
 *
 * 全站四处 logo 全部由这里派生，改这一处即可生效：
 *   public/favicon.svg       标签页图标         scripts/gen_logo.ts
 *   public/brand-logo.svg    独立品牌图          scripts/gen_logo.ts
 *   BrandLogo.vue            导航/页脚/知识库头部  scripts/gen_logo.ts
 *   public/og/*.png          社交分享卡片        scripts/gen_og.py 读 logo.json
 *
 * 配色固定为品牌橙 + 米白描边，不跟随深浅色模式变化：
 * 深色模式下若跟随 currentColor，底色会变成近白、描边米白，等于看不见。
 */

/** SVG viewBox 边长与底板圆角 */
export const LOGO_SIZE = 40
export const LOGO_RADIUS = 9

/** 底色：品牌橙，与旧 favicon 一致 */
export const LOGO_BG = '#C85A1E'
/** 描边与符号：米白 */
export const LOGO_FG = '#FFF6EC'
/** 描边粗细（viewBox 单位） */
export const LOGO_STROKE = 3.2

/** SVG path 数据：∞ 化简成的两个开口方块（viewBox 坐标） */
export const LOGO_PATHS = [
  'M6.5 15.5h8.5a4 4 0 0 1 0 8H8.5',
  'M33.5 24.5H25a4 4 0 0 1 0-8h6.5',
] as const

/**
 * 同一图形的归一化（0–1）画法描述，供不支持 SVG 的绘制场景（OG 分享图）直接画，
 * 避免在 Python 里解析 path 字符串。两份描述同源，改动请一起改。
 * - line: 两端点
 * - arc:  圆心 + 半径 + 圆心角起止（角度单位为度，顺时针，0 指向右）
 */
export const LOGO_SHAPE = {
  stroke: LOGO_STROKE / LOGO_SIZE,
  lines: [
    { x1: 6.5 / 40, y1: 15.5 / 40, x2: 15 / 40, y2: 15.5 / 40 },
    { x1: 8.5 / 40, y1: 23.5 / 40, x2: 6.5 / 40, y2: 23.5 / 40 },
    { x1: 33.5 / 40, y1: 24.5 / 40, x2: 25 / 40, y2: 24.5 / 40 },
    { x1: 31.5 / 40, y1: 16.5 / 40, x2: 33.5 / 40, y2: 16.5 / 40 },
  ],
  arcs: [
    { cx: 19 / 40, cy: 19.5 / 40, r: 4 / 40, from: -90, to: 90 },
    { cx: 21 / 40, cy: 20.5 / 40, r: 4 / 40, from: 90, to: 270 },
  ],
} as const

/** 供脚本与 Python 消费的纯数据 */
export const LOGO_DATA = {
  size: LOGO_SIZE,
  radius: LOGO_RADIUS,
  bg: LOGO_BG,
  fg: LOGO_FG,
  stroke: LOGO_STROKE,
  paths: [...LOGO_PATHS],
  shape: LOGO_SHAPE,
}

/** 独立 SVG 文件内容（favicon.svg / brand-logo.svg 共用） */
export function logoSvgFile(): string {
  const ps = LOGO_PATHS.map((d) => `<path d="${d}"/>`).join('')
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LOGO_SIZE} ${LOGO_SIZE}">` +
    `<rect width="${LOGO_SIZE}" height="${LOGO_SIZE}" rx="${LOGO_RADIUS}" fill="${LOGO_BG}"/>` +
    `<g fill="none" stroke="${LOGO_FG}" stroke-width="${LOGO_STROKE}" stroke-linecap="round">${ps}</g>` +
    `</svg>`
  )
}
