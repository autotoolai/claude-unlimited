/**
 * 知识库元数据 —— 「Claude 知识库」的唯一数据源。
 *
 * 四个分类按用户旅程排列：配置完成之前看「使用教程」/guide，本模块只服务「配置完成以后」的人。
 *  start 上手与进阶 → how 原理与机制 → cost 成本与计费 → troubleshoot 报错排查
 *
 * 约定：
 * - 正文在 docs/knowledge/<slug>.md（原生 markdown，frontmatter 写 layout: page + knowledge: true），
 *   这里只放列表页、JSON-LD（Article + FAQPage）、OG、页脚用的元数据。
 * - 加一篇文章：写 docs/knowledge/<slug>.md → 在这里加一条 KnowledgeMeta（含 faq）→ 在
 *   config/knowledge_sources.ts 登记它的源站原文 → 跑 npm run gen:sources / gen:og:knowledge / gen:routes。
 *   PAGES（check_dist.mjs / verify_build.py）从本文件动态读取，不需要手动加。
 *   最后跑 `python scripts/fetch_knowledge_covers.py`：按 knowledge_sources.ts 里 /blog/ 源页面下载封面到
 *   public/knowledge/ 并回写 cover 字段（版权归源站，只作氛围配图；源页面无图则不写 cover）。
 * - faq[] 必须与 md 里「## 常见问题」的 H3 一一对应（问题文本一致），FAQPage JSON-LD 由它生成。
 * - 素材来源：archive/knowledge_source_20261009/<slug>/（由 scripts/gen_sources.py 从 aiprimetech.io 抓取正文逐字复制，
 *   仅作选题与事实核对，全部中文原创改写，不逐句翻译、不搬运推广段落与联盟链接）。
 * - 第三方域名只允许出现在 config/knowledge_sources.ts 与 archive/，本文件与产物里不得出现。
 */

export type KnowledgeCat = 'start' | 'how' | 'cost' | 'troubleshoot'

export interface KnowledgeCategory {
  cat: KnowledgeCat
  /** 列表页分类小节标题（全名），如「上手与进阶」 */
  name: string
  /** 一句话说明，列表页分类小节副标题 */
  desc: string
  order: number
  /** 卡片与页内目录用的短标签，如「上手」 */
  short: string
}

export interface KnowledgeFaq {
  /** 问题文本，必须与 md 里「## 常见问题」下的 H3 一致 */
  q: string
  /** 答案，1–2 句；只放能独立引用的结论 */
  a: string
}

export interface KnowledgeMeta {
  /** 路由 /knowledge/<slug>；与 docs/knowledge/<slug>.md 文件名一致 */
  slug: string
  cat: KnowledgeCat
  /** H1，含目标长尾词 */
  title: string
  /** meta description；≤110 字 */
  desc: string
  /** 列表卡与 OG 图副标题用的短摘要；≤60 字，不填回落 desc */
  summary?: string
  /** 'YYYY-MM-DD' 发布日期；仅用于 JSON-LD datePublished 与站内排序，不在页面展示 */
  date: string
  /** 'YYYY-MM-DD' 更新日期，不填等于 date；同样只在 JSON-LD 里体现 */
  updated?: string
  /** H1 上方短标签，如 'Claude Code' */
  kicker: string
  /** 列表卡顶部封面图（站点根相对路径）；文件在 public/knowledge/，见 scripts/fetch_knowledge_covers.py。
   *  源页面没有配图的条目不填，卡片自动退化成无图的纯文字卡。 */
  cover?: string
  tags?: string[]
  /** 预计阅读分钟数，列表页卡片用 */
  minutes: number
  /** 列表页精选大卡位；后续新增的文章默认不进精选 */
  featured?: boolean
  /** 相关推荐（页尾三格），按重要性排 */
  related?: string[]
  /** 「## 常见问题」里的问答，FAQPage JSON-LD 的来源 */
  faq?: KnowledgeFaq[]
  /** 素材来源：见 config/knowledge_sources.ts 里同 slug 的条目（仅内部用，不渲染） */
  sourceSlug?: string
}

export const knowledgeCategories: KnowledgeCategory[] = [
  { cat: 'start',        name: '上手与进阶', short: '上手', order: 1, desc: '装好只是开始：第一次会话、常用命令、计划模式、权限、CLAUDE.md，再往下是子代理与技能。' },
  { cat: 'how',          name: '原理与机制', short: '原理', order: 2, desc: '想搞懂它为什么这么运行：上下文、token、缓存、限流。' },
  { cat: 'cost',         name: '成本与计费', short: '成本', order: 3, desc: '想少花钱：账单构成、估算方法、按量与订阅的取舍、模型选型、终端 agent 怎么选。' },
  { cat: 'troubleshoot', name: '报错排查',   short: '排错', order: 4, desc: '出错了：按报错信息查，一次一个问题。' },
]

