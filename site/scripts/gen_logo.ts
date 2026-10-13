/**
 * 从 config/logo.ts 生成全部静态 logo 资源。
 *
 * 用法：tsx scripts/gen_logo.ts
 * 产出：public/favicon.svg、public/brand-logo.svg、config/logo.json、BrandLogo.vue 模板
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { LOGO_DATA, LOGO_PATHS, LOGO_SIZE, LOGO_RADIUS, LOGO_BG, LOGO_FG, LOGO_STROKE, logoSvgFile } from '../config/logo'

const ROOT = join(import.meta.dirname, '..')
const OUT = join(ROOT, 'public')

const paths = LOGO_PATHS.map((d) => `<path d="${d}" />`).join('\n    ')

writeFileSync(join(OUT, 'favicon.svg'), logoSvgFile(), 'utf8')
writeFileSync(join(OUT, 'brand-logo.svg'), logoSvgFile(), 'utf8')
writeFileSync(join(ROOT, 'config', 'logo.json'), JSON.stringify(LOGO_DATA, null, 2) + '\n', 'utf8')

writeFileSync(
  join(ROOT, '.vitepress', 'theme', 'components', 'BrandLogo.vue'),
  `<script setup lang="ts">
/**
 * 品牌标记：品牌橙底方块 + 米白「无限」符号（∞ 化简成两个开口方块）。
 *
 * 本文件由 \`tsx scripts/gen_logo.ts\` 生成，请勿手改。
 * 几何与配色来自 config/logo.ts，与标签页 favicon 完全同源，
 * 且不跟随深浅色模式变化 —— 深色模式下 currentColor 会让底色接近纸色而看不见。
 */
defineProps<{ size?: number }>()
</script>

<template>
  <svg
    :width="size || 36"
    :height="size || 36"
    viewBox="0 0 ${LOGO_SIZE} ${LOGO_SIZE}"
    role="img"
    aria-label="Claude 无限卡"
    class="cu-logo"
  >
    <rect width="${LOGO_SIZE}" height="${LOGO_SIZE}" rx="${LOGO_RADIUS}" fill="${LOGO_BG}" />
    <g fill="none" stroke="${LOGO_FG}" stroke-width="${LOGO_STROKE}" stroke-linecap="round">
    ${paths}
    </g>
  </svg>
</template>
`,
  'utf8',
)

console.log('logo 资源已生成：favicon.svg / brand-logo.svg / config/logo.json / BrandLogo.vue')

