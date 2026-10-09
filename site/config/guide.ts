/**
 * 使用教程内容数据 —— 「使用教程」四页（总览 / 模型与切换 / 接入与模型 / CC Switch）的唯一数据源。
 *
 * 来源：卖家教程站 https://wx.bbyy.site/ 的 CC 无限配置教程（高手路径 + 小白路径 + VS Code + 新模型），
 * 按「买完之后做什么」重新组织为 5 步，去掉逐字搬运；截图已裁掉品牌栏与二维码。
 *
 * 规则：
 * - 所有网址来自 config/site.ts 的 partners（activation / ccswitch），这里只引用 id，不写 URL。
 * - 截图文件名对应 site/docs/guide/assets/ 下的图片。
 */

import { partnerUrl } from './site'

export interface GuideShot {
  /** 图片文件名，对应 .vitepress/theme/assets/guide/<file>（GuideShot.vue 里有静态导入表） */
  src: string
  /** 图注编号，如「图 03」，与正文引用一致 */
  label: string
  caption: string
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
}

export interface GuideBlock {
  id: string
  h2: string
  /** 小节内第一段（可选，页内目录只到 h2） */
  lead?: string
  /** 段落 */
  paras?: string[]
  /** 列表 */
  list?: string[]
  /** 要点框：写成「标题：正文」 */
  notes?: string[]
  /** 命令块 */
  cmd?: { title?: string; lines: string[] }[]
  /** 表格式数据 */
  table?: { columns: string[]; rows: { label: string; values: string[] }[]; caption?: string }
  /** 步骤块 */
  steps?: GuideStep[]
  /** 插图（单独一张） */
  shot?: GuideShot
  /** 链接列表 */
  links?: { text: string; url: string; external?: boolean }[]
}

