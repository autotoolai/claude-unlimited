/**
 * 教程内容数据源 —— 「使用教程」索引页与 5 个场景页的唯一真源。
 *
 * 页面只回答一件事：买家已经在「我在哪个客户端里用 Claude」上做完选择，接下来照着做。
 * 因此内容按「场景」分文件组织：每个场景一页，一页一条完整路径，从换 Key 到检测链路。
 *
 * 三条硬约定（改这里之前先读 docs/guide_design_spec.md）：
 *
 * 1. **编号不手写。** H2 的「N. 」与图注的「图 NN」都由 guideBlocks() 在装配期按页内
 *    出现顺序生成。数据里只写标题与图注文字。手写编号是这里最大的漂移源：插一节要改后面
 *    全部序号，补一张图要改后面全部图号，改到一半就留下错号。
 *
 * 2. **公共内容只写一份。** 装 CC Switch、换取 API Key 这类每个客户端都要做的步骤放在
 *    sharedBlocks 里，各场景页用 shared 字段引用。正文不抄两遍，改一处全站生效。
 *
 * 3. **一个主场页。** 某段内容只在一个页面是主场，其它页面给一行链接。
 *    三个值的「取法」在共享块里讲一次；「本客户端填什么」是各场景页自己的正文；
 *    「各家填法有什么不同」是 Cursor 页那张速查表的唯一职责。
 *
 * 来源：卖家腾讯文档《AI工具使用教程》（汇总版）与其三份分篇 —— Claude 桌面版、
 * Codex、WorkBuddy。正文与配图已抓取到 temp/qqdoc_fetch/，抓取方法见记忆文件
 * guide-source-is-qq-doc。文档里的客服微信、店铺链接、卡密发货说明等不搬进官网
 * （客服统一走右下角在线助手）。
 *
 * 外部地址一律走 config/site.ts 的 partners，这里只引用 id；模型 ID 走 config/models.ts。
 */

import { partnerUrl } from './site'
import { consoleBackupDomains } from './console'

/** 场景 id：既是页面路由后缀，也是该页锚点 id 的前缀 */
export type GuideSceneId = 'cc' | 'desktop' | 'codex' | 'workbuddy' | 'cursor'

/** 公共块 key：同一份正文被多个场景页引用 */
export type SharedBlockKey = 'install-ccswitch' | 'get-key'

export interface GuideShot {
  /** 图片文件名，对应 .vitepress/theme/assets/guide/<file>（GuideShot.vue 里有静态导入表） */
  src: string
  /** 图注文字。图注编号不在这里写，由装配层生成 */
  caption: string
  /** 密集界面图（表单、面板）：页面上可点开原图看细节 */
  zoom?: boolean
}

export interface GuideTerm {
  title: string
  lines: string[]
}

export interface GuideStep {
  title: string
  /** 这一步要达成什么，一句（次级墨色，顶格）。见 docs/guide_design_spec.md「步骤槽位」 */
  goal?: string
  /** 要做的动作，一行或几行。全页唯一的强调形式，简单步骤只写一行 */
  action?: string[]
  /** 外链卡（整块可点）；与块级 `url` 同组件 */
  link?: { href: string; path?: string; label?: string }
  /** 步骤内的按钮（主动作）；块级用 GuideBlock.cta */
  cta?: { text: string; url: string; external?: boolean }[]
  /** 只在这一子步骤成立的提示 */
  notes?: string[]
  /** 这一步的对照截图；多图用数组，GuideSteps 会并排渲染 */
  shot?: GuideShot | GuideShot[]
  /** 站内延伸阅读，与块级 `links` 同组件 */
  links?: { text: string; url: string; external?: boolean }[]
}

export interface GuideBlock {
  /** 全站唯一：场景页用 '<场景>-<语义>'，如 'codex-models' */
  id: string
  /** 小节标题，不含序号。序号由装配层加 */
  title: string
  /** 引用公共块：正文取 sharedBlocks[key]，本页只给 id 与标题 */
  shared?: SharedBlockKey
  /** 小节首段：先给结论（知识库同一规范），再说为什么 */
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
  table?: { labelCol?: string; columns: string[]; rows: { label: string; values: string[] }[]; caption?: string }
  /** 编号步骤 */
  steps?: GuideStep[]
  /** 插图（单独一张） */
  shot?: GuideShot
  /** 外链卡（整块可点） */
  url?: { href: string; path?: string; label?: string }
  /** 链接列表 */
  links?: { text: string; url: string; external?: boolean }[]
  /** 区块末尾的按钮行（links 是无序列表，cta 是按钮） */
  cta?: { text: string; url: string; external?: boolean }[]
}

/** 场景页数据 */
export interface GuidePage {
  /** 路由：/guide/cc */
  slug: string
  /** 场景 id（与 slug 后缀一致） */
  scene: GuideSceneId
  /** 目录与页脚里的短名 */
  nav: string
  order: number
  /** 页面标题（与 md frontmatter 的 title 一致，check_dist 会核对） */
  title: string
  /** 浏览器与分享卡片用的摘要（与 md frontmatter 的 description 一致） */
  desc: string
  /** 页头副标题（H1 下方）：一句话交代整页要做什么 */
  lead: string
  /** 页头短标签 */
  eyebrow: string
  /** 索引卡上的一句话定位 */
  summary: string
  /** 一句话答案：结论式独立成段，喂 llms-full.txt 与页面首段 */
  answer: string
  /** 常见问题（FAQPage JSON-LD 的来源） */
  faq: { q: string; a: string }[]
  /** 该页长尾搜索词，注入 per-page keywords */
  tags: string[]
  /** 相关阅读：≥3 条站内链接，锚文本用真实关键词 */
  related: { text: string; url: string }[]
  /** 小节流 */
  blocks: GuideBlock[]
  /** 页尾「接着看」 */
  next: { text: string; url: string }[]
}

/** 索引页（/guide）数据 */
export interface GuideIndex {
  title: string
  desc: string
  eyebrow: string
  /** 页头下的一句话：从换取 API Key 到检测链路怎么走 */
  lead: string
  /** 一句话答案：喂 llms-full.txt */
  answer: string
  /** 索引页的长尾搜索词（per-page keywords 的来源） */
  tags: string[]
  next: { text: string; url: string }[]
}

/** 索引卡（/guide 的场景选择区） */
export interface GuideSceneCard {
  id: GuideSceneId
  /** 场景名 */
  title: string
  /** 一句话定位 */
  desc: string
  /** 角标：几步 · 形态（步数由块数派生，不手写） */
  meta: string
  url: string
  /** 收尾卡：横跨两列，把最后一行补齐（兜底项「其它客户端」用） */
  wide?: boolean
}

/* ---------------- 公共块：正文只写一份，被多个场景页引用 ---------------- */

/** 管理后台地址（换 Key、一键导入都在这里） */
const consoleUrl = partnerUrl('console')
/** CC Switch 官网 */
const ccswitchUrl = partnerUrl('ccswitch')
/** 网关根地址（Base URL）：管理后台地址去掉结尾斜杠。CC Switch 里给 Claude Code、桌面版用的就是这个 */
const baseUrl = consoleUrl.replace(/\/+$/, '')
/** OpenAI 兼容端点的地址：Cursor、Codex、WorkBuddy 这类要用带 /v1 */
const baseUrlV1 = baseUrl + '/v1'
/** Claude 桌面版官网 */
const desktopUrl = partnerUrl('claude-desktop')

