/**
 * 欢迎语不是「面板头下方的一段文字」，而是一条普通语料（id 以 bot- 开头、没挂 faqId、答案在这里）。
 * 面板按答案消息的同一条渲染路径把它发出来，样式与后面的答案完全一致。
 * 写法约束：只用 \n 分段、不要用 Markdown；不出现「人工客服」字样（客服入口由面板兜底时给出）。
 */
export const kefuBotGreeting: KefuBotEntry = {
  cat: 'start',
  id: 'bot-greeting',
  keywords: ['你好', '在吗', '有人吗', '能问问题吗'],
  tag: '助手',
  q: '',
  a: `你好，我是站内助手，常见问题可以直接问我。搞不定可以直接找人工客服，面板底部有按钮。`,
}

/**
 * 在线助手的语料与话术 —— 「在线助手」面板的唯一数据源。
 *
 * 与 config/faq.ts 的分工（改一处，两边同步）：
 *   - faq.ts 是 /faq 页、首页内嵌 FAQ、JSON-LD 的数据源，答案是完整版，适合阅读；
 *   - 本文件是聊天气泡的语料，答案是同一件事的「短版话术」，第一句给结论，不铺背景。
 *   - keywords 会与 faq.ts 里同 id 条目的 keywords 自动合并（见 kefuBotKeywords），
 *     所以 FAQ 页新增关键词时助手自动跟着认，不必在这里重抄一遍。
 *
 * 字段约定：
 *   - a 第一句必须是结论；\n 分段；不用 Markdown（渲染器只处理纯文本 + links + code）。
 *     列表行以「- 」开头，面板会渲染成圆点列表。
 *   - q 用与 config/faq.ts 同款的问句（「支持哪些模型？」而不是「有哪些模型」），这样「支持哪些模型」这种
 *     前缀说法、以及「API Key 怎么用？」里含空格的「key 怎么填」都能靠子串命中同一题。
 *   - 关键词带空格与不带空格要各写一份（「key 怎么填」和「key怎么填」）：问句归一化后空格会被去掉，
 *     拉丁词元（「key怎么填」）靠不带空格的写法命中，中文子串（「key 怎么填」）靠带空格的写法命中。
 *   - 专名有三种写法：状态码与整词（429、key、sdk、ccswitch、人工）走「整词」通道；带空格或符号的写法
 *     （sk-、api key、baseurl、claude code、openai sdk、invalid api key）会被识别成「字面」通道，问句里出现即命中，
 *     问句反过来被关键词包含（「sk- 开头的 Key 怎么用」）也算；别把整词拆开写（「cc switch」会让「cc」命中它）。
 *   - keywords 是口语化别名，不是 FAQ 的标题。含汉字且 >= 2 字的走「子串命中」主通道，
 *     其余（429 / key / baseurl）走词元通道。单字关键词（「退」「续」）故意不写：
 *     子串命中会把它拉进所有含该字的问句。
 *
 * 改完语料不用碰组件：theme/kefu_items.ts 在构建期把它预处理成匹配索引，KefuWidget 只负责渲染。
 */

import { faqItems, type FaqLink } from './faq'

export type KefuBotCategory = 'start' | 'setup' | 'usage' | 'trouble' | 'account'

export interface KefuBotEntry {
  id: string
  cat: KefuBotCategory
  keywords: string[]
  /** 气泡顶部小标签 */
  tag: string
  /** 展示的问题标题 */
  q: string
  /** 答案正文；第一句是结论，空行分段；写了 faqId 就留空，答案与链接从 FAQ 取 */
  a?: string
  /** 指向 config/faq.ts 的条目 id 时复用其答案与链接，本文件只写更短的话术 */
  faqId?: string
  /**
   * 「联系人工客服」类语料：命中后 KefuWidget 直接发客服卡，而不是把答案发成一条文本。
   * 用户明确要求人工时，答案消息里没有任何按钮，只写一句「点上面的按钮」就是死路（2026-10 修复）。
   */
  human?: boolean
  /** 一条语料回答多个 FAQ 时，除主条目外还要收哪几条的关键词（答案仍取主条目） */
  extraFaqIds?: string[]
  /** 合并进来的关键词里要去掉的几个：同名别名在别的语料里指别的事（「用 fable 行不行」是问怎么切模型） */
  skipKeywords?: string[]
  links?: FaqLink[]
  code?: string[]
}

