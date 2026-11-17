import { partnerUrl } from './site'
import { limitBullets, refundSummary, refundWindowDays } from './rules'

/**
 * FAQ 唯一数据源 —— 同时驱动：
 *   1. /faq 页面（FaqList 组件）
 *   2. 营销页精选内嵌（首页 / 定价 / 模型 / 教程索引；见文末 *FaqIds）
 *   3. KefuWidget 关键词助手（经 kefu.data.ts 构建期预处理）
 *   4. 相关 FAQPage JSON-LD
 *
 * 分类按买家路径：商品与套餐 → 开通与配置 → 日常使用 → 限速与报错 → 安全与联系。
 * FAQ 只答「决策 + 卡点」；逐步操作主场在 /guide，这里给排错一句 + 链接。
 * 教程场景页的 page.faq[] 在 config/guide.ts，不迁到本文件。
 *
 * 差异化重点：「限速与报错」——对外只谈会话窗口，不披露 RPM / TPM / 子代理并发具体数字。
 * 退款细则主场在定价页；不写可用率、时效承诺等数字。
 *
 * 写作规范：
 * - q：约 14–22 字，完整口语一句即可；相关追问可并一句，别把两件无关事硬塞一行。
 * - a：第一句必须是结论；多段用换行分隔（模板字符串里直接换行）。
 * - 不要在 a 里用 Markdown，渲染器只处理纯文本 + links + code。
 *
 * 锚点 id（cat-limits-speed 等）有站外/知识库深链，改文案可、改 id 要全站搜一遍。
 */

export type FaqCategory = 'product' | 'setup' | 'usage' | 'limits' | 'safety'

export interface FaqLink {
  text: string
  url: string
  external?: boolean
}

export interface FaqItem {
  /** 该问题要匹配的关键词（小写；匹配时会做全角转半角） */
  keywords: string[]
  q: string
  /** 答案：第一句必须是结论。换行用模板字符串直接换行 */
  a: string
  /** 答案里要渲染的链接 */
  links?: FaqLink[]
  /** 答案里要渲染的代码行 */
  code?: string[]
  /** /faq 页锚点 */
  id: string
  cat: FaqCategory
  /** 「买之前」精选（首页 + /faq 顶部 + README）。与 pages/data.ts 的 buyingQuestions 保持同批。 */
  featured?: boolean
}

export const categoryLabels: Record<FaqCategory, string> = {
  product: '商品与套餐',
  setup: '开通与配置',
  usage: '日常使用',
  limits: '限速与报错',
  safety: '安全与联系',
}

/** /faq 各分类 h2 下的一句说明（与「买之前」导语同级） */
export const categoryLeads: Record<FaqCategory, string> = {
  product: '档位怎么选、有效期怎么算、退款边界在哪。',
  setup: '开卡、配 Key、接到 Claude Code 或其他客户端。',
  usage: '日常怎么用、怎么切模型、和官方订阅差在哪。',
  limits: '会话窗口怎么选、限速提示与常见报错。',
  safety: '账号与 Key 安全，以及联系人工客服。',
}