/**
 * 公共块正文表：key -> 去掉 id / title 的块体。
 * 多个场景页用 { id, title, shared: key } 引用同一份正文。
 * 引用方的 id 决定锚点（各页不同），正文与图注是同一份。
 */
export const sharedBlocks: Record<SharedBlockKey, Omit<GuideBlock, 'id' | 'title' | 'shared'>> = {
  'install-ccswitch': {
    lead: '装好 CC Switch 就算准备好了一半：它是个专门管 API 配置的小工具，全程默认安装，不用填任何东西。',
    steps: [
      {
        title: '打开下载页，下载对应系统的安装包',
        goal: '它是管配置的小工具，装好只是先把软件准备好，这一步不用填任何东西。',
        action: ['打开下面的官网 → 挑自己系统的安装包（Windows / macOS 都有）→ 下载 → 安装，全程保持默认。'],
        link: { href: ccswitchUrl, label: 'CC Switch 官网' },
        notes: ['软件很小，不需要注册账号，装完先不用配置，下一步直接换 Key。', '杀毒软件提示未知来源时选「仍要运行」，这是开源小工具。'],
        shot: { src: 'guide_ccswitch_site.png', caption: 'CC Switch 官网首页' },
      },
    ],
  },
  'get-key': {
    lead: '卡密在发货信息里，换成一把 sk- 开头的 API Key 后面全程只用它——CC Switch、各个客户端、终端都是这一把。',
    steps: [
      {
        title: '在管理后台把卡密换成 API Key',
        goal: '这把 sk- 开头的密钥就是后面全程要用的 API Key；激活码、Key 都会留在后台里，刷新页面随时能再看。',
        action: ['打开下面的管理后台 → 在「我的面板」或「提取 Key」页面粘贴激活码 → 提交激活 → 在「提取 Key」页面拿到你的 Key。'],
        link: { href: consoleUrl, label: '管理后台' },
        notes: ['先复制保存一份到密码管理器；忘了也不要紧，回管理后台用同一把激活码随时能再看，刷新页面不会丢。'],
        shot: { src: 'guide_site.png', caption: '管理后台首页，粘贴卡密的输入框在这里' },
      },
    ],
    notes: [
      '激活码、API Key、用量记录都存在管理后台里：同一把激活码随时回来查看，刷新、换浏览器、换设备都不影响。',
      '主域名打不开时，用后台里的备用域名（' + consoleBackupDomains.join('、') + '），API Key 不用换。',
      '兑换得到的 Key 以 sk- 开头；后面 CC Switch、VS Code、终端都用它，不用再换。',
    ],
  },
}

/* ---------------- 场景页数据 ---------------- */

