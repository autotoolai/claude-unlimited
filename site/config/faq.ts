import { partnerUrl } from './site'

/**
 * FAQ 唯一数据源 —— 同时驱动：
 *   1. /faq 页面（FaqList 组件）
 *   2. 首页 / pricing / unlimited 的内嵌 FAQ
 *   3. KefuWidget 关键词助手（经 kefu.data.ts 构建期预处理）
 *   4. /faq 页的 FAQPage JSON-LD
 *
 * 2026-10-09 新增「使用与配置」分类（setup）：教程来源为卖家教程站 https://wx.bbyy.site/，
 * 问题按买家「买完之后做什么」重写，答案里给 /guide/* 的链接。
 *
 * 改一处，四处同步，不会出现「页面写的和机器人答的不一样」。
 *
 * 差异化重点：「限速与封号」的退款与申诉、「购买与支付」的退款规则 ——
 * 竞品全站不给具体速率数字，FAQ 也不涉及退款和申诉。
 *
 * 写作规范：a 的第一句必须是结论；多段用换行分隔（模板字符串里直接换行）。
 * 不要在 a 里用 Markdown，渲染器只处理纯文本 + links + code。
 *
 * TODO R10：涉及退款、申诉、隐私的答案需法务确认后再上线。
 */

export type FaqCategory = 'product' | 'purchase' | 'setup' | 'usage' | 'limits' | 'security' | 'about'

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
}

export const categoryLabels: Record<FaqCategory, string> = {
  product: '关于商品',
  purchase: '购买与支付',
  setup: '使用与配置',
  usage: '接入与使用',
  limits: '限速与封号',
  security: '数据与安全',
  about: '关于我们',
}

