/**
 * 视频元数据 —— 视频的唯一数据源，供 VideoObject JSON-LD 与 llms.txt 派生。
 *
 * 为什么需要：产物里 <video> 的 src 是 Vue 绑定（VideoPlayer.vue 用它规避 Vite 把 mp4 当资源模块解析），
 * 爬虫不执行 JS、不读 data-*，等于这批视频对搜索引擎与 AI 抓取器完全不可见。补一份 VideoObject
 * 就能让它们进入视频富媒体结果与 AI 的引用候选。
 *
 * 约定：
 * - src 是 public/videos/ 下的**文件名**，不带路径、不带哈希。地址由 config/media_cdn.ts 的
 *   videoUrl() 统一拼（哈希后缀的映射也在那里），本文只管声明「有哪些视频」。
 * - 这里只登记正文里出现的视频。不出现在正文的片子不进 JSON-LD（否则会指向读者看不到的链接）。
 * - duration 是 ISO 8601（PT32S）。由 ffprobe 实测，改视频后必须同步。
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
]

/**
 * 已下架文章的视频元数据（2026-10-14 随 code-video-skills-guide 撤下）。
 *
 * 为什么不直接删：四支片子的 src / 时长 / 说明都还在，R2 上文件与 config/media_cdn.ts 的 VIDEO_KEYS 也都在，
 * 新文章（哪怕还是草稿）要用同一套素材时，直接把条目搬回 videos 即可，不必重测 ffprobe。
 *
 * 为什么留在 videos 里不行：videos 是 VideoObject JSON-LD 与 llms.txt 的唯一来源，文章没发布时挂上去，
 * 产物里就会出现指向 404 页面的 VideoObject 与 llms 链接。所以「未发布」必须表现为「不在 videos 里」。
 */
export const unlistedVideos: VideoMeta[] = [
  {
    src: 'v1_round3.mp4',
    description: 'Claude 无限卡的产品宣传片：四个镜头讲清这张卡是什么、有什么、怎么用，结尾给出访问地址。',
    duration: 'PT32S',
    uploadDate: '2026-10-13',
    page: 'code-video-skills-guide',
  },
  {
    src: 'v2.mp4',
    description: '上下文窗口与提示缓存的原理演示：相同前缀在第二次请求里如何命中缓存，以及命中前后 token 用量与耗时的差别。',
    duration: 'PT42S',
    uploadDate: '2026-10-14',
    page: 'code-video-skills-guide',
  },
  {
    src: 'v4_mcp.mp4',
    description: 'Claude Code 配置 MCP 的教学演示：claude mcp add 添加服务器、选择 scope、验证连接成功的完整命令序列。',
    duration: 'PT36S',
    uploadDate: '2026-10-14',
    page: 'code-video-skills-guide',
  },
  {
    src: 'v6_seek_t.mp4',
    description: '一条视频是怎么算出来的：解说稿怎么切成句子、每句怎么配上时间轴、每个时刻怎么算出一帧、帧怎么拼成 MP4。',
    duration: 'PT74S',
    uploadDate: '2026-10-14',
    page: 'code-video-skills-guide',
  },
]