/** Claude Code（VS Code 插件 / 终端）：一键导入，6 步 */
const ccPage: GuidePage = {
  slug: '/guide/cc',
  scene: 'cc',
  nav: 'Claude Code',
  order: 1,
  title: 'Claude Code 教程：VS Code 插件与终端配置',
  desc: 'Claude 无限卡接入 Claude Code 的完整步骤：装 CC Switch、换取 API Key、一键导入配置、拉取并保存模型、启用并检测链路、在 VS Code 官方插件里开始用。',
  lead: '从装 CC Switch 到在 VS Code 里跑起来，这条路一共 6 步，照着做就行。',
  eyebrow: '终端与编辑器',
  summary: '最主流的一条路。CC Switch 一键导入，VS Code 装官方插件就能写代码，终端里直接 claude 启动。',
  answer: 'Claude Code 是最主流的用法：先在管理后台把卡密换成 API Key，再用 CC Switch 一键导入配置、拉取模型、启用检测，最后在 VS Code 装官方 Claude Code 插件或在终端直接跑 claude。',
  faq: [
    { q: 'Claude Code 怎么配置 Claude 无限卡？', a: '在管理后台换取 API Key，用 CC Switch 一键导入配置，拉一次模型列表并保存，启用后检测链路显示正常就算配好了。VS Code 里再装官方 Claude Code 插件即可。' },
    { q: '一键导入后模型列表是空的？', a: '点「获取模型列表」再拉一次，加进模型配置后点保存。列表为空通常是配置刚导入还没刷新，或者 Key 没生效。' },
    { q: '在 VS Code 里能用 Claude 无限卡吗？', a: '能。VS Code 装官方 Claude Code 插件后，选「使用已有的 API 配置 / API Key」，它会读 CC Switch 已经写好的配置，不用再填一遍 Key。' },
    { q: '终端里怎么启动？', a: 'CC Switch 配置启用后，终端直接输入 claude 就能启动。想在会话里换模型用 /model 命令。' },
  ],
  tags: ['claude code 教程', 'claude code 配置', 'cc switch 配置', 'vscode claude code 插件', 'claude code api'],
  related: [
    { text: 'Claude Code 教程：第一次会话之后怎么用', url: '/knowledge/claude-code-tutorial' },
    { text: 'Claude Code 命令与参数速查：会话内和命令行', url: '/knowledge/claude-code-cli-cheatsheet' },
    { text: 'Claude Code 与 Codex CLI 怎么选', url: '/knowledge/claude-code-vs-codex' },
  ],
  blocks: [
    { id: 'cc-install-ccswitch', title: '安装 CC Switch', shared: 'install-ccswitch' },
    { id: 'cc-get-key', title: '换取 API Key', shared: 'get-key' },
    {
      id: 'cc-import',
      title: '一键导入配置',
      lead: '管理后台里有「一键导入配置」按钮，不用手填 Base URL 和 Key，两边自动对上。',
      steps: [
        {
          title: '在管理后台点「一键导入配置」',
          goal: '这一步让管理后台和 CC Switch 对上号，不用你手抄地址和密钥。',
          action: ['回到管理后台 → 点「一键导入配置」→ CC Switch 会自动弹出接收窗口 → 确认导入。'],
          notes: ['点了没反应多半是 CC Switch 没启动，先打开它再点。', '导入窗口里直接确认导入，不要改里面的 Base URL。', '同名配置会覆盖，重复导入不会叠加。', '窗口里提示「需在客户端中点击启用后写入配置文件」，下一步就做这件事。'],
          shot: { src: 'guide_onekey_import.png', caption: '管理后台里的「一键导入配置」按钮与导入确认窗口' },
        },
      ],
    },
    {
      id: 'cc-models',
      title: '拉取并保存模型',
      lead: '导入的配置要再拉一次模型列表，CC Switch 才知道网关这边有哪些模型可用。',
      steps: [
        {
          title: '打开 CC Switch 进去获取模型',
          goal: '先确认配置确实进了 CC Switch。',
          action: ['打开 CC Switch → 看左侧的 Claude 配置，标签显示「使用中」就说明已经导进来了。'],
          shot: { src: 'guide_get_models.png', caption: '打开 CC Switch，导入的配置已显示「使用中」' },
        },
        {
          title: '点高级选项，获取模型列表',
          goal: '让 CC Switch 知道网关这边有哪些模型可用。',
          action: ['双击这条配置进入「编辑供应商」→ 点「获取模型列表」，下面就会列出可用模型。'],
          notes: ['列表为空通常是 Base URL 或 Key 填错了，回上一步核对一遍。', '带 -5-5、-4-8 这样后缀的是不同版本，不确定就用列表里的最新几个。'],
          shot: { src: 'guide_model_list.png', caption: '「获取模型列表」后显示的可用模型' },
        },
        {
          title: '选择你需要的模型并保存',
          goal: '把要用的模型加进来，不保存下一步启用后模型列表会是空的。',
          action: ['把 claude-fable-5-1、claude-opus-5-5、claude-opus-4-8、claude-sonnet-5-5 都添加进去，然后点「保存」。'],
          notes: ['完整的模型介绍见<a href="/models">模型广场</a>。'],
          shot: { src: 'guide_save_models.png', caption: '选择模型并点「保存」' },
        },
      ],
    },
    {
      id: 'cc-enable',
      title: '启用并检测链路',
      lead: '前面配完配置已经在 CC Switch 里但还没生效，这一步启用并检测一下，显示运行正常就完成了。',
      steps: [
        {
          title: '点「启用」，再点「检测链路」',
          goal: '启用后配置才会写进 CC Switch，检测显示运行正常就算配完了。',
          action: ['回到 CC Switch 主界面 → 点「启用」→ 再点「检测链路」，显示运行正常即可。'],
          notes: ['检测失败先看<a href="/faq#cat-setup">常见问题 · 使用与配置</a>：多数情况是模型没保存，或者 Base URL 多带了 /v1。', '终端里的 claude、VS Code 里的 Claude Code 插件都直接生效，打开就能用。', '需要切换模型时，在终端里用 /model 这个指令，命令与参数见<a href="/knowledge/claude-code-cli-cheatsheet">命令速查</a>。'],
          shot: { src: 'guide_enable_test.png', caption: '启用配置并检测链路，显示运行正常' },
        },
      ],
    },
    {
      id: 'cc-vscode',
      title: '在 VS Code 里开始使用',
      lead: '没用过 Claude Code 的，请按下方步骤通过 VS Code 官方插件使用：安装方便，图形界面比命令行更好上手。',
      notes: [
        '会使用 Claude Code CLI 的也可以直接用：CC Switch 已经配置好密钥，打开终端输入 claude 就能启动。',
        'WorkBuddy、Cursor 等其他客户端同样支持，填法见<a href="/guide/cursor">通用手动配置</a>。',
      ],
      steps: [
        {
          title: '没装过 VS Code 的先下载安装',
          goal: '开始使用要先有 VS Code 本体。',
          action: ['打开下面这个官网，挑自己电脑的系统下载，一路下一步保持默认安装。'],
          link: { href: 'https://code.visualstudio.com/', label: 'VS Code 官网' },
          shot: { src: 'guide_vscode_site.png', caption: 'VS Code 官网' },
          notes: ['已经装了 VS Code 的跳过这一步，直接装下面那个插件。'],
        },
        {
          title: '安装 Claude Code 的官方插件',
          goal: '装好后直接在上面聊天、写代码，用的就是前面配好的那把 Key，不用再输一遍。',
          action: ['打开 VS Code 的扩展面板（Ctrl+Shift+X）→ 搜索「Claude Code」→ 确认发布者是 Anthropic → 安装。'],
          notes: ['认准发布者是 Anthropic，同名的第三方插件不要装。', '插件里的 API Key / 登录方式选「使用已有的 API 配置 / API Key」，不需要登录 Anthropic 账号。', '如果提示配置缺失，回 CC Switch 确认配置已启用，然后重启 VS Code。'],
          shot: { src: 'guide_vscode_plugin.png', caption: 'VS Code 扩展面板里的 Claude Code 官方插件（发布者 Anthropic）' },
        },
      ],
    },
  ],
  next: [
    { text: 'Claude Code 教程：第一次会话之后怎么用', url: '/knowledge/claude-code-tutorial' },
    { text: 'CLAUDE.md 怎么写：与 AGENTS.md 的关系和 .claude 目录', url: '/knowledge/claude-md-guide' },
    { text: 'Claude Code 命令与参数速查：会话内和命令行', url: '/knowledge/claude-code-cli-cheatsheet' },
  ],
}

