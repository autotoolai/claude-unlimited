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

- API Key 是 sk- 开头的字符串，卡密在发货信息里，在后台或 cc 网站兑换后复制；
- 用 CC Switch 一键导入配置，再点「高级选项」→「获取模型列表」把模型勾上保存，最后点「启用」→「检测链路」；
- 装好之后终端输入 claude 就能用，切换模型用 /model。

售前售后任何问题都可以扫教程页最上面的客服二维码。`,
    links: [
      { text: '按客户端看教程（带截图）', url: '/guide' },
      { text: 'Claude Code 一键导入配置', url: '/guide/cc#cc-import' },
    ],
  },
  {
    cat: 'start',
    id: 'bot-start-tools',
    keywords: ['支持什么工具', '支持哪些客户端', '支持哪些工具', '客户端', '编辑器', 'cursor', 'cline', 'roo code', 'aider', 'continue', 'jetbrains'],
    tag: '入门',
    q: '支持哪些客户端和工具？',
    faqId: 'cat-product-tools',
  },
  {
    cat: 'start',
    id: 'bot-start-official',
    keywords: ['官方', 'anthropic', '是不是官方', '正品', '真假', '和anthropic什么关系', '冒牌', '山寨', '授权', '靠谱'],
    tag: '入门',
    q: '你们是 Anthropic 官方吗？',
    faqId: 'cat-product-official',
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
    q: '「一键导入配置」点了没反应？',
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
    keywords: ['获取模型', '模型列表', '高级选项', '添加模型', '模型为空', '没有模型', '拉取模型', '模型怎么选', '推荐模型', '加哪些模型', '列表是空的', '支持哪些模型', '有哪些模型', '支持什么模型'],
    tag: '配置',
    q: '支持哪些模型？',
    faqId: 'cat-product-models',
    // 答案与链接以「在 CC Switch 里怎么获取模型列表」为准（推荐加哪些模型）；新模型上线是否要换 Key 一并在这里说明
    extraFaqIds: ['cat-setup-models'],
    /** fable / opus 这类模型名归「怎么切换模型」，本条只答「支持哪些 / 列表为空」 */
    skipKeywords: ['fable', 'opus', 'sonnet', 'haiku'],
  },
  {
    cat: 'setup',
    id: 'bot-setup-enable',
    keywords: ['启用', '检测链路', '链路', '检测', '启用配置', '生效', '测一下', '测试连接', '连通性'],
    tag: '配置',
    q: '「启用」和「检测链路」是做什么的？',
    faqId: 'cat-setup-enable',
  },

  {
    cat: 'usage',
    id: 'bot-usage-price',
    keywords: ['多少钱', '价格', '价钱', '贵不贵', '月费', '月租', '多少钱一个月', '价位', '怎么收费', '收费', '费用', '贵吗'],
    tag: '使用',
    q: '多少钱？怎么收费？',
    a: `价格与套餐以发卡站的商品详情页为准，站内「立即购买」按钮直接跳到对应商品页，页面上写清档位、周期与包含内容。

买之前可以先看「套餐说明」页，最低档也能先试一个周期；无限卡订阅期内不按 token 计费，不满意按商品详情页的退款条款处理。`,
    links: [
      { text: '看套餐说明', url: '/pricing' },
      { text: '看常见问题', url: '/faq' },
    ],
  },
  {
    cat: 'usage',
    id: 'bot-usage-speed',
    keywords: ['限速', '速率', '并发', '并发数', 'rps', 'tpm', 'rpm', '多少并发', '公平使用', 'fair use', '速度', '快不快', '卡不卡', '限速数字', '并发的数字'],
    tag: '使用',
    q: '限速和并发的具体数字是多少？',
    faqId: 'cat-limits-speed',
  },

  // ---------- 使用 ----------
  {
    cat: 'usage',
    id: 'bot-usage-claudecode',
    keywords: ['claude code', 'anthropic code', 'claude_code', 'claudecode', 'claude 命令怎么启动', '命令行怎么用', 'cli', '开发接入', 'cc怎么用', 'cc怎么装', '怎么安装 claude code'],
    tag: '使用',
    q: '怎么接入 Claude Code？',
    faqId: 'cat-usage-claudecode',
  },
  {
    cat: 'usage',
    id: 'bot-usage-vscode',
    keywords: ['vscode', 'vs code', 'vscode插件', 'vs code插件', 'claude code 插件', 'claude code 侧边栏', 'vscode侧边栏', 'vs code侧边栏', '侧边栏插件', 'vscode怎么用', 'vs code怎么用', '插件', '扩展', '装扩展', '扩展怎么装'],
    tag: '使用',
    q: 'VS Code 里怎么用 Claude Code？',
    faqId: 'cat-setup-vscode',
  },
  {
    cat: 'usage',
    id: 'bot-usage-command',
    keywords: ['claude 命令', 'claude命令', 'powershell', 'cmd', '找不到命令', '命令找不到', 'claude 命令没反应', 'claude 命令找不到', 'claude 闪退', 'claude 命令装不上', '命令装不上', '窗口一闪就没', '一闪就没', '直接退出', '闪退', '装不上', '打不开', '终端'],
    tag: '使用',
    q: '终端里输入 claude 命令没反应 / 找不到命令？',
    faqId: 'cat-setup-claude-command',
  },
  {
    cat: 'usage',
    id: 'bot-usage-model',
    keywords: ['切换模型', 'model 指令', '/model', '换模型', '切模型', 'newmodel', '新模型', '切到 fable', '切到 opus', '切到 sonnet', '模型推荐', 'fable', 'opus', 'sonnet'],
    tag: '使用',
    q: '怎么切换模型？',
    faqId: 'cat-setup-model-switch',
  },
  {
    cat: 'usage',
    id: 'bot-usage-renew',
    keywords: ['更新 key', '更新key', '怎么换 key', '换key', '换卡要多少钱', '换套餐', 'key 到期', 'key 过期', 'key 过期了怎么办', 'key 过期了', 'key过期了怎么办', 'key过期了', '续费', '怎么续费', '续期', '换绑', '重新兑换', '怎么重新激活', '重新激活', '套餐怎么续', '套餐到期', '延长有效期'],
    tag: '使用',
    q: '怎么换 Key 或换套餐？',
    faqId: 'cat-usage-renew',
  },
  {
    cat: 'usage',
    id: 'bot-usage-reconfigure',
    keywords: ['换卡要重新配置吗', '需要重新配置吗', '重新配置', '换卡后怎么办', '新卡激活', '重新配置卡', '换卡后要不要重新配置', '配置还在吗'],
    tag: '使用',
    q: '换卡之后需要重新配置吗？',
    a: `如果 Key 没变、只是同一账号下换了套餐，不用重新配置，额度自动生效。

