/**
 * 管理后台功能说明 —— /console 功能介绍页的唯一数据源。
 *
 * 后台是独立 SPA（Element Plus），本文件写「能做什么 / 怎么上手」，
 * 不做截图，避免后台改版后官网图文脱节。入口地址取 config/site.ts 的 partners.console。
 * 本页是 rsxermu666 搜索主场：title/meta/FAQ/CTA 主机名带品牌；
 * 可见 H1 不塞域名；lead 首句点明 rsxermu666.cn 官方身份（与 FAQ 首条、llms 事实要点同口径）。
 */

/** per-page keywords（config.mts transformHead 注入）；长尾词，不是堆砌 */
export const consoleTags: string[] = [
  'rsxermu666',
  'rsxermu666.cn',
  'claude 无限卡管理后台',
  '卡密兑换',
  'api key 提取',
]

/** 买完卡密后的上手路径（/console 三步） */
export interface ConsoleStep {
  n: string
  title: string
  blurb: string
}

export const consoleSteps: ConsoleStep[] = [
  {
    n: '01',
    title: '粘贴激活码',
    blurb: '打开后台「我的面板」，粘贴卡密完成兑换，看套餐状态与公告。',
  },
  {
    n: '02',
    title: '提取 API Key',
    blurb: '到「提取 Key」拿到 sk- 开头的专属 Key；首次发起请求时自动激活。',
  },
  {
    n: '03',
    title: '一键导入配置',
    blurb: '「使用教程」页一键写入 Claude Code / Cursor / CC Switch（需 ≥ v3.7.0）。',
  },
]

export interface ConsoleFeature {
  /** 卡片图标位里的两字缩写 */
  mark: string
  name: string
  /** 一句说明 */
  blurb: string
}

export const consoleFeatures: ConsoleFeature[] = [
  {
    mark: '面板',
    name: '我的面板',
    blurb: '兑换激活码，看套餐状态、计费方式、已消费额度与最新公告。',
  },
  {
    mark: '提取',
    name: '提取 Key',
    blurb: '把激活码换成专属 API Key，复制后填进 Claude Code、Cursor、CC Switch。',
  },
  {
    mark: '详情',
    name: 'Key 详情',
    blurb: '查看单把 Key 的状态、额度、到期时间，支持提前刷新额度。',
  },
  {
    mark: '用量',
    name: '查询用量',
    blurb: '按时间查每次请求的模型、Token、缓存命中、成败与累计费用。',
  },
  {
    mark: '图表',
    name: '用量图表',
    blurb: '按时间 / 额度看每日消耗、费用趋势与模型分布。',
  },
  {
    mark: '教程',
    name: '使用教程',
    blurb: '给出完整配置文本，并支持一键导入到本机客户端。',
  },
  {
    mark: '生图',
    name: 'GPT 图像生成',
    blurb: '文生图与图生图 Playground，可调尺寸与质量。',
  },
  {
    mark: '公告',
    name: '公告',
    blurb: '服务变更、模型上线、限速调整与活动通知。',
  },
]

/** 备用域名：主域名被运营商屏蔽或网络抖动时切换，API Key 无需更换 */
export const consoleBackupDomains: string[] = ['bxcv.store']

/** 后台常见问题（/console 页底部 FaqList）；首条点明品牌域名，其余偏操作 */
export const consoleFaqs = [
  {
    id: 'console-what-is-rsxermu666',
    q: 'rsxermu666.cn 是什么？',
    a: 'rsxermu666.cn 是 Claude 无限卡官方管理后台与 API 网关。本页是功能介绍；兑换激活码、提取 API Key、导入配置与查用量在 rsxermu666.cn 完成。主域名不可达时可用页内备用域名，API Key 无需更换。',
  },
  {
    id: 'console-vs-official-site',
    q: '管理后台和官网是什么关系？',
    a: '官网负责介绍、定价、教程与答疑；管理后台（rsxermu666.cn）负责兑换、提 Key、导入配置与查用量。卡密按官网指引购买，进后台完成操作。两者同属 Claude 无限卡官方服务。',
  },
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
    id: 'console-infinite',
    q: '无限卡在后台显示什么？',
    a: '显示「无额度 / 时间上限」，用量页只有 token 与请求数的统计，不产生按次费用。',
  },
]