/** Claude 桌面版：在 CC Switch 里新增一个专用供应商，再打开路由，8 步 */
const desktopPage: GuidePage = {
  slug: '/guide/desktop',
  scene: 'desktop',
  nav: 'Claude 桌面版',
  order: 2,
  title: 'Claude 桌面版教程：新增供应商、开启路由与安装',
  desc: 'Claude 无限卡接入 Claude 桌面版：装 CC Switch、换取 API Key、新增桌面版供应商、填地址与 Key、打开路由、启用检测、安装桌面版，以及虚拟机报错的处理。',
  lead: '桌面版要单独建一个供应商并开路由，比 Claude Code 多两步，这一页带你走完。',
  eyebrow: '官方桌面客户端',
  summary: '桌面版要单独建一个供应商并开路由，比 Claude Code 多两步。装完桌面版客户端即可用，也不用翻墙。',
  answer: 'Claude 桌面版要用 CC Switch 新增一个「桌面版」供应商，接入方式选直连，填上接口地址与 API Key，再打开路由开关并启用检测，最后安装桌面版客户端即可。',
  faq: [
    { q: 'Claude 桌面版怎么用 Claude 无限卡？', a: '在 CC Switch 里新增一个供应商，选择 Claude 桌面版并用自定义配置，接入方式选直连，填入接口地址与 API Key，打开路由里的 Claude Code 开关，启用并检测链路后安装桌面版即可。' },
    { q: '桌面版和 Claude Code 用的地址一样吗？', a: '一样，都是管理后台首页那一行地址。区别在接入方式：桌面版选「直连」，Codex 要选 Anthropic Messages 上游格式。' },
    { q: '桌面版提示要 Virtual Machine Platform 怎么办？', a: '这是 Windows 的可选功能没开。搜索「启用或关闭 Windows 功能」，勾选「虚拟机平台」和「适用于 Linux 的 Windows 子系统」，重启电脑即可。' },
    { q: '桌面版打不开、显示不可用？', a: '通常是配置还没写进客户端。把 Claude 桌面版完全退出（不是最小化），回到 CC Switch 确认配置已启用、路由已打开，再重新打开。' },
  ],
  tags: ['claude 桌面版教程', 'claude desktop 配置', 'claude 无限卡 桌面版', 'cc switch 供应商', 'claude cowork'],
  related: [
    { text: 'Claude Code 教程：第一次会话之后怎么用', url: '/knowledge/claude-code-tutorial' },
    { text: 'Claude Code 与 Codex CLI 怎么选', url: '/knowledge/claude-code-vs-codex' },
    { text: '常见问题：使用与配置', url: '/faq#cat-setup' },
  ],
  blocks: [
    { id: 'desktop-install-ccswitch', title: '安装 CC Switch', shared: 'install-ccswitch' },
    { id: 'desktop-get-key', title: '换取 API Key', shared: 'get-key' },
    {
      id: 'desktop-provider',
      title: '新增桌面版供应商',
      lead: '桌面版在 CC Switch 里是一个单独的供应商条目，要自己新建，不能用一键导入。',
      steps: [
        {
          title: '在 CC Switch 里找到 Claude Desktop Official',
          goal: '先确认客户端版本选对了，桌面版和 Claude Code 是两条不同的配置。',
          action: ['打开 CC Switch → 在供应商列表里找到「Claude Desktop Official」这一条。'],
          shot: { src: 'guide_desktop_provider_picker.webp', caption: 'CC Switch 供应商列表里的 Claude Desktop Official 条目' },
        },
        {
          title: '点「新建供应商」，选「自定义配置」',
          goal: '官方预设不适用于本卡，要自己填接口地址与 Key。',
          action: ['点「添加新供应商」→ 在预设列表里选「自定义配置」→ 填写下面的地址与 Key。'],
          shot: { src: 'guide_desktop_provider_preset.webp', caption: '「添加新供应商」弹窗，预设列表里选「自定义配置」' },
          notes: ['预设供应商里带「Claude Desktop」字样的那些都不是本卡，填了也不通。'],
        },
      ],
    },
    {
      id: 'desktop-key',
      title: '填入接口地址与 API Key',
      lead: '地址填管理后台首页那一行，Key 填上一步换来的那把，接入方式选「直连」——桌面版和 Claude Code 的区别就在这里。',
      steps: [
        {
          title: '填请求地址与 API Key，接入方式选直连',
          goal: '这三个填对了桌面版才连得上，填错的表现是连不上或报鉴权错误。',
          action: [
            '请求地址填 ' + baseUrl + '（不要带 /v1 结尾）',
            'API Key 填上一步换来的 sk- 开头那把',
            '接入方式选「直连」',
          ],
          shot: { src: 'guide_desktop_provider_form.webp', caption: '编辑供应商：请求地址、API Key 与接入方式「直连」', zoom: true },
          notes: ['地址后面不要自己加 /v1 或 /chat/completions，填了会 404。', '接入方式选「模型映射」也能连，但要多配一层模型映射，直接选「直连」最省事。'],
        },
      ],
    },
    {
      id: 'desktop-route',
      title: '打开路由开关',
      lead: '桌面版必须走本地路由转发，请求才会被送到网关——这一步不做，前面配的全都白配。',
      steps: [
        {
          title: '进设置里的「路由」，打开总开关与 Claude Code',
          goal: '总路由和桌面版对应的应用开关都要打开，只开一个不行。',
          action: ['CC Switch → 设置 → 「路由」标签 → 打开「路由总开关」→ 再打开「Claude Code」那个应用开关。'],
          shot: { src: 'guide_ccswitch_route_settings.webp', caption: 'CC Switch 设置里的「路由」页：路由总开关与各应用开关' },
          notes: ['路由服务地址默认是本机的 127.0.0.1:15721，不用改。', '改完地址或端口要重启路由服务才生效。'],
        },
        {
          title: '确认供应商列表里显示「需要路由」',
          goal: '这是路由生效的标志：条目上标了「需要路由」说明它走本地转发。',
          action: ['回到 CC Switch 主界面，供应商列表里能看到这条配置旁边标着「需要路由」。'],
          shot: { src: 'guide_ccswitch_provider_route.webp', caption: 'CC Switch 供应商列表里标着「需要路由」的两条配置' },
        },
      ],
    },
    {
      id: 'desktop-enable',
      title: '启用并检测链路',
      lead: '配完最后启用一下，检测显示连通正常，桌面版就能用了。',
      steps: [
        {
          title: '点「启用」，再点「检测链路」',
          goal: '启用才会把配置写进客户端，检测通过说明整条链路都通了。',
          action: ['回到 CC Switch 主界面 → 点「启用」→ 再点「检测链路」，显示连通正常即可。'],
          shot: { src: 'guide_desktop_link_ok.webp', caption: '检测链路显示 claude 连通正常' },
          notes: ['检测失败先看<a href="/faq#cat-setup">常见问题 · 使用与配置</a>。'],
        },
      ],
    },
    {
      id: 'desktop-install',
      title: '安装 Claude 桌面版',
      lead: '配置好了，再装桌面版客户端本体，两个下载渠道都放这儿。',
      steps: [
        {
          title: '从官网下载并安装 Claude 桌面版',
          goal: '客户端本体是官方的，和前面的 API 配置是两件事。',
          action: ['打开 Claude 官网下载页 → 选对应系统的安装包 → 下载 → 安装。'],
          link: { href: desktopUrl, label: 'Claude 桌面版下载' },
          shot: { src: 'guide_desktop_download.webp', caption: 'Claude 官网的桌面版下载页' },
          notes: ['官网页面在国内有时打不开，可以用底下的镜像地址；镜像是第三方文件，装之前自己判断要不要用。'],
        },
      ],
    },
    {
      id: 'desktop-use',
      title: '在桌面版里开始用',
      lead: '打开就能用，桌面版和终端里用的是同一把 Key、同一个模型。',
      steps: [
        {
          title: '打开 Claude 桌面版，直接开始对话',
          goal: '验证整条链路：能正常回答、模型对得上，就说明配成了。',
          action: ['打开桌面版 → 随便问一句（比如「你是什么模型」），能正常回答就是配好了。'],
          shot: { src: 'guide_desktop_cowork.webp', caption: '桌面版里正常对话，模型为 Fable 5.1' },
          notes: ['如果显示「不可用」，先确认 CC Switch 里配置已启用、路由已打开，然后完全退出桌面版再打开（不是最小化到托盘）。'],
        },
      ],
    },
    {
      id: 'desktop-vm',
      title: '提示要虚拟机平台怎么办',
      lead: '这是 Windows 缺可选功能，和你的 API 配置无关，按系统提示开一下就好。',
      steps: [
        {
          title: '看到「requires the Virtual Machine Platform」提示',
          goal: '先分清是系统功能缺失还是配置问题，这一屏的报错只跟系统有关。',
          action: ['桌面版弹出「Claude\'s workspace requires the Virtual Machine Platform on Windows」时，不用改任何 API 配置。'],
          shot: { src: 'guide_desktop_vm_error.webp', caption: '提示需要 Virtual Machine Platform 的报错弹窗' },
        },
        {
          title: '搜索「启用或关闭 Windows 功能」',
          goal: '这个功能在系统设置里，不在 Claude 里面。',
          action: ['打开 Windows 搜索框 → 输入「启用或关闭 Windows 功能」→ 打开它。'],
          shot: { src: 'guide_desktop_vm_search.webp', caption: 'Windows 搜索「启用或关闭 Windows 功能」' },
        },
        {
          title: '勾选虚拟机平台与 WSL，重启电脑',
          goal: '两个都勾上，桌面版的代码与文件功能才完整可用。',
          action: ['在列表里勾选「虚拟机平台」和「适用于 Linux 的 Windows 子系统」→ 确定 → 重启电脑。'],
          shot: { src: 'guide_desktop_vm_features.webp', caption: 'Windows 功能列表里勾选「虚拟机平台」与「适用于 Linux 的 Windows 子系统」' },
          notes: ['「Windows 虚拟机监控程序平台」不是同一个东西，别勾错。'],
        },
      ],
    },
  ],
  next: [
    { text: 'Claude Code 教程：第一次会话之后怎么用', url: '/knowledge/claude-code-tutorial' },
    { text: 'Claude Code 与 Codex CLI 怎么选', url: '/knowledge/claude-code-vs-codex' },
    { text: '常见问题：使用与配置', url: '/faq#cat-setup' },
  ],
}