export interface GuidePage {
  /** 路由：/guide、/guide/models、/guide/clients、/guide/ccswitch */
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

const activation = () => partnerUrl('activation')
const ccswitch = () => partnerUrl('ccswitch')

export const guidePages: GuidePage[] = [
  {
    slug: '/guide',
    nav: '使用教程',
    order: 1,
    title: '使用教程',
    eyebrow: '五步 · 从卡密到跑起来',
    lead: '买完卡密之后，按这五步走一遍，分钟级就能在 Claude Code、VS Code、Cursor 里用上。整个过程只需要两个信息：网关地址（Base URL）和 API Key。',
    desc: 'Claude 无限卡使用教程：五步从卡密兑换到 CC Switch 一键导入、添加模型、启用配置、VS Code 插件与模型切换。',
    blocks: [
      {
        id: 'before',
        h2: '开始之前',
        lead: '本教程按「已经拿到卡密」来讲。没买的话先看套餐：只有一种规格，固定订阅价，订阅期内不按 token 计费。',
        notes: [
          '第 1 步：在「购买与发卡」页面下单付款，系统自动发货卡密，通常分钟级到账。',
          '第 2 步：打开「卡密兑换与 API Key」页面，粘贴卡密兑换额度，同一页会给出网关地址与 API Key。',
          '第 3 步起：在你自己的电脑里配置工具。这一步不需要账号，也不需要付费。',
          '已经知道手里的 Base URL 和 API Key，可以直接跳到第 3 步。',
        ],
      },
      {
        id: 'workflow',
        h2: '五步总览',
        steps: [
          {
            title: '兑换卡密，拿到 Base URL 和 API Key',
            body: ['卡密在「购买与发卡」页面的发货信息里。到「卡密兑换与 API Key」页面粘贴兑换，页面会同时显示网关地址和以 sk- 开头的 Key，把这两行复制下来。'],
            do: '需要复制两行：Base URL（网关根地址）与 API Key（sk- 开头）。',
            tips: ['Base URL 不要手动加 /v1，除非工具明确要求。', 'Key 不要发到聊天群里、截图里或 Git 仓库中。'],
            shot: { src: 'guide_get_apikey.jpg', label: '图 01', caption: '兑换页里网关地址与 API Key 所在的位置（示意图）' },
          },
          {
            title: '安装 CC Switch',
            body: ['CC Switch 是个很小的配置管理工具（Windows / macOS），专门用来管理 Claude Code、Codex、Gemini 的 API 供应商配置，支持一键导入和链路检测。到官网下载，安装过程全部保持默认即可。'],
            do: `官网：${ccswitch()}`,
            tips: ['安装包不到 10 MB，不需要管理员权限之外的任何配置。', '安装完先不用配置，下一步直接导入。'],
          },
          {
            title: '在兑换页点「一键导入配置」',
            body: ['回到「卡密兑换与 API Key」页面，找到「使用教程」区域里的「一键导入配置」按钮，点一下。CC Switch 会自动识别并打开导入窗口，Base URL 和 API Key 已经填好了，你只需要确认保存。'],
            do: '导入窗口里确认名称 → 保存。不要改 Base URL。',
            tips: ['如果点了没反应，多半是 CC Switch 没启动，先打开它再点。', '同名配置会覆盖，重复导入不会叠加。'],
            shot: { src: 'guide_import_ccswitch.jpg', label: '图 02', caption: '「一键导入配置」按钮所在位置（示意图）' },
          },
          {
            title: '在 CC Switch 里获取并添加模型',
            body: [
              '打开 CC Switch，进入已导入的 Claude 配置，点「高级选项」→「获取模型列表」。配置正确时会列出网关实际可用的模型。',
              '把常用模型勾上并保存。建议至少添加三个：claude-opus-4-8（复杂推理）、claude-sonnet-5（日常主力）、claude-fable-5（创意写作）。添加后一定点「保存」。',
            ],
            do: '建议添加：claude-opus-4-8、claude-sonnet-5、claude-fable-5，保存。',
            tips: ['列表为空通常是 Base URL 或 Key 填错，回上一步核对。', '型号带 -8、-7、-6 后缀的是不同版本；不确定就用「获取模型列表」里的最新几个。'],
            shot: { src: 'guide_ccswitch_models.jpg', label: '图 03', caption: '「获取模型列表」后选择模型并保存（示意图）' },
          },
          {
            title: '启用配置，检测链路',
            body: ['回到 CC Switch 主界面点「启用」，再点「检测链路」。显示正常就配置完成了。终端里的 claude、VS Code 里的 Claude Code 插件都直接生效，打开就能用。'],
            do: '点「启用」→「检测链路」，显示正常即可。',
            tips: ['检测失败先看第 4 步的截图：多数情况是模型没保存或 Base URL 多带了 /v1。', '之后想换模型，在 Claude Code 终端里输入 /model 即可。'],
            shot: { src: 'guide_ccswitch_enable.jpg', label: '图 04', caption: '启用配置并检测链路（示意图）' },
          },
        ],
      },
      {
        id: 'stuck',
        h2: '配置完成之后，或者卡住了',
        paras: [
          '想在终端、VS Code、Cursor 里用 Claude Code，见「接入与模型」页。',
          '想新增或切换模型（含 claude-fable-5），见「模型与切换」页。',
        ],
        notes: [
          '配置失败、模型列表为空、检测链路报错——点右下角「人工客服」，复制微信号或 QQ 直接联系人，报故障时附上截图会快很多。',
          '也可以先看「常见问题」页的「使用与配置」分类，里面收录了新手最常问的 8 个问题。',
        ],
        links: [{ text: '常见问题 · 使用与配置', url: '/faq#cat-setup' }],
      },
    ],
    next: [
      { text: '接入与模型：VS Code、Cursor、Claude Code', url: '/guide/clients' },
      { text: '模型与切换：/model 指令与常用 ID', url: '/guide/models' },
      { text: 'CC Switch 详解：手动配置与排错', url: '/guide/ccswitch' },
    ],
  },

  {
    slug: '/guide/clients',
    nav: '接入与模型',
    order: 2,
    title: '接入与模型',
    eyebrow: 'Claude Code · VS Code · Cursor',
    lead: 'CC Switch 配置好之后，终端里的 claude 命令和 VS Code 里的 Claude Code 插件都会直接生效。这一页讲怎么把它们用起来，以及在 VS Code 里怎么装官方插件。',
    desc: '把 Claude 无限卡接入 Claude Code、VS Code、Cursor 等客户端：官方插件安装、环境变量配置与 Base URL 填写。',
    blocks: [
      {
        id: 'terminal',
        h2: '终端：直接用 claude 命令',
        lead: 'CC Switch 点过「启用」之后，终端里的 claude 命令已经指向你的网关，不需要再改任何环境变量。',
        cmd: [{ title: 'macOS / Linux', lines: ['claude', '# 直接进入交互会话；/model 切换模型，/help 查看全部指令'] }, { title: 'Windows PowerShell', lines: ['claude'] }],
        notes: [
          '如果 claude 命令找不到，先确认 CC Switch 里配置处于「已启用」状态，再重开一个终端窗口。',
          '会话里 /model 切换模型、/status 看当前配置，都是 Claude Code 自带指令。',
        ],
      },
      {
        id: 'vscode',
        h2: 'VS Code：装官方插件',
        lead: 'CC Switch 配好后，VS Code 里只要装上 Anthropic 官方的 Claude Code 插件，就能直接在编辑器侧边栏里用。',
        steps: [
          {
            title: '打开扩展面板，安装官方 Claude Code 插件',
            body: ['在 VS Code 里按 Ctrl+Shift+X（macOS 是 Cmd+Shift+X）打开扩展面板，搜索 Claude Code，认准发布者为 Anthropic 的那个官方插件，点 Install。'],
            do: '扩展面板 → 搜索「Claude Code」→ 发布者 Anthropic → Install。',
            shot: { src: 'guide_vscode_plugin.jpg', label: '图 05', caption: 'VS Code 扩展面板里的官方 Claude Code 插件（示意图）' },
          },
          {
            title: '登录时选择用 API Key',
            body: ['首次打开插件会要求登录。CC Switch 已经把配置写进了 Claude Code 的配置文件，这里选择「使用已有的 API 配置 / API Key」即可，不需要登录 Anthropic 账号。'],
            do: '登录方式选「API Key」而不是「Claude 账号」。',
            tips: ['如果提示配置缺失，回 CC Switch 确认配置已启用，然后重启 VS Code。'],
          },
        ],
      },
      {
        id: 'other-clients',
        h2: 'Cursor、Cline、Roo Code 等编辑器插件',
        lead: '这些工具都支持自定义 OpenAI 兼容端点，填法一样：Base URL 填网关地址（带 /v1），API Key 填你的 Key。',
        table: {
          columns: ['工具', '在哪填', 'Base URL 填法'],
          rows: [
            { label: 'Cursor', values: ['Settings → Models → API Keys（Override）', '带 /v1 的地址'] },
            { label: 'Cline / Roo Code', values: ['插件设置 → API Provider → OpenAI Compatible', '带 /v1 的地址'] },
            { label: 'Aider / Continue', values: ['配置文件或 .env', 'Anthropic SDK 填根地址，OpenAI 兼容填带 /v1'] },
            { label: 'Zed / JetBrains', values: ['设置里的模型供应商', 'Anthropic SDK 填根地址'] },
          ],
        },
        notes: ['一个常见坑：Anthropic SDK / Claude Code 填根地址（不带 /v1），OpenAI 兼容端点才带 /v1。填反了会 404。'],
      },
      {
        id: 'stuck',
        h2: '卡住了？',
        notes: [
          '连不上、提示配置缺失、插件里看不到模型——点右下角「人工客服」，复制微信号或 QQ 直接联系人，报故障时附上截图会快很多。',
          '自己先排查：回 CC Switch 确认配置已启用、模型已保存、Base URL 没多带 /v1。',
        ],
        links: [{ text: '排错清单', url: '/guide/ccswitch#troubleshoot' }, { text: '常见问题 · 使用与配置', url: '/faq#cat-setup' }],
      },
    ],
    next: [
      { text: '模型与切换：/model 指令与常用 ID', url: '/guide/models' },
      { text: 'CC Switch 详解：手动配置与排错', url: '/guide/ccswitch' },
    ],
  },

  {
    slug: '/guide/models',
    nav: '模型与切换',
    order: 3,
    title: '模型与切换',
    eyebrow: 'model ID · /model 指令',
    lead: '所有 Claude 模型都在同一订阅价内，选 Opus 不会多花钱。这一页列了常用的 model ID，以及怎么在 Claude Code 里切换。',
    desc: 'Claude 无限卡可用模型与切换方式：claude-opus-4-8、claude-sonnet-5、claude-fable-5 等 model ID，Claude Code 的 /model 指令与 VS Code 里切换。',
    blocks: [
      {
        id: 'ids',
        h2: '常用 model ID',
        lead: '下面这些 ID 是目前常见的可用型号。网关实际可用的列表以 CC Switch「获取模型列表」返回的结果为准，不同时间可能增删。',
        notes: ['不知道当前有哪些模型？在 CC Switch 的配置里点「高级选项」→「获取模型列表」，那里是实时的。'],
      },
      {
        id: 'pick',
        h2: '怎么选：三个够用',
        paras: ['大多数人只要加三个模型就够：复杂任务用 Opus，日常编码用 Sonnet，写文案和创意用 Fable。剩下的都是备用。'],
        notes: [
          'claude-opus-4-8：复杂推理、架构设计、深度代码分析。',
          'claude-sonnet-5：速度与质量均衡，日常编码主力。',
          'claude-fable-5：创意表达、叙事与风格化内容。',
        ],
      },
      {
        id: 'switch',
        h2: '在 Claude Code 里切换模型',
        lead: '切换模型用内置的 /model 指令，在交互会话里直接输入即可。',
        cmd: [
          { title: '打开选择列表', lines: ['/model'] },
          { title: '直接切到指定模型', lines: ['/model claude-fable-5', '/model claude-opus-4-8'] },
        ],
        notes: ['也可以在 VS Code 的 Claude Code 侧边栏里点当前模型名切换。', '在 Claude Code 里输入 /help 可以看到全部内置指令。'],
        shot: { src: 'guide_model_fable.jpg', label: '图 06', caption: '在 Claude Code 里用 /model 切到 claude-fable-5（示意图）' },
      },
      {
        id: 'new',
        h2: 'Anthropic 上线新模型怎么办',
        paras: ['新模型上线后，网关会以新的 model ID 提供访问。你的 Key 不需要换，只要在 CC Switch 的配置里点「获取模型列表」刷新一下，把新 ID 勾上保存，再到 Claude Code 里 /model 切过去就行。'],
      },
      {
        id: 'stuck',
        h2: '卡住了？',
        notes: [
          '/model 列表里没有新模型——回 CC Switch 点「获取模型列表」刷新，再回到 /model 看。',
          '切模型报 404——model ID 打错了，或者该模型没在 CC Switch 里保存。',
        ],
        links: [{ text: '回五步教程', url: '/guide' }, { text: '常见问题 · 使用与配置', url: '/faq#cat-setup' }],
      },
    ],
    next: [
      { text: '接入与模型：VS Code、Cursor、Claude Code', url: '/guide/clients' },
      { text: 'CC Switch 详解：手动配置与排错', url: '/guide/ccswitch' },
    ],
  },

  {
    slug: '/guide/ccswitch',
    nav: 'CC Switch',
    order: 4,
    title: 'CC Switch 详解',
    eyebrow: '高手路径 · 手动配置',
    lead: '这一页给已经知道自己 Base URL 和 API Key 的人：直接在 CC Switch 里手动新增供应商，不需要一键导入。',
    desc: 'CC Switch 手动配置与排错：供应商名称、Base URL、API Key 字段填法，一键导入失败怎么办。',
    blocks: [
      {
        id: 'download',
        h2: '安装 CC Switch',
        lead: '官网下载，安装过程全部默认。',
        links: [{ text: 'CC Switch 官网', url: ccswitch(), external: true }],
      },
      {
        id: 'manual',
        h2: '手动新增供应商（高手路径）',
        lead: '在 CC Switch 里新增一个 Claude 供应商，按下表填写。填完保存，点「启用」。',
        table: {
          columns: ['字段', '填什么'],
          rows: [
            { label: 'URL / Base URL', values: ['网关根地址，不带 /v1（复制兑换页那一行）'] },
            { label: 'API Key', values: ['sk- 开头的 Key（复制兑换页那一行）'] },
            { label: '模型模版 / 模型 ID', values: ['claude-opus-4-8、claude-sonnet-5、claude-fable-5 等，勾上后保存'] },
          ],
        },
        notes: ['配置完点「启用」→「检测链路」，显示正常即可。', '如果这是你第一次配置，优先用「使用教程」里的一键导入，字段填错是新手最常见的失败原因。'],
      },
      {
        id: 'troubleshoot',
        h2: '一键导入没反应，或找不到模型',
        paras: ['按出现顺序排查，绝大多数问题在前两步就解决了。'],
        list: [
          'CC Switch 没启动：点了「一键导入」没反应，多半是软件还没开。打开它再点一次。',
          'Base URL 多了 /v1：手动配置时最容易犯的错。Anthropic SDK / Claude Code 填根地址，不带 /v1。',
          'Key 复制不全：从兑换页重新复制，别从聊天记录里复制（容易少字符）。',
          '模型没保存：勾选模型后一定要点「保存」，否则 /model 里看不到。',
          '检测链路失败：截图连同「检测链路」的错误提示一起发给人工客服，能最快定位。',
        ],
        links: [{ text: '回到五步教程', url: '/guide' }],
      },
      {
        id: 'stuck',
        h2: '卡住了？',
        notes: [
          '排错清单走完还是不行——点右下角「人工客服」，把「检测链路」的报错截图和你的 Base URL（Key 打码）一起发过去。',
        ],
        links: [{ text: '常见问题 · 使用与配置', url: '/faq#cat-setup' }],
      },
    ],
    next: [
      { text: '接入与模型：VS Code、Cursor、Claude Code', url: '/guide/clients' },
      { text: '模型与切换：/model 指令与常用 ID', url: '/guide/models' },
    ],
  },
]

/** 按 slug 取教程页 */
export function guidePage(slug: string): GuidePage {
  return guidePages.find((p) => p.slug === slug) ?? guidePages[0]
}