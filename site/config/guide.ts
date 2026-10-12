/**
 * 使用教程内容数据 —— 「使用教程」单页（/guide）的唯一数据源。
 *
 * 页面只回答一件事：已经买好了，怎么把 Claude 跑起来。购买相关的正文（选套餐、发卡站下单、
 * 订单号换激活码）在 2026-10 重构时整段删除，改为不再在正文里放购买入口，客服与售后统一走右下角在线助手。
 *
 * 正文分两条轨，页内用分段切换（SegmentedTabs）：
 *   小白教程（默认，7 步）：安装 CC Switch → 获取 API Key → 一键导入 → 获取并保存模型 → 启用并检测链路 → VS Code 插件
 *     顺序与文案逐条对齐卖家腾讯文档《AI工具使用教程》第 3 章；文档里的「切换新模型」一节按买家要求
 *     不搬进小白轨，/model 的用法只留在高手教程与知识库命令速查里。
 *   高手教程（5 节）：参数速查 → 手动配置供应商 → 环境变量 → 编辑器与第三方工具 → 自检
 *   两条轨共用：常见问题排查
 *
 * 来源：
 * - 小白轨的步骤顺序与配图直接采用发给买家的腾讯文档《AI工具使用教程》（11 张真实截图，
 *   图片落在 .vitepress/theme/assets/guide/），用户按官网图文做能在卖家文档里找到同一步。
 * - Claude Code 安装与终端用法：官方文档 docs.claude.com/en/docs/claude-code/setup 与 quickstart。
 * - 站内知识库 docs/knowledge/*.md（命令速查、CLAUDE.md、计划模式、报错排查）。
 *
 * 规则：
 * - 所有网址来自 config/site.ts 的 partners（purchase / console / ccswitch），这里只引用 id，不写 URL。
 * - 截图文件名对应 .vitepress/theme/assets/guide/ 下的图片（GuideShot.vue 里有静态导入表）。
 * - 正文里的站内链接写 <a href="...">，渲染时由 utils/inline.ts 的 renderInline 转成 <a>；CompareTable 的表格是纯文本渲染，不支持链接。
 * - 锚点 id 是深链契约：config/faq.ts 与 config/kefu_bot.ts 里有 /guide#models、/guide#ccswitch、
 *   /guide#editors、/guide#errors 等外链，重排块顺序时不改这些 id。
 */

import { partnerUrl, siteConfig } from './site'
import { consoleBackupDomains } from './console'

/** 管理后台地址（教程里的「后台兑换」「一键导入」「Base URL」都指向它） */
const consoleUrl = siteConfig.partners.find((p) => p.id === 'console')?.url ?? ''
/** Base URL 根地址：后台地址去掉结尾斜杠，环境变量示例与命令块里都用它，不写死域名 */
const baseUrl = consoleUrl.replace(/\/+$/, '')

/** Base URL 根地址：与教程里的环境变量、命令块同源，首页 Hero 的演示终端也用它，不写死域名 */
export const gatewayBaseUrl = baseUrl

/** 教程的两条轨。tab 不设的块（常见问题排查）在两条轨下面都显示。 */
export type GuideTabId = 'novice' | 'pro'

/** 教程页两条轨的分组，供 SegmentedTabs 与右侧目录共用 */
export const guideTabs: { id: GuideTabId; name: string; desc: string }[] = [
  { id: 'novice', name: '小白教程', desc: '没配过，跟着做就行：先装 CC Switch，再取 Key 并一键导入，每一步都有截图对照。' },
  { id: 'pro', name: '高手教程', desc: '已经有 Key，或者不想装 CC Switch：直接抄参数、手填字段或设环境变量。' },
]

export interface GuideShot {
  /** 图片文件名，对应 .vitepress/theme/assets/guide/<file>（GuideShot.vue 里有静态导入表） */
  src: string
  /** 图注编号，如「图 03」，与正文引用一致 */
  label: string
  caption: string
}

export interface GuideTerm {
  title: string
  lines: string[]
}

export interface GuideStep {
  title: string
  body: string[]
  /** 「要做的事」高亮行 */
  do?: string
  tips?: string[]
  /** 终端命令块 */
  cmd?: string[]
  shot?: GuideShot
  /** 明文网址行（可点开 + 一键复制），如 ccswitch.io、后台地址 */
  url?: { href: string; path?: string; label?: string }
  /** 步骤内的按钮（主动作，如「去后台兑换」）；区块级用 GuideBlock.cta */
  cta?: { text: string; url: string; external?: boolean }[]
  links?: { text: string; url: string; external?: boolean }[]
}