/** Codex：CC Switch 里新增 Codex 供应商，上游格式必须选 Anthropic Messages，8 步 */
const codexPage: GuidePage = {
  slug: '/guide/codex',
  scene: 'codex',
  nav: 'Codex',
  order: 3,
  title: 'Codex 教程：接入 Claude 无限卡并配置模型列表',
  desc: 'Codex 接入 Claude 无限卡：装 CC Switch、换取 API Key、新增 Codex 供应商、填地址与 Key、上游格式选 Anthropic Messages、启用检测后重启 Codex。',
  lead: 'Codex 多两个关键动作：上游格式必须选 Anthropic Messages，改完必须彻底重启才生效。',
  eyebrow: '终端 Agent',
  summary: 'Codex 多两个关键动作：上游格式必须选 Anthropic Messages，配置完必须彻底重启 Codex 才会生效。',
  answer: 'Codex 要在 CC Switch 里新增一个 Codex 供应商，上游格式必须选 Anthropic Messages 并开启路由，配置好模型列表后启用并检测链路，最后彻底重启 Codex 才会生效。',
  faq: [
    { q: 'Codex 怎么配置 Claude 无限卡？', a: '在 CC Switch 新增 Codex 供应商，填接口地址（带 /v1）与 API Key，默认模型填 claude-opus-5-5，上游格式选 Anthropic Messages，开启路由里的 Codex 开关，启用检测后彻底重启 Codex。' },
    { q: 'Codex 改了配置不生效？', a: 'Codex 只在启动时读一次配置，改完必须彻底退出（任务管理器里结束进程）再打开，单纯关窗口不算。' },
    { q: '上游格式为什么必须选 Anthropic Messages？', a: '本卡是 Anthropic 兼容端点，Codex 选 Chat Completions 或 Responses 会按 OpenAI 协议发请求而连不上。选 Anthropic Messages 时必须同时开启路由。' },
    { q: '检测链路显示正常但 Codex 里报错？', a: '先确认路由总开关和 Codex 那个应用开关都打开了；只有总开关开着、应用开关没开，请求不会被转发。' },
  ],
  tags: ['codex 教程', 'codex 配置 claude api', 'codex 接入 api', 'anthropic messages 上游格式', 'codex 模型列表'],
  related: [
    { text: 'Claude Code 与 Codex CLI 怎么选', url: '/knowledge/claude-code-vs-codex' },
    { text: 'Claude Code 教程：第一次会话之后怎么用', url: '/knowledge/claude-code-tutorial' },
    { text: '常见问题：使用与配置', url: '/faq#cat-setup' },
  ],
  blocks: [
    { id: 'codex-install-ccswitch', title: '安装 CC Switch', shared: 'install-ccswitch' },
    { id: 'codex-get-key', title: '换取 API Key', shared: 'get-key' },
    {
      id: 'codex-provider',
      title: '新增 Codex 供应商',
      lead: 'Codex 要在 CC Switch 里单独建一个供应商，不能用一键导入，也不能用桌面版那条配置。',
      steps: [
        {
          title: '新增供应商时选 Codex 供应商',
          goal: '先选对供应商类型，后面能填的字段才和 Codex 对得上。',
          action: ['CC Switch → 「添加新供应商」→ 选「Codex 供应商」这一类 → 进到编辑页。'],
          shot: { src: 'guide_codex_provider_type.webp', caption: '「添加新供应商」里选择 Codex 供应商' },
          notes: ['列表里带「需要路由」标记的那条是本卡的既有配置，可以直接用它的地址与 Key 改。'],
        },
      ],
    },
    {
      id: 'codex-key',
      title: '填入地址、Key 与默认模型',
      lead: 'Codex 的请求地址要带 /v1，和 Claude Code 那边不一样；默认模型填一个网关确实返回的模型名。',
      steps: [
        {
          title: '填请求地址、API Key 与默认模型',
          goal: '这三个值决定 Codex 往哪儿发请求、发什么模型，填错的表现是连不上或报模型不存在。',
          action: [
            'API 请求地址填 ' + baseUrlV1 + '（Codex 这里要带 /v1）',
            'API Key 填上一步换来的 sk- 开头那把',
            '默认模型填 claude-opus-5-5',
          ],
          shot: { src: 'guide_codex_provider_form.webp', caption: '编辑供应商：请求地址带 /v1、API Key 与默认模型', zoom: true },
          notes: ['地址不带 /v1 会 404，这是 Codex 与 Claude Code 最容易踩的差别。', '默认模型留空且配了模型映射时，会用映射的第一行。'],
        },
      ],
    },
    {
      id: 'codex-upstream',
      title: '把上游格式设为 Anthropic Messages',
      lead: '这是 Codex 专有的一步，也是最关键的一步：本卡是 Anthropic 兼容端点，选错格式请求就发不出去。',
      steps: [
        {
          title: '高级选项里选「Anthropic Messages（需开启路由）」',
          goal: '让 Codex 按 Anthropic 协议向网关发请求，而不是按 OpenAI 协议。',
          action: ['编辑供应商 → 展开「高级选项」→「上游格式」→ 选「Anthropic Messages」→ 按提示先开启路由。'],
          shot: { src: 'guide_codex_upstream_format.webp', caption: '高级选项里的上游格式：Anthropic Messages（需开启路由）', zoom: true },
          notes: ['Chat Completions 与 Responses 是 OpenAI 协议，本卡用不了。', '这里选 Anthropic Messages，就必须开路由，两步是配套的。'],
        },
      ],
    },
    {
      id: 'codex-models',
      title: '配置模型列表',
      lead: '把网关有的模型加进列表，Codex 的 /model 命令才会列出这些模型名。',
      steps: [
        {
          title: '获取模型列表并添加模型',
          goal: 'Codex 只认自己列表里的模型名，没加进去的模型在 /model 里看不到。',
          action: ['编辑供应商 → 「获取模型列表」→ 选「添加模型」→ 填菜单显示名与实际请求模型。'],
          shot: { src: 'guide_codex_model_picker.webp', caption: '获取模型列表后添加模型：菜单显示名与实际请求模型', zoom: true },
          notes: ['「实际请求模型」要填网关真实返回的 ID（如 claude-opus-5-5），填错了 Codex 会报模型不存在。'],
        },
        {
          title: '在模型映射里配好，生成 model_catalog.json',
          goal: '模型映射决定 /model 里显示的名字和实际请求的模型；生成 model_catalog.json 之后 Codex 才会列出它们。',
          action: ['同一页的「模型映射」里填菜单显示名与实际请求模型 → 勾上「生成 Codex model_catalog.json」→ 保存。'],
          shot: [
            { src: 'guide_codex_model_mapping.webp', caption: '模型映射表：左边菜单显示名，右边实际请求模型' },
            { src: 'guide_codex_catalog.webp', caption: '高级选项里的「生成 Codex model_catalog.json」开关' },
          ],
          notes: ['改完 model_catalog.json 必须彻底重启 Codex，模型列表才会刷新。'],
        },
      ],
    },
    {
      id: 'codex-route',
      title: '开启路由',
      lead: 'Codex 走本地路由转发，和桌面版一样：总开关与 Codex 应用开关都要开。',
      steps: [
        {
          title: '设置里的路由页，打开总开关与 Codex',
          goal: 'Codex 的请求必须被路由接管，否则不会发往网关。',
          action: ['CC Switch → 设置 → 「路由」→ 打开「路由总开关」→ 再打开「Codex」那个应用开关。'],
          shot: { src: 'guide_ccswitch_route_settings.webp', caption: '路由页：打开总开关与 Codex 应用开关' },
        },
        {
          title: '确认供应商标着「需要路由」',
          goal: '这是路由生效的标志，条目上会显示出来。',
          action: ['回到主界面，供应商列表里这条配置旁边应显示「需要路由」。'],
          shot: { src: 'guide_codex_provider_need_route.webp', caption: '供应商列表里标着「需要路由」的 Codex 配置' },
        },
      ],
    },
    {
      id: 'codex-enable',
      title: '启用并检测链路',
      lead: '配置齐了启用一下，检测显示连通正常再往下走。',
      steps: [
        {
          title: '点「启用」，再点「检测链路」',
          goal: '启用才会把配置写进 Codex，检测通过说明整条链路都通了。',
          action: ['回到 CC Switch 主界面 → 点「启用」→ 再点「检测链路」，显示连通正常即可。'],
          shot: [
            { src: 'guide_codex_provider_list.webp', caption: '供应商列表里无限卡那条已启用，地址带 /v1' },
            { src: 'guide_codex_link_ok.webp', caption: '检测链路显示无限卡连通正常' },
          ],
          notes: ['检测失败先看<a href="/faq#cat-setup">常见问题 · 使用与配置</a>。'],
        },
      ],
    },
    {
      id: 'codex-restart',
      title: '彻底重启 Codex',
      lead: 'Codex 只在启动时读一次配置，这一步不做，前面所有配置都不会生效。',
      steps: [
        {
          title: '在任务管理器里结束 Codex 进程，再重新打开',
          goal: '彻底重启后新配置才会被加载，模型列表也会刷新。',
          action: ['完全退出 Codex → 打开任务管理器确认没有残留的 Codex 进程 → 结束它 → 重新启动 Codex。'],
          notes: ['关窗口不算完全退出，Codex 可能还在后台驻留。', '改了模型映射后同样要重启，/model 里的列表才会更新。'],
        },
      ],
      shot: { src: 'guide_codex_in_use.webp', caption: '重启后在 Codex 里正常使用，模型为 claude-opus-5-5' },
    },
  ],
  next: [
    { text: 'Claude Code 与 Codex CLI 怎么选', url: '/knowledge/claude-code-vs-codex' },
    { text: 'Claude Code 教程：第一次会话之后怎么用', url: '/knowledge/claude-code-tutorial' },
    { text: '常见问题：使用与配置', url: '/faq#cat-setup' },
  ],
}

