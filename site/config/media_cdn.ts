/**
 * 媒体 CDN —— 视频地址的唯一来源。
 *
 * 为什么视频不走 Pages：视频是不可变的大文件（单支 4–37MB，五支 + 版本对比会到 140MB+），
 * 放 public/ 意味着每次部署都要重传全部视频，且吃 Pages 单文件体积上限。迁到 R2 之后
 * 部署包与视频彻底解耦，视频可以按内容哈希长期缓存。
 *
 * VIDEO_CDN 留空则回落站点根路径（本地开发、以及 R2 域名未生效时的过渡态），
 * 两条路都通，不要因为域名没解析就把整条链路卡住。
 *
 * 产物名带内容哈希（videos/v1_round3.a1b2c3d4.mp4）：视频一改名字就变，
 * 于是 immutable 缓存永远不会拿到旧内容。map 查不到就回落原名——新视频还没上传时也不会 404 在构建期。
 */
export const VIDEO_CDN = 'https://media.claude-unlimited.aiautotools.com'

/** config/video_meta.ts 里的 src（不含路径）-> R2 上的 key */
export const VIDEO_KEYS: Record<string, string> = {
  'videos/v1_round3.mp4': 'videos/v1_round3.77bbc425.mp4',
  'videos/v2.mp4': 'videos/v2.8c1875a7.mp4',
  'videos/v4_mcp.mp4': 'videos/v4_mcp.22bf26f7.mp4',
  'videos/v5_skills.mp4': 'videos/v5_skills.73410985.mp4',
  'videos/v6_seek_t.mp4': 'videos/v6_seek_t.a5f38c65.mp4',
}

export const videoUrl = (src: string): string => {
  const key = VIDEO_KEYS[src]
  if (VIDEO_CDN) return key ? `${VIDEO_CDN}/${key}` : `${VIDEO_CDN}/videos/${src}`
  return key ? `/${key}` : `/videos/${src}`
}

/** 首帧缩略图。缩略图体积小（几十 KB），留在站点 public/ 下，不必上 R2 */
export const posterUrl = (src: string): string =>
  `/videos/poster/${src.replace(/\.mp4$/, '.jpg')}`
