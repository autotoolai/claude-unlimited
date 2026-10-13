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
 * - duration 是 ISO 8601（PT31S）。由 ffprobe 实测，改视频后必须同步。
 * - pages：视频所在的知识库文章 slug；不在文章正文里的视频不进 JSON-LD。
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
  /** 版本标签。同一个 label 系列的多支属于「同一支片子的迭代版本」，正文用 <VideoPlayer versions> 对照播放 */
  label?: string
  /** 版本定位：这个版本在优化过程的哪一步、暴露了什么问题 */
  note?: string
}

export const videos: VideoMeta[] = [
  {
    src: 'v1_round1.mp4',
    label: '第一轮',
    note: '第一轮：卡片卖点 19–31 字 ×4 条塞进 480×400 卡片，内容总高 442px 超可用 320px；CTA 入场帧 214 落在 SceneOutro 的 215 帧之内，等不到；尾部 100 帧无人负责，实测纯白空屏。',
    description: '用代码做视频的第一轮成片：卡片卖点溢出容器、结尾 CTA 一次都没出现、最后 100 帧纯白空屏。三处错误都由像素级机器闸量化，不是靠肉眼发现。',
    duration: 'PT32S',
    uploadDate: '2026-10-14',
    page: 'code-video-skills-guide',
  },
  {
    src: 'v1_round2.mp4',
    label: '第二轮',
    note: '第二轮：文字溢出与尾部空屏修好了，但静止闸仍 FAIL（静止占比 0.406、最长静止 5.25 秒）、响度闸 FAIL。七道闸里过两道，是「看起来比第一轮好」但仍不合格的中间态。',
    description: '用代码做视频的第二轮成片：排版与收尾已修，但静止占比 0.406、最长静止 5.25 秒、响度不合格。说明「肉眼看着好」和「机器闸全过」之间还隔着一轮。',
    duration: 'PT35S',
    uploadDate: '2026-10-14',
    page: 'code-video-skills-guide',
  },
  {
    src: 'v1_round3.mp4',
    label: '终版',
    note: '终版：八道机器闸全过。内容区墨迹中位数 23.94%、空格占比 3%、尾部 3 秒峰值 9.61%、最长静止 0.75 秒、响度 -15.86 LUFS、真峰值 -1.41 dBTP。',
    description: '用代码做视频的终版成片：卖点缩到 8–10 字 ×3 条、卡片提到 460、CTA 改为按绝对帧常驻的收尾层。八道机器闸全部通过，内容区墨迹中位数 23.94%、最长静止 0.75 秒。',
    duration: 'PT32S',
    uploadDate: '2026-10-13',
    page: 'code-video-skills-guide',
  },
  {
    src: 'v2.mp4',
    description: '上下文窗口与提示缓存的原理演示：相同前缀在第二次请求里如何命中缓存，以及命中前后 token 用量与耗时的差别。',
    duration: 'PT42S',
    uploadDate: '2026-10-12',
    page: 'code-video-skills-guide',
  },
  {
    src: 'v4_mcp.mp4',
    description: 'Claude Code 配置 MCP 的演示：claude mcp add 添加服务器、选择 scope、验证连接成功的完整命令序列。',
    duration: 'PT36S',
    uploadDate: '2026-10-13',
    page: 'code-video-skills-guide',
  },
  {
    src: 'v5_skills.mp4',
    description: 'Claude Code 技能（skills）的演示：技能目录结构、SKILL.md 的写法，以及技能被渐进式加载的过程。',
    duration: 'PT43S',
    uploadDate: '2026-10-13',
    page: 'code-video-skills-guide',
  },
  {
    src: 'v6_seek_t.mp4',
    description: '一条视频是怎么算出来的：解说稿怎么切成句子、每句怎么配上时间轴、每个时刻怎么算出一帧、帧怎么拼成 MP4，以及改一句话要怎么重算整条片。',
    duration: 'PT74S',
    uploadDate: '2026-10-13',
    page: 'code-video-skills-guide',
  },
]