/** WorkBuddy：直接填三个值，不用 CC Switch，3 步 */
const workbuddyPage: GuidePage = {
  slug: '/guide/workbuddy',
  scene: 'workbuddy',
  nav: 'WorkBuddy',
  order: 4,
  title: 'WorkBuddy 教程：添加自定义模型并切换使用',
  desc: 'WorkBuddy 接入 Claude 无限卡：换取 API Key，在模型设置里添加自定义模型（接口地址带 /v1、填 API Key 与模型名），切换到该模型即可用，不必装 CC Switch。',
  lead: '最省事的一条路：不用装 CC Switch，三个值填进 WorkBuddy 就能用。',
  eyebrow: '国产 Agent 客户端',
  summary: '最省事的一条路，不用装 CC Switch，也不用开路由。三个值填进 WorkBuddy 的自定义模型里就行。',
  answer: 'WorkBuddy 不用装 CC Switch——换取 API Key 后，在设置里添加自定义模型，接口地址填管理后台地址带 /v1、API Key 填 sk- 开头那把、模型名称填 claude-opus-5-5，保存后在模型列表里选中它就能用。',
  faq: [
    { q: 'WorkBuddy 怎么用 Claude 无限卡？', a: '换取 API Key 后，进 WorkBuddy 的设置添加自定义模型：接口地址填管理后台地址带 /v1、API Key 填 sk- 开头那把、模型名称填 claude-opus-5-5，保存后在模型列表里选中它即可。' },
    { q: 'WorkBuddy 需要装 CC Switch 吗？', a: '不需要。WorkBuddy 支持 OpenAI 兼容协议，自定义模型里直接填三个值就能连；装 CC Switch 是 Claude Code、桌面版、Codex 这几条路才需要的。' },
    { q: '接口地址后面要加 /v1 吗？', a: '要。WorkBuddy 的接口地址填管理后台地址加 /v1，界面上也有这句提示，不加会 404。' },
    { q: '保存后模型列表里看不到？', a: '模型名称要和网关返回的 ID 完全一致（claude-opus-5-5），填错就不出现在列表里。填好后记得在模型列表里选中它。' },
  ],
  tags: ['workbuddy 教程', 'workbuddy 自定义模型', 'workbuddy 接入 claude api', 'workbuddy 配置'],
  related: [
    { text: 'Claude Code 与 Codex CLI 怎么选', url: '/knowledge/claude-code-vs-codex' },
    { text: '模型广场：model ID 一览', url: '/models' },
    { text: '常见问题：使用与配置', url: '/faq#cat-setup' },
  ],
  blocks: [
    { id: 'workbuddy-get-key', title: '换取 API Key', shared: 'get-key' },
    {
      id: 'workbuddy-model',
      title: '添加自定义模型',
      lead: 'WorkBuddy 的自定义模型只认 OpenAI 兼容协议，所以接口地址要带 /v1。',
      steps: [
        {
          title: '在设置里添加自定义模型，填三个值',
          goal: '把这三个值填对，WorkBuddy 就能把请求发到网关。',
          action: [
            '打开 WorkBuddy → 设置 → 模型 → 「自定义模型」→「添加模型」',
            '接口地址填 ' + baseUrlV1,
            'API Key 填上一步换来的 sk- 开头那把',
            '模型名称填 claude-opus-5-5',
          ],
          shot: { src: 'guide_workbuddy_add_model.webp', caption: '编辑模型：接口地址、API Key 与模型名称三个值', zoom: true },
          notes: ['接口地址后面要加 /v1，界面上也有这句提示。', '「仅支持 OpenAI 兼容协议 API」是 WorkBuddy 的限制，不能用 Anthropic 那种地址写法。', '其余选项（图片输入、工具调用、思考模式等）按需开，不影响连通。'],
        },
      ],
    },
    {
      id: 'workbuddy-use',
      title: '切换到自定义模型开始用',
      lead: '添加完要在模型列表里选中它才会生效，填完不选还是用的原来的模型。',
      steps: [
        {
          title: '在模型列表里选中刚加的自定义模型',
          goal: '确认实际生效的是你刚填的那个模型。',
          action: ['回到对话框的模型选择器 → 选中刚添加的自定义模型 → 随便问一句，比如「你是什么模型」。'],
          shot: { src: 'guide_workbuddy_model_picker.webp', caption: '模型列表里选中刚添加的自定义模型' },
        },
      ],
      shot: { src: 'guide_workbuddy_in_use.webp', caption: 'WorkBuddy 里正常使用，模型为 claude-opus-5-5' },
    },
  ],
  next: [
    { text: '模型广场：model ID 一览', url: '/models' },
    { text: 'Claude Code 与 Codex CLI 怎么选', url: '/knowledge/claude-code-vs-codex' },
    { text: '常见问题：使用与配置', url: '/faq#cat-setup' },
  ],
}

