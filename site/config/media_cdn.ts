/**
 * 媒体 CDN —— 视频地址的唯一来源。
 *
 * 为什么视频不走 Pages：视频是不可变的大文件（单支 4–37MB，五支 + 版本对比会到 140MB+），
 * 放 public/ 意味着每次部署都要重传全部视频，且吃 Pages 单文件体积上限。迁到 R2 之后
 * 部署包与视频彻底解耦，视频可以按内容哈希长期缓存。
 *
 * VIDEO_CDN 留空则回落站点根路径（本地开发、草稿预览端口、R2 域名未生效时的过渡态），
 * 两条路都通，不要因为域名没解析就把整条链路卡住。草稿预览端口（41802）由 media_cdn.ts
 * 按 location.port 自动置空，理由见它自己的注释与 log.md 问题 11。
 *
 * 产物名带内容哈希（videos/v1_round3.a1b2c3d4.mp4）：视频一改名字就变，
 * 于是 immutable 缓存永远不会拿到旧内容。map 查不到就回落原名——新视频还没上传时也不会 404 在构建期。
 */
/**
 * 草稿预览端口（41802）把 VIDEO_CDN 置空：视频改从本机 public/videos/ 提供，不依赖 CDN。
 *
 * 判断方式：运行期看 location.port 等不等于 DRAFT_PREVIEW_PORT。
 * 不用构建期 define——实测 vitepress dev 会把 config 里的 vite.define 丢掉，
 * theme 里的 config/media_cdn.ts 拿到的还是未替换的源码（define 里的 import.meta.env 与裸标识符都试过，都不生效）。
 * 运行期判断是可靠的：只有 41802 那个 dev server 的 location.port 是 41802；
 * 站点 dev 是 41800，build 产物在 41777 / 线上域名，三条路都不进这个分支。
 * SSR 阶段没有 location，返回 false（草稿列表页不渲染视频，无所谓）。
 */
export const DRAFT_PREVIEW_PORT = '41802'
const DRAFT_PREVIEW = typeof location !== 'undefined' && location.port === DRAFT_PREVIEW_PORT
export const VIDEO_CDN = DRAFT_PREVIEW ? '' : 'https://media.claude-unlimited.aiautotools.com'

/** config/video_meta.ts 里的 src（不含路径）-> R2 上的 key */
export const VIDEO_KEYS: Record<string, string> = {
'videos/v1_round1.mp4': 'videos/v1_round1.d0c3d4e6.mp4',
'videos/v1_round2.mp4': 'videos/v1_round2.4d4726e2.mp4',
'videos/v1_round3.mp4': 'videos/v1_round3.77bbc425.mp4',
'videos/v2.mp4': 'videos/v2.8c1875a7.mp4',
'videos/v4_mcp.mp4': 'videos/v4_mcp.22bf26f7.mp4',
'videos/v5_skills.mp4': 'videos/v5_skills.73410985.mp4',
'videos/v6_seek_t.mp4': 'videos/v6_seek_t.d278851d.mp4',
}

/** map 里的 key 是 R2 上的带哈希文件名；本地 public/videos/ 存的是原名，所以本地回落一律用原名。 */
export const videoUrl = (src: string): string => {
  const key = VIDEO_KEYS[src]
  if (VIDEO_CDN) return key ? `${VIDEO_CDN}/${key}` : `${VIDEO_CDN}/videos/${src}`
  return `/videos/${src}`
}

/** 首帧缩略图。缩略图体积小（几十 KB），留在站点 public/ 下，不必上 R2 */
export const posterUrl = (src: string): string =>
  `/videos/poster/${src.replace(/\.mp4$/, '.jpg')}`
