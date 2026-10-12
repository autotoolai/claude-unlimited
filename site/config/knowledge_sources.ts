/**
 * 知识库素材来源记录 —— 「每篇文章的英文/中文原文在哪」的唯一数据源。
 *
 * 约定（配套 scripts/gen_sources.py）：
 * - 本文件不被任何组件 import，第三方域名不会进入构建产物；只由 gen_sources.py / check_sources.py 读取。
 * - 每个 slug 对应 config/knowledge.ts 里的一篇 KnowledgeMeta；files[] 是该文的全部源页面
 *   （path = temp/aiprimetech_site/pages/ 下的文件名，文件名规则：URL 去首尾斜杠后 / 换成 __）。
 * - url 必须与源文件头 `# URL:` 一致（脚本会核对），section 是源站栏目（写进 _index.md 供后续核对）。
 * - index 是源站页面在 all_summaries.md 里的中文摘要原文（用于选题与事实核对）；中文版页面不在该文件里，
 *   此时用源文件头的 DESC 代替。
 * - 原文由 `python scripts/gen_sources.py` 逐字复制到 archive/knowledge_source_20261009/<slug>/，
 *   复制前需把仓库根 temp/aiprimetech_site/ 同步到 site/temp/aiprimetech_site/；`npm run check:sources` 校验一致性。
 *
 * 注意：素材站的整站抓取目录（仓库根 temp/）是 gitignored 的。这里的 path / url / title / section / index
 * 就是它进 git 的原因——以后换机器、重建抓取、核对某篇文章依据哪几页，都能凭本文件复原。
 */

export interface KnowledgeSourceFile {
  /** temp/aiprimetech_site/pages/ 下的文件名 */
  path: string
  /** 源站完整 URL（必须与文件头 `# URL:` 一致） */
  url: string
  /** 源页面标题（TITLE 行） */
  title: string
  /** 源站栏目，如 /claude-code/、/blog/、/docs/guides/、/zh/learn/ */
  section: string
  lang: 'en' | 'zh'
  /** 中文版页面的中文标题 */
  titleZh?: string
}

export interface KnowledgeSourceEntry {
  /** 与 config/knowledge.ts 的 KnowledgeMeta.slug 一致 */
  slug: string
  /** 抓取日期 YYYY-MM-DD */
  fetchedAt: string
  /** 源站页面中文摘要 / DESC 原文 */
  index: string
  files: KnowledgeSourceFile[]
}

const SITE = 'https://aiprimetech.io'

