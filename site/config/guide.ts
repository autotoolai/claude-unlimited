/**
 * 使用教程内容数据 —— 「使用教程」单页（/guide）的唯一数据源。
 *
 * 页面只回答一件事：已经买好了，怎么把 Claude 跑起来。购买相关的正文（选套餐、发卡站下单、
 * 订单号换激活码）在 2026-10 重构时整段删除，改为不再在正文里放购买入口，客服与售后统一走右下角在线助手。
 *
 * 正文分两条轨，页内用分段切换（SegmentedTabs）：
 *   小白教程（默认，6 步）： CC Switch → 获取 API Key → 一键导入配置 → 拉取并保存模型 → 启用并检测链路 → VS Code 插件
 *     顺序与文案逐条对齐卖家腾讯文档《AI工具使用教程》第 3 章；文档里的「切换新模型」一节按买家要求
 *     不搬进小白轨，/model 的用法只留在知识库命令速查里。
 *   高级配置（2 节）：1. 提取 API Key（配截图）→ 2. 手动配置（接口地址 / API Key / 模型名）
 *     只交付「手动配工具要填哪三个值」；编辑器逐个工具的填法、环境变量与自检排错不进本轨，由知识库承接。
 * 两条轨都不放常见问题排查（2026-10 已删，报错排查统一走 /faq 与知识库），但页尾统一挂知识库排错入口。
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
 * - 锚点 id 是深链契约：config/faq.ts 与 config/kefu_bot.ts 里有 /guide#models、/guide#install-ccswitch、
 *   /guide#import、/guide#params 等外链，重排块顺序时不改这些 id。当前契约清单（8 个）与
 *   scripts/check_dist.mjs 的白名单、docs/guide_design_spec.md「锚点与外部引用」一节三处必须一致。
 */

import { partnerUrl, siteConfig } from './site'
import { consoleBackupDomains } from './console'

/** 管理后台地址（教程里的「后台兑换」「一键导入」「Base URL」都指向它） */
const consoleUrl = siteConfig.partners.find((p) => p.id === 'console')?.url ?? ''
/** Base URL 根地址：后台地址去掉结尾斜杠，环境变量示例与命令块里都用它，不写死域名 */
const baseUrl = consoleUrl.replace(/\/+$/, '')

/** Base URL 根地址：与教程里的环境变量、命令块同源，首页 Hero 的演示终端也用它，不写死域名 */
export const gatewayBaseUrl = baseUrl

/** 教程的两条轨。tab 不设的块（共用块）在两条轨下面都渲染一份；2026-10 起页面已没有共用块，
 *  报错排查统一走 /faq 与知识库。保留这个约定，将来要加页级说明（如购买须知）时不用重新设计渲染层。 */
export type GuideTabId = 'novice' | 'pro'

/** 教程页两条轨的分组，供 SegmentedTabs 与右侧目录共用 */
export const guideTabs: GuideTab[] = [
  {
    id: 'novice',
    name: '小白教程',
    desc: '第一次用就走这条，六步把 Claude 跑起来',
    meta: '6 步 · 一键导入',
  },
  {
    id: 'pro',
    name: '高级配置',
    desc: '已经在用了，只讲手动工具要填哪三个值',
    meta: '2 节 · 手动填',
  },
]

/** 教程轨条目：轨选择器的数据源（SegmentedTabs 的 groups 兼容这个形状，另外多一个 meta） */
export interface GuideTab {
  id: GuideTabId
  name: string
  /** 轨选择器上的定位句；空串不渲染 */
  desc: string
  /** 轨选择器右下角的小徽标：这条轨有多长、是什么形态 */
  meta: string
}

/** 给一条轨的块按出现顺序加回 h2 的序号（「安装 CC Switch」→「1. 安装 CC Switch」）。
 *  两条轨都从 1 开头，靠页头的轨选择器区分轨，h2 的序号管轨内第几步；
 *  左侧目录的 label 取自 h2，所以目录项也一起带上序号。 */
export function guideH2(title: string, index: number): string {
  return `${index + 1}. ${title}`
}

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
  id: string
  h2: string
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

/** VS Code 官网；小白轨第 6 步的下载子步骤用它 */
const vscodeSite = 'https://code.visualstudio.com/'