如果 Key 变了，把工具或环境变量里的旧 Key 换成新的，再重启 Claude Code 或编辑器使配置生效。`,
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
    keywords: ['有效期', '多久到期', '天数', '到期会怎样', '过期会怎样', '自动续费', '30天', '套餐过期', '有效期多久', '过期了多久', '一个周期', '能用多久'],
    tag: '使用',
    q: '有效期怎么算？',
    faqId: 'cat-product-period',
  },
  {
    cat: 'usage',
    id: 'bot-usage-context',
    keywords: ['上下文', 'context', '200k', '1m', '长文本', '上下文窗口', '最大上下文', '上下文多大', '记忆长度', '窗口多大', '模型上下文', '上下文最大'],
    tag: '使用',
    q: '上下文窗口多大？',
    faqId: 'cat-usage-context',
  },
  {
    cat: 'usage',
    id: 'bot-usage-unlimited',
    keywords: ['无限', '无限额度', '不限量', '真无限', 'token限制', 'token 限制', 'token 上限', '额度上限', '额度上限是多少', '有没有额度限制', '用不完', '到底无限'],
    tag: '使用',
    q: '「无限额度」到底无限到什么程度？',
    faqId: 'cat-product-unlimited',
  },

  // ---------- 报错 ----------
  {
    cat: 'trouble',
    id: 'bot-trouble-429',
    keywords: ['429', '限流', 'rate limit', 'too many requests', 'retry-after', '请求太频繁', '被限速了', '限速', '要等多久', '429 怎么办', '报 429', '重度使用会限速吗', '正常用会限速吗', '会不会被限速', '限速了会怎样', '并发多少够用', '会丢请求吗'],
    tag: '报错',
    q: '重度使用会限速吗？触到 429 怎么办？',
    faqId: 'cat-limits-429',
  },
  {
    cat: 'trouble',
    id: 'bot-trouble-login',
    keywords: ['登录不上', '登录失败', '连不上', '连不上网关', '连接失败', 'error', 'error code', '用不了', '不能用了', '一直报错', '报错', '用着用着不能用', '突然不能用', '打不开了'],
    tag: '报错',
    q: '登录不上 / 一直报错怎么办？',
    a: `按顺序排查三件事：

1. 状态码是 429（速率限制）→ 等 Retry-After 指定的秒数，会自动恢复，见「遇到 429 怎么办」；
2. 状态码是 401（Key 无效）→ 多半是 Key 没更新或 Base URL 填错，重新核对这两行；
3. 状态码是 403 且提示账户状态异常 → 是账号被停用，需要人工申诉。

还不行就把账号标识、报错原文和发生时间发给人工客服。`,
  },
  {
    cat: 'trouble',
    id: 'bot-trouble-401',
    keywords: ['401', 'unauthorized', 'invalid api key', 'invalid api', '鉴权失败', 'key 无效', 'key无效', 'key 不对'],
    tag: '报错',
    q: '换 Key 后还是报 401 怎么办？',
    a: `401 是鉴权失败，不是额度问题。按顺序查：