/** 气泡顶部小标签 */
export const kefuBotCategoryLabels: Record<KefuBotCategory, string> = {
  start: '入门',
  setup: '配置',
  usage: '使用',
  trouble: '报错',
  account: '关于',
}

export const kefuBotEntries: KefuBotEntry[] = [
  kefuBotGreeting,

  // ---------- 入门 ----------
  {
    cat: 'start',
    id: 'bot-start-plan',
    keywords: ['怎么开始', '从哪开始', '第一步', '小白', '新手', '第一次用', '入门', '教程', '怎么用', '从零', '配置步骤', '怎么配'],
    tag: '入门',
    q: '我该从哪开始？',
    a: `已经买好的话，三件事：拿到 API Key → 写进 CC Switch → 装上 Claude Code 开始用。

- 发卡站发货的是卡密；到管理后台粘贴卡密、提取 sk- 开头的 API Key（提取即激活，有效期按 24 小时制起算）；
- 用 CC Switch 一键导入配置，再点「高级选项」→「获取模型列表」把模型勾上保存，最后点「启用」→「检测链路」；
- 装好之后终端输入 claude 就能用，切换模型用 /model。

售前售后点右下角在线助手，或到「联系我们」页加微信 / QQ 群。`,
    links: [
      { text: '管理后台说明', url: '/console' },
      { text: '按用法看教程（带截图）', url: '/guide' },
      { text: 'Claude Code 一键导入配置', url: '/guide/cc#cc-import' },
      { text: '联系我们', url: '/contact' },
    ],
  },

  {
    cat: 'start',
    id: 'bot-start-tools',
    keywords: [
      '支持什么工具', '支持哪些客户端', '支持哪些工具', '客户端', '编辑器', 'agent',
      'claude code', 'cursor', 'codex', 'workbuddy', 'trae',
      'cline', 'roo code', 'aider', 'continue', 'opencode', '桌面版',
    ],
    tag: '入门',
    q: '目前支持哪些客户端和工具？',
    faqId: 'cat-product-tools',
  },
  // ---------- 配置 ----------
  {
    cat: 'setup',
    id: 'bot-setup-key',
    keywords: ['apikey', 'api key', 'sk-', '密钥', '在哪拿', '在哪获取', '怎么拿', '从哪拿', '哪拿 key', '拿 key', '兑换', '卡密怎么用', 'key 怎么填', '卡密', 'secret'],
    tag: '配置',
    q: 'API Key 怎么用？',
    faqId: 'cat-setup-apikey',
  },
  {
    cat: 'setup',
    id: 'bot-setup-baseurl',
    keywords: ['baseurl', 'base url', '网关地址', '接口地址', '地址填什么', '填什么', 'url 填什么', '填哪个', '地址怎么填', '结尾要加 /v1 吗', '要加 /v1 吗'],
    tag: '配置',
    q: 'Base URL 填什么？',
    faqId: 'cat-usage-baseurl',
  },
  {
    cat: 'setup',
    id: 'bot-setup-import',
    keywords: ['一键导入', '导入', '导入配置', '导入失败', '点击没反应', '点了没反应', '点没反应', '导不进去', '复制了没变化', '导入不了'],
    tag: '配置',
    q: '「一键导入配置」点了没反应怎么办？',
    faqId: 'cat-setup-import',
  },
  {
    cat: 'setup',
    id: 'bot-setup-ccswitch',
    keywords: ['ccswitch', 'cc switch', '配置软件', '配置工具', '必须装吗', '必须安装吗', '安装ccswitch', 'cc switch 怎么用', 'cc switch 是什么', 'cc switch 怎么安装', 'cc switch 安装', '装 cc', 'cc是什么', 'cc怎么装', 'cc switch 介绍'],
    tag: '配置',
    q: 'CC Switch 是什么？必须装吗？',
    faqId: 'cat-setup-ccswitch',
  },
  {
    cat: 'setup',
    id: 'bot-setup-models',
    keywords: ['模型怎么选', '推荐模型', '加哪些模型', '支持哪些模型', '有哪些模型', '支持什么模型', '高级选项', '添加模型'],
    tag: '配置',
    q: '支持哪些模型？',
    faqId: 'cat-product-models',
    /** fable / opus 归「怎么切换模型」；列表为空 / 获取失败归 bot-setup-enable */
    skipKeywords: ['fable', 'opus', 'sonnet', 'haiku'],
  },
  {
    cat: 'setup',
    id: 'bot-setup-enable',
    keywords: [
      '启用', '检测链路', '链路', '检测', '启用配置', '生效', '测一下', '测试连接', '连通性',
      '配好了', '检测失败', '模型为空', '没有模型', '模型列表为空', '获取模型', '拉取模型',
    ],
    tag: '配置',
    q: '配好了但连不上，该先查哪几步？',
    faqId: 'cat-setup-connect',
  },

  {
    cat: 'usage',
    id: 'bot-usage-opus-fable-card',
    keywords: [
      'opus 无限卡', 'opus无限卡', 'claude opus 无限卡', 'opus 5.5 无限卡',
      'fable 无限卡', 'fable无限卡', 'claude fable 无限卡', 'fable 5.1 无限卡',
      'sonnet 无限卡', '单独买 opus', 'opus 要另买吗', '要不要单独买', '要单独买卡吗',
    ],
    tag: '使用',
    q: 'Opus / Fable 要单独买一张「无限卡」吗？',
    faqId: 'cat-product-opus-fable-card',
  },
  {
    cat: 'usage',
    id: 'bot-usage-price',
    keywords: ['多少钱', '价格', '价钱', '贵不贵', '月费', '月租', '多少钱一个月', '价位', '怎么收费', '收费', '费用', '贵吗'],
    tag: '使用',
    q: '怎么收费？和按量 API 有什么差别？',
    faqId: 'cat-product-price',
  },
  {
    cat: 'usage',
    id: 'bot-usage-refund',
    keywords: ['退款', '退钱', '申请退款', '能不能退', '能退吗', '能退款吗', '不满意'],
    tag: '使用',
    q: '买了之后不满意可以申请退款吗？',
    faqId: 'cat-product-refund',
  },
  {
    cat: 'usage',
    id: 'bot-usage-speed',
    keywords: [
      '限速', '速率', '并发', '并发数', '多少并发', '公平使用', 'fair use', '速度', '快不快', '卡不卡',
      '单窗口', '双窗口', '三窗口', '怎么选', '几个窗口', '多开', '会话窗口',
    ],
    tag: '使用',
    q: '单窗口、双窗口、三窗口怎么选？',
    faqId: 'cat-limits-speed',
  },

  // ---------- 使用 ----------
  {
    cat: 'usage',
    id: 'bot-usage-claudecode',
    keywords: ['claude code', 'anthropic code', 'claude_code', 'claudecode', 'claude 命令怎么启动', '命令行怎么用', 'cli', '开发接入', 'cc怎么用', 'cc怎么装', '怎么安装 claude code', '怎么接入'],
    tag: '使用',
    q: '怎么接入 Claude Code？',
    faqId: 'cat-usage-clients',
  },
  {
    cat: 'usage',
    id: 'bot-usage-vscode',
    keywords: ['vscode', 'vs code', 'vscode插件', 'vs code插件', 'claude code 插件', 'claude code 侧边栏', 'vscode侧边栏', 'vs code侧边栏', '侧边栏插件', 'vscode怎么用', 'vs code怎么用', '插件', '扩展', '装扩展', '扩展怎么装', 'cursor 插件', 'cursor扩展', 'cursor 装插件'],
    tag: '使用',
    q: 'VS Code 和 Cursor 里怎么用 Claude Code 插件？',
    a: `CC Switch 配好并启用后，在扩展面板搜索 Claude Code，装 Anthropic 官方插件；首次打开选「使用已有的 API 配置 / API Key」。VS Code 与 Cursor 是同一扩展。逐步截图见教程。`,
    links: [{ text: '教程 · 在 VS Code 里装插件', url: '/guide/cc#cc-vscode' }],
  },
  {
    cat: 'usage',
    id: 'bot-usage-command',
    keywords: ['claude 命令', 'claude命令', 'powershell', 'cmd', '找不到命令', '命令找不到', 'claude 命令没反应', 'claude 命令找不到', 'claude 闪退', 'claude 命令装不上', '命令装不上', '窗口一闪就没', '一闪就没', '直接退出', '闪退', '装不上', '打不开', '终端'],
    tag: '使用',
    q: '终端里输入 claude 命令没反应 / 找不到命令？',
    a: `先确认配置已启用，再重开一个终端窗口。仍找不到命令，多半是 CLI 没装好或没进 PATH：按 CLI 教程重装一遍。`,
    links: [
      { text: '教程 · 启用并检测链路', url: '/guide/cc#cc-enable' },
      { text: '教程 · Claude Code CLI', url: '/guide/cli' },
    ],
  },
  {
    cat: 'usage',
    id: 'bot-usage-model',
    keywords: ['切换模型', 'model 指令', '/model', '换模型', '切模型', 'newmodel', '新模型', '切到 fable', '切到 opus', '切到 sonnet', '模型推荐', 'fable', 'opus', 'sonnet', '要换key吗'],
    tag: '使用',
    q: '怎么切换模型？新模型要换 Key 吗？',
    faqId: 'cat-setup-model-switch',
  },
  {
    cat: 'usage',
    id: 'bot-usage-renew',
    keywords: [
      '更新 key', '更新key', '怎么换 key', '换key', '换卡要多少钱', '换套餐', 'key 到期', 'key 过期',
      'key 过期了怎么办', 'key 过期了', 'key过期了怎么办', 'key过期了', '续费', '怎么续费', '续期', '换绑',
      '重新兑换', '怎么重新激活', '重新激活', '套餐怎么续', '套餐到期', '延长有效期',
      '换卡要重新配置吗', '需要重新配置吗', '重新配置', '换卡后怎么办', '新卡激活', '换卡后要不要重新配置', '配置还在吗',
    ],
    tag: '使用',
    q: '换卡或换套餐之后要重新配置吗？',
    faqId: 'cat-usage-renew',
  },

  {
    cat: 'usage',
    id: 'bot-usage-openai',
    keywords: ['openai sdk', 'openai', 'sdk', 'python', 'typescript', 'go', '兼容接口', '兼容吗', '接口文档', 'api 调用', 'openai 兼容', '开发接入', '调用接口', 'sdk'],
    tag: '使用',
    q: '支持 OpenAI 兼容接口吗？',
    faqId: 'cat-usage-openai',
  },
  {
    cat: 'usage',
    id: 'bot-usage-period',
    keywords: [
      '有效期', '多久到期', '天数', '到期会怎样', '过期会怎样', '自动续费', '30天',
      '套餐过期', '有效期多久', '过期了多久', '一个周期', '能用多久',
      '激活时间', '什么时候开始算', '什么时候起算', '提取后才算', '未激活计时吗', '买了就开始算吗',
    ],
    tag: '使用',
    q: '有效期从什么时候起算？到期会怎样？',
    faqId: 'cat-product-period',
  },
  {
    cat: 'usage',
    id: 'bot-usage-context',
    keywords: ['上下文', 'context', '200k', '1m', '长文本', '上下文窗口', '最大上下文', '上下文多大', '记忆长度', '窗口多大', '模型上下文', '上下文最大'],
    tag: '使用',
    q: '上下文窗口多大？',
    a: `Claude Code 这类 agent 工具的官方标准窗口一般是 200k token，读大段代码、长日志够用。想看当前会话实际窗口，在工具里跑 /context 即可。`,
  },
  {
    cat: 'usage',
    id: 'bot-usage-unlimited',
    keywords: ['无限', '无限额度', '不限量', '真无限', 'token限制', 'token 限制', 'token 上限', '额度上限', '额度上限是多少', '有没有额度限制', '用不完', '到底无限', '续杯', '无限续杯', 'claude无限续杯', 'claude 无限续杯'],
    tag: '使用',
    q: '「无限额度」到底有没有上限？',
    faqId: 'cat-product-unlimited',
  },

  // ---------- 报错 ----------
  {
    cat: 'trouble',
    id: 'bot-trouble-429',
    keywords: ['429', '限流', 'rate limit', 'too many requests', 'retry-after', '请求太频繁', '被限速了', '限速', '要等多久', '429 怎么办', '报 429', '重度使用会限速吗', '正常用会限速吗', '会不会被限速', '限速了会怎样', '并发多少够用', '会丢请求吗'],
    tag: '报错',
    q: '正常用会限速吗？碰到 429 怎么办？',
    faqId: 'cat-limits-429',
  },
  {
    cat: 'trouble',
    id: 'bot-trouble-login',
    keywords: ['登录不上', '登录失败', '连不上', '连不上网关', '连接失败', 'error', 'error code', '用不了', '不能用了', '一直报错', '报错', '用着用着不能用', '突然不能用', '打不开了'],
    tag: '报错',
    q: '连不上网关或一直报错怎么排查？',
    faqId: 'cat-limits-login',
  },

  {
    cat: 'trouble',
    id: 'bot-trouble-401',
    keywords: ['401', 'unauthorized', 'invalid api key', 'invalid api', '鉴权失败', 'key 无效', 'key无效', 'key 不对'],
    tag: '报错',
    q: '报 401 或提示 Key 无效怎么办？',
    faqId: 'cat-limits-401',
  },
  {
    cat: 'trouble',
    id: 'bot-trouble-forbidden',
    keywords: ['403', 'forbidden', '禁止', '不能做什么', '什么行为', '封号', '封禁', '滥用', '共享', '压测', '转卖', '批量', '能多人用吗', '能共享吗'],
    tag: '报错',
    q: '哪些使用行为会被限制或停用？',
    faqId: 'cat-limits-forbidden',
  },
  {
    cat: 'trouble',
    id: 'bot-trouble-appeal',
    keywords: ['申诉', '被限制了', '恢复了', '复通', '怎么解除', '投诉限制', '误判', '停用', '怎么恢复', '限制怎么解除', '号被封了'],
    tag: '报错',
    q: '被限制了怎么办？',
    human: true,
    a: `429 是短时速率限制，等一下或等 Retry-After 后通常会自动恢复，不必找人工。

若返回 403 且提示账户状态异常，或确认被停用，请联系客服并附上：卡密尾号、大致时间点、报错原文。助手会把客服二维码发给你。`,
  },
  {
    cat: 'trouble',
    id: 'bot-trouble-sla',
    keywords: [
      '可用率', 'sla', '稳定性', '宕机', '故障', '挂了', '稳定性保证', '稳定吗', '稳不稳',
      '稳定性有保障吗', '有保障吗', '服务挂了', '宕机了怎么办', '挂了怎么办',
    ],
    tag: '报错',
    q: '服务完全挂了或不可用怎么办？',
    faqId: 'cat-limits-down',
    human: true,
    a: `服务依赖上游模型与公网，偶发抖动或维护时请先看站内公告与购买页通知。紧急故障（完全不可用）请联系客服，并附上卡密尾号与报错原文；助手会把客服二维码发给你。`,
  },

  // ---------- 关于 ----------
  {
    cat: 'account',
    id: 'bot-account-human',
    keywords: ['人工客服', '客服', '联系方式', '邮箱', 'telegram', '加微信', '微信号', '转人工', '真人', '找人工', '联系人工', '客服什么时候回', '人工什么时候回', '联系人工要多久', '人工要多久', '客服要多久', '套餐怎么换', '人工', '联系方式是什么', '怎么联系你们', '加我微信', '加微信好友', 'QQ群', 'QQ 群', '加群', 'qq群'],
    tag: '关于',
    q: '怎么联系客服？',
    human: true,
    a: '微信加客服，或扫码进 QQ 交流群。助手马上把二维码和号码发给你。添加时请备注来意；联系时附上账号标识、报错原文、发生时间，处理更快。',
  },
  {
    cat: 'account',
    id: 'bot-account-contact',
    keywords: ['邮箱', '邮件', 'telegram', 'tel', '电话', '在线客服', '工作日', '上班时间', '什么时候能联系上'],
    // 「联系方式 / 微信 / 客服」只挂在 bot-account-human，避免与本条抢词。
    skipKeywords: ['联系方式', '微信', '加微信', '微信号', '怎么联系你们', '联系客服', '客服', '客服微信', 'QQ群', 'QQ 群', '加群'],
    tag: '关于',
    q: '除了微信还有别的联系方式吗？',
    faqId: 'cat-about-contact',
    human: true,
    a: `可以加微信客服，也可以扫码进 QQ 交流群。助手马上把二维码和号码发给你。

添加时请备注来意；联系时请附上账号标识、报错原文、发生时间，处理更快。完整二维码也在「联系我们」页；常见问题页大多能当场答完。`,
    links: [
      { text: '联系我们', url: '/contact' },
      { text: '看常见问题', url: '/faq' },
      { text: '看使用教程', url: '/guide' },
    ],
  },
  {
    cat: 'account',
    id: 'bot-account-who',
    keywords: [
      '你们是谁', '运营主体', '谁在卖', '你们的团队', '你们在哪家公司', '主体是谁', '你们公司地址在哪', '公司地址', '你们公司',
      '官方', 'anthropic', '是不是官方', '你们是官方吗', '正品', '真假', '和anthropic什么关系', '冒牌', '山寨', '授权', '靠谱',
    ],
    tag: '关于',
    q: '你们是谁？',
    a: `本站是独立的第三方 API 网关服务，不是 Anthropic 官方。提供 Claude 系列模型的统一接入与订阅销售；定位与条款见「关于我们」页。`,
    links: [{ text: '关于我们', url: '/about' }],
  },
  {
    cat: 'account',
    id: 'bot-account-store',
    keywords: ['存储', '存不存', '日志', '记录', '保存多久', '数据留存', '隐私', '留存', '会存储', '会保存', '存储我的', '保存我的', '会存我的对话吗', '对话会留存吗', '请求记录保留多久', '存你们那吗', '数据安全'],
    tag: '关于',
    q: '请求内容会保存在你们这边吗？',
    faqId: 'cat-security-store',
  },
  {
    cat: 'account',
    id: 'bot-account-train',

    keywords: ['训练', '用于训练', 'train', '微调', '拿去训练', '数据用途', '支持微调吗', '会用来训练'],
    tag: '关于',
    q: '我的对话内容会被用来训练模型吗？',
    faqId: 'cat-security-train',
  },
]

