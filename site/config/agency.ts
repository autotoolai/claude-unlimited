/**
 * Token 代理页 —— /agency 招商页的唯一数据源。
 *
 * 本页侧重「为什么值得做 Token 代理」：无押金、复购、长期副业、教学答疑。
 * 转化只走微信（siteConfig.contact），备注「代理」；合作细节加微后沟通，
 * 本站不讲拿货操作、不放代理后台外链。
 * SEO/GEO 主场：对外名称一律「Token 代理」；keywords / FAQ 保留「rsxermu666 代理」作搜索别名。
 * 裸词 rsxermu666 / rsxermu666.cn 仍归 /console。可见 H1 不塞域名。
 */

export interface AgencyAudience {
  title: string
  desc: string
}

export interface AgencyBenefit {
  title: string
  desc: string
}

export interface AgencyMindset {
  title: string
  desc: string
}

/** document title / og:title / JSON-LD WebPage.name 同口径；页面名用 Token 代理 */
export const agencyPageTitle = 'Token 代理 · Claude 无限卡'

/** per-page keywords（config.mts transformHead 注入）；长尾词，不是堆砌 */
export const agencyTags: string[] = [
  'Token 代理',
  'Claude 无限卡代理',
  'rsxermu666 代理',
  '无限卡渠道合作',
  'Claude API 卡密代理',
]

/** 与 description / JSON-LD / llms 同口径的一句话定义（首句可被 GEO 引用） */
export const agencyLead =
  '无押金起步，客户复购稳定，适合长期副业；没有经验也能做，我们提供基础 Agent 用法教学与答疑。加微信备注「代理」了解合作。'

/** 3 条铺满默认三列网格；与上方 6 条「为什么值得做」错开密度，只做对号入座 */
export const agencyAudiences: AgencyAudience[] = [
  {
    title: '社群与私域',
    desc: '已有学习群、兴趣群或私域客户，成员要办公、写论文、用 AI，你来稳定供货。',
  },
  {
    title: '闲鱼与渠道',
    desc: '本来就在卖 AI 相关服务，想多一条靠谱货源；客户用完还会回来续。',
  },
  {
    title: '个人做副业',
    desc: '不一定懂技术，但愿意花时间对接客户；基础用法与答疑我们帮你补。',
  },
]

export const agencyBenefits: AgencyBenefit[] = [
  {
    title: '无押金，轻起步',
    desc: '不做押金门槛，谈妥就能开始；适合先小做验证，再按自己节奏放大。',
  },
  {
    title: '需求广，能长做',
    desc: '办公写作、论文研习、编程开发、内容创作都在用 AI；刚需持续，不是一波热度。',
  },
  {
    title: '有周期，易复购',
    desc: '卡密有使用周期，用完还会再买；养好一批客户后，续单比冷启动轻松得多。',
  },
  {
    title: '数字化，免囤货',
    desc: '发的是卡密，没有库存、物流和压货；客户要再对接，不用提前囤一批。',
  },
  {
    title: '零基础，能上手',
    desc: '提供基础用法教学与答疑；你负责获客对接，上手路径我们帮你补齐。',
  },
  {
    title: '人群广，增速快',
    desc: '学生、职场、创作者到开发者都在用；用的人还在涨，额度刚需跟着放大。',
  },
]

/** 申请区右侧：心态建议，编号列表；与左侧二维码并排，不跟上方卖点卡同构 */
export const agencyMindsets: AgencyMindset[] = [
  {
    title: '别想暴富',
    desc: 'Token 代理是细水长流的生意，客户和口碑都要时间沉淀。',
  },
  {
    title: '先做起来',
    desc: '别等万事俱备再开工；先接单、先服务，边做边优化。',
  },
  {
    title: '真诚优先',
    desc: '真心帮客户把问题解决好，信任和转介会自然跟上。',
  },
  {
    title: '持续学习',
    desc: 'AI 用法与场景变化快，跟得上节奏，答疑才更有底。',
  },
  {
    title: '长期主义',
    desc: '把客户当朋友来服务，别做成一锤子买卖。',
  },
]

/** 页内 FAQ（不进全站 /faq 主分类）；结构对齐 consoleFaqs，供 FaqList + JSON-LD */
export const agencyFaqs = [
  {
    id: 'agency-what',
    q: 'Token 代理是什么？',
    a: '把 Claude 无限卡卡密卖给自己的客户，我们提供货源与基础用法答疑。加微信备注「代理」即可了解合作。',
  },
  {
    id: 'agency-deposit',
    q: '需要押金吗？',
    a: '不需要。无押金起步，具体合作方式加微信备注「代理」后沟通即可。',
  },
  {
    id: 'agency-skill',
    q: '没有技术经验可以做吗？',
    a: '可以。代理侧主要是获客与对接客户；基础 Agent 用法我们提供教学答疑，客户配置也可转发官网教程与 FAQ。',
    links: [
      { text: '使用教程', url: '/guide' },
      { text: '常见问题', url: '/faq' },
    ],
  },
  {
    id: 'agency-why',
    q: '为什么适合当副业？',
    a: '数字化交付、无押金、客户有自然复购，时间安排相对灵活；需求来自办公、学习、创作与开发等真实 AI 使用场景，而不是短期噱头。',
  },
]