1. 环境变量或 CC Switch 里的 Key 是不是换卡后的新 Key（sk- 开头），旧进程还拿着旧 Key；
2. 改完 Key 要重启 Claude Code 或编辑器才会重新读取；
3. Base URL 是不是带了多余的 /v1 或者漏了 /v1。

三处都对还报 401，把账号标识和报错原文发给人工客服核对。`,
  },
  {
    cat: 'trouble',
    id: 'bot-trouble-forbidden',
    keywords: ['403', 'forbidden', '禁止', '不能做什么', '什么行为', '封号', '封禁', '滥用', '共享', '压测', '转卖', '批量', '能多人用吗', '能共享吗'],
    tag: '报错',
    q: '哪些行为会被限制或停用？',
    faqId: 'cat-limits-forbidden',
  },
  {
    cat: 'trouble',
    id: 'bot-trouble-appeal',
    keywords: ['申诉', '被限制了', '恢复了', '复通', '怎么解除', '投诉限制', '误判', '停用', '怎么恢复', '限制怎么解除', '号被封了'],
    tag: '报错',
    q: '被限制了怎么申诉？',
    faqId: 'cat-limits-appeal',
  },
  {
    cat: 'trouble',
    id: 'bot-trouble-sla',
    keywords: ['可用率', 'sla', '稳定性', '宕机', '故障', '挂了', '稳定性保证', '稳定吗', '稳不稳'],
    tag: '报错',
    q: '稳定性有保障吗？',
    faqId: 'cat-about-sla',
  },
  {
    cat: 'trouble',
    id: 'bot-trouble-leak',
    keywords: ['泄露', 'key 泄露', 'key 泄露了', 'key泄露了', '被盗', '盗用', '异常调用', 'key 安全', 'key丢了', 'key 丢了', 'key找不到了'],
    tag: '报错',
    q: 'Key 泄露了怎么办？',
    faqId: 'cat-security-leak',
  },

  // ---------- 关于 ----------
  {
    cat: 'account',
    id: 'bot-account-human',
    keywords: ['人工客服', '客服', '联系方式', '邮箱', 'telegram', '加微信', '微信号', '转人工', '真人', '找人工', '联系人工', '客服什么时候回', '人工什么时候回', '联系人工要多久', '人工要多久', '客服要多久', '套餐怎么换', '人工', '退款', '退钱', '申请退款', '能不能退', '能退吗', '能退款吗', '联系方式是什么', '怎么联系你们', '加我微信', '加微信好友'],
    tag: '关于',
    q: '怎么联系客服？',
    human: true,
    a: '微信联系，助手马上把客服二维码和微信号发给你。联系时附上账号标识、报错原文、发生时间，处理更快。',
  },
  {
    cat: 'account',
    id: 'bot-account-contact',
    keywords: ['邮箱', '邮件', 'telegram', 'tel', '电话', '在线客服', '工作日', '上班时间', '什么时候能联系上'],
    // 「联系方式 / 微信 / 怎么联系你们」只挂在 bot-account-human（主问句「怎么联系客服？」）上。
    // 本条挂的是同一个 cat-about-contact，合并时会连 FAQ 的关键词一起带过来，两条语料抢同一批关键词、
    // 本条因标题多两个字而稳定垫底，check:kefu 的联系类用例会误判成 bot-account-contact。
    skipKeywords: ['联系方式', '微信', '加微信', '微信号', '怎么联系你们', '联系客服', '客服微信'],
    tag: '关于',
    q: '除了微信还有别的联系方式吗？',
    faqId: 'cat-about-contact',
    human: true,
    a: `目前主要通过微信联系，助手马上把客服二维码和微信号发给你。

联系时请附上账号标识、报错原文、发生时间，处理更快。也可以先看「常见问题」页，大部分问题当场就有答案。`,
    links: [
      { text: '看常见问题', url: '/faq' },
      { text: '看使用教程', url: '/guide' },
    ],
  },
  {
    cat: 'account',
    id: 'bot-account-who',
    keywords: ['你们是谁', '运营主体', '谁在卖', '你们的团队', '你们在哪家公司', '主体是谁', '你们公司地址在哪', '公司地址', '你们公司'],
    tag: '关于',
    q: '你们是谁？',
    faqId: 'cat-about-who',
  },
  {
    cat: 'account',
    id: 'bot-account-store',
    keywords: ['存储', '存不存', '日志', '记录', '保存多久', '数据留存', '隐私', '留存', '会存储', '会保存', '存储我的', '保存我的', '会存我的对话吗', '对话会留存吗', '请求记录保留多久', '存你们那吗', '数据安全'],
    tag: '关于',
    q: '我的请求内容会被存储吗？',
    faqId: 'cat-security-store',
  },
  {
    cat: 'account',
    id: 'bot-account-train',
    keywords: ['训练', '用于训练', 'train', '微调', '拿去训练', '数据用途', '支持微调吗', '会用来训练'],
    tag: '关于',
    q: '我的内容会被用于训练模型吗？',
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