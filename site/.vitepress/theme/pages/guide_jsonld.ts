/**
 * 教程页的结构化数据（JSON-LD）生成器。
 *
 * 为什么单独一个文件：这份数据有两个消费方——
 *   1. 页面组件里的 <JsonLd>（客户端注入，做降级）；
 *   2. .vitepress/theme/pages/jsonld_server.ts（构建期直接写进产物 HTML，爬虫不执行 JS 只能看到这份）。
 * 两边必须产出同一份东西，所以生成逻辑只写在这里，两边各自 import。
 * 不能放在 pages/data.ts：那份 import 了 components/sections.ts（Vue 组件文件），
 * config.mts 在 Node 侧加载会拖进 SFC 编译器。
 *
 * 本文件只依赖 config/ 下的纯数据模块。
 */
import { guideIndex, guidePages, guideBlocks, guideSceneCards } from '../../../config/guide'
import type { GuidePage } from '../../../config/guide'

const BASE = 'https://claude-unlimited.aiautotools.com'

/**
 * 场景页：一个 HowTo（这条路径从头到尾怎么做）+ 一个 FAQPage（这个客户端的常见问题）。
 *
 * step 里的 name 取装配后的 h2（带「1. 」「2. 」序号），与页面上的小节标题一字不差，
 * 爬虫按 step 抓取时能对上原文。
 */
export function jsonLdGuideScene(page: GuidePage) {
  const blocks = guideBlocks(page)
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'HowTo',
        name: page.title,
        description: page.answer,
        url: BASE + page.slug,
        step: blocks.map((b, j) => ({
          '@type': 'HowToStep',
          position: j + 1,
          name: b.h2,
          text: b.lead ?? '',
        })),
      },
      {
        '@type': 'FAQPage',
        mainEntity: page.faq.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      },
    ],
  }
}

/** 索引页：CollectionPage + ItemList（5 个客户端各一条，AI 能据此判断该去哪个页面） */
export function jsonLdGuideIndex() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        name: guideIndex.title,
        description: guideIndex.answer,
        url: BASE + '/guide',
        isPartOf: { '@id': BASE + '/#site' },
        mainEntity: {
          '@type': 'ItemList',
          itemListElement: guideSceneCards().map((c, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            url: BASE + c.url,
            name: c.title,
            description: c.desc,
          })),
        },
      },
    ],
  }
}

/** 页脚「教程」列：索引页 + 5 个客户端页（每页的短名与一句话） */
export function guideFooterItems() {
  return [
    { title: guideIndex.title, nav: guideIndex.title, url: '/guide', desc: guideIndex.desc, eyebrow: '教程' },
    ...guidePages.map((p) => ({
      title: p.nav,
      nav: p.nav,
      url: p.slug,
      desc: p.summary,
      eyebrow: '教程',
    })),
  ]
}