/** 建议加入的四个模型 ID，第 4 步与高级配置第 2 步共用，避免两处漂移 */
const recommendedModels = 'claude-fable-5-1、claude-opus-5-5、claude-opus-4-8、claude-sonnet-5-5'

export const guidePages: GuidePage[] = [
  {
    slug: '/guide',
    nav: '使用教程',
    order: 1,
    title: '使用教程',
    eyebrow: '已经买好了，从这里开始',
    lead: '建议按照小白教程通过 CC Switch 一键完成配置，如果需要在其他 Agent 使用，可以按照高级教程自行配置。',
    desc: 'Claude 无限卡使用教程：获取 API Key、CC Switch 一键导入配置、获取并保存模型、启用并检测链路、在 VS Code 里开始使用；另附高级配置轨：提取 API Key，以及手动配置时接口地址 / API Key / 模型名的填法。',
    blocks: [
      // ---------------- 小白教程（逐条对齐腾讯文档第 3 章） ----------------
      {
        id: 'install-ccswitch',
        h2: guideH2('安装 CC Switch', 0),
        tab: 'novice',
        lead: 'CC Switch 是个很小的配置管理软件，专门管 Claude Code 的 API 配置。下载后安装，全部保持默认就行。',
        steps: [
          {
            title: '打开下载页，下载对应系统的安装包',
            goal: '它是管配置的小工具，装好只是先把软件准备好，这一步不用填任何东西。',
            action: ['打开下面的官网 → 挑自己系统的安装包（Windows / macOS 都有）→ 下载 → 安装，全程保持默认。'],
            link: { href: ccswitch(), label: 'CC Switch 官网' },
            notes: ['软件很小，不需要注册账号，装完先不用配置，下一步直接导入。', '杀毒软件提示未知来源时选「仍要运行」，这是开源小工具。'],
            shot: { src: 'guide_ccswitch_site.png', label: '图 01', caption: 'CC Switch 官网首页' },
          },
        ],
      },
      {
        id: 'get-key',
        h2: guideH2('换取 API Key', 1),
        tab: 'novice',
        lead: '卡密在发货信息里，拿到后先在后台激活，再换成一把 sk- 开头的 API Key，后面全程只用它。',
        steps: [
          {
            title: '在管理后台把卡密换成 API Key',
            goal: '这把 sk- 开头的密钥就是后面全程要用的 API Key；激活码、Key 都会留在后台里，刷新页面随时能再看。',
            action: ['打开下面的管理后台 → 在「我的面板」或「提取 Key」页面粘贴激活码 → 提交激活 → 在「提取 Key」页面拿到你的 Key。'],
            link: { href: consoleUrl, label: '管理后台' },
            notes: ['先复制保存一份到密码管理器；忘了也不要紧，回管理后台用同一把激活码随时能再看，刷新页面不会丢。'],
            shot: { src: 'guide_site.png', label: '图 02', caption: '管理后台首页，粘贴卡密的输入框在这里' },
          },
        ],
        notes: [
          '激活码、API Key、用量记录都存在管理后台里：同一把激活码随时回来查看，刷新、换浏览器、换设备都不影响。',
          '主域名打不开时，用后台里的备用域名（' + consoleBackupDomains.join('、') + '），API Key 不用换。',
          '兑换得到的 Key 以 sk- 开头；后面 CC Switch、VS Code、终端都用它，不用再换。',
        ],
      },
      {
        id: 'import',
        h2: guideH2('一键导入配置', 2),
        tab: 'novice',
        lead: '管理后台里有「一键导入配置」按钮，不用手填 Base URL 和 Key。',
        steps: [
          {
            title: '在管理后台点「一键导入配置」',
            goal: '这一步让管理后台和 CC Switch 对上号，不用你手抄地址和密钥。',
            action: ['回到管理后台 → 点「一键导入配置」→ CC Switch 会自动弹出接收窗口 → 确认导入。'],
            notes: ['点了没反应多半是 CC Switch 没启动，先打开它再点。', '导入窗口里直接确认导入，不要改里面的 Base URL。', '同名配置会覆盖，重复导入不会叠加。', '窗口里提示「需在客户端中点击启用后写入配置文件」，下一步就做这件事。'],
            shot: { src: 'guide_onekey_import.png', label: '图 03', caption: '管理后台里的「一键导入配置」按钮与导入确认窗口' },
          },
        ],
      },
      {
        id: 'models',
        h2: guideH2('拉取并保存模型', 3),
        tab: 'novice',
        lead: '打开 CC Switch，点高级选项，获取模型列表，会显示获取到的模型。把你需要的模型都添加进去，添加后记得点击保存。',
        steps: [
          {
            title: '打开 CC Switch 进去获取模型',
            goal: '先确认配置确实进了 CC Switch。',
            action: ['打开 CC Switch → 看左侧的 Claude 配置，标签显示「使用中」就说明已经导进来了。'],
            shot: { src: 'guide_get_models.png', label: '图 04', caption: '打开 CC Switch，导入的配置已显示「使用中」' },
          },
          {
            title: '点高级选项，获取模型列表',
            goal: '让 CC Switch 知道网关这边有哪些模型可用。',
            action: ['双击这条配置进入「编辑供应商」→ 点「获取模型列表」，下面就会列出可用模型。'],
            notes: ['列表为空通常是 Base URL 或 Key 填错了，回第 2 步核对一遍。', '带 -5-5、-4-8 这样后缀的是不同版本，不确定就用列表里的最新几个。'],
            shot: { src: 'guide_model_list.png', label: '图 05', caption: '「获取模型列表」后显示的可用模型' },
          },
          {
            title: '选择你需要的模型并保存',
            goal: '把要用的模型加进来，不保存下一步启用后模型列表会是空的。',
            action: ['把 ' + recommendedModels + ' 都添加进去，然后点「保存」。'],
            notes: ['完整的模型介绍见<a href="/models">模型广场</a>。'],
            shot: { src: 'guide_save_models.png', label: '图 06', caption: '选择模型并点「保存」' },
          },
        ],
      },
      {
        id: 'enable',
        h2: guideH2('启用并检测链路', 4),
        tab: 'novice',
        lead: '前面五步配完，配置已经在 CC Switch 里但还没生效。这一步启用并检测一下，显示运行正常就完成了。',
        steps: [
          {
            title: '点「启用」，再点「检测链路」',
            goal: '启用后配置才会写进 CC Switch，检测显示运行正常就算配完了。',
            action: ['回到 CC Switch 主界面 → 点「启用」→ 再点「检测链路」，显示运行正常即可。'],
            notes: ['检测失败先看<a href="/faq#cat-setup">常见问题 · 使用与配置</a>：多数情况是模型没保存，或者 Base URL 多带了 /v1。', '终端里的 claude、VS Code 里的 Claude Code 插件都直接生效，打开就能用。', '需要切换模型时，在终端里用 /model 这个指令，命令与参数见<a href="/knowledge/claude-code-cli-cheatsheet">命令速查</a>。'],
            shot: { src: 'guide_enable_test.png', label: '图 07', caption: '启用配置并检测链路，显示运行正常' },
          },
        ],
      },
      {
        id: 'vscode',
        h2: guideH2('开始使用 Claude Code', 5),
        tab: 'novice',
        lead: '没用过 Claude Code 的，请按下方步骤通过 VS Code 官方插件使用：安装方便，图形界面比命令行更好上手。',
        notes: [
          '会使用 Claude Code CLI 的也可以直接用：CC Switch 已经配置好密钥，打开终端输入 claude 就能启动。',
          'WorkBuddy、Cursor 等其他 agent 工具同样支持，需要自行在设置里填 Base URL 和 API Key，填法见<a href="#params">高级配置 · 手动配置</a>。',
        ],
        steps: [
          {
            title: '没装过 VS Code 的先下载安装',
            goal: '开始使用要先有 VS Code 本体。',
            action: ['打开下面这个官网，挑自己电脑的系统下载，一路下一步保持默认安装。'],
            link: { href: vscodeSite, label: 'VS Code 官网' },
            shot: { src: 'guide_vscode_site.png', label: '图 08', caption: 'VS Code 官网' },
            notes: ['已经装了 VS Code 的跳过这一步，直接装下面那个插件。'],
          },
          {
            title: '安装 Claude Code 的官方插件',
            goal: '装好后直接在上面聊天、写代码，用的就是前面配好的那把 Key，不用再输一遍。',
            action: ['打开 VS Code 的扩展面板（Ctrl+Shift+X）→ 搜索「Claude Code」→ 确认发布者是 Anthropic → 安装。'],
            notes: ['认准发布者是 Anthropic，同名的第三方插件不要装。', '插件里的 API Key / 登录方式选「使用已有的 API 配置 / API Key」，不需要登录 Anthropic 账号。', '如果提示配置缺失，回 CC Switch 确认配置已启用，然后重启 VS Code。'],
            shot: { src: 'guide_vscode_plugin.png', label: '图 09', caption: 'VS Code 扩展面板里的 Claude Code 官方插件（发布者 Anthropic）' },
          },
        ],
      },

      // ---------------- 高级配置 ----------------
      {
        id: 'pro-key',
        h2: guideH2('提取 API Key', 0),
        tab: 'pro',
        lead: '激活码在发货信息里。在管理后台把它换成一把 sk- 开头的 API Key，换出来的 Key 在 CC Switch、编辑器、终端里通用，也一直留在后台里随时能查看。',
        url: { href: consoleUrl, path: '管理后台地址（主）', label: '打开管理后台' },
        shot: { src: 'guide_site.png', label: '图 10', caption: '管理后台首页，左侧「提取 Key」' },
        notes: [
          '粘贴激活码提交后会生成一把 sk- 开头的 Key。Key 一直保存在管理后台的「Key 详情」里，刷新页面、换浏览器都还能再看，建议同时复制一份存进密码管理器。',
          'Key 泄露或想换一把时，回「提取 Key」重新提取一把新的。',
          '主域名打不开时换备用域名 ' + consoleBackupDomains.join('、') + '，内容和主域名一样，Key 不用重提。',
        ],
      },
      {
        id: 'params',
        h2: guideH2('手动配置', 1),
        tab: 'pro',
        lead: '不想用一键导入，或者已经熟悉别的工具，就自己填。CC Switch、编辑器、终端都只要三个值：接口地址、API Key、模型名。地址和模型名在管理后台首页顶部就能看到，Key 是上一步提取的那串。',
        table: {
          labelCol: '要填的地方',
          columns: ['填什么', '去哪里拿'],
          rows: [
            { label: '接口地址（Base URL）', values: [baseUrl, '管理后台首页顶部那一行；打不开就换备用域名 ' + consoleBackupDomains.join('、')] },
            { label: 'API Key', values: ['sk- 开头的密钥', '第 1 步提取的那把；忘了就回管理后台的「Key 详情」再看'] },
            { label: '模型名', values: [recommendedModels, '网关实时返回，「获取模型列表」里能看到的都在；不确定用哪个看<a href="/models">模型广场</a>'] },
          ],
        },
        notes: [
          '接口地址不要自己加 /v1 结尾，也不要加 /chat/completions；Cursor 这类 OpenAI 兼容端点才带 /v1。填反了会 404。',
          '模型不用背：工具里的「获取模型列表」是网关实时返回的，最全也最新；CC Switch 里拉一次就会存下来。上面四个是起步够用的主力，完整的档位与适用场景见<a href="/models">模型广场</a>。',
          '拿不准怎么填、或者还没装 CC Switch，照 <a href="#install-ccswitch">小白教程</a>走即可，两边用的是同一把 Key。',
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
/**
 * 教程页用到的截图文件名（block.shot 与 steps[].shot），**按出现次数**计数，不去重：
 * 两条轨都渲染在 SSR 产物里（切轨靠 hidden），同一张图在两条轨各挂一次就会渲染两次，
 * scripts/check_dist.mjs 用它断言产物里 <img class="cu-shot"> 的数量，两者必须一致。
 */
export const guideShots: string[] = (() => {
  const out: string[] = []
  for (const p of guidePages) {
    for (const b of p.blocks) {
      // 块级插图：两条轨都进 SSR 产物
      if (b.shot) out.push(b.shot.src)
      // 步骤内插图：guide_site.png 在两条轨各挂一次，按「出现次数」计，才能和产物里 <img> 的数量对上；shot 可以是单张或数组
      for (const st of b.steps ?? []) {
        if (!st.shot) continue
        if (Array.isArray(st.shot)) for (const sh of st.shot) out.push(sh.src)
        else out.push(st.shot.src)
      }
    }
  }
  return out
})()