export const faqItems: FaqItem[] = [
  // ---------- 商品与套餐 ----------
  {
    cat: 'product',
    id: 'cat-product-unlimited',
    featured: true,
    keywords: ['无限', '无限额度', '不限量', '到底无限', '什么意思', '是不是真无限', 'token限制', '额度上限', '续杯', '无限续杯', 'claude无限续杯', 'claude 无限续杯'],
    q: '「无限额度」到底有没有上限？',
    a: `订阅期内不按 token 计费：每次调用无论消耗多少 token，都包含在订阅价里。

「无限」不是无边界：套餐按「同时可开几个会话窗口」区分；也不包含生产流量、压测或多人共享 Key。个人日常开发按档位窗口数使用即可。`,
    links: [{ text: '各档窗口怎么选', url: '/faq#cat-limits-speed' }],
  },
  {
    cat: 'product',
    id: 'cat-product-refund',
    featured: true,
    keywords: ['退款', '退钱', '申请退款', '能不能退', '能退吗', '能退款吗', '不满意', '售后'],
    q: '买了之后不满意可以申请退款吗？',
    a: `${refundSummary}；售后申请窗口为购买后 ${refundWindowDays} 天内。

未激活的卡密可全额退；因个人操作问题（配置、模型选择、客户端使用）产生的困扰不在退款范围内。细则以套餐页与发卡站商品详情为准。`,
    links: [{ text: '套餐与退款说明', url: '/pricing' }],
  },
  {
    cat: 'product',
    id: 'cat-product-price',
    keywords: ['多少钱', '价格', '价钱', '贵不贵', '月费', '月租', '多少钱一个月', '价位', '怎么收费', '收费', '费用', '贵吗'],
    q: '怎么收费？和按量 API 有什么差别？',
    a: `按订阅周期与会话窗口档位收费，订阅期内不按 token 计费；具体价格以发卡站商品详情为准，站内「立即购买」跳到对应商品页。

和按量 API 的差别：本卡用多少 token 不另计费，上限体现在同时可开的会话窗口数，而不是账单上的 token 行。`,
    links: [{ text: '看套餐与价格', url: '/pricing' }],
  },
  {
    cat: 'product',
    id: 'cat-product-models',
    keywords: ['模型', '支持哪些模型', 'opus', 'fable', '5.5', '5.1', '版本', '新模型', '有哪些模型', '支持什么模型'],
    q: '支持哪些模型？选 Opus 多花钱吗？',
    a: `本卡承诺 Fable 5.1 与 Opus 5.5，均在同一订阅价内，选 Opus 不另收费。

model ID：claude-fable-5-1（速度与质量均衡，日常编码主力）、claude-opus-5-5（复杂推理、架构设计）。以工具「获取模型列表」实际返回的 ID 为准；新模型上线一般只需更新 model ID，不必换 Key。`,
    links: [
      { text: '模型广场', url: '/models' },
      { text: '教程 · 拉取并保存模型', url: '/guide/cc#cc-models' },
    ],
  },
  {
    cat: 'product',
    id: 'cat-product-opus-fable-card',
    featured: true,
    keywords: [
      'opus 无限卡', 'opus无限卡', 'claude opus 无限卡', 'opus 5.5 无限卡',
      'fable 无限卡', 'fable无限卡', 'claude fable 无限卡', 'fable 5.1 无限卡',
      'sonnet 无限卡', '单独买 opus', 'opus 要另买吗', '要不要单独买',
    ],
    q: 'Opus / Fable 要单独买一张「无限卡」吗？',
    a: `不用。Claude 无限卡是一份订阅制通道：有效期内承诺的 Fable 5.1 与 Opus 5.5 都在同一订阅价内，选 Opus 不另计费，也不单独售卖「Opus 卡」或「Fable 卡」。

搜「opus 无限卡」「fable 无限卡」通常就是指这类用法；档位与价格见套餐定价，复制 model ID 见模型广场。`,
    links: [
      { text: '看套餐与价格', url: '/pricing' },
      { text: '模型广场', url: '/models' },
    ],
  },
  {
    cat: 'product',
    id: 'cat-product-tools',
    keywords: [
      '工具', '支持什么工具', '客户端', '编辑器', 'agent',
      'claude code', 'cursor', 'codex', 'workbuddy', 'trae',
      'cline', 'roo code', 'aider', 'continue', 'opencode', '桌面版',
    ],
    q: '目前支持哪些客户端和工具？',
    a: `凡是能接 Anthropic 或 OpenAI 兼容接口的都能用。站内教程已覆盖 Claude Code（CLI 与编辑器插件）、Claude 桌面版、Codex、WorkBuddy、Cursor；也可接 Trae、Cline、Roo Code、Aider、Continue、OpenCode 等，以及官方 Python / TypeScript / Go SDK。

接入是改 Base URL 加 Key，不必重写业务逻辑。`,
    links: [{ text: '按客户端看教程', url: '/guide' }],
  },
  {
    cat: 'product',
    id: 'cat-product-period',
    featured: true,
    keywords: [
      '有效期', '多久', '天数', '到期会怎样', '过期会怎样', '自动续费', '30天',
      '激活', '什么时候开始算', '什么时候起算', '提取后才算', '激活时间', '未激活',
    ],
    q: '有效期从什么时候起算？到期会怎样？',
    a: `从管理后台提取 API Key（激活）起算，按 24 小时制：商品页标注天数 × 24 小时（天卡 24 小时，周卡 7×24，月卡 30×24）。付款本身不起算；卡密未提取前不计时。

到期后访问结束，不自动续费。多张卡各自独立计时，不合并。`,
    links: [{ text: '管理后台 · 提取 Key', url: '/console' }],
  },

  // ---------- 开通与配置 ----------
  {
    cat: 'setup',
    id: 'cat-setup-apikey',
    keywords: ['apikey', 'api key', '密钥', '在哪拿', '怎么拿', '网关地址', '地址', '兑换', '卡密', '卡密怎么用'],
    q: '卡密和 API Key 分别是什么？怎么拿？',
    a: `发卡站发的是卡密；到管理后台粘贴卡密、提取后得到 API Key（sk- 开头）和 Base URL。提取 Key 即激活，有效期按 24 小时制起算。

- Base URL：网关根地址（是否加 /v1 见下一题）；
- API Key：等同于官方 Key 的用法。

两行复制下来就能配。`,
    links: [
      { text: '管理后台说明', url: '/console' },
      { text: '使用教程', url: '/guide' },
    ],
  },
  {
    cat: 'setup',
    id: 'cat-usage-baseurl',
    keywords: ['base url', 'baseurl', 'url', '接口地址', '填什么', '怎么填', '配置', '结尾要加 /v1 吗', '要加 /v1 吗'],
    q: 'Base URL 结尾要不要加 /v1？',
    a: `Anthropic SDK 和 Claude Code：填网关根地址（不含 /v1），SDK 会自己拼 /v1/messages。
OpenAI SDK、LangChain、LiteLLM、Cursor、WorkBuddy：填带 /v1 的地址。

大多数接入失败都是 /v1 漏填或多填。`,
    code: [
      '# Anthropic SDK / Claude Code：不带 /v1',
      'ANTHROPIC_BASE_URL=<网关根地址>',
      'ANTHROPIC_API_KEY=<你的 Key>',
      '',
      '# OpenAI SDK / Cursor / LangChain：带 /v1',
      'OPENAI_BASE_URL=<网关根地址>/v1',
      'OPENAI_API_KEY=<你的 Key>',
    ],
  },
  {
    cat: 'setup',
    id: 'cat-setup-ccswitch',
    keywords: ['ccswitch', 'cc switch', 'cc是什么', 'cc switch 介绍', '配置软件', '配置工具', '必须装吗'],
    q: 'CC Switch 是什么？必须装吗？',
    a: `CC Switch 是管理 Claude Code / Codex 等供应商配置的小工具（Windows / macOS），支持一键导入、拉模型列表、检测链路。

小白建议装：配一次，终端与编辑器插件一起生效。高手可跳过，直接写环境变量或 settings.json。逐步操作见教程。`,
    links: [
      { text: 'CC Switch 官网', url: partnerUrl('ccswitch') || 'https://ccswitch.io/', external: true },
      { text: 'Claude Code 配置教程', url: '/guide/cc' },
    ],
  },
  {
    cat: 'setup',
    id: 'cat-setup-import',
    keywords: ['一键导入', '导入', '导入配置', '点击没反应', '导入失败', '点了没反应'],
    q: '「一键导入配置」点了没反应怎么办？',
    a: `多数是 CC Switch 还没启动：先打开 CC Switch，再回管理后台点「一键导入」，窗口弹出后确认保存。

同名配置会覆盖。不想装 CC Switch，可把 Base URL 与 Key 写进 %USERPROFILE%\\.claude\\settings.json（Windows）。完整步骤见教程。`,
    code: [
      'Windows（%USERPROFILE%\\.claude\\settings.json）',
      '{',
      '  "env": {',
      '    "ANTHROPIC_BASE_URL": "网关根地址，不带 /v1",',
      '    "ANTHROPIC_API_KEY": "sk-你的Key"',
      '  }',
      '}',
    ],
    links: [{ text: '教程 · 一键导入配置', url: '/guide/cc#cc-import' }],
  },
  {
    cat: 'setup',
    id: 'cat-setup-connect',
    keywords: ['连不上', '配好了', '用不了', '检测失败', '启用', '检测链路', '链路', '测一下', '测试连接', '连通性', '获取模型', '模型列表', '模型为空', '没有模型'],
    q: '配好了但连不上，该先查哪几步？',
    a: `按顺序查四步：

- Key 是否已在管理后台提取，且工具里写的是新 Key；
- Base URL 是否按客户端要求带/漏了 /v1；
- CC Switch（若在用）是否已「启用」，并点过「检测链路」；模型列表空则再「获取模型列表」后保存；
- 改完后是否重开了终端或编辑器。

逐步截图与各客户端差异见使用教程。`,
    links: [
      { text: '教程 · 启用并检测链路', url: '/guide/cc#cc-enable' },
      { text: '按客户端看教程', url: '/guide' },
    ],
  },

  // ---------- 日常使用 ----------
  {
    cat: 'usage',
    id: 'cat-setup-model-switch',
    keywords: ['切换模型', 'model 指令', '/model', '换模型', '切模型', 'fable', 'opus', '新模型', '要换key吗'],
    q: '怎么切换模型？新模型要换 Key 吗？',
    a: `在 Claude Code 会话里输入 /model 打开列表，或 /model claude-fable-5-1 切到指定模型。所有模型同一订阅价，选 Opus 不多花钱。

新模型上线后刷新模型列表再切即可，一般不必换 Key。`,
    code: ['/model', '/model claude-fable-5-1'],
    links: [{ text: '教程 · 拉取并保存模型', url: '/guide/cc#cc-models' }],
  },
  {
    cat: 'usage',
    id: 'cat-usage-renew',
    keywords: ['换key', '换 key', '换卡', '更新key', '重新配置', 'key过期', '换绑', '续费', '换卡后怎么办', '需要重新配置吗'],
    q: '换卡或换套餐之后要重新配置吗？',
    a: `买新卡密 → 管理后台提取新 Key → 把工具或环境变量里的旧 Key 换成新的 → 重启 Claude Code 或编辑器。若报 401，先核对新 Key 是否已写入且进程已重启。

多数情况只要换 Key，Base URL 不用改。新卡密提取后按该卡档位重新起算有效期。`,
    links: [{ text: '管理后台 · 提取 Key', url: '/console' }],
  },
  {
    cat: 'usage',
    id: 'cat-usage-openai',
    keywords: ['openai', '兼容', 'sdk', 'python', 'typescript', 'go', '调用接口'],
    q: '支持 OpenAI 兼容接口吗？',
    a: `支持。网关同时提供 Anthropic 兼容端点与 OpenAI 兼容端点（/v1/chat/completions），现有 OpenAI SDK 改 Base URL 即可，不必重写。

流式响应、工具调用、扩展思考、视觉输入、长上下文等主要能力均透传。`,
  },
  {
    cat: 'usage',
    id: 'cat-usage-clients',
    keywords: ['各客户端', '客户端怎么配', '按客户端看', '哪个教程', '场景页'],
    q: '各客户端怎么配？找不到命令怎么办？',
    a: `按你用的客户端打开对应教程：Claude Code（编辑器插件与 CLI）、桌面版、Codex、WorkBuddy、Cursor 各有一条完整路径。

终端里 claude 找不到命令：先确认配置已启用，再重开终端；仍不行按 CLI 教程重装并检查 PATH。`,
    links: [
      { text: '教程索引', url: '/guide' },
      { text: '教程 · Claude Code CLI', url: '/guide/cli' },
      { text: '教程 · VS Code / Cursor 插件', url: '/guide/cc#cc-vscode' },
    ],
  },

  // ---------- 限速与报错 ----------
  {
    cat: 'limits',
    id: 'cat-limits-speed',
    featured: true,
    keywords: [
      '限速', '速率', '并发', '限制', '公平使用', 'fair use', '多少并发', '上限',
      '单窗口', '双窗口', '三窗口', '怎么选', '几个窗口', '多开', '子代理',
      '会话窗口', '一窗口', '两个窗口',
    ],
    q: '单窗口、双窗口、三窗口怎么选？',
    a: `套餐按时长计费，不按 token 计费；档位差别主要在「同时能开几个会话窗口」。

${limitBullets().join('\n')}

按你平时会同时开几个对话窗口（或几台电脑）选即可。`,
  },
  {
    cat: 'limits',
    id: 'cat-limits-429',
    keywords: ['429', '限流', 'rate limit', 'too many requests', 'retry-after', '请求太频繁', '被限速了', '要等多久', '429 要等多久', '限速了会怎样', '会不会被限速', '会限速吗', '正常用会限速吗', '重度使用会限速吗', '并发多少够用', '会丢请求吗'],
    q: '正常用会限速吗？碰到 429 怎么办？',
    a: `正常个人开发（编码、调试、审查、文档），以及单窗口下正常使用子代理，一般不会因为「用得多」被卡住。

短暂停顿多半是短时请求太猛——例如脚本死循环，或同时拉起多个子代理触发并发限制——不是额度用完。主流工具通常会自动重试，等一下再继续即可，任务上下文不会丢。不要立即循环重试。

若经常要同时开多个项目窗口，或经常并行多个子代理，换双窗口 / 三窗口档会更从容。`,
  },
  {
    cat: 'limits',
    id: 'cat-limits-401',
    keywords: ['401', 'unauthorized', 'invalid api key', 'invalid api', '鉴权失败', 'key 无效', 'key无效', 'key 不对'],
    q: '报 401 或提示 Key 无效怎么办？',
    a: `401 是鉴权失败，不是额度用完。按顺序查：

- 工具或环境变量里是否已换成提取后的新 Key（sk- 开头），旧进程是否还拿着旧 Key；
- 改完后是否重启了 Claude Code 或编辑器；
- Base URL 是否多带或漏了 /v1。

三处都对仍报 401，把账号标识与报错原文发给客服核对。`,
    links: [{ text: '联系我们', url: '/contact' }],
  },
  {
    cat: 'limits',
    id: 'cat-limits-login',
    keywords: ['登录不上', '登录失败', '连不上网关', '连接失败', 'error', 'error code', '不能用了', '一直报错', '报错', '用着用着不能用', '突然不能用', '打不开了'],
    q: '连不上网关或一直报错怎么排查？',
    a: `先看状态码再动手：

- 429：短时限流，等 Retry-After 或稍后再试，见「正常用会限速吗？碰到 429 怎么办」；
- 401：Key 或 Base URL 问题，见上一题；
- 403 且提示账户状态异常：可能被停用，联系客服并附上卡密尾号与报错原文。

仍不行就把卡密尾号、报错原文和发生时间发给人工客服。`,
    links: [
      { text: '碰到 429 怎么办', url: '/faq#cat-limits-429' },
      { text: '联系我们', url: '/contact' },
    ],
  },
  {
    cat: 'limits',
    id: 'cat-limits-forbidden',
    keywords: ['禁止', '不能做什么', '什么行为', '封号', '封禁', '滥用', '共享', '压测', '转卖', '批量', '能多人用吗', '能共享吗'],
    q: '哪些使用行为会被限制或停用？',
    a: `以下行为违反公平使用约定，会触发限制或停用：

- 把个人套餐当作生产流量入口，或多人共享同一把 Key；
- 每分钟成千上万次自动请求、死循环重试、无人值守脚本持续打满上下文；
- 压测、扫描、或批量数据抓取；
- 转卖、二次分发 Key。

正常个人开发（编码、调试、分析、文档、学习、原型）不会因为「用得多」被限制。`,
  },
  {
    cat: 'limits',
    id: 'cat-limits-down',
    keywords: [
      '可用率', 'sla', '稳定性', '宕机', '故障', '挂了', '稳定性保证', '稳定吗', '稳不稳',
      '稳定性有保障吗', '有保障吗', '服务挂了', '宕机了怎么办', '挂了怎么办',
    ],
    q: '服务完全挂了或不可用怎么办？',
    a: `服务依赖上游模型与公网，偶发抖动或维护时请先看站内公告与购买页通知。网关可用性、延迟不作数字承诺。

紧急故障（完全不可用）请联系客服，并附上卡密尾号与报错原文。`,
    links: [{ text: '联系我们', url: '/contact' }],
  },

  // ---------- 安全与联系 ----------
  {
    cat: 'safety',
    id: 'cat-security-train',
    keywords: ['训练', '用于训练', 'train', '微调', '拿去训练', '数据用途'],
    q: '我的对话内容会被用来训练模型吗？',
    a: `不会。你的请求内容仅用于完成本次 API 调用，不用于训练或二次利用。

调用会转发至上游模型供应商处理，上游对内容的处理适用其自身的隐私与数据政策。`,
  },
  {
    cat: 'safety',
    id: 'cat-security-store',
    keywords: ['存储', '存不存', '日志', '记录', '保存多久', '数据留存', '隐私', '留存', '会存储', '会保存', '会存我的对话吗', '对话会留存吗', '请求记录保留多久', '数据安全'],
    q: '请求内容会保存在你们这边吗？',
    a: `请求会经本站网关转发至上游完成调用；请勿在请求里提交与任务无关的敏感个人信息。

数据处理与隐私细则见「关于我们」页的隐私政策；有具体合规疑问可联系客服说明场景。`,
    links: [
      { text: '隐私政策', url: '/about#privacy' },
      { text: '联系我们', url: '/contact' },
    ],
  },
  {
    cat: 'safety',
    id: 'cat-about-contact',
    keywords: ['联系方式', '微信', '加微信', '微信号', '怎么联系你们', 'QQ群', 'QQ 群', '加群'],
    q: '使用中出问题了怎么联系人工客服？',
    a: `完整联系方式（微信二维码、微信号、QQ 群）在「联系我们」页；添加时请备注来意（售后 / 代理 / 商务）。也可点右下角在线助手，面板底部有「联系客服」入口。

紧急故障请附上账号标识与报错原文，处理更快。`,
    links: [{ text: '联系我们（二维码与微信号）', url: '/contact' }],
  },
]