export const knowledgeSources: KnowledgeSourceEntry[] = [
  {
    slug: 'claude-code-tutorial',
    fetchedAt: '2026-10-08',
    index:
      '给出第一次会话的五步：/init 生成并认真修改 CLAUDE.md、先要计划再让它动手、告诉它测试命令并要求自跑自修、用 /permissions 收紧范围、话题一变就 /compact。常用命令表覆盖 /init、/compact、/clear、/model、/cost、/status、/permissions、/mcp、/agents、/hooks、/review、/doctor，以及非交互的 claude -p 和续接上次会话的 claude -c。回车是发送，换行用 Shift+Enter。核心判断是把 Claude Code 当成记忆力极好的初级工程师，用同样的评审标准对待它的产出。',
    files: [
      {
        path: 'claude-code__tutorial.md',
        url: `${SITE}/claude-code/tutorial/`,
        title: 'Claude Code Tutorial — First Session, CLAUDE.md, Plan Mode, Permissions (2026)',
        section: '/claude-code/',
        lang: 'en',
      },
      {
        path: 'claude-code__zh__tutorial.md',
        url: `${SITE}/claude-code/zh/tutorial/`,
        title: 'Claude Code 怎么用：使用教程、常用命令、换行与快捷键、第一次会话完整指南（2026）',
        section: '/claude-code/zh/',
        lang: 'zh',
        titleZh: 'Claude Code 使用教程：第一次会话、常用命令、换行与快捷键',
      },
      {
        path: 'zh__learn__use-claude-api-with-claude-code.md',
        url: `${SITE}/zh/learn/use-claude-api-with-claude-code/`,
        title: 'Claude Code 无限 API 使用指南',
        section: '/zh/learn/',
        lang: 'zh',
        titleZh: 'Claude Code 无限 API 使用指南',
      },
    ],
  },
  {
    // 原创文章，素材来自官方文档、官方 servers README、本机 CLI 与中文社区，不来自素材站抓取目录
    // 故 files[] 为空；原文副本见 site/temp/mcp_*_2026-10-10.*
    slug: 'claude-code-mcp-config',
    fetchedAt: '2026-10-10',
    index:
      '原创文章（2026-10-10）。素材原文副本见 site/temp/：mcp_docs_2026-10-10.txt（官方文档）、mcp_servers_readme_2026-10-10.md（官方 servers README）、mcp_cli_help_2026-10-10.txt（本机 CLI 帮助与 mcp list 输出）、mcp_weixin_2026-10-10.txt（搜狗跳转页，正文需 Playwright 渲染）。素材卡：① 官方 Claude Code MCP 文档（docs.claude.com/en/docs/claude-code/mcp，fetch_url 读取）：claude mcp add 的三种 transport（http / sse / stdio）与 --transport、--env/-e、--header/-H、--scope/-s 选项；选项必须写在服务器名字前面，-- 分隔服务器命令；scope local/project/user 与存储位置；project 级 .mcp.json 需人工批准（Pending approval），claude mcp reset-project-choices 重置；状态列（Pending approval / Rejected / disabledMcpjsonServers / Disabled for this project / disconnected 连续五次重连失败）；claude mcp list 与 /mcp 的四类告警（首尾空格、${VAR} 未设、同名多 scope 冲突、内置保留名 workspace/claude-in-chrome/computer-use）；同名不同 endpoint 需分别 OAuth 登录；claude mcp add-from-claude-desktop 仅 Mac/WSL；add-json 支持 stdio/SSE/HTTP/WebSocket；.mcp.json 条目 timeout 字段（毫秒）覆盖 MCP_TOOL_TIMEOUT；claude -p 与 SDK 会话自动重连无 /mcp 面板；找服务器应去 MCP Registry 而非 GitHub 仓库；disabledMcpServers 是用户配置的停用清单。② 本机 claude mcp --help / add --help（2026-10-10）：-t/--transport、-s/--scope 默认 local、-e/--env、-H/--header、--client-id/--client-secret、--callback-port；子命令 add/add-json/add-from-claude-desktop/get/list/login/logout/remove/reset-project-choices；官方文档未把 cmd /c 列为 Windows 硬性要求。③ 本机 claude mcp list：只连 Playwright 一个服务器。④ modelcontextprotocol/servers 仓库 README（curl raw，副本 temp/mcp_servers_readme_2026-10-10.md）：Reference Servers 只剩 Everything/Fetch/Filesystem/Git/Memory/Sequential Thinking/Time；Archived 段列出 AWS KB Retrieval/Brave Search/EverArt/GitHub/GitLab/Google Drive/Google Maps/PostgreSQL/Puppeteer/Redis/Sentry/Slack/SQLite 全部移入 servers-archived，Brave Search 由 brave/brave-search-mcp-server 接手、Slack 由 Zencoder 接手；README 明确参考实现是教学示例非生产方案；README 的 Windows 配置示例本身用 cmd /c npx，作为 Windows 写法的官方佐证。⑤ 中文社区 2026 推荐清单（ai.cheemao.com，fetch_url）：装 15 个服务器可能带来上百个工具定义常驻，烧 token 并让模型选工具犯迷糊；建议 4 到 6 个；选型标准「这件事是不是靠复制粘贴在做」；cursor 约 40 个活跃工具软上限。⑥ 本机开场 token 3 万多，MCP 工具 schema 占大头（与 claude-code-startup-tokens 一致）。⑦ 中文教程（公众号《Claude Code MCP 配置教程》《在 windows 下 OpenCode 如何正确配置 GitNexus MCP》、CSDN《Claude code 配置 MCP（windows）》）：Windows 上 stdio 服务器可能需要 cmd /c 包装；claude mcp add 缺 --transport 或缺 cmd /c 参数会连不上；.claude.json 手改示例；fetch 的 --ignore-robots-txt——只进素材记录，不作为官方口径。⑧ 小红书与知乎站内检索未找到与本主题相关的笔记（360 索引浅），知乎正文被风控拦截。',
    files: [],
  },
  {
    // 本条素材来源是 Remotion 官方文档与官方 skills 仓库（2026-10-10 核对），
    // 不是素材站的抓取目录，故 files[] 为空、archive 不落原文；index 是下面几页的中文要点。
    slug: 'claude-code-make-video',
    fetchedAt: '2026-10-10',
    index:
      'Remotion 的思路是给你一个帧号和一块空白画布，用 React 渲染任何东西；视频是随时间变化的图像，每帧都变就是动画。视频四个属性：宽、高、durationInFrames、fps。动画的本质是属性随时间变化，可用 interpolate() 映射帧区间与数值区间（配 extrapolateRight: "clamp"），也可用 spring() 做弹簧模拟。官方文档给出的 AI 入口是先把 Agent Skills 装上（npx skills add remotion-dev/skills），再让 Claude Code / Codex / OpenCode 建项目并生成；命令行入口为 npx create-video@latest。官方 skills 仓库含 /remotion-create、/remotion-markup、/remotion-studio、/remotion-render、/remotion-maps、/remotion-captions、/remotion-saas、/remotion-interactivity、/remotion-docs、/remotion-upgrade 等技能；总路由 /remotion-best-practices 的指引是：先开 Studio 预览，除非用户明确要求才渲染。渲染命令为 npx remotion render。中文社区实测补充（2026-10-10 核对）：Remotion Agent Skills 于 2026 年上半年推出后在中文社区（腾讯云开发者社区 2026-03/04/07 三篇文章、CSDN 2026-03 文章）被大量实测，常见说法是 remotion-best-practices 含 30+ 领域规则文件、解决 API 记不全/性能差/代码不规范三个通病（规则文件清单以官方仓库为准）；安装命令也写作 npx skills add remotion-dev/skills --skill remotion-best-practices。初始化推荐 Empty 模板并确认安装 TailwindCSS 与 Agent Skills；提示词要写精确数值（px、色值）并附参考图。渲染失败的排查共识是加 --log=verbose 看首处异常，常见原因为 undefined、数据未加载完即渲染、大图/长视频内存不足、Node 版本或并发过高；本地视频必须用 OffthreadVideo + staticFile() 引用 public/ 下的文件，直接写路径会报 DEMUXER_ERROR_COULD_NOT_OPEN。2026-09 爆火案例（2026-10-10 核对，中文媒体与 B 站教程）：Opus 5.5 于 9 月 22 日发布后刷屏的不是模型直出视频，而是「代码渲染」路线；社区称 Vibe Video，作品先在 X 涌现再蔓延到小红书、抖音（国内平台因封号风险未大量跟进）。代表性案例：X 博主 @anabology 给一段提示词、Midjourney 权限和情绪板，约 12 小时产出 5 分钟反乌托邦短片（浏览 1800 万+），完整流程约 19 小时、人工 50 条消息、API 626 美元；Deedy 为推理初创公司做发布视频约 1 分钟、2 美元、32 万播放；Pivi 只给一句话加参考视频做出 32.5 秒手绘风宣传片；Addy Osmani 40 秒讲浏览器原理；Deedy 由论文生成 8 分钟 3Blue1Brown 风格讲解（25 万播放）；Chubby 3 分钟 AI 简史；宝玉《桃花源记》three.js 3D 交互动画；WY《中华上下五千年》2 分 38 秒只用高档订阅周额度 1%；SuSu_酥酥 Claude 小人在自制剪辑软件时间轴上剪片（35 万播放）；Vox 29 秒《小字》；Justin 一句指令跑约 5 小时、约 6.97 亿 token 出 demoscene 片头、280KB 单 HTML。拆解出的通用骨架是四角色：导演（先写分镜、每镜有动效、角色固定、配色路线、切镜有理由）→ 制片（风格手册 + 按章节拆多个文件或子代理并行）→ 画师（每文件用代码逐帧画自己那段）→ 剪辑（脚本逐帧截图，FFmpeg 合成并校验）。骨架可换：不装 Remotion 也能用 HTML Canvas + Playwright 截图或 p5.js。优势是可编辑（改几行代码而非整条重生成）与模板化批量出片；边界是写实人物与自然物理仍属视频模型。负面反馈是只给一句指令和参考图会出「PPT 感」，需补分镜与风格手册。提示词技巧来自案例：参考视频让模型拆帧分析风格；长片先只要分镜表 + 风格手册，确认后按章生成；数值化 px、色值、行距。成本区间差异极大（数美元到数百美元），取决于时长、章节数、外部素材工具与迭代轮数。B 站教程侧另有共识：Remotion 约 3.6 万 Star，Claude Code + Remotion 的难点在动画质感优化，以及 6 大类动画（产品演示、数据可视化、地图、3D、视频包装、复刻视频）。补充核对（2026-10-10，2026-09-26 至 09-30 的中文社区长文与开源案例集）：① 路线分三层，底层 GSAP+HTML/React、中间 Remotion、上层轻量 HTML 逐帧框架（如 HyperFrames），底层都是「写代码画画面 → 无头浏览器/Playwright 逐帧截图 → FFmpeg 合成」；选中间层是因为长片组件化维护、AI 改动可控。② 海外动态设计师复盘给出的幕后规矩：每一帧只由时间参数 t 决定，禁用依赖上一帧状态的临时计时器，随机纹理固定种子，每轮导出联系表检查开头、手机尺寸与循环接缝——用于回答「为什么会出现会自动播放的 PPT 感」。③ 同质化风险：相同任务描述会把作品推向相近的文字、渐变、卡片和转场；品牌片必须把产品网址、logo、颜色、字体、真实截图喂进去，先拆镜头表，画面里的价格与界面数据必须来自产品本身。④ 成本真实样本：30 秒讲解片 700+ 行代码画帧、代码合成配乐、中途抽帧自查重渲，5 小时额度烧 5%；1 分钟创业产品发布片约 2 美元；单支讲解片生成约 4 分钟、模型费约 0.66 美元（不含渲染与重试）；60-70 秒动效实测 249 万输入 token、33 万输出、323 次请求；国内某模型 25.7 分钟出 88 秒实验短片。结论：真实成本大头是渲染等待、自主检查重试与长任务占用的额度窗口。⑤ 社区对 Opus 5.5 视频能力的争议是「自嗨」还是专业：批评者认为缺专业经验易成自嗨，支持者认为 AI 把写的门槛拉平、把定义问题的门槛抬高；我方文章取「画面数据必须真实 + 四角色骨架」两条可操作结论，不做价值判断。⑥ 相关开源案例集 awesome-opus5-5-videos 收录 400 至 500 条作品及原始提示词。⑦ 国内平台跟进情况：媒体与自媒体观察到 X 爆火后小红书、抖音出现零星跟进，但因平台对 AI 内容封号风险未成规模（2026-09-24 前后），到 2026-10-10 未见成规模笔记。',
    files: [],
  },
  {
    slug: 'claude-code-plan-mode',
    fetchedAt: '2026-10-08',
    index:
      '解释 plan 模式把「提方案」和「写代码」分开，是只读规划加等待批准，仍可读文件和调用只读工具（2.1.x 修过 Plan Mode 启动会话中只读工具调用的 bug）。三种进入方式：会话内按 Shift+Tab 循环切换、/plan（v2.1.72 起支持 /plan fix the auth bug 直接带任务）、启动时 claude --permission-mode plan；退出仍是切回 Manual/acceptEdits/auto。给出高质量 plan 的写法：用 @path/to/file 提前指定路径、附上验收标准，并附 plan / Manual / acceptEdits / auto 四种权限模式对照。另有把 permissions.defaultMode: "plan" 写进 ~/.claude/settings.json 设为默认的设置项。',
    files: [
      {
        path: 'blog__claude-code-plan-mode.md',
        url: `${SITE}/blog/claude-code-plan-mode/`,
        title: 'Claude Code Plan Mode: How to Use It and When It Saves Time and Tokens',
        section: '/blog/',
        lang: 'en',
      },
    ],
  },
  {
    slug: 'claude-code-permission-modes',
    fetchedAt: '2026-10-08',
    index:
      '逐条对比六种权限模式——default、acceptEdits、plan、auto、dontAsk、bypassPermissions 的基线行为和对应命令，并指出 --dangerously-skip-permissions 等同于 --permission-mode bypassPermissions，而 --allow-dangerously-skip-permissions 只是「让 bypass 可用」不会立即激活。版本时间线：auto 模式 2026 年 3 月 24 日上线研究预览、7 月 10 日全量；2.1.278（9 月 19 日）让服务端分类成为 API/Enterprise 及 Bedrock、Vertex、Foundry、网关的默认值且「分类开销不计费、计费回退会告警」；2.1.281 用 CLAUDE_CODE_AUTO_MODE_SERVER 环境变量控制开关。',
    files: [
      {
        path: 'blog__claude-code-auto-mode-vs-dangerously-skip-permissions.md',
        url: `${SITE}/blog/claude-code-auto-mode-vs-dangerously-skip-permissions/`,
        title: 'Claude Code Auto Mode vs --dangerously-skip-permissions: Letting Claude Work Without Asking',
        section: '/blog/',
        lang: 'en',
      },
    ],
  },
  {
    slug: 'claude-md-guide',
    fetchedAt: '2026-10-08',
    index:
      '讲清了 Claude Code 2.1.277（2026 年 9 月 18 日发布）新增的 AGENTS.md 回退机制：只有当从文件系统根到工作目录的祖先路径上不存在 CLAUDE.md、.claude/CLAUDE.md、CLAUDE.local.md 时，才会读取 AGENTS.md，而 ~/.claude/CLAUDE.md 和 .claude/rules/ 不构成抑制。核心配置是在 /config 里把 Project instructions 设为 claude-md-or-agents-md（默认）、claude-md-and-agents-md、claude-md 或 managed-only，具体 pluginConfigs 只能写进用户设置 ~/.claude/settings.json、--settings 传入的文件或托管设置，项目级 .claude/settings.json 不生效，改动下一次重载后生效。',
    files: [
      {
        path: 'blog__claude-code-agents-md-support.md',
        url: `${SITE}/blog/claude-code-agents-md-support/`,
        title: 'Claude Code Now Reads AGENTS.md: CLAUDE.md vs AGENTS.md and the .claude Directory',
        section: '/blog/',
        lang: 'en',
      },
    ],
  },
  {
    slug: 'claude-code-cli-cheatsheet',
    fetchedAt: '2026-10-08',
    index:
      '逐条列出 CLI 的启动形态（claude、claude -p、claude -c、claude -r、--model）与值得记住的参数：--output-format text|json|stream-json、--allowedTools 预授权、--dangerously-skip-permissions、--max-turns、--add-dir。还给出会话内斜杠命令清单（/init、/compact、/cost、/permissions、/agents 等）、配置文件的存放位置，以及 claude setup-token 这一为订阅用户 CI 生成长期 OAuth token 的用法，并明确它只对订阅有效、用 API key 时多余。写脚本和 CI 时用 claude -p 配合 --allowedTools 与 --max-turns 的组合，以及用 /v1/models 查端点支持的模型 id。',
    files: [
      {
        path: 'claude-code__cli.md',
        url: `${SITE}/claude-code/cli/`,
        title: 'Claude Code CLI Documentation — Commands, Flags, Headless Mode (2026)',
        section: '/claude-code/',
        lang: 'en',
      },
      {
        path: 'claude-code__zh__tutorial.md',
        url: `${SITE}/claude-code/zh/tutorial/`,
        title: 'Claude Code 怎么用：使用教程、常用命令、换行与快捷键、第一次会话完整指南（2026）',
        section: '/claude-code/zh/',
        lang: 'zh',
        titleZh: 'Claude Code 使用教程：第一次会话、常用命令、换行与快捷键',
      },
    ],
  },
  {
    slug: 'why-agents-cost-more-tokens',
    fetchedAt: '2026-10-08',
    index:
      '给出上下文成本的数学直觉：N 轮对话每轮约 T 个 token，累计输入 token 约为 N 平方乘 T 除以 2 而非 N 乘 T，会话长度翻倍输入账单约翻四倍，这就是「十分钟很便宜、一小时后吓人」的原因。给出四种可控住历史的模式：滑动窗口（只留最近 K 轮）、滚动摘要（用一次便宜模型把旧轮次压成一段摘要）、每个任务开新会话、把状态外部化到文件或数据库。常见元凶是工具结果：500 行数据会进入之后每一次请求，agent 读整文件、反复重发截图、完整构建日志都应只保留首尾各 50 行。',
    files: [
      {
        path: 'docs__guides__context-management.md',
        url: `${SITE}/docs/guides/context-management/`,
        title: 'Context management',
        section: '/docs/guides/',
        lang: 'en',
        titleZh: '上下文管理',
      },
      {
        path: 'learn__claude-code-api-costs.md',
        url: `${SITE}/learn/claude-code-api-costs/`,
        title: 'Claude Code Pricing Explained: API Costs, Plans & How to Cut Them',
        section: '/learn/',
        lang: 'en',
      },
    ],
  },
  {
    slug: 'claude-code-subagents',
    fetchedAt: '2026-10-08',
    index:
      '给出 .claude/agents/code-reviewer.md 的完整前置元数据，说明 description 应写成路由规则（"非小改动之后使用"）而不是职位名，tools 可限制为只读（不能编辑的审查者更安全），model 可固定档位或 inherit。项目级 .claude/agents 随仓库提交、全队共享，~/.claude/agents 只对自己生效，/agents 可在会话内增删；委派分隐式与显式两种，子智能体有自己的上下文窗口且不能再生成子智能体。成本解释很到位：读四十个文件的子智能体在自己的窗口里读完只回给主会话一段摘要，否则那四十个文件会在此后每轮反复重发。末尾提到实验性的 agent teams，多个会话作为有名字的队友共享任务列表与消息。',
    files: [
      {
        path: 'claude-code__subagents.md',
        url: `${SITE}/claude-code/subagents/`,
        title: 'Claude Code Subagents Documentation — Custom Agents, .claude/agents, Agent Teams (2026)',
        section: '/claude-code/',
        lang: 'en',
      },
    ],
  },
  {
    slug: 'claude-code-skills',
    fetchedAt: '2026-10-08',
    index:
      '先定义技能的本质是"指令的渐进式披露"——模型起初只看到 name 与 description，任务匹配时才读取完整 SKILL.md 及其引用的文件，因此能在压低上下文的同时按需提供流程、风格规则与可执行脚本。给出写技能时 description 要写成触发规则、SKILL.md 保持精简而把参考材料拆成单独文件、确定性步骤交给脚本等要点。目录有三处（用户级、项目级、插件内），并给出一条完整的 release-notes 技能示例。插件与市场部分给出 /plugin marketplace add、/plugin install、/plugin 三条命令，并指出官方 anthropics/skills 仓库含文档类技能与 skill-creator。',
    files: [
      {
        path: 'claude-code__skills.md',
        url: `${SITE}/claude-code/skills/`,
        title: 'Claude Code Skills & Plugins — Marketplace, Best Skills, Write Your Own (2026)',
        section: '/claude-code/',
        lang: 'en',
      },
    ],
  },
  {
    slug: 'claude-code-startup-tokens',
    fetchedAt: '2026-10-08',
    index:
      '拆解 Claude Code 冷启动约 33k token 的构成：系统提示词约 3k–5k、工具定义约 15k–20k（最大头，每个工具的 JSON Schema 含嵌套参数描述常占 500–1500 token）、环境上下文约 2k–4k、CLAUDE.md 0–10k+，并与 OpenCode 约 7k 的冷启动做对比。三个可控杠杆：精简 CLAUDE.md 只留「承载行为」的规则、用 claude mcp list / claude mcp remove 清理闲置 MCP 服务并用 settings 里的 permissions allow/deny 关掉无用工具（如 deny WebFetch）、以及利用 prompt caching 的前缀特性（中途改 CLAUDE.md 会让缓存失效，稳定缓存的 33k 前缀可能比反复重建的 7k 更便宜）。',
    files: [
      {
        path: 'blog__claude-code-token-overhead-startup.md',
        url: `${SITE}/blog/claude-code-token-overhead-startup/`,
        title: 'Why Claude Code Sends 33k Tokens Before Your Prompt (And What to Do)',
        section: '/blog/',
        lang: 'en',
      },
    ],
  },
  {
    slug: 'prompt-caching-explained',
    fetchedAt: '2026-10-08',
    index:
      '说明提示缓存把请求前缀存下来，后续共享该前缀的调用按更低的输入价计费，适合系统提示、工具与函数定义、被反复提问的文档、few-shot 示例这类稳定前缀；不适合缓存用户的最新消息、含时间戳或请求 id 的前缀（一个变动字节就会让它之后的内容全部失效）、以及低于最小长度的短提示。用法是在 system 数组的文本块上加 cache_control 的 ephemeral 标记，且顺序必须是稳定内容在前、易变内容在后。验证方式是看 usage 里有没有 cache_read 计数，一直为 0 说明前缀其实不稳定，常见元凶是时间戳、会话 id 或 JSON key 顺序不确定。',
    files: [
      {
        path: 'docs__guides__prompt-caching.md',
        url: `${SITE}/docs/guides/prompt-caching/`,
        title: 'Prompt caching',
        section: '/docs/guides/',
        lang: 'en',
        titleZh: '提示缓存',
      },
      {
        path: 'blog__prompt-caching-explained.md',
        url: `${SITE}/blog/prompt-caching-explained/`,
        title: 'Prompt Caching, Explained: When It Saves Money and When It Does Not',
        section: '/blog/',
        lang: 'en',
      },
    ],
  },
  {
    slug: 'claude-api-pricing-explained',
    fetchedAt: '2026-10-08',
    index:
      '了解 Claude API 价格的计算方式：input token 与 output token、prompt caching，以及如何预估一次请求的真实成本。计算器页给出 30 个模型的官方价对照（Claude Opus 5 为 $5/$25，Sonnet 5 为 $2/$10，Haiku 4.5 为 $1/$5），上下文窗口从 200K 到 1.05M 不等，并给出按 token 计费且输出价远高于输入价等结论。',
    files: [
      {
        path: 'zh__learn__claude-api-pricing-explained.md',
        url: `${SITE}/zh/learn/claude-api-pricing-explained/`,
        title: 'Claude API 价格，全面讲清楚',
        section: '/zh/learn/',
        lang: 'zh',
        titleZh: 'Claude API 价格，全面讲清楚',
      },
      {
        path: 'tools__claude-api-cost-calculator.md',
        url: `${SITE}/tools/claude-api-cost-calculator/`,
        title: 'Claude API Cost Calculator — Official vs Discounted Pricing (Oct 2026)',
        section: '/tools/',
        lang: 'en',
      },
    ],
  },
  {
    slug: 'reduce-token-usage-tips',
    fetchedAt: '2026-10-08',
    index:
      '作者把一个客服 agent 每工单 18,000–42,000 输入 token 压到中位数下降 68%，方法是先把 token 按 prompt 分段记账（system / history / retrieval / tool_results / user / output），发现真正吃 token 的是检索和上下文而不是用户问题。随后按业务路由设预算、用 rerank + 片段抽取替代 top-k 塞文档、用结构化摘要（保留精确 ID）替代整段历史、用 JSON Schema 和硬性格式约束输出、用 stop sequence 做边界、把简单子任务路由到便宜模型。结尾强调要用 assert_token_budget 这类断言在入口处 fail fast，衡量口径是「每成功任务的 token 数」而非单次调用。',
    files: [
      {
        path: 'blog__reduce-llm-token-usage.md',
        url: `${SITE}/blog/reduce-llm-token-usage/`,
        title: 'Engineering Lower Token Usage Without Hurting Quality',
        section: '/blog/',
        lang: 'en',
      },
    ],
  },
  {
    slug: 'choose-claude-model',
    fetchedAt: '2026-10-08',
    index:
      '从开发者实际使用角度对比 Claude 模型家族：Opus 4.8、Sonnet 4.6、Haiku 4.5 和 Fable 5，说明各自适合的场景。选型页核心观点是 Opus、Sonnet、Haiku 是同一家族在能力-成本曲线上的三个点位，最便宜的正确答案几乎从不是最大的模型，建议「先降一档试，质量真不行再升级」：Haiku 用于高并发、简单判断、延迟敏感场景；Sonnet 是编码和多数生产任务的默认选择；Opus 用于困难推理、长时运行 agent 和出错代价高的决策。',
    files: [
      {
        path: 'zh__learn__claude-api-models-compared.md',
        url: `${SITE}/zh/learn/claude-api-models-compared/`,
        title: 'Claude 模型对比',
        section: '/zh/learn/',
        lang: 'zh',
        titleZh: 'Claude 模型对比',
      },
      {
        path: 'tools__claude-model-selector.md',
        url: `${SITE}/tools/claude-model-selector/`,
        title: 'Which Claude Model Should You Use? Opus vs Sonnet vs Haiku (Oct 2026)',
        section: '/tools/',
        lang: 'en',
      },
    ],
  },
  {
    slug: 'claude-code-vs-codex',
    fetchedAt: '2026-10-08',
    index:
      '逐项对比三家：可用模型（Claude Code 只能用 Claude、Codex 只能用 OpenAI、OpenCode 任意）、是否开源、无头与 CI 方式（claude -p / codex exec）、扩展点、沙箱默认值、计费方式、自定义端点的变量名。最有价值的结论是"后端比智能体本身更影响体验"——同一个 Claude 模型经同一端点，Claude Code 会话与 OpenCode 会话产出的工作相似、花费相似，换端点才会同时改变两者的成本。选型建议是：想要最完整工具链选 Claude Code、团队已在用 ChatGPT 套餐且看重沙箱默认值选 Codex、在乎开源或想逐任务换模型选 OpenCode，也可以同时跑两个。',
    files: [
      {
        path: 'claude-code__vs-codex.md',
        url: `${SITE}/claude-code/vs-codex/`,
        title: 'Claude Code vs Codex CLI vs OpenCode (2026): Agents Compared, Pricing, Which to Pick',
        section: '/claude-code/',
        lang: 'en',
      },
    ],
  },
  {
    slug: 'claude-code-prompt-too-long-fix',
    fetchedAt: '2026-10-08',
    index:
      '先列出真正填满上下文的几类东西：工具输出（cat 一个 4MB 日志、压缩后的打包文件）、每个 MCP 服务器的工具 schema 会进入每一次请求、大体量技能与 CLAUDE.md 自动加载、Stop hook 把会话交给评估模型时自身就会溢出。处置顺序强调先跑 /context 看构成：如果固定成本（MCP、技能）占三分之一，压缩对话没用，要先移除；单次工具输出过大则 /clear 更快。还提到反向陷阱——选了默认 1M 窗口的模型但套餐不含该档位，报的是用量上限而非上下文错误。',
    files: [
      {
        path: 'claude-code__errors__prompt-too-long.md',
        url: `${SITE}/claude-code/errors/prompt-too-long/`,
        title: 'Claude "Prompt Is Too Long" / "Input Is Too Long for Requested Model" / "Context Limit Reached" — Fixes (2026)',
        section: '/claude-code/errors/',
        lang: 'en',
      },
    ],
  },
  {
    slug: 'claude-code-429-rate-limit',
    fetchedAt: '2026-10-08',
    index:
      '讲清三个同时生效的上限：每分钟请求数、每分钟输入/输出 token 数、并发在途请求数，且都是按模型按组织按消费档位计的。核心解释是智能体与聊天客户端的差异：Claude Code 每轮都流式输出（整个过程占住一个并发位）、子智能体并行（各占一位）、每轮重发完整会话（token/分钟随会话长度攀升），十个子智能体就是十个同时进行的流。给出六步修复顺序：先让客户端按 retry-after 重试、减少并行、/compact 压缩、用 /model 换档、后台工作挪到便宜档、最后才是申请提额。',
    files: [
      {
        path: 'claude-code__rate-limits.md',
        url: `${SITE}/claude-code/rate-limits/`,
        title: 'Claude Rate Limit Error — "API Error: Rate Limit Reached" in Claude Code, Claude Rate Limits Explained, Fixes (2026)',
        section: '/claude-code/',
        lang: 'en',
      },
      {
        path: 'blog__rate-limits-and-retries.md',
        url: `${SITE}/blog/rate-limits-and-retries/`,
        title: 'Handling Rate Limits and Retries on LLM APIs',
        section: '/blog/',
        lang: 'en',
      },
    ],
  },
  {
    slug: 'claude-code-529-overloaded',
    fetchedAt: '2026-10-08',
    index:
      '说明 529 是模型容量不足而非用户额度问题。成因除了新模型发布与美国工作时间早高峰的天然需求峰值，还有一个很实用的自造因素：自己把 N 个子智能体同时打出去，它们在同一分钟一起失败。修复顺序是让内置的重试跑完、/model 换档、给并发扇出加错峰、显式重跑被中断的子任务、大任务避开高峰。扇出式并行是最容易制造 529 的用法。',
    files: [
      {
        path: 'claude-code__errors__overloaded-529.md',
        url: `${SITE}/claude-code/errors/overloaded-529/`,
        title: 'Claude Overloaded Error (API Error 529) — Why It Happens and How to Fix It (2026)',
        section: '/claude-code/errors/',
        lang: 'en',
      },
    ],
  },
  {
    slug: 'claude-code-401-403',
    fetchedAt: '2026-10-08',
    index:
      '按诊断顺序组织：先用 /status 和环境变量确认当前到底发的是哪个凭据，并指出 ANTHROPIC_API_KEY 或 apiKeyHelper 的返回值优先于 OAuth 登录，陈旧密钥是「反复 /login 仍然 401」的经典原因；再用 curl 打 /v1/models 判断密钥是否属于该端点（控制台密钥与网关密钥互不通用）；最后处理 OAuth 侧的空 refreshToken、多个进程抢同一个 token、Keychain 被写坏等问题。403 则分 host_not_allowed（沙箱出口白名单或企业代理）、组织变更、网关账户禁用几种。',
    files: [
      {
        path: 'claude-code__errors__auth-401-403.md',
        url: `${SITE}/claude-code/errors/auth-401-403/`,
        title: 'Claude Code "401 Invalid Authentication Credentials", "Invalid API Key", "Not Logged In" and 403 Errors — Fixes (2026)',
        section: '/claude-code/errors/',
        lang: 'en',
      },
    ],
  },
  {
    slug: 'claude-code-connection-lost',
    fetchedAt: '2026-10-08',
    index:
      '给出一个两分钟自查法：用 curl 打端点，一秒内返回 401 说明网络通路正常、问题在上游或客户端，超时或 SSL 错误说明问题在本地。然后指出「Waiting for API response · check your network」这句话经常冤枉自己的网络，退避是指数增长所以真正的损害是等待时间。核心是一组可调环境变量：CLAUDE_CODE_MAX_RETRIES、CLAUDE_CODE_RETRY_WATCHDOG、API_TIMEOUT_MS、CLAUDE_STREAM_FIRST_BYTE_TIMEOUT_MS、CLAUDE_CODE_MAX_TOOL_USE_CONCURRENCY，以及企业 TLS 中间人代理要用 NODE_EXTRA_CA_CERTS 指定根证书。',
    files: [
      {
        path: 'claude-code__errors__connection-lost.md',
        url: `${SITE}/claude-code/errors/connection-lost/`,
        title: 'Claude Code ECONNRESET, "Connection Lost", "Waiting for API Response · Check Your Network", "Unable to Connect to API" and Certificate Errors — Fixes (2026)',
        section: '/claude-code/errors/',
        lang: 'en',
      },
    ],
  },
  {
    slug: 'claude-code-usage-limit-reached',
    fetchedAt: '2026-10-08',
    index:
      '按「来自哪个计量器」把消息分成三类：订阅的会话/周/Opus 滚动窗口（按 token 而非消息消耗，所以带子智能体的长会话掉得很快，/usage 与 /stats 可查，重置时间写在意料之中没有可修的）；控制台的指定消费上限与预付余额不足（都不是 bug，/compact 和重装都没用）；以及括号里写着「not your usage limit」的服务端限流。建议用 claude -c 续跑并设 CLAUDE_CODE_RETRY_WATCHDOG=1。特别提醒同机同时有密钥和订阅时密钥优先，容易撞上从不知道自己设过的上限；/status 显示当前到底是订阅还是密钥在计费，是排查「账单不对劲」的第一个动作。',
    files: [
      {
        path: 'claude-code__errors__usage-limit-reached.md',
        url: `${SITE}/claude-code/errors/usage-limit-reached/`,
        title: 'Claude "Usage Limit Reached", "Weekly Limit", "Specified API Usage Limits" and "Credit Balance Is Too Low" — What Each Means (2026)',
        section: '/claude-code/errors/',
        lang: 'en',
      },
    ],
  },
]