export const knowledge: KnowledgeMeta[] = [
  {
    slug: 'claude-code-tutorial',
    cat: 'start',
    title: 'Claude Code 教程：第一次会话之后怎么用',
    desc: '配置完成后怎么把 Claude Code 用顺手：/init 与 CLAUDE.md 怎么写、先要计划的工作流、常用命令表、让它自跑测试、环境变量冲突的排查。',
    summary: '配置完成后怎么把 Claude Code 用顺手：CLAUDE.md、工作流、常用命令。',
    date: '2026-10-09',
    kicker: 'Claude Code',
    cover: '/knowledge/claude-code-tutorial.jpg',
    tags: ['claude code 教程', '第一次会话', 'claude.md', '常用命令'],
    minutes: 7,
    featured: true,
    related: ['claude-code-plan-mode', 'claude-code-cli-cheatsheet'],
    sourceSlug: 'claude-code-tutorial',
    faq: [
      { q: '回车是发送，那怎么换行？', a: '输入框里按 Shift+Enter 换行。终端不支持时先输入一个反斜杠 `\\` 再按回车。多行的长提示可以先写进文件，再用管道喂进去。' },
      { q: 'Claude Code 本身收费吗？', a: '工具本身免费，模型调用按 token 计费或使用订阅额度。用无限卡时订阅期内不按 token 计费，细节见[套餐定价](/pricing)与[模型广场](/models)两页。' },
      { q: '第一次会话应该先做什么？', a: '先 `cd` 进项目目录再输入 `claude`，跑 `/init` 生成 CLAUDE.md 并把它改对；其余命令等你配置完成后再看[使用教程](/guide)。' },
      { q: '`/init` 生成的 CLAUDE.md 不对怎么办？', a: '直接编辑它，改成你项目真实的构建命令、测试命令与约定。它就是一个普通 markdown 文件，每次会话都会带上。' },
    ],
  },
  {
    slug: 'claude-code-mcp-config',
    cat: 'start',
    title: 'Claude Code MCP 怎么配：命令、scope 与避坑',
    desc: '用 claude mcp add 装外部工具：三种 transport、三种 scope 的区别、Windows 要不要 cmd /c 包装、官方参考服务器哪些已归档、装几个够用、连不上怎么排查、密钥怎么放才安全。',
    summary: 'claude mcp add 命令、三种 scope、Windows 坑、归档包避坑、连不上排查。',
    date: '2026-10-10',
    cover: '/knowledge/claude-code-mcp-config.jpg',
    kicker: 'Claude Code',
    tags: ['claude code mcp', 'mcp 配置', 'claude mcp add', 'model context protocol', 'mcp 服务器'],
    minutes: 10,
    related: ['claude-code-tutorial', 'claude-code-startup-tokens', 'claude-code-cli-cheatsheet', 'claude-code-skills'],
    faq: [
      { q: '连不上一个 MCP 服务器，先看哪里？', a: '先 `claude mcp list` 看状态列，再 `claude mcp get <名字>` 看详情。官方文档列出的高频原因只有四类：Pending approval（进 `/mcp` 批准）、Rejected（改 `settings.json` 的 `disabledMcpjsonServers`）、配置值有首尾空格、`${VAR}` 没设。其次是传输方式不匹配（远程 HTTP 服务器用了 stdio 命令）和名字冲突。' },
      { q: 'MCP 配置存在哪？能不能直接改 JSON？', a: 'user 和 local 范围的服务器存在本机用户配置文件里（Windows 上是家目录下的 `.claude.json`），project 范围存在项目根目录的 `.mcp.json`。不建议手改这个用户级文件：它同时保存会话状态，改坏了可能影响启动。用 `claude mcp add` / `remove` 增删更安全，手改只在给 `.mcp.json` 加 `timeout` 字段时必要。' },
      { q: '装几个 MCP 服务器合适？', a: '社区实测普遍给 4 到 6 个，并给出判断标准：只有把数据从别的系统手动倒进对话框这类动作才值得用一个 MCP 换掉。装完观察开场 token 是否明显上涨、模型是否开始出现选错工具的现象，超过就删。' },
      { q: 'Windows 上所有 MCP 都要 cmd /c 包装吗？', a: '不是所有。官方文档没有把 `cmd /c` 列为 Windows 的要求，它是很多中文教程里的经验做法。正确的用法是把它当成排查手段：某个 stdio 服务器连不上而别的正常时，用 `cmd /c` 包一层再试。' },
    ],
  },
  {
    slug: 'claude-code-make-video',
    cat: 'start',
    title: 'Opus 5.5 做视频教程：Remotion 出第一条 MP4',
    desc: 'Opus 5.5 最近刷屏的「一句话出视频」是怎么回事：它不生成像素，写代码再渲染成视频。零基础八步跑通第一条 MP4：装 Node.js 与 FFmpeg、建 Remotion 项目、装官方技能、提示词怎么写、预览与导出 mp4。',
    summary: '刷屏的「一句话出视频」背后是 Remotion：八步跑通第一条 MP4。',
    date: '2026-10-10',
    cover: '/knowledge/claude-code-make-video.jpg',
    kicker: 'Claude Code',
    tags: ['opus 5.5 视频', 'claude code 做视频', 'remotion 教程', 'AI 生成视频', 'vibe video'],
    minutes: 11,
    related: ['claude-code-tutorial', 'claude-code-skills', 'claude-code-plan-mode', 'claude-code-subagents'],
    faq: [
      { q: 'Claude 能直接生成视频吗？', a: '不能。官方口径是能看图，但不能生成、制作或编辑图像和视频。它做的是写出一段画面的程序，再渲染成 MP4；像素级的实拍画面仍然要用视频生成模型。' },
      { q: '这和剪映、Pr、Ae 比起来怎么样？', a: '这套流程没有可视化时间轴和拖拽，全靠改代码或用提示词，适合「代码演示、数据动画、字幕条、logo 演绎」这类规则明确的视频；自由拍摄和大量手工调色的片子，还是剪映或 Pr 更快。两者也可以配合：Claude 负责解说的脚本和分镜，代码生成画面型片段。' },
      { q: '出来的效果像 PPT 怎么办？', a: '九成是因为只丢了一句指令。三个补法按顺序试：先让它写分镜表和风格手册（角色固定、配色路线、每镜有动效）再一章一章生成；再要求所有动画只由帧号决定，不写「上一帧结束后停 0.3 秒」这种依赖上一帧状态的计时；最后把画面里的文字改成图形、图表、示意图，而不是一屏一屏的卡片。改完还是「自动播放的 PPT」，说明这个题材本来就不适合代码路线，换成数据可视化或 3D 场景会好很多。' },
      { q: '做一条视频大概要花多少钱？', a: '30 秒纯代码画面在本机渲染，token 消耗不大；真正决定花多少的是镜头数、迭代轮数和是否用外部素材工具。长片、多章节并行、反复重出才会明显贵，先出 30 秒样片定风格能省很多。' },
      { q: '我本机没有 FFmpeg 或者 Node.js 怎么办？', a: '两个都独立于 Claude，与用哪个模型无关。Node.js 用 nvm-windows 装 LTS 版本，FFmpeg 解压后把 `bin` 目录加进 PATH，重开终端用 `node -v` 和 `ffmpeg -version` 验证。' },
    ],
  },
  {
    slug: 'code-video-skills-guide',
    cat: 'how',
    title: '代码做视频：四个技能实测与分场景选型',
    desc: '实测四个开源代码渲染视频技能：video-shotcraft、anything2explainer、video-talkcraft、claude-motion-design，按宣传片、科普、教程、纯动效给出选型表。',
    summary: '四个代码渲染技能实测，按场景选型，附素材清单与踩坑。',
    date: '2026-10-13',
    kicker: '视频',
    cover: '/knowledge/code-video-skills-guide.jpg',
    tags: ['代码做视频', 'remotion', '视频生成', 'skills', '文案配音'],
    minutes: 11,
    related: ['claude-code-make-video', 'claude-code-skills', 'choose-claude-model'],
    sourceSlug: 'code-video-skills-guide',
    faq: [
      { q: "代码做视频和文生视频差在哪？", a: "文生视频是模型逐帧生成像素，适合实拍质感与人物表演；代码做视频是每一帧由程序算出来，适合字幕条、数据动画、代码演示、宣传片与科普讲解。核心差别是可复现：同一份代码渲染一百次结果完全一样。" },
      { q: "四个技能怎么选？", a: "看画面是真实界面还是抽象示意：真实界面（你的产品、你的终端）用 video-shotcraft；抽象示意图配解说用 anything2explainer；要字级时间戳锁配音用 video-talkcraft；想避开 Remotion 许可用 claude-motion-design。" },
      { q: "我该给技能多少信息？", a: "只给五样：主题或产品入口、时长、要不要解说、配音偏好、素材路径。不要自己写分镜、字幕位置、元素出现帧号——那是技能内部的实现，手填会和它的自动设计冲突。正确做法是让技能先出 30 秒样片，再提修改意见。" },
      { q: "中文配音用什么？出片后怎么检查？", a: "配音用 Kokoro-82M-v1.1-zh 本地跑，免费可商用不联网，四个中文音色；edge-tts 音质自然且有词级边界，但需要能连 speech.platform.bing.com，连不上握手 403。音量：人声 -14 LUFS，音乐 -18 以下让位，峰值不过 -1 dBTS。检查用机器闸而非人眼：本文实测里人工审帧认为两支片子通过，实际场景根本没挂载成片（上部像素标准差 0.00）。" },
      { q: "为什么第一帧很重要？", a: "X、Threads 这类平台直接抓视频第一帧当缩略图。第一帧是空白底色或半截入场动画，热度和点击都会打折，所以前 5 帧要放完整画面。" },
    ],
  },
  {
    slug: 'claude-code-plan-mode',
    cat: 'start',
    title: 'Claude Code 计划模式怎么用：四种权限模式的区别',
    desc: 'plan、manual、acceptEdits、auto 四种模式的差别，三种进入计划模式的方法，什么任务值得先规划再动手，以及计划模式与模型搭配的关系。',
    summary: 'plan / manual / acceptEdits / auto 的差别，何时先要计划再动手。',
    date: '2026-10-09',
    kicker: 'Claude Code',
    cover: '/knowledge/claude-code-plan-mode.jpg',
    tags: ['claude code 计划模式', 'plan mode', '权限模式'],
    minutes: 7,
    featured: true,
    related: ['claude-code-permission-modes', 'claude-code-tutorial', 'claude-code-prompt-too-long-fix'],
    sourceSlug: 'claude-code-plan-mode',
    faq: [
      { q: 'Shift+Tab 按了几下没进计划模式？', a: '看终端底部状态栏当前显示的模式名称，循环切换时以它为准。「按两下」只是从默认状态出发的描述。' },
      { q: '计划模式下它能跑命令吗？', a: '能跑只读命令（读文件、列目录、查状态），不能跑有副作用的命令（写文件、安装、删除、提交）。' },
      { q: '怎么让每次启动都进计划模式？', a: '在 `~/.claude/settings.json` 里设 `"permissions": { "defaultMode": "plan" }`；只想某一次则用 `claude --permission-mode plan` 启动。' },
      { q: '计划模式省 token 吗？', a: '没有固定的节省比例。它省的是不必要的文件搜索与返工轮次，代价是计划本身也要读文件、生成方案。' },
    ],
  },
  {
    slug: 'claude-code-permission-modes',
    cat: 'start',
    title: 'Claude Code 权限模式有哪些',
    desc: 'default、acceptEdits、plan、auto、dontAsk、bypassPermissions 六种权限模式的差别，跳过权限到底跳过了什么，无人值守任务怎么配。',
    summary: '六种权限模式的差别与无人值守任务的配置边界。',
    date: '2026-10-09',
    kicker: 'Claude Code',
    cover: '/knowledge/claude-code-permission-modes.jpg',
    tags: ['claude code 权限模式', 'auto mode', 'dangerously-skip-permissions', 'bypassPermissions'],
    minutes: 7,
    related: ['claude-code-plan-mode', 'claude-code-cli-cheatsheet', 'claude-code-tutorial'],
    sourceSlug: 'claude-code-permission-modes',
    faq: [
      { q: '--dangerously-skip-permissions 是完全不做任何检查吗？', a: '它跳过的是常规权限审批，剩下的保护措施仍然生效：危险的删除命令在 auto 与 bypass 模式下会先等待再拒绝。' },
      { q: 'auto 模式还会拦命令吗？', a: '会。auto 让被判定安全的动作直接执行、其余拦截让 Claude 换一种做法，连续拦截后可以转人工审批。' },
      { q: '为什么在项目 .claude/settings.json 里设 defaultMode: auto 没生效？', a: '项目级设置不能把 auto 或 bypassPermissions 作为 defaultMode。请写到用户设置 `~/.claude/settings.json`，或启动时带 `--permission-mode` 参数。' },
      { q: '无人值守跑长任务怎么配？', a: 'auto 模式加上 `--permission-prompts none`：本来会弹审批的动作一律拒绝，会话在允许的范围内继续，不会中途停下等人。' },
    ],
  },
  {
    slug: 'claude-md-guide',
    cat: 'start',
    title: 'CLAUDE.md 怎么写：写什么、放哪',
    desc: 'CLAUDE.md 该写什么、放在哪；2.1.277 起 AGENTS.md 在什么条件下会被读取；四个读取模式怎么选；设置、命令、子代理、技能分别放在 .claude 目录的哪里。',
    summary: 'CLAUDE.md 写什么放哪，AGENTS.md 何时被读，.claude 目录各文件用途。',
    date: '2026-10-09',
    kicker: 'Claude Code',
    cover: '/knowledge/claude-md-guide.jpg',
    featured: true,
    tags: ['claude.md', 'agents.md', '.claude 目录', '项目记忆'],
    minutes: 7,
    related: ['claude-code-tutorial', 'claude-code-cli-cheatsheet', 'claude-code-skills'],
    sourceSlug: 'claude-md-guide',
    faq: [
      { q: 'CLAUDE.md 是什么？', a: '它是 Claude Code 每次会话都会读入上下文的纯文本 Markdown 文件，用来放构建命令、代码约定、架构说明和工作流规则；`/init` 能根据项目起草一份。' },
      { q: 'CLAUDE.md 和 AGENTS.md 都存在时读哪个？', a: '2.1.277 的默认模式 `claude-md-or-agents-md` 下，只要有符合条件的 CLAUDE.md、.claude/CLAUDE.md 或 CLAUDE.local.md，AGENTS.md 就不回退。选 `claude-md-and-agents-md` 可以两个都读，或在 CLAUDE.md 里写 `@AGENTS.md` 导入。' },
      { q: '为什么加了一个 CLAUDE.local.md 之后 AGENTS.md 不读了？', a: '从文件系统根到工作目录的路径上只要找到 CLAUDE.local.md，默认回退就被它抑制了。它虽然是自己用的项目说明，却会改变 AGENTS.md 是否加载。' },
      { q: '能在项目 .claude/settings.json 里配置两个文件都读吗？', a: '不能，2.1.277 的这项 plugin 配置只认用户设置、`--settings` 传入的文件和托管设置。用 `/config` 改，或写到 `~/.claude/settings.json`。' },
    ],
  },
  {
    slug: 'claude-code-cli-cheatsheet',
    cat: 'start',
    title: 'Claude Code 命令与参数速查：会话内和命令行',
    desc: 'claude 的启动方式、常用参数（--model、--allowedTools、--output-format、--max-turns、--add-dir）、会话内斜杠命令表，以及写脚本和 CI 时的用法。',
    summary: '启动方式、常用参数、会话内斜杠命令表，脚本与 CI 用法。',
    date: '2026-10-09',
    kicker: 'Claude Code',
    cover: '/knowledge/claude-code-cli-cheatsheet.jpg',
    tags: ['claude code 命令', '斜杠命令', 'claude -p', 'headless'],
    minutes: 6,
    related: ['claude-code-tutorial', 'claude-code-permission-modes', 'claude-md-guide'],
    sourceSlug: 'claude-code-cli-cheatsheet',
    faq: [
      { q: '怎么知道端点支持哪些模型 ID？', a: '请求该地址的 `/v1/models`，返回的列表就是可用模型；也可以用 CC Switch 的「获取模型列表」。填进 `--model` 的值必须与返回的 ID 逐字一致。' },
      { q: 'claude -p 和交互式会话有什么区别？', a: '`-p` 是打印模式：读入输入、输出一段结果就退出，不弹审批。脚本、批处理和 CI 都用它，配 `--allowedTools` 预授权工具、配 `--max-turns` 限制轮次。' },
      { q: 'claude setup-token 是什么？', a: '在浏览器登录一次并打印一个长期 OAuth 令牌，给订阅用户在 CI 或无浏览器机器上用。用 API Key 时不需要它。' },
      { q: '怎么续接上一次的会话？', a: '`claude -c` 继续最近一次会话，`claude -r` 从列表里选一个会话恢复。' },
    ],
  },
  {
    slug: 'claude-code-subagents',
    cat: 'start',
    title: 'Claude Code 子代理怎么用',
    desc: '子代理是什么、.claude/agents/<name>.md 的 frontmatter 四个字段、项目级与用户级目录的优先级、隐式委派与显式点名、子代理为什么能省上下文，以及并行多少个会撞 429。',
    summary: '子代理的独立上下文、定义方式、委派方式与并行上限。',
    date: '2026-10-09',
    kicker: 'Claude Code',
    cover: '/knowledge/claude-code-subagents.jpg',
    tags: ['claude code 子代理', 'subagent', '.claude/agents', '并行', '多智能体'],
    minutes: 7,
    related: ['claude-code-plan-mode', 'claude-code-cli-cheatsheet', 'claude-code-429-rate-limit'],
    sourceSlug: 'claude-code-subagents',
    faq: [
      { q: '子代理是什么，和直接让它干活有什么区别？', a: '子代理在独立的上下文窗口里完成一块工作，只把一段结论交回主会话。主会话不必为此重发四十个文件的全文，所以大代码库任务明显更省。' },
      { q: '`.claude/agents/<name>.md` 里的 description 应该怎么写？', a: '写成「什么时候用我」的路由规则而不是职位名，例如「非小改动之后用它做评审」。模型只根据 description 决定要不要自动委派，写成「代码评审专家」基本不会被匹配到。' },
      { q: '项目级和用户级子代理同名会怎样？', a: '项目级优先，`.claude/agents/` 里的文件覆盖 `~/.claude/agents/` 里的同名文件。项目级的应该随仓库提交，团队共享同一个评审、测试、迁移子代理。' },
      { q: '子代理可以再派子代理吗？', a: '不能。子代理层级只有一层。需要多级编排只能用 agent teams，那是实验特性，随版本变化，用 `claude --help` 查当前开关。' },
    ],
  },
  {
    slug: 'claude-code-skills',
    cat: 'start',
    title: 'Claude Code 技能怎么写',
    desc: '技能是什么、为什么模型起先只看到 name 与 description、三个加载位置（用户级、项目级、插件内）、plugin marketplace 怎么装，以及写一个能被正确触发的技能要满足的四点。',
    summary: '渐进式披露、三个加载位置、marketplace 与写好技能的要点。',
    date: '2026-10-09',
    kicker: 'Claude Code',
    cover: '/knowledge/claude-code-skills.jpg',
    tags: ['claude code 技能', 'skills', 'SKILL.md', '渐进式披露', 'plugin'],
    minutes: 6,
    related: ['claude-code-subagents', 'claude-md-guide', 'claude-code-startup-tokens'],
    sourceSlug: 'claude-code-skills',
    faq: [
      { q: '技能是什么，和 CLAUDE.md、子代理有什么区别？', a: 'CLAUDE.md 每次会话全文进上下文；技能是按需加载，只在任务匹配时才读；子代理是独立执行者。技能管「这类任务按这套流程做」，子代理管「派谁去做」。' },
      { q: '模型怎么知道该用哪个技能？', a: '起先只看到每个技能的 name 和 description，任务匹配上才去读完整的 SKILL.md。所以 description 要写「何时用」，写职位名不会被匹配到。' },
      { q: '技能放在哪几个位置？', a: '`~/.claude/skills/<name>/SKILL.md` 是个人技能；`.claude/skills/<name>/SKILL.md` 随仓库提交、团队共享；插件内的技能随插件安装。' },
      { q: '技能和插件是一回事吗？', a: '不是。技能是一个能力（一个含 SKILL.md 的目录）；插件是可分发的打包物，可以含多个技能加斜杠命令、子代理和 MCP 服务，从 marketplace 安装。' },
    ],
  },
  {
    slug: 'why-agents-cost-more-tokens',
    cat: 'how',
    title: '为什么 Agent 比聊天更烧 token',
    desc: '每轮都要重发完整对话，输入 token 按轮次平方增长；工具输出是大头；四种控制历史的模式（滑动窗口、滚动摘要、每任务新会话、状态外部化）与它们的取舍。',
    summary: '输入 token 按轮次平方增长，工具输出是大头，四种控制历史的模式。',
    date: '2026-10-09',
    kicker: '原理',
    cover: '/knowledge/why-agents-cost-more-tokens.jpg',
    tags: ['claude code token 消耗', '上下文管理', '工具输出', 'agent 成本'],
    minutes: 6,
    related: ['claude-code-prompt-too-long-fix', 'reduce-token-usage-tips', 'prompt-caching-explained'],
    sourceSlug: 'why-agents-cost-more-tokens',
    faq: [
      { q: '会话时间长了 token 为什么会突然变多？', a: '因为每一轮都要重发整段历史。N 轮、每轮 T 个 token，累计输入约为 N²T/2；会话长度翻倍，输入账单约翻四倍。' },
      { q: '最占 token 的是什么？', a: '工具结果。一次 cat 一个 4MB 日志、或让 agent 读整文件，这段输出会进入之后每一次请求。只取首尾各几十行往往就够。' },
      { q: '摘要压缩用什么模型做？', a: '用便宜的档位（如 Haiku）。摘要是压缩任务不是推理任务，质量标准是「保留事实与 ID」而不是「讲得通顺」。' },
      { q: '长上下文窗口能不能解决这个问题？', a: '不能省，只是把上限抬高。上下文窗口是能力，不是默认架构；该不该把大段材料发进去，仍取决于任务是否真的需要。' },
    ],
  },
  {
    slug: 'claude-code-startup-tokens',
    cat: 'how',
    title: 'Claude Code 启动时那 33k token 去了哪',
    desc: '冷启动约 33k token 的构成：系统提示、工具定义、MCP 工具 schema、环境上下文与 CLAUDE.md；三个可控杠杆与提示缓存的关系。',
    summary: '33k 启动 token 的构成，三个可控杠杆，以及它与提示缓存的关系。',
    date: '2026-10-09',
    kicker: '原理',
    cover: '/knowledge/claude-code-startup-tokens.jpg',
    tags: ['claude code 启动 token', '工具 schema', 'mcp', '缓存'],
    minutes: 5,
    related: ['why-agents-cost-more-tokens', 'prompt-caching-explained', 'claude-code-prompt-too-long-fix'],
    sourceSlug: 'claude-code-startup-tokens',
    faq: [
      { q: '33k 是不是白花的钱？', a: '不是浪费，是换取即时的工具能力和更少的往返。精简它只是把固定成本换成变成本，用更小的启动开销换更多轮次。' },
      { q: '第一件该做的事是什么？', a: '清理 MCP 服务器（`claude mcp list` 后移除这个项目不用的）和用设置里的 `permissions` deny 关掉不用的工具，这一步收益最大。' },
      { q: 'CLAUDE.md 里的东西越多越好吗？', a: '只留真正会改变它行为的规则。删掉模型默认就会做的说明，深层文档改成按需引用而不是整段粘进去。' },
    ],
  },
  {
    slug: 'prompt-caching-explained',
    cat: 'how',
    title: '提示缓存原理：什么时候省钱、什么时候白花',
    desc: '提示缓存按前缀命中计费：什么是好的缓存对象、cache_control 怎么标、顺序为什么重要、怎么验证命中（cache_read），以及它什么时候不省。',
    summary: '按前缀命中的计费逻辑、cache_control 用法、命中验证与不省的情况。',
    date: '2026-10-09',
    kicker: '原理',
    cover: '/knowledge/prompt-caching-explained.jpg',
    tags: ['prompt caching', '提示缓存', 'cache_control', 'cache_read'],
    minutes: 5,
    related: ['claude-code-startup-tokens', 'claude-api-pricing-explained', 'why-agents-cost-more-tokens'],
    sourceSlug: 'prompt-caching-explained',
    faq: [
      { q: '提示缓存算不算压缩？', a: '不算。它是稳定前缀的复用：付一次创建成本，之后每次读都按更低的价计费。' },
      { q: '怎么确认缓存真的命中了？', a: '看响应 usage 里有没有 cache_read 计数。重复调用一直是 0，说明前缀并不稳定，常见元凶是时间戳、会话 ID 或 JSON 键顺序不确定。' },
      { q: '能不能把整个对话都缓存？', a: '不能。缓存的是前缀，用户最新消息每次都变；前缀里只要有一个字节变化，其后的内容全部失效。' },
    ],
  },
  {
    slug: 'claude-api-pricing-explained',
    cat: 'cost',
    title: 'Claude API 怎么计费：token 构成与估算',
    desc: '输入与输出 token 分别包含什么、缓存读写价与 Batch 折扣、为什么一次对话的账单远大于你看到的输入，以及怎么用四步估算一个月要花多少。',
    summary: '输入与输出 token 的构成、缓存价，以及一个可复用的估算公式。',
    date: '2026-10-09',
    kicker: '计费',
    cover: '/knowledge/claude-api-pricing-explained.jpg',
    tags: ['claude api 价格', 'token 计费', '成本估算', '缓存计费'],
    minutes: 6,
    related: ['prompt-caching-explained', 'why-agents-cost-more-tokens', 'claude-code-usage-limit-reached'],
    sourceSlug: 'claude-api-pricing-explained',
    faq: [
      { q: '我的成本为什么比预期高？', a: '请求里通常包含比你看到的用户输入更多的上下文：检索文档、长对话历史、代码文件、工具结果、多次 agent 步骤、失败后的重试。' },
      { q: '按量计费一定比固定套餐划算吗？', a: '不一定。按量适合轻量、偶发、可预测的负载；调用次数多、agent 多步执行时，固定费率更稳。' },
      { q: '按量计费、订阅和不限量怎么选？', a: '看你每次让模型读大文件、跑长会话前要不要心算「这次大概多少 token」。要，就选固定费率；一周只调用几次且规模可预测，按量更省；只在网页里聊天，Pro/Max 订阅就够。' },
      { q: '不限量套餐真的什么都不限吗？', a: '不是。取消的是按 token 计费，不是无限制并发与压测；仍有公平使用的速率与并发限制，具体数字见[常见问题](/faq#cat-limits-speed)。' },
      { q: '系统提示词要计入吗？', a: '要。system 提示、开发者指令、安全策略文本、schema 描述、工具返回都算输入 token；工具定义如果开了缓存则按缓存读写价计。' },
    ],
  },
  {
    slug: 'reduce-token-usage-tips',
    cat: 'cost',
    title: '降低 Claude 用量的工程方法：先测量再优化',
    desc: '按请求分段记账、给每条路由设 token 预算、检索前裁剪而不是检索后堆、结构化摘要替代整段历史、输出用 schema 约束、按任务路由模型，以及如何诚实地衡量节省。',
    summary: '分段记账、路由预算、检索裁剪、结构化摘要、输出 schema 与诚实衡量。',
    date: '2026-10-09',
    kicker: '成本',
    cover: '/knowledge/reduce-token-usage-tips.jpg',
    tags: ['降低 token 用量', 'token 预算', '检索裁剪', '输出 schema'],
    minutes: 8,
    related: ['why-agents-cost-more-tokens', 'choose-claude-model', 'claude-api-pricing-explained'],
    sourceSlug: 'reduce-token-usage-tips',
    faq: [
      { q: '为什么我的账单比「用户问的那句话」贵得多？', a: '用户的问题通常不到 300 token，其余是系统提示、完整历史、检索到的文档和工具结果的 JSON。默认设置里检索常常就是最大的那桶。' },
      { q: '降低 max_tokens 能省钱吗？', a: '能限制长输出，但阻止不了输入被塞满。输入才是通常的大头，先做输入侧的优化。' },
      { q: '用便宜模型分类会不会得不偿失？', a: '如果便宜分类省 300 token 却多花 600ms 和一条重试路径，就不划算。路由的前提是它可靠地完成那一步。' },
      { q: '怎样才算真的省了？', a: '看「每个成功任务的 token 数」，同时对照重试次数、升级人工的比例和用户追问次数；只比较单次调用会被省 token 但省坏质量的做法骗到。' },
    ],
  },
  {
    slug: 'choose-claude-model',
    cat: 'cost',
    title: '按任务选模型：Opus、Sonnet、Haiku 怎么选',
    desc: '三个档位分别在什么任务上用；为什么最便宜的正确答案通常不是最大的模型；先降一档试、失败再升级的做法；以及怎么用自己任务的评测而不是排行榜来选。',
    summary: '三档模型的任务边界，先降一档再升级，以及用自己任务做评测。',
    date: '2026-10-09',
    kicker: '成本',
    cover: '/knowledge/choose-claude-model.jpg',
    tags: ['claude 模型选型', 'opus sonnet haiku', '模型路由', '降档'],
    minutes: 7,
    related: ['reduce-token-usage-tips', 'claude-api-pricing-explained', 'claude-code-vs-codex'],
    sourceSlug: 'choose-claude-model',
    faq: [
      { q: '开发者应该先用哪个 Claude 模型？', a: '大多数工作流先从 Sonnet 开始：编码、工具调用、改仓库、写测试、调试和常规 API 任务都能覆盖，且延迟更容易接受。' },
      { q: '什么时候用 Opus 而不是 Sonnet？', a: '任务复杂、模糊或影响面大时：架构规划、困难 bug 排查、深度 code review、长上下文推理、上线前最终检查。' },
      { q: 'Haiku 最适合做什么？', a: '高并发、低复杂度的任务：分类、字段抽取、摘要、路由、简单改写、安全预检查和请求分流。' },
      { q: '换模型要改代码吗？', a: '同一个 Base URL 和 Key，换模型只是改请求里的模型 ID。可以先试便宜档，失败再重试更大的档。' },
    ],
  },
  {
    slug: 'claude-code-vs-codex',
    cat: 'cost',
    title: 'Claude Code 与 Codex CLI 怎么选',
    desc: 'Claude Code、Codex CLI、OpenCode 三个终端 agent 的逐项对照：模型、开源、无头模式、扩展性、沙箱、计费、自定义端点；各自适合谁，以及为什么真正的差别在底下的模型和价格。',
    summary: '三个终端 agent 的七项对照，以及差别到底在哪里。',
    date: '2026-10-09',
    kicker: '对比',
    cover: '/knowledge/claude-code-vs-codex.jpg',
    tags: ['claude code vs codex', 'codex cli', 'opencode', '终端 agent', '工具对比'],
    minutes: 7,
    related: ['choose-claude-model', 'claude-api-pricing-explained', 'claude-code-cli-cheatsheet'],
    sourceSlug: 'claude-code-vs-codex',
    faq: [
      { q: 'Claude Code 和 Codex CLI 最大的区别是什么？', a: 'agent 循环的形状已经趋同：读仓库、提计划、改文件、跑测试、迭代。真正的差别在下面——模型（Claude 独占 vs OpenAI 独占）和计费（订阅 / API / 按量）。' },
      { q: '哪个是开源的？', a: 'Codex CLI 与 OpenCode 开源；Claude Code 的命令行闭源，但它的 Agent SDK 与 GitHub Action 是开源的。' },
      { q: 'Codex CLI 能无人值守跑吗？', a: '能，用 `codex exec` 非交互模式，沙箱可选 read-only、workspace-write 或完全访问。对应到 Claude Code 是 `claude -p` 配合 `--allowedTools`。' },
      { q: 'Claude Code、Codex CLI 和 OpenCode 怎么选？', a: '已在用 ChatGPT 订阅、想要 OpenAI 模型或偏好更严的沙箱默认值，选 Codex；需要子代理、hooks、技能、插件、MCP 这整套扩展面，选 Claude Code；开源或按任务切模型优先于生态，选 OpenCode。建议在自己的仓库上各试一天。' },
    ],
  },
  {
    slug: 'claude-code-prompt-too-long-fix',
    cat: 'troubleshoot',
    title: 'prompt too long 报错怎么处理',
    desc: '「prompt is too long」「context limit reached」的完整处理：先 /context 看窗口被什么填满，再按优先级释放；/compact 与 /clear 的区别；表显示没用但仍报错怎么办。',
    summary: '先 /context 看构成，再按固定成本、单次输出、正常增长三种情况分别处理。',
    date: '2026-10-09',
    kicker: '排错',
    cover: '/knowledge/claude-code-prompt-too-long-fix.jpg',
    tags: ['claude code prompt too long', 'context limit', '/compact', '/context'],
    minutes: 5,
    featured: true,
    related: ['claude-code-tutorial', 'claude-code-plan-mode'],
    sourceSlug: 'claude-code-prompt-too-long-fix',
    faq: [
      { q: '`/compact` 也失败怎么办？', a: '说明可压缩的旧对话太少（比如一整轮都是巨大工具输出）。`/clear` 重开，下次把大输出拆小或先保存到文件再让它读。' },
      { q: '新会话第一次就报？', a: '检查 CLAUDE.md 是不是太长、是否一次粘贴了大文件、是否开了太多 MCP 工具。新开一个干净会话，只带必要输入。' },
      { q: '换模型有用吗？', a: '有用但要看窗口。官方标准窗口是 200k，网关上标着 1M 的变体实测并没有真的变大；切模型前后都先用 `/context` 确认当前窗口。' },
      { q: '这个错误会影响计费吗？', a: 'Claude 无限卡订阅期内不按 token 计费，所以这个报错不影响费用，只影响当前会话能不能继续。' },
    ],
  },
  {
    slug: 'claude-code-429-rate-limit',
    cat: 'troubleshoot',
    title: 'Claude Code 报 429 限流怎么办',
    desc: '429 的三个上限：每分钟请求数、每分钟 token 数、并发在途请求；为什么 Agent 比聊天更容易撞上；按有效顺序排列的六步处理与脚本里的 --max-turns。',
    summary: '429 的三个上限、Agent 更容易撞上的原因、六步处理顺序。',
    date: '2026-10-09',
    kicker: '排错',
    cover: '/knowledge/claude-code-429-rate-limit.jpg',
    tags: ['claude code 429', 'rate limit', '并发', 'tpm'],
    minutes: 5,
    related: ['claude-code-529-overloaded', 'claude-code-usage-limit-reached', 'claude-code-connection-lost'],
    sourceSlug: 'claude-code-429-rate-limit',
    faq: [
      { q: '429 是什么意思？', a: '你在每分钟的请求数、token 数或并发在途请求上超了上限。Claude Code 会按 retry-after 等待并重试；持续超限就要减少并发或压缩上下文。' },
      { q: '限流有哪几个维度？', a: '每分钟请求数、每分钟输入与输出 token 数、并发在途请求数，都按模型分别计算。Agent 会话通常先撞上并发和 token/分钟。' },
      { q: '怎么提高上限？', a: '官方按消费档位自动调整，档位随支出上升；要更高得联系销售。我们这边新账户的并发从保守值起步，可以带着账户和工作负载联系客服调整。' },
      { q: '这是不是订阅的用量上限？', a: '不是。限流是每分钟计算、过一会儿自己恢复；用量上限按固定时间重置。两者报错文案不同。' },
    ],
  },
  {
    slug: 'claude-code-529-overloaded',
    cat: 'troubleshoot',
    title: 'Claude 报错 529 overloaded 怎么处理',
    desc: '529 是模型容量不足不是额度问题：常见触发（模型发布、美国工作时间、自己的子代理扇出）、五步处理，以及 529、500、429 三者的区别。',
    summary: '529 是容量问题：五步处理，以及它与 500、429 的区别。',
    date: '2026-10-09',
    kicker: '排错',
    cover: '/knowledge/claude-code-529-overloaded.jpg',
    tags: ['claude 529', 'overloaded', '容量不足', '子代理并发'],
    minutes: 4,
    related: ['claude-code-429-rate-limit', 'claude-code-permission-modes', 'claude-code-tutorial'],
    sourceSlug: 'claude-code-529-overloaded',
    faq: [
      { q: '529 是什么意思？', a: '那一刻模型没有空闲容量（HTTP 529，overloaded_error）。影响所有用这个模型的人，会自己恢复。' },
      { q: '怎么处理？', a: '让 Claude Code 把内置重试跑完、用 `/model` 换一档、减少同时运行的子代理；大任务尽量避开高峰。' },
      { q: '买了更大的套餐就不会 529 吗？', a: '不会。529 是容量问题，与套餐无关，Max 用户和普通用户一样会遇到。' },
    ],
  },
  {
    slug: 'claude-code-401-403',
    cat: 'troubleshoot',
    title: 'Claude Code 报错 401 / 403 怎么解决',
    desc: '先 /status 看当前发的是哪个凭据；环境变量里的陈旧密钥优先于登录态；Key 与端点必须匹配；OAuth token 损坏与多进程抢刷新的修法；403 的四种来源。',
    summary: '先确认发的是哪个凭据，再分 Key 与端点不匹配、OAuth token、403 来源三类处理。',
    date: '2026-10-09',
    kicker: '排错',
    cover: '/knowledge/claude-code-401-403.jpg',
    tags: ['claude code 401', '403', 'invalid api key', 'oauth'],
    minutes: 6,
    related: ['claude-code-connection-lost', 'claude-code-usage-limit-reached'],
    sourceSlug: 'claude-code-401-403',
    faq: [
      { q: '一直 401，反复 /login 也没用？', a: '检查 `/status` 和环境变量。环境里的 `ANTHROPIC_API_KEY`（或 `apiKeyHelper` 的返回值）优先于登录态，一个几个月前导出的陈旧密钥就是反复 `/login` 仍然 401 的典型原因。' },
      { q: '401 和 invalid x-api-key 怎么区分？', a: '前者是凭据无效或被拒，后者是端点不认这个 Key。Key 只属于一个端点：控制台 Key 只对官方地址有效，换到别处一律 401。用 curl 打 `/v1/models` 能一眼看出是哪一种。' },
      { q: '403 host_not_allowed 是 Key 的问题吗？', a: '不是。是沙箱出口白名单或企业代理拒绝了目标主机，凭据没问题。把主机加进白名单，或在沙箱外运行 CLI。' },
      { q: '最快的绕过办法是什么？', a: '用 API Key：设好 `ANTHROPIC_BASE_URL` 与 `ANTHROPIC_API_KEY` 后，Claude Code 完全不走 OAuth，没有 token 刷新，也没有多进程竞争。' },
    ],
  },
  {
    slug: 'claude-code-connection-lost',
    cat: 'troubleshoot',
    title: 'Claude Code 连接中断、等待 API 响应怎么处理',
    desc: '两分钟自查法：curl 打端点，401 秒回说明网络通、超时或 SSL 错说明问题在本地；退避超时变量；代理、VPN 与企业 TLS 中间人证书的处理。',
    summary: '两分钟自查法、退避超时变量、代理与企业 TLS 中间人证书的处理。',
    date: '2026-10-09',
    kicker: '排错',
    cover: '/knowledge/claude-code-connection-lost.jpg',
    tags: ['claude code connection lost', 'econnreset', '代理', '证书'],
    minutes: 5,
    related: ['claude-code-401-403', 'claude-code-529-overloaded', 'claude-code-429-rate-limit'],
    sourceSlug: 'claude-code-connection-lost',
    faq: [
      { q: '怎么判断是我的网络还是上游的问题？', a: '用 curl 打端点：一秒内返回 401 说明网络通路正常，问题在上游或客户端；超时或 SSL 错误说明问题在你这一侧。' },
      { q: '「Waiting for API response · check your network」是网络问题吗？', a: '经常不是。退避是指数增长，真正难受的是等待时间；把首字节超时调低，客户端会更快放弃沉默的流并重试。' },
      { q: '公司网络报 unable to get local issuer certificate？', a: '企业 TLS 检查代理用自己的证书替换了官方证书。把公司根证书导出成 PEM，设置 `NODE_EXTRA_CA_CERTS` 指向它；不要关闭证书校验。' },
      { q: '重试次数怎么调？', a: '默认 10 次、间隔逐渐变长，`CLAUDE_CODE_MAX_RETRIES` 最多提到 15；无人值守的运行可以设 `CLAUDE_CODE_RETRY_WATCHDOG=1` 让它一直重试。' },
    ],
  },
  {
    slug: 'claude-code-usage-limit-reached',
    cat: 'troubleshoot',
    title: 'Claude 提示用量上限：分清是哪个计量器',
    desc: '订阅窗口、控制台消费上限、余额不足、服务端临时限流四类消息的区分与处理；为什么同机同时有 Key 与订阅时 Key 优先；/status 是排查账单问题的第一步。',
    summary: '四类用量消息的区分与处理，/status 是排查账单问题的第一步。',
    date: '2026-10-09',
    kicker: '排错',
    cover: '/knowledge/claude-code-usage-limit-reached.jpg',
    tags: ['usage limit reached', 'weekly limit', 'credit balance', '/status'],
    minutes: 6,
    related: ['claude-code-prompt-too-long-fix', 'claude-code-429-rate-limit', 'claude-api-pricing-explained'],
    sourceSlug: 'claude-code-usage-limit-reached',
    faq: [
      { q: '「达到指定用量上限」是什么？', a: '控制台里为组织设置的月度消费上限，到了就停，消息里的日期一到或管理员调高后恢复。它只作用于 API Key，与订阅无关。' },
      { q: '「余额不足」是什么？', a: '预付余额用完了。API 是预付制，余额为空就没有调用。`/compact`、重启、重装都没用，只能充值或改用订阅登录。' },
      { q: '「not your usage limit」是什么？', a: '服务端在高峰时限流，你的额度没动。等一分钟，用 `claude -c` 续跑；无人值守的运行设 `CLAUDE_CODE_RETRY_WATCHDOG=1`。' },
      { q: '怎么继续工作？', a: '把同样的 Claude Code 指向一个 API 端点：按 token 计费，没有会话窗口和周窗口；订阅重置后再取消环境变量切回来。' },
    ],
  },
]


