<script setup lang="ts">
/**
 * 管理后台介绍页：后台能做什么（功能卡）、几个关键功能细说、备用域名与连通性、常见问题。
 * 所有「打开」按钮都指向 partners.console，新标签页打开；本站不代理后台的任何数据。
 */
import PageShell from './PageShell.vue'
import JsonLd from './JsonLd.vue'
import FaqList from './FaqList.vue'
import CtaBand from './CtaBand.vue'
import { partnerUrl, siteConfig } from '../../../config/site'
import { consoleFeatures, consoleBackupDomains, consoleFaqItems, jsonLdConsole } from '../pages/data'

const href = partnerUrl('console')
const detail = [
  {
    id: 'activate',
    h: '用激活码换 Key',
    p: '买完卡密后在后台「我的面板」粘贴激活码即可激活；再到「提取 Key」页面拿到 sk- 开头的专属 Key 和网关地址。Key 在首次发起 API 请求时自动激活，不用额外点一次。激活码、Key 和用量记录都保存在后台里，刷新页面、换浏览器随时能再看。',
  },
  {
    id: 'import',
    h: '一键导入配置',
    p: '后台「使用教程」页有「一键导入配置」按钮，会自动写入 Claude Code / Codex CLI 的完整配置（apiKey、baseURL、settings.json / config.toml），也支持一键导入到 CC Switch 客户端。需要本机安装 CC Switch ≥ v3.7.0。',
  },
  {
    id: 'usage',
    h: '用量与图表',
    p: '「查询用量」按时间列出每次请求的模型、输入 / 输出 Token、缓存命中、成功失败与累计费用；「用量图表」按时间、按额度、时间 + 额度三种口径看每日 Token 消耗、费用趋势与模型分布。无限卡在后台显示「无额度 / 时间上限」。',
  },
  {
    id: 'image',
    h: 'GPT 图像生成',
    p: '后台内置文生图与图生图，带独立 Playground，可调图片尺寸与质量。适合做配图、封面和效果图。',
  },
]
</script>

<template>
  <JsonLd id="cu-jsonld-console" :json="jsonLdConsole" />

  <PageShell
    slug="console"
    toc="wide"
    title="管理后台"
    lead="买完卡密之后，兑换、提取 Key、一键导入配置、看用量和公告，都在这个页面完成。后台独立运行，点下面的按钮在新标签页打开。"
    eyebrow="激活码 · API Key · 用量"
  >
    <div class="cu-console-hero">
      <p>
        后台地址固定在 <code>{{ href }}</code>。它是一个独立的页面，和官网不是同一个站点；
        本站只做介绍与答疑，不代理后台里的任何数据。
      </p>
      <a class="cu-btn cu-btn--solid cu-btn--lg" :href="href" target="_blank" rel="noopener" data-cta="console_main">
        打开管理后台 ↗
      </a>
    </div>

    <h2 id="features">后台能做什么</h2>
    <p>一共九个功能，都是围绕一把 Key 展开的：换 Key、看 Key、看用量、导配置、生成图、看公告。</p>
    <div class="cu-cgrid">
      <article v-for="f in consoleFeatures" :key="f.name" class="cu-ccard">
        <div class="cu-ccard__head">
          <span class="cu-ccard__mark">{{ f.mark }}</span>
          <h3 class="cu-ccard__name">{{ f.name }}</h3>
        </div>
        <p class="cu-ccard__what">{{ f.what }}</p>
        <p class="cu-ccard__when">{{ f.when }}</p>
      </article>
    </div>

    <h2 id="keys">几个关键功能细说</h2>
    <section v-for="d in detail" :key="d.id" :aria-label="d.h">
      <h3>{{ d.h }}</h3>
      <p>{{ d.p }}</p>
    </section>
    <p class="cu-more">
      后台的完整图文教程在它自己的「使用教程」页；官网这边对应的是<a href="/guide">使用教程</a>，
      按「取 Key → 一键导入 → 保存模型 → 检测链路」四步走，小白教程每步都有截图；已经有 Key 的看高级配置，那里只讲 Base URL / API Key / 模型 ID 三个值怎么填。
    </p>

    <h2 id="domain">备用域名与连通性</h2>
    <p>
      后台「使用教程」页有主域名的实时连通性检测。主域名被运营商屏蔽或网络抖动时，切换到标记为「备用域名」的地址即可，
      <strong>API Key 无需更换</strong>，已配置的编辑器也不用重新填。备用域名：
    </p>
    <div class="cu-domains">
      <span v-for="d in consoleBackupDomains" :key="d" class="cu-domain">{{ d }} <CopyChip :text="'https://' + d" label="复制网址" cta="copy_url" /></span>
    </div>

    <h2 id="faq">后台常见问题</h2>
    <FaqList :items="consoleFaqItems" :default-open="1" />

    <CtaBand title="先挑个档位，再进后台兑换" />

  </PageShell>
</template>
