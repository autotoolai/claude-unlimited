import DefaultTheme from 'vitepress/theme'
import './styles/00_base.css'
import './styles/01_shell.css'
import './styles/01_shell_toc.css'
import './styles/02_hero.css'
import './styles/03_buttons.css'
import './styles/05_cards.css'
import './styles/06_steps.css'
import './styles/07_pricing_card.css'
import './styles/08_tables.css'
import './styles/09_figures.css'
import './styles/10_faq.css'
import './styles/11_trust.css'
import './styles/12_kefu.css'
import './styles/13_layout_tail.css'
import './styles/14_knowledge.css'
import './styles/15_models.css'
import './styles/16_plans.css'
import './styles/17_console.css'
import type { Theme } from 'vitepress'
import './shell_extra.css'

import './jsonld_registry' // 必须在任何组件之前求值：注册表挂在 globalThis，JsonLd 组件 setup 立即写入
import Layout from './Layout.vue'

import HomeHero from './components/HomeHero.vue'
import FeatureCards from './components/FeatureCards.vue'
import CtaBand from './components/CtaBand.vue'
import ExternalCta from './components/ExternalCta.vue'
import PricingCard from './components/PricingCard.vue'
import CompareTable from './components/CompareTable.vue'
import FaqList from './components/FaqList.vue'
import StepFlow from './components/StepFlow.vue'
import KefuWidget from './components/KefuWidget.vue'
import JsonLd from './components/JsonLd.vue'
import PageShell from './components/PageShell.vue'
import TabBar from './components/TabBar.vue'
import SectionNav from './components/SectionNav.vue'
import BrandLogo from './components/BrandLogo.vue'
import GuidePage from './components/GuidePage.vue'
import GuideSteps from './components/GuideSteps.vue'
import GuideShot from './components/GuideShot.vue'
import GuideTerm from './components/GuideTerm.vue'
import SegmentedTabs from './components/SegmentedTabs.vue'
import SiteFooter from './components/SiteFooter.vue'

// frontmatter.layout 的解析发生在默认主题的 VPContent 里（<component :is="frontmatter.layout" />），
// 它只能认 theme/index.ts 的 enhanceApp 里 app.component() 注册过的名字。所以页面组件必须在这里显式注册，
// 只在 theme/ 下建文件、不 import 到 theme/index.ts，页面会 SSR 成空的 <div>。
import PageIndex from './index.vue'
import PagePricing from './pricing.vue'
import PageFaq from './faq.vue'
import PageGuideIndex from './guide_index.vue'
import PageKnowledgeIndex from './knowledge_index.vue'
import CopyChip from './components/CopyChip.vue'
import ConsoleEntry from './components/ConsoleEntry.vue'
import ModelCard from './components/ModelCard.vue'
import PlanCard from './components/PlanCard.vue'
import PlanGrid from './components/PlanGrid.vue'
import KnowledgeDoc from './components/KnowledgeDoc.vue'
import KnowledgeIndex from './components/KnowledgeIndex.vue'
import KnowledgeCard from './components/KnowledgeCard.vue'
import KnowledgeFooter from './components/KnowledgeFooter.vue'

/** frontmatter.layout 值 -> 页面组件 */
const themePages = {
  index: PageIndex,
  pricing: PagePricing,
  faq: PageFaq,
  guide_index: PageGuideIndex,
  knowledge_index: PageKnowledgeIndex,
  models: PageModels,
  console: PageConsole,
}
import PageModels from './models.vue'
import VideoPlayer from './components/VideoPlayer.vue'
import PageConsole from './console.vue'
import NotFoundPage from './components/NotFoundPage.vue'

/* ---------- 主题 ---------- */

const theme: Theme = {
  // 默认外壳只用来提供 useData / useRoute / 页面组件插槽（VPContent，在 Layout.vue 里直接 import）；导航栏、页脚、
  // 侧栏、目录全部关掉（themeConfig），默认外壳的空节点（VPApp/VPNav/VPLocalNav）干脆不渲染——
  // Layout.vue 只用 VPContent。四页的正文由 VPContent 按 frontmatter.layout 选组件
  // （index / pricing / faq），docs/*.md 只是 frontmatter 路由壳。
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    for (const [name, comp] of Object.entries(themePages)) app.component(name, comp)
    app.component('HomeHero', HomeHero)
    app.component('FeatureCards', FeatureCards)
    app.component('CtaBand', CtaBand)
    app.component('ExternalCta', ExternalCta)
    app.component('PricingCard', PricingCard)
    app.component('CompareTable', CompareTable)
    app.component('FaqList', FaqList)
    app.component('StepFlow', StepFlow)
    app.component('JsonLd', JsonLd)
    app.component('KefuWidget', KefuWidget)
    app.component('PageShell', PageShell)
    app.component('TabBar', TabBar)
    app.component('SectionNav', SectionNav)
    app.component('BrandLogo', BrandLogo)
    app.component('GuidePage', GuidePage)
    app.component('GuideSteps', GuideSteps)
    app.component('GuideShot', GuideShot)
    app.component('GuideTerm', GuideTerm)
    app.component('SegmentedTabs', SegmentedTabs)
    app.component('SiteFooter', SiteFooter)
    app.component('KnowledgeIndex', KnowledgeIndex)
    app.component('VideoPlayer', VideoPlayer)
    app.component('KnowledgeCard', KnowledgeCard)
    app.component('KnowledgeFooter', KnowledgeFooter)
    app.component('NotFoundPage', NotFoundPage)
    app.component('CopyChip', CopyChip)
    app.component('ConsoleEntry', ConsoleEntry)
    app.component('ModelCard', ModelCard)
    app.component('PlanCard', PlanCard)
    app.component('PlanGrid', PlanGrid)
    // 页面组件按 frontmatter.layout 的名字注册：VPContent 对 layout: <name> 走 `<component :is="name">`，
    // 名字到组件的映射只能靠全局注册（SSR 与客户端都如此），所以这里不能用局部 import 顶替。
  },
}

export default theme