export interface GuideBlock {
  id: string
  h2: string
  /** H2 上方的步骤标签，如「小白教程 · 第 3 步」；不带则不渲染 */
  kicker?: string
  /** 小节内第一段（可选，页内目录只到 h2） */
  lead?: string
  /** 段落 */
  paras?: string[]
  /** 列表 */
  list?: string[]
  /** 提示块（浅底） */
  notes?: string[]
  /** 术语 / 命令块 */
  cmd?: GuideTerm[]
  /** 表格 */
  table?: { columns: string[]; rows: { label: string; values: string[] }[]; caption?: string }
  /** 编号步骤 */
  steps?: GuideStep[]
  /** 插图（单独一张） */
  shot?: GuideShot
  /** 明文网址行（可点开 + 一键复制） */
  url?: { href: string; path?: string; label?: string }
  /** 链接列表 */
  links?: { text: string; url: string; external?: boolean }[]
  /** 区块末尾的按钮行（links 是无序列表，cta 是按钮） */
  cta?: { text: string; url: string; external?: boolean }[]
  /** 属于哪条轨；不传 = 两条轨共用的块 */
  tab?: GuideTabId
}

export interface GuidePage {
  /** 路由：/guide（教程只有这一页） */
  slug: string
  /** 目录里的短名 */
  nav: string
  order: number
  title: string
  /** 一句话结论（H1 下方的 lead） */
  lead: string
  /** 副标题（浏览器 tab 里 description 用） */
  desc: string
  eyebrow: string
  blocks: GuideBlock[]
  /** 页尾「接着看」 */
  next: { text: string; url: string }[]
}

const ccswitch = () => partnerUrl('ccswitch')

/** 快捷方式：给小白教程的七个步骤统一编号，kicker 手写容易和 h2 里的数字漂移 */
const N = (n: number) => '小白教程 · 第 ' + n + ' 步'

