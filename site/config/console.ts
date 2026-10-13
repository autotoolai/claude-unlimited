/**
 * 管理后台功能说明 —— /console 介绍页与首页合作平台卡的唯一数据源。
 *
 * 后台是独立 SPA（Element Plus），本文件只写「这是什么 / 什么时候用」，
 * 不做截图，避免后台改版后官网图文脱节。入口地址取 config/site.ts 的 partners.console。
 */

export interface ConsoleFeature {
  /** 卡片图标位里的两字缩写 */
  mark: string
  name: string
  /** 这是什么 */
  what: string
  /** 什么时候用 */
  when: string
}

export const consoleFeatures: ConsoleFeature[] = [
  {
    mark: '面板',
    name: '我的面板',
    what: '后台首页。粘贴激活码完成兑换，看套餐状态（正常 / 未激活 / 已禁用 / 已过期 / 已退款）、计费方式、已消费额度和最新公告。',
    when: '买完卡密后的第一站，也是随时查套餐状态的地方。',
  },
  {
    mark: '提取',
    name: '提取 Key',
    what: '把激活码兑换成专属 API Key（sk- 开头），复制后填进 Claude Code、Cursor、CC Switch。Key 在首次发起 API 请求时自动激活。',
    when: '拿到激活码后换 Key；Key 泄露或想换一把时重新提取。',
  },
  {
    mark: '详情',
    name: 'Key 详情',
    what: '查看单个 Key 的状态、计费方式、已消费额度与到期时间，支持提前刷新额度。',
    when: '怀疑额度或有效期算错了、想确认这把 Key 具体能用多久。',
  },
  {
    mark: '用量',
    name: '查询用量',
    what: '按时间查询每一次请求用了什么模型、输入 / 输出 Token、缓存命中 Token、成功或失败、累计费用。',
    when: '对账、排查某次调用为什么失败、看周期卡或额度卡还剩多少额度。',
  },
  {
    mark: '图表',
    name: '用量图表',
    what: '按时间、按额度、时间 + 额度三种口径看每日 Token 消耗、费用趋势和模型使用分布。',
    when: '想看自己一个月的使用分布，决定要不要升级档位。',
  },
  {
    mark: '教程',
    name: '使用教程',
    what: '后台内建的一键配置：给出 Claude Code / Codex CLI / Cursor 的完整配置文本，以及「一键导入配置」按钮，自动写入 apiKey、baseURL 与 settings.json / config.toml。',
    when: '装了 CC Switch（≥ v3.7.0）后点一下就能配好，不用手抄字段。',
  },
  {
    mark: '生图',
    name: 'GPT 图像生成',
    what: '文生图与图生图，带独立 Playground，可调图片尺寸与质量。',
    when: '需要生成配图、封面或效果图时。',
  },
  {
    mark: '公告',
    name: '公告',
    what: '服务变更、模型上线、限速调整与活动通知，带发布时间。',
    when: '模型列表对不上、限速数字变了，先看公告。',
  },
  {
    mark: '主题',
    name: '界面与主题',
    what: '侧栏可折叠，亮色 / 暗色主题切换，设置记在本机浏览器里。',
    when: '纯粹顺手，不是必须。',
  },
]

/** 备用域名：主域名被运营商屏蔽或网络抖动时切换，API Key 无需更换 */
export const consoleBackupDomains: string[] = ['bxcv.store']

/** 后台常见问题（/console 页底部 FaqList） */
export const consoleFaqs = [
  {
    id: 'console-key-where',
    q: '后台要注册账号吗？',
    a: '不用。激活码本身就是凭证，粘贴到「我的面板」或「提取 Key」页面即可使用。',
  },
  {
    id: 'console-import-fail',
    q: '点「一键导入配置」没反应？',
    a: '多半是 CC Switch 没启动，或版本低于 v3.7.0。先打开 CC Switch 再点；浏览器拦截第二次唤起时，页面会把导入链接复制下来，手动粘贴到 CC Switch 即可。',
  },
  {
    id: 'console-domain',
    q: '主域名连不上怎么办？',
    a: '后台「使用教程」页有实时连通性检测。主域名访问异常时切换到标记为「备用域名」的地址，API Key 无需更换。',
  },
  {
    id: 'console-key-lost',
    q: 'Key 忘了或页面刷新后找不到了？',
    a: '激活码、已提取的 Key 和用量记录都保存在管理后台里。用同一把激活码回到「提取 Key」页面或「Key 详情」就能再看，不需要重新购买。建议第一次提取时就复制一份存进密码管理器。',
  },
  {
    id: 'console-refresh-key',
    q: 'Key 泄露了怎么办？',
    a: '到「提取 Key」用同一把激活码重新提取一把新的，旧的不再使用。提取次数与费用以发卡站商品说明为准。',
  },
  {
    id: 'console-infinite',
    q: '无限卡在后台显示什么？',
    a: '显示「无额度 / 时间上限」，用量页只有 token 与请求数的统计，不产生按次费用。',
  },
]