/** 按分类分组，供 /faq 页与内嵌 FAQ 使用 */
export function faqByCategory(cat: FaqCategory): FaqItem[] {
  return faqItems.filter((x) => x.cat === cat)
}

/** 按 id 精选（营销页内嵌）；缺 id 时静默跳过，构建期靠条数断言兜底 */
export function faqByIds(ids: readonly string[]): FaqItem[] {
  return ids.map((id) => faqItems.find((x) => x.id === id)).filter((x): x is FaqItem => !!x)
}

/**
 * 营销页精选：按「本页意图」切片，不与五分类一一对应；全文主场仍是 /faq。
 * 首页 / 定价 / 模型 / 教程索引共用这里的 id 列表，JSON-LD 与页面组件都从这里取，避免漂移。
 */
export const buyingQuestionIds = [
  'cat-product-opus-fable-card',
  'cat-product-unlimited',
  'cat-product-period',
  'cat-limits-speed',
  'cat-product-refund',
] as const

export const pricingFaqIds = [
  'cat-product-opus-fable-card',
  'cat-product-price',
  'cat-product-unlimited',
  'cat-limits-speed',
  'cat-product-refund',
] as const

export const modelsFaqIds = [
  'cat-product-models',
  'cat-setup-model-switch',
  'cat-product-tools',
  'cat-setup-connect',
] as const

export const guideFaqIds = [
  'cat-product-tools',
  'cat-usage-clients',
  'cat-setup-ccswitch',
  'cat-setup-apikey',
] as const

export const buyingQuestions = faqByIds(buyingQuestionIds)
export const pricingFaqItems = faqByIds(pricingFaqIds)
export const modelsFaqItems = faqByIds(modelsFaqIds)
export const guideFaqItems = faqByIds(guideFaqIds)

/** 顺序：买前最关心 → 开通 → 日常 → 出问题 → 安全联系 */
export const faqCategories: FaqCategory[] = ['product', 'setup', 'usage', 'limits', 'safety']