export const guidePages: GuidePage[] = [
  {
    slug: '/guide',
    nav: '使用教程',
    order: 1,
    title: '使用教程',
    eyebrow: '已经买好了，从这里开始',
    lead: '整件事只有三件事：装 CC Switch → 拿到 API Key 并一键导入 → 启用后开始用。六步都有截图，照着点就行。卡住了点右下角在线助手，手把手带你走一遍。',
    desc: 'Claude 无限卡使用教程：获取 API Key、CC Switch 一键导入配置、获取并保存模型、启用并检测链路、VS Code 安装官方插件；另附高手向的参数速查、手动配置、环境变量、编辑器接入与报错速查。',
    blocks: [
      // ---------------- 客服入口说明 ----------------
      {
        id: 'contact',
        h2: '先说一句：卡住随时找客服',
        lead: '下面是完整的人工联系方式，配置过程中任何一步报错、模型列表为空、点了没反应，都可以随时问。',
      },

      // ---------------- 小白教程（逐条对齐腾讯文档第 3 章） ----------------
      {
        id: 'install-ccswitch',
        kicker: N(1),
        h2: '1. 安装 CC Switch',
        tab: 'novice',
        lead: 'CC Switch 是个很小的配置管理软件，专门管 Claude Code 的 API 配置。下载后安装，全部保持默认就行。',
        steps: [
          {
            title: '打开下载页，下载对应系统的安装包',
            body: ['地址在下面，直接点开就是 CC Switch 官网的下载页，挑自己电脑的系统（Windows / macOS 都有），下载后打开安装包，一路下一步保持默认。'],
            do: '打开下载页 → 挑自己系统的安装包 → 下载 → 安装，全程默认。',
            tips: ['软件很小，不需要注册账号。装完先不用配置，下一步直接导入。', '杀毒软件提示未知来源时选「仍要运行」，这是开源小工具。'],
            url: { href: ccswitch(), label: 'CC Switch 官网' },
            cta: [{ text: 'CC Switch 官网 ↗', url: ccswitch(), external: true }],
          },
        ],
      },
      {
        id: 'get-key',
        kicker: N(2),
        h2: '2. 获取 API Key',
        tab: 'novice',
        lead: '卡密在卖家的发货信息那里，拿到之后去 cc 网站把它换成 API Key。',
        steps: [
          {
            title: '打开 cc 网站，粘贴卡密',
            body: ['在浏览器里打开下面这个 cc 网站，找到「提取Key」的输入框，把卡密粘贴进去，提交后就能看到你的 API Key。'],
            do: '打开 cc 网站 → 粘贴卡密 → 提交，拿到 sk- 开头的 Key。',
            tips: ['一个卡密只能兑换一次，兑换成功后复制保存好，别弄丢。'],
            url: { href: consoleUrl, label: 'cc 网站' },
            cta: [{ text: '打开管理后台 ↗', url: consoleUrl, external: true }],
            shot: { src: 'guide_site.png', label: '图 01', caption: 'cc 网站首页，提取Key 的输入框在这里' },
          },
        ],
        notes: [
          '主域名打不开时，用后台里的备用域名（' + consoleBackupDomains.join('、') + '），API Key 不用换。',
          '兑换得到的 Key 以 sk- 开头；后面 CC Switch、VS Code、终端都用它，不用再换。',
        ],
      },
      {
        id: 'import',
        kicker: N(3),
        h2: '3. 一键导入配置',
        tab: 'novice',
        lead: '点击网页的「使用教程」，找到一键导入配置按钮，点击一键导入。',
        steps: [
          {
            title: '在 cc 网站点「一键导入配置」',
            body: ['回到 cc 网站，点击「使用教程」，找到一键导入配置按钮，点一下。CC Switch 会自动弹出来接收配置，你只需要确认保存。'],
            do: '网页「使用教程」→ 一键导入配置 → 确认导入。',
            tips: ['点了没反应，多半是 CC Switch 没启动，先打开它再点。', '导入窗口里确认配置名，直接确认导入，不要改 Base URL。', '同名配置会覆盖，重复导入不会叠加。', '窗口里提示「需在客户端中点击启用后写入配置文件」，下一步就做这件事。'],
            url: { href: consoleUrl, label: 'cc 网站' },
            shot: { src: 'guide_onekey_import.png', label: '图 02', caption: '网页上的「一键导入配置」按钮与导入确认窗口' },
          },
        ],
      },
      {
        id: 'models',
        kicker: N(4),
        h2: '4. 获取并保存模型',
        tab: 'novice',
        lead: '打开 CC Switch，点高级选项，获取模型列表，会显示获取到的模型。把你需要的模型都添加进去，添加后记得点击保存。',
        steps: [
          {
            title: '打开 CC Switch 进去获取模型',
            body: ['导入成功后打开 CC Switch，就能看到刚导入的配置，显示「使用中」就说明配置已经在里面了。'],
            do: '打开 CC Switch，看左侧的 Claude 配置。',
            shot: { src: 'guide_get_models.png', label: '图 03', caption: '打开 CC Switch，导入的配置已显示「使用中」' },
          },
          {
            title: '点高级选项，获取模型列表',
            body: ['双击这条配置进入「编辑供应商」，点「获取模型列表」，会显示获取到的模型。'],
            do: '编辑供应商 → 高级选项 → 获取模型列表。',
            tips: ['列表为空通常是 Base URL 或 Key 填错了，回第 3 步核对一遍。', '带 -5-5、-4-8 这样后缀的是不同版本，不确定就用列表里的最新几个。'],
            shot: { src: 'guide_model_list.png', label: '图 04', caption: '「获取模型列表」后显示的可用模型' },
          },
          {
            title: '选择你需要的模型并保存',
            body: ['建议把 claude-fable-5-1、claude-opus-5-5、claude-opus-4-8、claude-sonnet-5-5 这四个模型都添加进去，添加后记得点击保存。'],
            do: '添加这四个模型 → 保存。',
            tips: ['保存是必须的，不保存下一步启用后模型列表会是空的。', '完整的模型介绍见<a href="/models">模型广场</a>。'],
            shot: { src: 'guide_save_models.png', label: '图 05', caption: '选择模型并点「保存」' },
          },
        ],
      },
      {
        id: 'enable',
        kicker: N(5),
        h2: '5. 启用并检测链路',
        tab: 'novice',
        lead: '返回点击启用，检测链路。检测下链路是否正常，到此配置就完成了。',
        steps: [
          {
            title: '点「启用」，再点「检测链路」',
            body: ['回到 CC Switch 主界面点「启用」，再点「检测链路」。显示运行正常就配置完成了。'],
            do: '点「启用」→「检测链路」，显示运行正常即可。',
            tips: ['检测失败先看<a href="#errors">常见问题排查</a>：多数情况是模型没保存，或者 Base URL 多带了 /v1。', '终端里的 claude、VS Code 里的 Claude Code 插件都直接生效，打开就能用。', '需要切换模型时，在 cc 终端里用 /model 这个指令，命令与参数见<a href="/knowledge/claude-code-cli-cheatsheet">命令速查</a>。'],
            shot: { src: 'guide_enable_test.png', label: '图 06', caption: '启用配置并检测链路，显示运行正常' },
          },
        ],
      },
      {
        id: 'vscode',
        kicker: N(6),
        h2: '6. 用 VS Code 装官方插件',
        tab: 'novice',
        lead: '配置好之后，最省事的使用方式是 VS Code 里的官方插件：有图形界面，不用记命令。',
        steps: [
          {
            title: '去官网下载 VS Code',
            body: ['打开 VS Code 官网，下载对应系统的版本，安装过程全部保持默认即可。'],
            do: '下载 → 默认安装。',
            tips: ['已经装了 VS Code 的直接跳过这一步。'],
            url: { href: 'https://code.visualstudio.com/', label: 'VS Code 官网' },
            links: [{ text: 'VS Code 官网 ↗', url: 'https://code.visualstudio.com/', external: true }],
          },
          {
            title: '安装 Claude Code 的官方插件',
            body: ['按下面箭头指示，在 VS Code 的扩展面板里下载官方 cc 插件（发布者 Anthropic），装好就可以直接使用了。'],
            do: '扩展面板 → 搜索「Claude Code」→ 发布者 Anthropic → 安装。',
            tips: ['插件里的 API Key / 登录方式选「使用已有的 API 配置 / API Key」，不需要登录 Anthropic 账号。', '如果提示配置缺失，回 CC Switch 确认配置已启用，然后重启 VS Code。'],
            shot: { src: 'guide_vscode_plugin.png', label: '图 07', caption: 'VS Code 扩展面板里的官方 Claude Code 插件（发布者 Anthropic）' },
          },
        ],
      },

      // ---------------- 高手教程 ----------------
      {
        id: 'params',
        kicker: '高手教程 · 参数速查',
        h2: '高手教程 · 参数速查',
        tab: 'pro',
        lead: '已经有以上信息的话，自己配就行。下面几个值直接抄，填进任何工具都通用。',
        table: {
          columns: ['字段', '填什么'],
          rows: [
            { label: 'URL / Base URL', values: ['网关根地址，不带 /v1（后台「使用教程」页顶部那一行）'] },
            { label: 'API Key', values: ['sk- 开头的 Key（后台「提取 Key」页面，或 cc 网站兑换后复制）'] },
            { label: '模型 ID', values: ['claude-fable-5-1、claude-opus-5-5、claude-sonnet-5-5、claude-opus-4-8（详见下方模型对照表）'] },
          ],
        },
        notes: [
          '不确定有哪些可用模型时，工具里的「获取模型列表」是网关实时返回的，以它为准。',
          '主域名不可达时用后台提供的备用域名（' + consoleBackupDomains.join('、') + '），API Key 不用换。',
        ],
      },
      {
        id: 'manual',
        kicker: '高手教程 · 手动配置供应商',
        h2: '高手教程 · 手动配置供应商',
        tab: 'pro',
        lead: '不想用一键导入、或者一键导入没反应时，直接在 CC Switch 里手填字段。打开 CC Switch → 新增供应商 → Claude，按下表填写，填完保存，点「启用」。',
        table: {
          columns: ['字段', '填什么'],
          rows: [
            { label: '配置名称', values: ['随便起一个能认出来的，比如「我的卡」'] },
            { label: 'URL / Base URL', values: ['网关根地址，不带 /v1（复制后台那一行）'] },
            { label: 'API Key', values: ['sk- 开头的 Key'] },
            { label: '模型', values: ['点「高级选项」→「获取模型列表」，勾常用模型后点「保存」；保存后回主界面点「启用」写入配置文件'] },
          ],
        },
        notes: ['保存后点「启用」→「检测链路」，显示运行正常即可。', '字段填错是新手最常见的失败来源，第一次配置建议先用<a href="#import">一键导入</a>。'],
      },
      {
        id: 'env',
        kicker: '高手教程 · 环境变量',
        h2: '高手教程 · 环境变量（什么都不装）',
        tab: 'pro',
        lead: '不想装 CC Switch，也可以直接设两个环境变量。macOS / Linux 写进 ~/.bashrc 或 ~/.zshrc，Windows 写进用户环境变量。Claude Code 会自己拼 /v1/messages，Base URL 不要手动加 /v1。',
        cmd: [
          {
            title: 'macOS / Linux（bash / zsh）',
            lines: ['export ANTHROPIC_BASE_URL=' + baseUrl, 'export ANTHROPIC_API_KEY=sk-你的Key', '# 重开一个终端窗口后生效；进入会话用 /model 选模型'],
          },
          {
            title: 'Windows PowerShell（用户级）',
            lines: ['[Environment]::SetEnvironmentVariable("ANTHROPIC_BASE_URL", "' + baseUrl + '", "User")', '[Environment]::SetEnvironmentVariable("ANTHROPIC_API_KEY", "sk-你的Key", "User")', '# 同样需要重开终端'],
          },
          {
            title: 'Windows CMD（用户级）',
            lines: ['setx ANTHROPIC_BASE_URL ' + baseUrl, 'setx ANTHROPIC_API_KEY sk-你的Key', '# 同样需要重开终端'],
          },
        ],
        notes: [
          '如果同时装了 CC Switch，CC Switch 会接管这两个变量，改完记得在客户端里点「启用」。',
          '也可以写 ANTHROPIC_AUTH_TOKEN 代替 ANTHROPIC_API_KEY，效果一样（前者发 Bearer 头，后者发 x-api-key 头）。',
          '同一个项目想单独配一份：在项目根目录建 .env 写同样的两个变量，Claude Code 会加载；.env 里含 Key，记得加进 .gitignore。',
          '改完环境变量后旧终端不会更新，一定重开一个终端窗口；会话里输入 /status 能看到当前实际生效的端点和密钥。',
        ],
      },
      {
        id: 'editors',
        kicker: '高手教程 · 编辑器接入',
        h2: '高手教程 · VS Code / Cursor 等编辑器',
        tab: 'pro',
        lead: '装好官方插件或装好 Cursor 之后，在设置里把「Anthropic / OpenAI 兼容端点」指向后台给的地址，填同一个 Key。',
        table: {
          columns: ['工具', '在哪填', 'Base URL 填法'],
          rows: [
            { label: 'Claude Code 官方插件', values: ['VS Code / JetBrains 插件里选 API Key 登录', '根地址，不带 /v1'] },
            { label: 'Cursor', values: ['Settings → Models → API Keys（Override OpenAI Base URL）', '带 /v1 的 OpenAI 兼容地址，不要加 /chat/completions 或尾斜杠'] },
            { label: 'Cline / Roo Code', values: ['插件设置 → API Provider → OpenAI Compatible', '带 /v1 的地址'] },
            { label: 'Aider / Continue', values: ['配置文件或 .env', 'Anthropic SDK 填根地址，OpenAI 兼容填带 /v1'] },
            { label: 'Zed / JetBrains 其它插件', values: ['设置里的模型供应商', 'Anthropic SDK 填根地址'] },
          ],
        },
        paras: [
          'Cursor 用法有三个关键点：Verify 成功不代表 Chat 里一定在用你的模型，每次配完都要在顶部模型选择器里确认当前选中的是你添加的模型 ID；模型 ID 必须逐字匹配，Cursor 不会把「Fable」翻译成 claude-fable-5-1；配置很慢时先确认没选错模型（Opus 比 Sonnet 慢），再看上下文是不是太大。',
        ],
        notes: [
          '一个常见坑：Anthropic SDK / Claude Code 填根地址（不带 /v1），OpenAI 兼容端点才带 /v1。填反了会 404。',
          '自定义 Key 只覆盖对话式功能，Tab 自动补全始终走 Cursor 自己的链路，不用排查；Cursor 的已知限制见<a href="/faq#cat-usage">常见问题 · 接入与使用</a>。',
        ],
      },
      {
        id: 'selfcheck',
        kicker: '高手教程 · 自检与排错',
        h2: '高手教程 · 自检与排错',
        tab: 'pro',
        lead: '跑起来之后，用这几件事确认它走的是你的网关、你的 Key、你的模型，而不是残留的登录态或旧环境变量。',
        cmd: [
          { title: '会话里看当前配置', lines: ['/status'] },
          {
            title: '终端里绕过 Claude Code 直接问网关',
            lines: ['curl -sS -o /dev/null -w "%{http_code} %{time_total}s\\n" \\', '  "$ANTHROPIC_BASE_URL/v1/models" -H "x-api-key: $ANTHROPIC_API_KEY" -H "anthropic-version: 2023-06-01"', '# 一秒内 401 = 网络通路正常，问题在上游或 Claude Code；超时 / SSL 错误 = 问题在你这一侧', 'claude --debug     # 日志里有每个请求的耗时与重试原因'],
          },
          {
            title: '网络不稳时的退避与重试',
            lines: ['export CLAUDE_CODE_RETRY_WATCHDOG=1                  # 一直重试，适合无人值守', 'export HTTPS_PROXY=http://127.0.0.1:7890                # 代理只在浏览器或 npm 里配时，CLI 看不到'],
          },
        ],
        notes: [
          '同机同时有 Key 和订阅时 Key 优先：环境里存在 ANTHROPIC_API_KEY 时，即使你以为自己在用 Max，实际也按 Key 计费；/status 直接告诉你当前是哪一个。',
          '连不上先查环境变量残留：新开终端，echo $ANTHROPIC_BASE_URL 看是不是旧值，再检查 ~/.zshrc、~/.bashrc、PowerShell 配置文件。Windows 上「用户环境变量」和「系统环境变量」是两处，都要看。',
          'claude 命令找不到：确认 CC Switch 里配置处于「已启用」状态，再重开一个终端窗口。',
          '网络不稳时优先关掉 VPN，低质量代理会让响应明显变慢。',
        ],
      },

      // ---------------- 两条轨共用 ----------------
      {
        id: 'errors',
        h2: '常见问题排查',
        lead: '按报错信息查，一次只查一个。绝大多数问题在前五步就解决了。',
        table: {
          columns: ['你看到的', '先做什么', '还不行'],
          rows: [
            { label: '401 / 403', values: ['curl 验一下 Key（一秒内 401 说明 Key 与端点不匹配），从后台重新复制', '看知识库「401 / 403 鉴权失败」'] },
            { label: '429', values: ['先让它自己重试；少开子代理；/compact；/model 换档；脚本里加 --max-turns', '看知识库「429 限流」'] },
            { label: '529 overloaded', values: ['模型容量不足，换一个模型再试，或过几分钟重试', '看知识库「529 overloaded」'] },
            { label: 'prompt too long', values: ['/context 看被什么填满，/compact 压缩，/clear 重开；反复失败就 /clear', '看知识库「prompt too long」'] },
            { label: '等待 API 响应', values: ['curl 超过一秒或超时 = 你这一侧的问题；检查代理变量、公司证书，关掉 VPN 再试', '看知识库「连接中断」'] },
            { label: '模型列表为空 / 切模型 404', values: ['回 CC Switch 核对 Base URL 没多带 /v1、Key 没少复制、模型勾选后点过「保存」', '重新点「获取模型列表」'] },
          ],
          caption: '知识库里每篇报错排查文章都有完整的处理顺序；本页只列第一步',
        },
        notes: [
          '配置失败、模型列表为空、检测链路报错——扫本页最上面的二维码，客服直接帮你看，报故障时附上截图会快很多。',
          '也可以先看<a href="/faq#cat-setup">常见问题 · 使用与配置</a>与<a href="/faq#cat-usage">接入与使用</a>，里面收录了新手最常问的问题。',
        ],
        links: [
          { text: '管理后台功能说明', url: '/console' },
          { text: '知识库 · 报错排查', url: '/knowledge#cat-troubleshoot' },
        ],
      },
    ],
    next: [
      { text: 'Claude Code 教程：第一次会话之后怎么用', url: '/knowledge/claude-code-tutorial' },
      { text: 'CLAUDE.md 怎么写：与 AGENTS.md 的关系和 .claude 目录', url: '/knowledge/claude-md-guide' },
      { text: 'Claude Code 命令与参数速查：会话内和命令行', url: '/knowledge/claude-code-cli-cheatsheet' },
    ],
  },
]

/** 教程页（只有 /guide 一页） */
export function guidePage(): GuidePage {
  return guidePages[0]
}

/** 教程页用到的全部截图文件名（block.shot 与 steps[].shot 的去重列表），供 scripts/check_dist.mjs 断言产物里每张图都渲染出来了 */
export const guideShots: string[] = (() => {
  const out: string[] = []
  for (const p of guidePages) {
    for (const b of p.blocks) {
      if (b.shot) out.push(b.shot.src)
      for (const st of b.steps ?? []) if (st.shot) out.push(st.shot.src)
    }
  }
  return [...new Set(out)]
})()