/** Cursor 等其它客户端：手动填三个值，附各客户端填法差异速查表，3 步 */
const cursorPage: GuidePage = {
  slug: '/guide/cursor',
  scene: 'cursor',
  nav: '其它客户端',
  order: 5,
  title: '通用手动配置：Cursor 等客户端怎么填三个值',
  desc: '在 Cursor 等支持自定义 API 的客户端里接入 Claude 无限卡：手动填接口地址、API Key 与模型名三个值，附各客户端填法差异速查表。',
  lead: 'Cursor 这类客户端不用 CC Switch，填三个值就行；末尾附各客户端填法差异速查表。',
  eyebrow: '任意支持自定义 API 的客户端',
  summary: '已经会自己填 API 的人看这一页：三个值怎么填、各客户端的差异，一次说清。',
  answer: '任何支持自定义 API 的客户端都只要填三个值——接口地址、sk- 开头的 API Key、模型名称；Cursor 这类 OpenAI 兼容端点的地址要带 /v1，各客户端的差异见页面末尾的速查表。',
  faq: [
    { q: '在 Cursor 里怎么用 Claude 无限卡？', a: '在 Cursor 的模型设置里添加自定义模型：接口地址填管理后台地址带 /v1、API Key 填 sk- 开头那把、模型名填 claude-opus-5-5 之类的真实 ID，保存后即可使用。' },
    { q: '三个值到底填什么？', a: '接口地址是管理后台首页顶部那一行（OpenAI 兼容端点要带 /v1），API Key 是后台「提取 Key」页面那把 sk- 开头的密钥，模型名是网关真实返回的 model ID。' },
    { q: '模型名称填什么？', a: '填网关真实返回的 ID，比如 claude-opus-5-5、claude-fable-5-1。填错客户端就选不到这个模型，完整清单见模型广场。' },
    { q: '各家客户端的地址写法都一样吗？', a: '不一样。Claude Code 与桌面版用不带 /v1 的地址，Codex、WorkBuddy、Cursor 这类用带 /v1 的地址。页面末尾的速查表列了全部差异。' },
  ],
  tags: ['cursor 配置 claude api', 'cursor 接入 claude api', '自定义 api 客户端配置', 'cline 配置', 'openai 兼容端点'],
  related: [
    { text: '模型广场：model ID 一览', url: '/models' },
    { text: 'Claude Code 与 Codex CLI 怎么选', url: '/knowledge/claude-code-vs-codex' },
    { text: '常见问题：接入与使用', url: '/faq#cat-usage' },
  ],
  blocks: [
    { id: 'cursor-get-key', title: '换取 API Key', shared: 'get-key' },
    {
      id: 'cursor-params',
      title: '手动配置三个值',
      lead: '不用 CC Switch 的话，所有客户端都只要这三个值，区别只在地址写法与上游格式。',
      table: {
        labelCol: '要填的地方',
        columns: ['填什么', '去哪里拿'],
        rows: [
          { label: '接口地址（Base URL）', values: [baseUrlV1, '管理后台首页顶部那一行后面加 /v1（OpenAI 兼容端点要带）；主域名打不开就换备用域名 ' + consoleBackupDomains.join('、')] },
          { label: 'API Key', values: ['sk- 开头的密钥', '上一步在后台提取的那把；忘了就回后台的「Key 详情」再看'] },
          { label: '模型名', values: ['claude-opus-5-5、claude-fable-5-1 等', '网关实时返回，「获取模型列表」里能看到的都在；完整清单见<a href="/models">模型广场</a>'] },
        ],
      },
      notes: [
        '接口地址不要自己加 /chat/completions，也别漏掉 /v1。OpenAI 兼容端点漏 /v1 会 404，Claude Code 与桌面版那边加了 /v1 反而会 404。',
        '模型不用背：工具里的「获取模型列表」是网关实时返回的，最全也最新。',
        '没装 CC Switch、也没法用一键导入，就照这一页手动填即可，各客户端的差异见下一节的速查表。',
      ],
    },
    {
      id: 'cursor-difference',
      title: '各客户端填法差异速查',
      lead: '同一个 Key 在不同客户端里，地址写法、上游格式和要不要开路由都不一样，对照这张表填。',
      table: {
        labelCol: '客户端',
        columns: ['要不要 CC Switch', '接口地址', '上游格式', '开路由', '默认模型'],
        rows: [
          { label: 'Claude Code', values: ['要（一键导入）', baseUrl, 'Anthropic Messages', '开', '见「拉取并保存模型」'] },
          { label: 'Claude 桌面版', values: ['要（新增供应商）', baseUrl + '（直连）', 'Anthropic Messages', '开（总路由 + Claude Code 开关）', '在客户端里选'] },
          { label: 'Codex', values: ['要（新增供应商）', baseUrlV1, 'Anthropic Messages', '开（总路由 + Codex 开关）', 'claude-opus-5-5'] },
          { label: 'WorkBuddy', values: ['不用', baseUrlV1, 'OpenAI 兼容', '不用', 'claude-opus-5-5'] },
          { label: 'Cursor 等 OpenAI 兼容客户端', values: ['不用（手填）', baseUrlV1, 'OpenAI 兼容', '不用', '实时获取'] },
        ],
        caption: '「开路由」指 CC Switch 设置里的路由总开关与该应用开关，两个都要打开',
      },
      notes: [
        '只给 Cursor 这类客户端用的：直接看上一节的三个值就够，不用装 CC Switch。',
        '拿不准自己用哪个客户端，看<a href="/guide">使用教程</a>首页的场景列表，每个客户端都有独立的图文步骤。',
      ],
    },
  ],
  next: [
    { text: '模型广场：model ID 一览', url: '/models' },
    { text: 'Claude Code 与 Codex CLI 怎么选', url: '/knowledge/claude-code-vs-codex' },
    { text: '常见问题：接入与使用', url: '/faq#cat-usage' },
  ],
}

