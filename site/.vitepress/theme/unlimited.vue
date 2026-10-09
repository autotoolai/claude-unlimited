<script setup lang="ts">
/**
 * 无限额度页：与按量计费的差别 / 支持模型与能力 / 公平使用 / 怎么配置 Base URL 与 Key。
 * 模型表改由 config/models.ts 提供，FAQ 多挂一个「使用与配置」分类。
 */
import PageShell from './components/PageShell.vue'
import JsonLd from './components/JsonLd.vue'
import StepFlow from './components/StepFlow.vue'
import CompareTable from './components/CompareTable.vue'
import CtaBand from './components/CtaBand.vue'
import FaqList from './components/FaqList.vue'
import { faqByCategory } from '../../config/faq'
import { jsonLdUnlimited, setupSteps, siteConfig, modelTierRows, modelIdRows } from './pages/data'

const productFaq = faqByCategory('product')
const setupFaq = faqByCategory('setup').slice(0, 3)
const usageFaq = faqByCategory('usage')
</script>

<template>
  <JsonLd id="cu-jsonld-unlimited" :json="jsonLdUnlimited" />

  <PageShell
    slug="unlimited"
    title="无限额度到底无限到什么程度"
    lead="在有效订阅周期内，你发起的每次 API 调用都不按 token 单独收费。无论这次消耗 1,000 个 token，还是因为长上下文、代码库分析、PDF 处理消耗 200,000 个 token，都包含在固定订阅费用里。"
  >
    <h2 id="vs-usage">它和按量计费差在哪</h2>
    <p>按量计费时，成本随使用量快速波动。一个重度开发日——让 Claude Code 持续读取项目、规划任务、生成 patch、反复验证，再让 Cursor 或 Cline 并行处理——单日 API 成本到几十美元并不罕见。无限额度下，这一天的成本和几乎没调用的一天一样：都是你的订阅价格，不会额外叠加 token 费用。</p>
    <p>真正被改变的不是理论上可以无限请求，而是<strong>把不确定的使用成本变成可预测的固定支出</strong>。你可以按真实工作需要用 Claude，而不是因为担心费用而减少提问、缩短上下文或手动裁剪代码片段。</p>
    <p>需要注意，无限额度是基于时间窗口的订阅服务，不是一个永久 token 池。访问权限在订阅周期内生效，不需要管理 rollover，也不会因为累计用量到达某个预算而被突然停止。</p>

    <h2 id="models">支持哪些模型</h2>
    <p>四个层级都在同一订阅价内，不会因为选了 Opus 而产生额外费用。</p>
    <CompareTable :columns="['适合场景']" :rows="modelTierRows" />
    <h3>常用 model ID</h3>
    <CompareTable :columns="['层级', '适合场景', '建议']" :rows="modelIdRows" caption="以 CC Switch「获取模型列表」的实际返回为准" />
    <p>Anthropic 发布新版模型后，网关会以新的 model identifier 提供访问，你只需在工具配置里改 model ID，Key 不需要重新生成或重新购买。在 Claude Code 里用 <code>/model</code> 切换，详见<a href="/guide/models">模型与切换</a>。</p>

    <h2 id="capabilities">支持哪些能力</h2>
    <p>网关透传 Anthropic API 的主要能力：</p>
    <ul>
      <li>流式响应（streaming responses）</li>
      <li>工具调用（tool calling / function calling）</li>
      <li>扩展思考（extended thinking）</li>
      <li>视觉图片输入、PDF 处理</li>
      <li>最高 200k token 的长上下文窗口</li>
    </ul>
    <p>只要 Claude 标准 API 支持某项能力，网关通常以相同方式提供。<strong>不要求你重写业务逻辑，也不要求放弃现有 SDK。</strong> 同时提供 Anthropic 兼容端点和 OpenAI 兼容端点（/v1/chat/completions）。</p>

    <h2 id="fair-use">公平使用：取消计费压力，不等于取消流控</h2>
    <p>无限额度不等于可以无限并发、无限吞吐、无限制压测。网关需要保证所有订阅用户都能稳定访问，因此设有公平使用速率限制：</p>
    <div class="cu-table-wrap">
      <table class="cu-table cu-table--plain">
        <thead>
          <tr><th scope="col">指标</th><th scope="col">默认值</th></tr>
        </thead>
        <tbody>
          <tr><th scope="row">单 Key 并发</th><td>20 路</td></tr>
          <tr><th scope="row">请求速率</th><td>60 次 / 分钟</td></tr>
          <tr><th scope="row">Token 吞吐</th><td>300k token / 分钟</td></tr>
        </tbody>
      </table>
    </div>
    <p>它取消的是按 token 计费压力，而不是工程上的流控机制。限速对重度个人开发者通常仍足够宽松——同时跑 Claude Code 处理重构、让 Cline 在 IDE 自动编辑、用 Roo Code 的 Orchestrator 分解任务、后台 agent 定期总结日志或处理 issue，这类工作流请求数不少，但远在限制之内。</p>
    <p>对于恶意刷请求、错误配置的无限重试循环，或把个人套餐当作大规模生产流量入口的场景，限速会保护整体服务质量。触发限速后工具会等待 <code>Retry-After</code> 自动重试，不额外扣费。</p>

    <h2 id="setup">怎么开始配置</h2>
    <p>拿到卡密后，核心就是在工具里填两个值：Base URL 和 API Key。完整的图文步骤（含 CC Switch 一键导入、VS Code 插件、模型切换）见<a href="/guide">使用教程</a>。</p>

    <StepFlow :steps="setupSteps" />

    <p>大多数接入失败都是 Base URL 填错，尤其是 /v1 后缀漏填或多填。</p>

    <h2 id="faq">商品与接入相关常见问题</h2>
    <FaqList :items="productFaq" :default-open="2" />
    <FaqList :items="setupFaq" />
    <FaqList :items="usageFaq" />

    <CtaBand title="看懂了就现在接入" />

    <div class="cu-notice">{{ siteConfig.disclaimer }}</div>
  </PageShell>
</template>