export function knowledgeBySlug(slug: string): KnowledgeMeta | undefined {
  return knowledge.find((k) => k.slug === slug)
}

export function knowledgeByCategory(cat: KnowledgeCat): KnowledgeMeta[] {
  return knowledgeCategoryEntries(cat)
}

export function knowledgeCategoryName(cat: KnowledgeCat): string {
  return knowledgeCategories.find((c) => c.cat === cat)?.name ?? cat
}

export function knowledgeCategoryShort(cat: KnowledgeCat): string {
  return knowledgeCategories.find((c) => c.cat === cat)?.short ?? cat
}

/** 列表卡与 OG 图副标题用：summary 优先，回落 desc */
export function knowledgeSummary(k: KnowledgeMeta): string {
  return k.summary ?? k.desc
}
/* ---------- 站内顺序与派生：全部文章 date 相同，排序必须显式确定 ---------- */

/** 站内顺序 = knowledge 数组的书写顺序（不再按 date 倒序：所有文章同一天，date 排序没有意义） */
export const knowledgeEntries: KnowledgeMeta[] = [...knowledge]


/** 分类内的文章按站内顺序 */
export function knowledgeCategoryEntries(cat: KnowledgeCat): KnowledgeMeta[] {
  return knowledgeEntries.filter((k) => k.cat === cat)
}

/** 分类内的文章数 */
export function knowledgeCategoryCount(cat: KnowledgeCat): number {
  return knowledgeEntries.reduce((n, k) => n + (k.cat === cat ? 1 : 0), 0)
}