/* ---------------- 索引页（/guide）：选客户端 ---------------- */

export const guideIndex: GuideIndex = {
  title: '使用教程',
  desc: 'Claude 无限卡使用教程：按客户端选一条路——Claude Code、Claude 桌面版、Codex、WorkBuddy、Cursor 等，每条路都有完整步骤与真实截图。',
  eyebrow: '已经买好了，从这里开始',
  lead: '从换取 API Key 到检测链路，跟着做就行，不用先懂原理。',
  answer: '先选你用的客户端——Claude Code、Claude 桌面版、Codex、WorkBuddy、Cursor 各有一条完整路径，每一步都带真实截图，照着做就能跑起来。',
  tags: ['claude 无限卡 使用教程', 'claude 无限卡 教程', 'claude code 教程', 'claude 桌面版 教程', 'codex 教程', 'workbuddy 教程', 'cursor 配置 claude api'],
  next: [
    { text: 'Claude Code 教程：第一次会话之后怎么用', url: '/knowledge/claude-code-tutorial' },
    { text: 'CLAUDE.md 怎么写：与 AGENTS.md 的关系和 .claude 目录', url: '/knowledge/claude-md-guide' },
    { text: 'Claude Code 命令与参数速查：会话内和命令行', url: '/knowledge/claude-code-cli-cheatsheet' },
  ],
}

/* ---------------- 装配层：编号与图注在这里生成 ---------------- */

/** 场景页数据，按 order 排列 */
export const guidePages: GuidePage[] = [ccPage, desktopPage, codexPage, workbuddyPage, cursorPage]

/** 索引页的场景卡（步数由小节数派生，不手写） */
export function guideSceneCards(): GuideSceneCard[] {
  const tags: Record<GuideSceneId, string> = {
    cc: '一键导入',
    desktop: '新增供应商',
    codex: '新增供应商',
    workbuddy: '自定义模型',
    cursor: '手动填值',
  }
  return guidePages.map((p) => ({
    id: p.scene,
    title: p.nav,
    desc: p.summary,
    meta: p.blocks.length + ' 步 · ' + tags[p.scene],
    url: p.slug,
    // 「其它客户端」是兜底项，做横跨两列的收尾卡
    wide: p.scene === 'cursor' ? true : undefined,
  }))
}

/** 按 slug 找场景页 */
export function guidePageBySlug(slug: string): GuidePage | undefined {
  return guidePages.find((p) => p.slug === slug)
}

/** 按场景 id 找场景页 */
export function guidePageByScene(scene: GuideSceneId): GuidePage | undefined {
  return guidePages.find((p) => p.scene === scene)
}

/** 装配后的截图：带页内连续的图注编号（「图 01」） */
export interface GuideShotLabeled extends GuideShot {
  label: string
}

/** 装配后的步骤：截图已带编号 */
export interface GuideStepResolved extends Omit<GuideStep, 'shot'> {
  shot?: GuideShotLabeled | GuideShotLabeled[]
}

/** 装配后的小节：h2 带页内序号，截图已带编号 */
export interface GuideBlockResolved extends Omit<GuideBlock, 'steps' | 'shot' | 'shared'> {
  h2: string
  steps?: GuideStepResolved[]
  shot?: GuideShotLabeled
}

/**
 * 装配一页的小节：合并共享块正文 + 生成 H2 序号 + 生成图注编号。
 *
 * 这是全站唯一给教程内容编号的地方。数据里不写「3. 」「图 04」这类序号，
 * 所以插一节、补一张图都不会让后面的编号失配（现有实现里手写序号，是最大的漂移源）。
 *
 * 编号顺序 = 页面上的出现顺序：块内先步骤截图、后块级截图（与 GuideScenePage 的渲染顺序一致）。
 */
export function guideBlocks(page: GuidePage): GuideBlockResolved[] {
  let fig = 0
  const label = () => '图 ' + String(++fig).padStart(2, '0')
  return page.blocks.map((b, i) => {
    // 共享块：正文取 sharedBlocks，本页的 id 与标题保留
    const body = b.shared ? sharedBlocks[b.shared] : b
    const out: GuideBlockResolved = {
      id: b.id,
      title: b.title,
      h2: i + 1 + '. ' + b.title,
      lead: body.lead,
      paras: body.paras,
      list: body.list,
      notes: body.notes,
      cmd: body.cmd,
      table: body.table,
      url: body.url,
      links: body.links,
      cta: body.cta,
    }
    if (body.steps) {
      out.steps = body.steps.map((s): GuideStepResolved => {
        if (!s.shot) {
          const { shot: _unused, ...rest } = s
          return rest
        }
        const one = (sh: GuideShot): GuideShotLabeled => ({ ...sh, label: label() })
        return { ...s, shot: Array.isArray(s.shot) ? s.shot.map(one) : one(s.shot) }
      })
    }
    if (body.shot) out.shot = { ...body.shot, label: label() }
    return out
  })
}

/** 索引页的长尾搜索词（per-page keywords 的来源） */
export function guideIndexTags(): string[] {
  return guideIndex.tags
}

/** 一个场景页的长尾搜索词（per-page keywords 的来源） */
export function guideTagsOf(scene: GuideSceneId): string[] {
  return guidePages.find((p) => p.scene === scene)?.tags ?? []
}

/** 一页的小节 id 清单（锚点白名单，供门禁逐页双向核对） */
export function guideAnchorsOf(page: GuidePage): string[] {
  return guideBlocks(page).map((b) => b.id)
}

/** 一页的截图文件名清单（按出现次数计，不去重），供门禁逐页核对产物里的图数 */
export function guideShotsOf(page: GuidePage): string[] {
  const out: string[] = []
  for (const b of guideBlocks(page)) {
    for (const s of b.steps ?? []) {
      if (!s.shot) continue
      if (Array.isArray(s.shot)) for (const sh of s.shot) out.push(sh.src)
      else out.push(s.shot.src)
    }
    if (b.shot) out.push(b.shot.src)
  }
  return out
}

/**
 * 旧锚点 -> 新地址。旧的 /guide 单页两条轨拆成多页后，老链接（FAQ、在线助手、
 * 外部转载的深链）不能断：这里给出机读映射，/guide 索引页在客户端读 hash 时跳转。
 */
export const guideLegacyAnchors: Record<string, string> = {
  'install-ccswitch': '/guide/cc#cc-install-ccswitch',
  'get-key': '/guide/cc#cc-get-key',
  'import': '/guide/cc#cc-import',
  'models': '/guide/cc#cc-models',
  'enable': '/guide/cc#cc-enable',
  'vscode': '/guide/cc#cc-vscode',
  'pro-key': '/guide/cursor#cursor-get-key',
  'params': '/guide/cursor#cursor-params',
  // 2026-10-20 索引页瘦身时删掉的两段小节：老链接指到内容最接近的地方
  'first-step': '/guide/cc#cc-get-key',   // 换取 API Key（每个客户端页的第一步）
  'not-sure': '/guide/cursor#cursor-params', // 「不确定用哪个」原本指向的通用手动配置
}
