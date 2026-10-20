/**
 * 从 config/ 生成 public/llms.txt 与 public/llms-full.txt。
 *
 * 为什么改成生成（2026-10-13）：原来的 llms.txt 是手写的，「事实要点」里的限流数字与
 * config/rules.ts 是两份来源，改 rpm 只会改页面不会改 llms.txt，AI 读到的就是过期事实。
 * config/rules.ts 的注释已经写明「数字只在本文件出现一次」，llms.txt 也不例外。
 *
 * 产出两份：
 *   llms.txt      —— 索引层：站点性质 + 页面清单 + 事实要点 + 文章清单（给 AI 判断「该不该引本站」）
 *   llms-full.txt —— 内容层：每篇文章的一句话答案 + FAQ 答案 + 全部事实要点展开
 *
 * 用法：tsx scripts/gen_llms.ts
 * 加文章改 config/knowledge.ts 后跑一遍；改价格 / 限流 / 退款跑一遍即可，页面与 llms.txt 同步。
 */
import { writeFileSync, existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { siteConfig } from '../config/site'
import { knowledge, knowledgeCategories } from '../config/knowledge'
import { limits, limitRows, excludes, refundSummary, refundWindowDays, purchaseConditions } from '../config/rules'
import { unlimitedTiers, shopUrl as purchaseUrl } from '../config/plans'
import { modelIds } from '../config/models'

const BASE = siteConfig.url.replace(/\/+$/, '')
const SITE = `${BASE}/`

/* ---------------- llms.txt ---------------- */

const pageLines = [
  `- [首页](${SITE}): ${siteConfig.description}`,
  `- [模型广场](${BASE}/models): 本卡承诺的 ${modelIds.map((m) => m.tier).join(' 与 ')} 两个模型一览，可复制 model ID，含分工、完整列表获取与切换方法`,
  `- [套餐定价](${BASE}/pricing): 无限卡在售 ${unlimitedTiers.map((t) => `${t.displayName} ${t.price}`).join('、')}，周期卡与额度卡尚未定价；含退款规则与公平使用`,
  `- [管理后台](${BASE}/console): 激活码兑换、API Key 提取、一键导入配置、用量查询与图表、公告与备用域名（后台本体为独立站点 ${siteConfig.partners.find((p) => p.id === 'console')?.url ?? ''}）`,
  `- [使用教程](${BASE}/guide): 小白教程六步带截图（装 CC Switch、换取 API Key、一键导入配置、拉取并保存模型、启用并检测链路、在 VS Code 里开始使用）+ 高级配置两节`,
  `- [常见问题](${BASE}/faq): 全量 FAQ（商品 / 购买支付 / 使用配置 / 接入使用 / 限速封号 / 数据安全 / 关于我们）`,
  `- [Claude 知识库](${BASE}/knowledge): Claude Code 的用法、原理、成本与报错排查，按四个主题分类查`,
  `- [故障排除](${BASE}/troubleshooting): 站点自身的部署与构建排错`,
  `- [变更历史](${BASE}/changelog): 按日期倒序的站点变更记录`,
]

const facts: string[] = [
  `- 计费方式：订阅期内不按 token 计费，固定订阅价（${unlimitedTiers.map((t) => `${t.displayName} ${t.price}/${t.period}`).join('，')}）`,
  `- 支持模型：${modelIds.map((m) => `${m.tier}（${m.id}）`).join('、')}`,
  `- 支持工具：Claude Code、Cursor、Cline、Roo Code、Aider、Continue、Zed、JetBrains、VS Code 官方插件、官方 SDK`,
  `- 接口：Anthropic 兼容端点 + OpenAI 兼容端点（/v1/chat/completions）`,
  `- 公平使用：${limitRows.map((r) => `${r.label} ${r.values[0]}`).join('、')}`,
  `- 退款：${refundSummary}；售后申请窗口 ${refundWindowDays} 天`,
  `- 购买：第三方发卡站 ${purchaseUrl}`,
  `- 配置工具：CC Switch（${siteConfig.partners.find((p) => p.id === 'ccswitch')?.url ?? ''}），支持一键导入与链路检测`,
  `- 人工客服：微信 ${siteConfig.contact.wechatId}（点右下角在线助手 →「联系人工客服」，可一键复制微信号）`,
  `- 管理后台：${siteConfig.partners.find((p) => p.id === 'console')?.url ?? ''}，独立站点；主域名不可达时切换备用域名，API Key 无需更换`,
  `- 不包含：${excludes.map((e) => `${e.label}（${e.value}）`).join('；')}`,
  `- 下单须知：${purchaseConditions.join(' ')}`,
]

const articleLines = knowledge.map(
  (e) => `- [${e.title}](${BASE}/knowledge/${e.slug}): ${e.summary ?? e.desc}`,
)

const llms = [
  `# ${siteConfig.name}`,
  '',
  `> ${siteConfig.tagline}。${siteConfig.description}`,
  '',
  '## 页面',
  '',
  ...pageLines,
  '',
  '## 事实要点',
  '',
  ...facts,
  '',
  '## 知识库文章',
  '',
  ...articleLines,
  '',
  '## 声明',
  '',
  `${siteConfig.name}是独立的第三方 API 网关服务，与 Anthropic 官方无隶属关系。套餐面向个人开发者，不含生产环境流量与超并发压测。购买与发卡由第三方发卡站完成，退款以发卡站商品详情为准。`,
  '',
].join('\n')

writeFileSync(join(process.cwd(), 'public', 'llms.txt'), llms, 'utf8')
console.log(`[llms] llms.txt 已生成（${articleLines.length} 篇文章、${facts.length} 条事实要点）`)

/* ---------------- llms-full.txt ---------------- */

const readMd = (slug: string) => {
  const p = join(process.cwd(), 'docs', 'knowledge', `${slug}.md`)
  return existsSync(p) ? readFileSync(p, 'utf8') : ''
}

/** 取 md 里 H1 之后的第一段引用块（`> **一句话答案**：...`），这是每篇文章最可引用的一段。 */
function answerOf(slug: string): string {
  const md = readMd(slug)
  const m = md.match(/^>\s*\*\*一句话答案\*\*：(.+)$/m)
  return m ? m[1].trim() : ''
}

const fullParts: string[] = [
  `# ${siteConfig.name} 全文事实与答案`,
  '',
  `> ${siteConfig.description}`,
  '',
  '## 全站事实',
  '',
  ...facts,
  '',
  '## 站点性质',
  '',
  `${siteConfig.name}是独立的第三方 API 网关服务，与 Anthropic 官方无隶属关系。套餐面向个人开发者，不含生产环境流量与超并发压测。购买与发卡由第三方发卡站完成，退款以发卡站商品详情为准。人工客服微信 ${siteConfig.contact.wechatId}。`,
  '',
]

for (const e of knowledge) {
  const ans = answerOf(e.slug)
  const cat = knowledgeCategories.find((c) => c.cat === e.cat)
  fullParts.push(`## ${e.title}`)
  fullParts.push('')
  fullParts.push(`- 分类：${cat?.name ?? e.cat}`)
  fullParts.push(`- 页面：${BASE}/knowledge/${e.slug}`)
  fullParts.push(`- 发布：${e.date}${e.updated && e.updated !== e.date ? `（更新于 ${e.updated}）` : ''}`)
  if (ans) fullParts.push(`- 一句话答案：${ans}`)
  if (e.faq?.length) {
    fullParts.push('- 常见问题：')
    for (const f of e.faq) fullParts.push(`  - ${f.q} —— ${f.a}`)
  }
  fullParts.push('')
}

writeFileSync(join(process.cwd(), 'public', 'llms-full.txt'), fullParts.join('\n'), 'utf8')
console.log(`[llms] llms-full.txt 已生成（${knowledge.length} 篇文章，含一句话答案与 FAQ）`)