export const faqItems: FaqItem[] = [
  // ---------- 关于商品 ----------
  {
    cat: 'product',
    id: 'cat-product-official',
    keywords: ['官方', 'anthropic', '是不是官方', '正品', '真假', '和anthropic什么关系'],
    q: '你们是 Anthropic 官方吗？',
    a: '不是：本站是独立的第三方 API 网关服务，与 Anthropic 无隶属关系、未获其背书或赞助。Claude 与 Anthropic 是 Anthropic, Inc. 的商标，本站仅通过兼容接口转发起调用。',
  },
  {
    cat: 'product',
    id: 'cat-product-unlimited',
    keywords: ['无限', '无限额度', '不限量', '到底无限', '什么意思', '是不是真无限', 'token限制', '额度上限'],
    q: '「无限额度」到底无限到什么程度？',
    a: `订阅期内不按 token 计费：你发起的每次调用，无论消耗 1 千还是 20 万 token，都包含在订阅价里。

但「无限」不等于「无限制并发、无限制吞吐、无限制压测」——服务需要保证所有用户都能稳定访问，因此会有公平使用的速率与并发限制。取消的是按 token 计费压力，不是工程上的流控机制。`,
    links: [{ text: '查看限速具体数字', url: '/faq#cat-limits-speed' }],
  },
  {
    cat: 'product',
    id: 'cat-product-models',
    keywords: ['模型', '支持哪些模型', 'opus', 'sonnet', 'haiku', 'fable', '版本', '新模型'],
    q: '支持哪些模型？新模型上线要换 Key 吗？',
    a: `覆盖当前 Claude 主要模型层级：Opus、Sonnet、Haiku、Fable，均在同一订阅价内，不因选择 Opus 产生额外费用。

常见的具体型号有 claude-opus-4-8（复杂推理）、claude-sonnet-5（日常主力）、claude-fable-5（创意写作），建议至少把这三个加进 CC Switch。

Anthropic 发布新版本后，网关会以新的 model identifier 提供访问。你的 Key 不需要重新生成，只需在工具配置里把 model ID 更新为最新版本。`,
    links: [{ text: '模型与切换', url: '/guide/models' }],
  },
  {
    cat: 'product',
    id: 'cat-product-tools',
    keywords: ['工具', '支持什么工具', 'claude code', 'cursor', 'cline', 'roo code', 'aider', 'continue', '客户端', '编辑器'],
    q: '支持哪些客户端和工具？',
    a: `凡是能接 Anthropic 或 OpenAI 兼容接口的都能用，包括：Claude Code、Cursor、Cline、Roo Code、Aider、Continue、Zed、JetBrains、VS Code，以及官方 Python / TypeScript / Go SDK。

接入方式是改一个 Base URL 加一个 Key，不要求你重写业务逻辑，也不要求放弃现有 SDK。`,
    // 「接入指南」页二期上线后再加链接：一期保持纯文本，避免死链
  },
  {
    cat: 'product',
    id: 'cat-product-period',
    keywords: ['有效期', '多久', '天数', '到期', '过期', '续费', '自动续费', '30天'],
    q: '有效期怎么算？到期会怎样？',
    a: `从支付成功起算对应周期（当前套餐 30 天）。到期后访问权限结束，不自动续费，需要重新下单。

到期前会在站内提示。若购买多张卡，卡密独立计算有效期，不合并。`,
  },

  // ---------- 购买与支付 ----------
  {
    cat: 'purchase',
    id: 'cat-purchase-where',
    keywords: ['在哪买', '怎么购买', '下单', '购买链接', '去哪里买', '发卡', '卡密'],
    q: '在哪里买？',
    a: `本站只做介绍与答疑，不处理支付。下单在官方发卡站完成：商品页选规格 → 付款 → 自动获取卡密。

点任意「立即购买」按钮会直接跳转到发卡站。`,
    links: [{ text: '前往下单页', url: 'https://catfk.com/shop/2Z0CEP7C', external: true }],
  },
  {
    cat: 'purchase',
    id: 'cat-purchase-pay',
    keywords: ['支付', '付款', '怎么付', '支付宝', '微信', 'paypal', '信用卡', '付款方式'],
    q: '支持哪些付款方式？',
    a: `发卡站支持的付款方式以其页面为准。下单成功后系统自动发货卡密，不需要人工审核、不需要排队等待。`,
  },
  {
    cat: 'purchase',
    id: 'cat-purchase-delivery',
    keywords: ['多久到账', '发货', '到账', '多久', '瞬间', '立即', '卡密什么时候'],
    q: '买完多久能用？',
    a: `通常是分钟级。支付成功后卡密自动生成，拿到后在接入页兑换成额度即可，不存在等待名单或人工审核期。`,
    // 「接入指南」页二期上线后再加链接
  },
  {
    cat: 'purchase',
    id: 'cat-purchase-refund',
    keywords: ['退款', '退', '能退吗', '退钱', '不想要了', '未激活', '售后', '投诉'],
    q: '能退款吗？',
    a: `可以，但仅限以下情形，需在购买后 7 个自然日内提出，并提供卡密尾号与订单号：

1. 卡密未激活、无法兑换；
2. 兑换后因网关故障导致服务连续不可用超过 24 小时；
3. 实际提供的模型或能力与本页描述明显不符。

已激活并正常使用的卡密、以及因个人使用习惯产生的「买多买少」，不支持无理由退款。审核结果 3 个工作日内通过你留下的联系方式反馈。`,
    code: ['申请时提供：订单号 / 卡密尾号 / 问题描述 / 截图'],
  },
  {
    cat: 'purchase',
    id: 'cat-purchase-invoice',
    keywords: ['发票', '开票', '合同', '企业', '报销'],
    q: '能开发票或签合同吗？',
    a: `个人购买默认不提供发票。企业用户需要发票或签合同，请在购买前联系客服说明主体信息与开票需求，确认后再下单。`,
  },

  // ---------- 使用与配置（教程来源：卖家教程站 https://wx.bbyy.site/，按问答重写；链接指向 /guide/*） ----------
  {
    cat: 'setup',
    id: 'cat-setup-ccswitch',
    keywords: ['ccswitch', 'cc switch', '配置软件', '配置工具', '导入配置', '一键导入'],
    q: 'CC Switch 是什么？必须装吗？',
    a: `CC Switch 是一个专门管理 Claude Code、Codex、Gemini API 供应商配置的小工具（Windows / macOS，安装包不到 10 MB），支持一键导入、获取模型列表、链路检测。

小白强烈建议装：配置一次，Claude Code、终端、VS Code 全部生效。高手可以跳过，用环境变量直接配也完全可行。`,
    links: [{ text: 'CC Switch 官网', url: partnerUrl('ccswitch') || 'https://ccswitch.io/', external: true }],
  },
  {
    cat: 'setup',
    id: 'cat-setup-apikey',
    keywords: ['apikey', 'api key', '密钥', '在哪拿', '怎么拿', 'base url', '网关地址', '地址', '兑换'],
    q: 'API Key 和 Base URL 在哪里拿？',
    a: `在「卡密兑换与 API Key」页面粘贴买到的卡密兑换额度，同一页会给出两行信息：

1. Base URL：网关根地址（不带 /v1），Claude Code 和 Anthropic SDK 填这个；
2. API Key：sk- 开头的字符串，等同于官方 Key 的用法。

这两行复制下来就能配。`,
    links: [{ text: '五步教程', url: '/guide' }],
  },
  {
    cat: 'setup',
    id: 'cat-setup-import',
    keywords: ['一键导入', '导入', '导入配置', '点击没反应', '导入失败'],
    q: '「一键导入配置」点了没反应怎么办？',
    a: `多数情况是 CC Switch 还没启动：先打开 CC Switch，再回到兑换页点「一键导入配置」，导入窗口会自动弹出，Base URL 和 API Key 已填好，确认后保存。

同名配置会覆盖，不会叠加。`,
    links: [{ text: '五步教程', url: '/guide#workflow' }],
  },
  {
    cat: 'setup',
    id: 'cat-setup-models',
    keywords: ['获取模型', '模型列表', '高级选项', '添加模型', '模型为空', '没有模型'],
    q: '在 CC Switch 里怎么获取模型列表？推荐加哪些？',
    a: `在 CC Switch 里进入已导入的 Claude 配置，点「高级选项」→「获取模型列表」，会列出网关实际可用的模型。

建议至少添加三个：claude-opus-4-8（复杂推理）、claude-sonnet-5（日常主力）、claude-fable-5（创意写作）。勾选后一定点「保存」。

列表为空通常是 Base URL 或 Key 填错，回上一步核对。`,
    links: [
      { text: '模型与切换', url: '/guide/models' },
      { text: 'CC Switch 详解', url: '/guide/ccswitch' },
    ],
  },
  {
    cat: 'setup',
    id: 'cat-setup-enable',
    keywords: ['启用', '检测链路', '链路', '检测', '启用配置', '生效'],
    q: '「启用」和「检测链路」是做什么的？',
    a: `「启用」把这份配置设为当前生效的供应商，终端里的 claude、VS Code 里的 Claude Code 插件都会指向它。

「检测链路」发一次测试请求确认网关可达，显示正常就配置完成。检测失败先看第 4、5 步的截图与排错清单。`,
    links: [{ text: '排错清单', url: '/guide/ccswitch#troubleshoot' }],
  },
  {
    cat: 'setup',
    id: 'cat-setup-vscode',
    keywords: ['vscode', 'vs code', '插件', '扩展', '侧边栏', '编辑器插件'],
    q: 'VS Code 里怎么用 Claude Code？',
    a: `CC Switch 配好后，在 VS Code 扩展面板（Ctrl+Shift+X / Cmd+Shift+X）搜索 Claude Code，认准发布者为 Anthropic 的官方插件并安装。首次打开选择「使用已有的 API 配置 / API Key」登录，不需要登录 Anthropic 账号。`,
    links: [{ text: '接入与模型', url: '/guide/clients#vscode' }],
  },
  {
    cat: 'setup',
    id: 'cat-setup-model-switch',
    keywords: ['切换模型', 'model 指令', '/model', '换模型', '切模型', 'fable', 'sonnet', 'opus'],
    q: '怎么切换模型？新模型上线要换 Key 吗？',
    a: `在 Claude Code 会话里输入 /model 打开列表，或直接输入 /model claude-fable-5 切到指定模型。

所有模型都在同一订阅价内，选 Opus 不会多花钱。Anthropic 上线新模型后网关会以新的 model ID 提供访问，Key 不需要换，只要在 CC Switch 里刷新模型列表再 /model 切过去。`,
    code: ['/model', '/model claude-fable-5'],
    links: [{ text: '模型与切换', url: '/guide/models' }],
  },
  {
    cat: 'setup',
    id: 'cat-setup-claude-command',
    keywords: ['claude 命令', '终端', '命令行', 'cmd', 'powershell', '打不开', '找不到命令'],
    q: '终端里输入 claude 命令没反应 / 找不到命令？',
    a: `先确认 CC Switch 里配置处于「已启用」状态，再重开一个终端窗口。

如果仍然找不到命令，看「接入与模型」页的 VS Code / 终端部分，Windows 上可以在 PowerShell 里直接运行 claude。`,
    links: [{ text: '接入与模型', url: '/guide/clients' }],
  },

  // ---------- 接入与使用 ----------
  {
    cat: 'usage',
    id: 'cat-usage-baseurl',
    keywords: ['base url', 'baseurl', '地址', 'url', '接口地址', '填什么', '怎么填', '配置'],
    q: 'Base URL 填什么？',
    a: `Anthropic SDK 和 Claude Code：填网关根地址（不含 /v1），SDK 会自己拼 /v1/messages。
OpenAI SDK、LangChain、LiteLLM、Cursor：填带 /v1 的地址，它会拼 /v1/chat/completions。

大多数接入失败都是 Base URL 填错——尤其是 /v1 后缀漏填或多填。`,
    code: [
      '# Anthropic SDK / Claude Code：填根地址，不带 /v1',
      'ANTHROPIC_BASE_URL=<网关根地址>',
      'ANTHROPIC_API_KEY=<你的 Key>',
      '',
      '# OpenAI SDK / Cursor / LangChain：多一个 /v1',
      'OPENAI_BASE_URL=<网关根地址>/v1',
      'OPENAI_API_KEY=<你的 Key>',
    ],
    // 「接入指南」页二期上线后再加链接：一期保持纯文本，避免死链
  },
  {
    cat: 'usage',
    id: 'cat-usage-claudecode',
    keywords: ['claude code', 'cc', '命令行', 'cli', '终端', 'anthropic code', 'claude_code'],
    q: '怎么接入 Claude Code？',
    a: `四步：装 Claude Code → 设两个环境变量（Base URL + Key）→ 验证生效 → 正常用。

设环境变量有三种方式（终端临时、写入 shell 配置、全局生效），Windows / macOS / Linux 命令不同，详见接入指南。`,
    code: ['export ANTHROPIC_BASE_URL=<网关根地址>', 'export ANTHROPIC_API_KEY=<你的 Key>'],
    // 「接入指南」页二期上线后再加链接
  },
  {
    cat: 'usage',
    id: 'cat-usage-openai',
    keywords: ['openai', '兼容', 'sdk', 'python', 'typescript', 'go', '开发', 'api'],
    q: '支持 OpenAI 兼容接口吗？',
    a: `支持。网关同时提供 Anthropic 兼容端点和 OpenAI 兼容端点（/v1/chat/completions），现有 OpenAI SDK 代码只需改 Base URL 即可跑，不必重写。

流式响应、工具调用、扩展思考、视觉输入、长上下文等 Anthropic API 主要能力均透传。`,
  },
  {
    cat: 'usage',
    id: 'cat-usage-renew',
    keywords: ['换key', '换 key', '换卡', '更新key', '重新配置', 'key过期', '换绑'],
    q: '怎么换 Key 或换套餐？',
    a: `兑换新卡密后在同一个账号下激活即可；若工具里报 401，先确认环境变量里的 Key 已是新的，再重启 Claude Code 或编辑器使配置生效。

Key 不需要因为模型升级而更换——新模型上线只改 model ID。`,
    // 「报错自救」页二期上线后再加链接
  },
  {
    cat: 'usage',
    id: 'cat-usage-context',
    keywords: ['上下文', 'context', '200k', '1m', '长文本', 'token', '窗口', '最大'],
    q: '上下文窗口多大？',
    a: `标准为 200k token 长上下文窗口，适合读取大型代码片段、分析长日志、处理技术 PDF。

部分模型提供 1M 窗口档位，需要在工具里显式选择该变体；选错会出现「该模型需要额外用量」类提示。`,
  },

  // ---------- 限速与封号（差异化重点） ----------
  {
    cat: 'limits',
    id: 'cat-limits-speed',
    keywords: ['限速', '速率', '并发', 'rps', 'tpm', 'rpm', '限制', '公平使用', 'fair use', '多少并发', '上限'],
    q: '限速和并发的具体数字是多少？',
    a: `为保证所有用户稳定访问，网关设有公平使用速率限制，具体数值会随上游容量调整：

- 单 Key 并发：默认 20 路，可按需申请提升；
- 请求速率：默认 60 次/分钟；
- Token 吞吐：默认 300k token/分钟。

对编码、调试、代码审查、文档生成、agent 多步执行这类正常个人开发场景，上述数值通常不构成障碍。数字调整时会公告。`,
    // 「公平使用与限制」页二期上线后再加链接：一期保持纯文本，避免死链
  },
  {
    cat: 'limits',
    id: 'cat-limits-429',
    keywords: ['429', '限流', 'rate limit', 'too many requests', 'retry-after', '请求太频繁', '被限速了'],
    q: '遇到 429 怎么办？',
    a: `429 表示触发了速率限制，不是额度用完。网关会返回 Retry-After 头，告诉你需要等多少秒。

Claude Code、Cursor、Cline、Aider 等主流工具都有内置重试逻辑，会自动等待后重新发起，请求可能短暂停顿但不会丢失任务上下文。手工处理时：等待 Retry-After 指定的秒数再重试，不要立即循环重试。`,
  },
  {
    cat: 'limits',
    id: 'cat-limits-forbidden',
    keywords: ['禁止', '不能做什么', '什么行为', '封号', '封禁', '滥用', '共享', '压测', '转卖', '批量'],
    q: '哪些行为会被限制或停用？',
    a: `以下行为违反公平使用约定，会触发限制或停用：

- 把个人套餐当作生产流量入口，或用于多用户共享调用；
- 每分钟成千上万次自动请求、死循环重试、无人值守脚本持续打满上下文；
- 压测、扫描、或批量数据抓取；
- 转卖、二次分发 Key。

正常个人开发（编码、调试、分析、文档、学习、原型）不会因为「用得多」被限制。`,
  },
  {
    cat: 'limits',
    id: 'cat-limits-appeal',
    keywords: ['申诉', '被限制了', '恢复了', '复通', '怎么解除', '投诉限制', '误判'],
    q: '被限制了怎么申诉？',
    a: `先看返回的错误类型：429 是速率限制，等待 Retry-After 后自动恢复，不需要申诉。

如果是账号被停用（返回 403 且提示账户状态异常），请联系客服并提供：账号标识、卡密尾号、被限制的时间点、当时的请求类型。核实后 1 个工作日内给结论；确属误判会立即解除并补足受影响时段。`,
  },

  // ---------- 数据与安全 ----------
  {
    cat: 'security',
    id: 'cat-security-store',
    keywords: ['存储', '存不存', '日志', '记录', '保存多久', '数据留存', '隐私'],
    q: '我的请求内容会被存储吗？',
    a: `我们以提供服务与排查故障所必需的限度记录用量元数据（调用时间、模型、状态、消耗、请求标识），不记录你的 prompt 正文与模型输出。

请不要在请求中提交与任务无关的敏感个人信息。`,
  },
  {
    cat: 'security',
    id: 'cat-security-train',
    keywords: ['训练', '用于训练', 'train', '微调', '拿去训练', '数据用途'],
    q: '我的内容会被用于训练模型吗？',
    a: `不会。你的请求内容仅用于完成本次 API 调用，不用于训练或二次利用。

调用会转发至上游模型供应商处理，上游对内容的处理适用其自身的隐私与数据政策。`,
  },
  {
    cat: 'security',
    id: 'cat-security-leak',
    keywords: ['key泄露', '泄露', '被盗', '盗用', 'key 安全', '换key', '异常调用'],
    q: 'Key 泄露了怎么办？',
    a: `立即在兑换页作废该 Key 并重新兑换，然后把新 Key 只放在环境变量里，不要写进代码仓库或前端代码。

发现未经授权的调用时，联系客服并提供账号标识与大致时间区间，我们会协助排查并作废。`,
  },

  // ---------- 关于我们 ----------
  {
    cat: 'about',
    id: 'cat-about-who',
    keywords: ['你们是谁', '主体', '公司', '运营', '谁在卖', '团队'],
    q: '你们是谁？',
    a: `本站由独立的 API 网关服务运营方提供，用于 Claude 系列模型的统一接入与订阅销售。站点本身只做介绍与答疑，不处理支付、不保存账号。`,
  },
  {
    cat: 'about',
    id: 'cat-about-contact',
    keywords: ['联系', '客服', '联系方式', '邮箱', 'qq', 'telegram', '微信', '找人'],
    q: '怎么联系你们？',
    a: `点右下角的在线助手，它内置了常见问题的关键词速答；答不上来可以直接留邮箱或 QQ 人工联系。

紧急故障（服务完全不可用）请附上账号标识与报错原文，能显著加快处理。`,
  },
  {
    cat: 'about',
    id: 'cat-about-sla',
    keywords: ['可用率', 'sla', '稳定性', '宕机', '故障', '挂了', '不能用了', '稳定性保证'],
    q: '稳定性有保障吗？',
    a: `网关通过多上游账号智能路由与自动故障转移来提升可用性，目标可用率 99.9%。但服务依赖上游模型供应商与公网，我们不对不中断作绝对保证。

发生维护或故障会在站内公告页与购买页同步通知。`,
    // 「服务状态」页二期上线后再加链接
  },
]

/** 按分类分组，供 /faq 页与内嵌 FAQ 使用 */
export function faqByCategory(cat: FaqCategory): FaqItem[] {
  return faqItems.filter((x) => x.cat === cat)
}

export const faqCategories: FaqCategory[] = ['product', 'purchase', 'setup', 'usage', 'limits', 'security', 'about']