/** config/faq.ts 条目 id -> 条目；供 faqId 复用完整答案（答案、链接、代码都取自 FAQ，这里不重复维护） */
export const faqById: Record<string, (typeof faqItems)[number]> = Object.fromEntries(
  faqItems.map((it) => [it.id, it]),
)

/** 全角转半角 + 折叠空白 + 小写；合并关键词时先归一化，避免同一别名两种写法重复占位 */
export function kefuNorm(s: string): string {
  return s
    .replace(/[！-～]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

/**
 * 合并关键词：本文件手写的口语别名 + FAQ 同 id 条目的 keywords。
 * FAQ 是关键词的权威源，页面上新增别名后助手自动认，不用两处同步改。
 */
export function kefuBotKeywords(e: KefuBotEntry): string[] {
  const skip = new Set((e.skipKeywords ?? []).map(kefuNorm))
  const faqs = [e.faqId, ...(e.extraFaqIds ?? [])].filter((id): id is string => !!id).map((id) => faqById[id])
  const all = [...e.keywords.map(kefuNorm), ...faqs.flatMap((f) => (f?.keywords ?? []).map(kefuNorm))]
  return [...new Set(all.filter((k) => k && !skip.has(k)))]
}

/** faqId 是否都存在：写错 id 时构建期就能发现（npm run build 的 check:kefu 会报） */
export function kefuBotBadFaqIds(): string[] {
  return kefuBotEntries.flatMap((e) =>
    [e.faqId, ...(e.extraFaqIds ?? [])]
      .filter((id): id is string => !!id && !faqById[id])
      .map((id) => `${e.id} -> ${id}`),
  )
}