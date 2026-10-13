/**
 * 视频元数据 —— public/videos/*.mp4 的唯一数据源，供 VideoObject JSON-LD 派生。
 *
 * 为什么需要：产物里 <video> 只有 data-src（VideoPlayer.vue 用它规避 Vite 把 mp4 当资源模块解析），
 * 爬虫不执行 JS、不读 data-*，等于这批视频对搜索引擎与 AI 抓取器完全不可见。补一份 VideoObject
 * 就能让它们进入视频富媒体结果与 AI 的引用候选。
 *
 * 约定：
 * - src 与 public/videos/ 下的文件名一一对应，改名必须同步这里。
 * - poster 指向站点根相对路径，用 public/videos/poster/ 下的首帧图。
 * - duration 单位 ISO 8601（PT3M12S）；uploadDate 是该视频首次上线日期。
 * - pages: 视频所在的知识库文章 slug；不在文章正文里的视频不进 JSON-LD。
 */
export interface VideoMeta {
  /** public/videos/ 下的文件名 */
  src: string
  /** 视频讲的主题，一句话说清它回答什么问题（AI 引用时读的就是这句） */
  description: string
  /** ISO 8601 时长 */
  duration: string
  /** 首次上线日期 YYYY-MM-DD */
  uploadDate: string
  /** 所在知识库文章 slug */
  page: string
}

export const videos: VideoMeta[] = [
  {
    src: 'v1_unlimited_card.mp4',
    description: 'Claude 无限卡的购买与接入全流程演示：从发卡站下单、拿激活码，到在后台兑换提取 API Key，再到 CC Switch 一键导入配置并检测链路。',
    duration: 'PT1M18S',
    uploadDate: '2026-10-12',
    page: 'code-video-skills-guide',
  },
  {
    src: 'v2_context_cache.mp4',
    description: '提示缓存的原理演示：展示相同前缀在第二次请求里如何命中缓存，以及缓存命中前后 token 用量与耗时的差别。',
    duration: 'PT1M2S',
    uploadDate: '2026-10-12',
    page: 'code-video-skills-guide',
  },
  {
    src: 'v4_mcp.mp4',
    description: 'Claude Code 配置 MCP 的演示：claude mcp add 添加服务器、选择 scope、验证连接成功的完整命令序列。',
    duration: 'PT1M24S',
    uploadDate: '2026-10-13',
    page: 'code-video-skills-guide',
  },
  {
    src: 'v5_skills.mp4',
    description: 'Claude Code 技能（skills）的演示：技能目录结构、SKILL.md 的写法，以及技能被渐进式加载的过程。',
    duration: 'PT1M41S',
    uploadDate: '2026-10-13',
    page: 'code-video-skills-guide',
  },
  {
    src: 'v6_seek_t.mp4',
    description: '代码渲染视频时用转场效果衔接镜头的演示：seek_t 方案怎么做、画面如何平滑过渡、什么时候不该用。',
    duration: 'PT1M33S',
    uploadDate: '2026-10-13',
    page: 'code-video-skills-guide',
  },
]
