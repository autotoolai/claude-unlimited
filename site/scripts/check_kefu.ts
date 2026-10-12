/**
 * 助手匹配自测：跑真实问句，验证 theme/kefu_match.ts 的七档通道。
 *   1. exact   问句就是某条语料的 q
 *   2. latin   问句里的拉丁词元（429 / apikey / ccswitch / key）与关键词逐词相等，或被关键词包含
 *   3. literal 关键词与问句去掉空格后互相包含（api key、sk-、invalid api key）
 *   4. cjk     中文关键词子串命中（泛词已从 kwCjk 剔除：裸 key / 人工 / 模型 / 过期……）
 *   5. title   问句是标题前缀，或以拉丁词开头的标题子串
 *   6. weak    泛词兜底（裸 key / 人工 / sdk / cc / 模型 / 过期……）
 *   7. tokens  分词覆盖度兜底（短问句 70%，长问句 60%）
 * 同一问句命中多条语料时只写最终胜出的那一条（如「invalid api key」最终命中「API Key」）。
 *
 * 这里直接调用组件同款 matchKefu()，用例通过 = 线上行为；改关键词只改 config/kefu_bot.ts 与本文件的用例。
 * 另外两项构建期自检：faqId 是否都存在；FAQ 里有没有语料还没收录的条目（kefuUncoveredFaqIds）。
 *
 * 用法：npx tsx scripts/check_kefu.ts（npm run check:kefu）
 */
import { kefuItems, kefuUncoveredFaqIds } from '../.vitepress/theme/kefu_items'
import { matchKefu } from '../.vitepress/theme/kefu_match'
import { kefuBotBadFaqIds } from '../config/kefu_bot'

const FALLBACK = '(兜底)'
/** [问句, 期望命中的语料 id 或 FALLBACK] */
const cases: [string, string][] = [
  // ---- 状态码 / 报错 ----
  ['429', 'bot-trouble-429'], ['429 怎么办', 'bot-trouble-429'], ['报错了 429', 'bot-trouble-429'], ['被限流了', 'bot-trouble-429'],
  ['被限速了要等多久？', 'bot-trouble-429'], ['rate limit', 'bot-trouble-429'], ['401', 'bot-trouble-401'], ['403', 'bot-trouble-forbidden'],
  ['invalid api key', 'bot-trouble-401'], ['key 无效', 'bot-trouble-401'], ['鉴权失败', 'bot-trouble-401'],
  ['换 Key 后还是报 401', 'bot-trouble-401'], ['key 泄露了', 'bot-trouble-leak'], ['key 被盗用了', 'bot-trouble-leak'], ['key找不到了', 'bot-trouble-leak'],
  ['登录不上', 'bot-trouble-login'], ['连不上', 'bot-trouble-login'], ['一直报错', 'bot-trouble-login'], ['突然不能用', 'bot-trouble-login'],
  ['哪些行为会被封号', 'bot-trouble-forbidden'], ['能多人用吗', 'bot-trouble-forbidden'], ['能共享吗', 'bot-trouble-forbidden'],
  ['被限制了怎么申诉', 'bot-trouble-appeal'], ['号被封了', 'bot-trouble-appeal'], ['怎么恢复', 'bot-trouble-appeal'],
  ['稳定性有保障吗', 'bot-trouble-sla'], ['稳不稳', 'bot-trouble-sla'], ['宕机了怎么办', 'bot-trouble-leak'], ['宕机了', 'bot-trouble-sla'],

  // ---- Key / Base URL ----
  ['apikey 在哪拿', 'bot-setup-key'], ['密钥怎么填', 'bot-setup-key'], ['API Key 在哪获取', 'bot-setup-key'], ['从哪拿 key', 'bot-setup-key'],
  ['sk- 开头的 Key 怎么用', 'bot-setup-key'], ['卡密怎么用', 'bot-setup-key'], ['key 怎么填', 'bot-setup-key'], ['API Key 怎么用？', 'bot-setup-key'],
  ['base url 填什么', 'bot-setup-baseurl'], ['BaseURL怎么填', 'bot-setup-baseurl'], ['接口地址填什么', 'bot-setup-baseurl'],
  ['地址填什么', 'bot-setup-baseurl'], ['url 填什么', 'bot-setup-baseurl'], ['Base URL 填什么？', 'bot-setup-baseurl'],
  ['结尾要加 /v1 吗', 'bot-setup-baseurl'], ['要加 /v1 吗', 'bot-setup-baseurl'],

  // ---- CC Switch / 模型 ----
  ['ccswitch 必须装吗', 'bot-setup-ccswitch'], ['cc switch 是什么', 'bot-setup-ccswitch'], ['CC Switch 怎么安装', 'bot-setup-ccswitch'],
  ['cc 怎么装', 'bot-setup-ccswitch'], ['一键导入没反应', 'bot-setup-import'], ['导入配置时没反应', 'bot-setup-import'], ['导入失败', 'bot-setup-import'],
  ['模型列表为空', 'bot-setup-models'], ['获取模型', 'bot-setup-models'], ['推荐加哪些模型', 'bot-setup-models'], ['支持哪些模型', 'bot-setup-models'],
  ['支持哪些模型？', 'bot-setup-models'], ['支持哪些模型？新模型上线要换 Key 吗？', 'bot-setup-models'], 
  ['「启用」和「检测链路」是做什么的？', 'bot-setup-enable'], ['测试连接', 'bot-setup-enable'], ['怎么切换模型？', 'bot-usage-model'],
  ['怎么切换模型', 'bot-usage-model'], ['切换到 opus', 'bot-usage-model'], ['切到 fable', 'bot-usage-model'], ['能用 opus 吗', 'bot-usage-model'], ['sonnet 能用吗', 'bot-usage-model'],

  // ---- 客户端 / 命令行 ----
  ['支持哪些客户端和工具？', 'bot-start-tools'], ['支持哪些工具', 'bot-start-tools'], ['支持 cursor 吗', 'bot-start-tools'],
  ['VS Code 怎么用 Claude Code？', 'bot-usage-vscode'], ['vscode 插件', 'bot-usage-vscode'], ['侧边栏插件', 'bot-usage-vscode'], ['扩展怎么装', 'bot-usage-vscode'],
  ['claude 命令找不到', 'bot-usage-command'], ['终端里输入 claude 命令没反应怎么办？', 'bot-usage-command'], ['终端里跑 claude 命令闪退？', 'bot-usage-command'],
  ['claude 窗口一闪就没', 'bot-usage-command'], ['怎么装 claude code', 'bot-usage-claudecode'], ['powershell 里找不到命令', 'bot-usage-command'],
  ['cmd 报错', 'bot-usage-command'], ['装不上', 'bot-usage-command'], ['怎么接入 Claude Code？', 'bot-usage-claudecode'], ['怎么安装 claude code', 'bot-usage-claudecode'], ['怎么用 cc', 'bot-usage-claudecode'], ['cc 是什么', 'bot-setup-ccswitch'], ['装 cc', 'bot-setup-ccswitch'], ['cc怎么用', 'bot-usage-claudecode'],
  ['怎么安装 claudecode', 'bot-usage-claudecode'], ['openai 兼容吗', 'bot-usage-openai'], ['支持 OpenAI 兼容接口吗？', 'bot-usage-openai'],
  ['python sdk 能用吗', 'bot-usage-openai'], ['python 调用接口', 'bot-usage-openai'], ['支持 openai sdk 吗', 'bot-usage-openai'],

  // ---- 套餐 / 有效期 / 额度 ----
  ['key 过期了', 'bot-usage-renew'], ['key 过期了怎么办？', 'bot-usage-renew'], ['怎么换 key', 'bot-usage-renew'], ['更新key', 'bot-usage-renew'],
  ['续费', 'bot-usage-renew'], ['套餐怎么续', 'bot-usage-renew'], ['怎么续费', 'bot-usage-renew'], ['怎么重新激活', 'bot-usage-renew'],
  ['到期了', 'bot-usage-renew'], ['套餐到期', 'bot-usage-renew'], ['卡过期了', 'bot-usage-renew'],
  ['换卡后要不要重新配置', 'bot-usage-reconfigure'], ['换卡之后需要重新配置吗？', 'bot-usage-reconfigure'], ['需要重新配置吗', 'bot-usage-reconfigure'],
  ['配置还在吗', 'bot-usage-reconfigure'],
  ['有效期多久？到期会怎样？', 'bot-usage-period'], ['有效期多久', 'bot-usage-period'], ['能用多久', 'bot-usage-period'], ['一个周期是多久', 'bot-usage-period'],
  ['自动续费吗', 'bot-usage-period'],
  ['无限额度是什么意思', 'bot-usage-unlimited'], ['token 限制', 'bot-usage-unlimited'], ['额度上限是多少', 'bot-usage-unlimited'], ['用不完', 'bot-usage-unlimited'],
  ['上下文窗口多大', 'bot-usage-context'], ['哪个模型上下文最大', 'bot-usage-context'], ['最大上下文', 'bot-usage-context'], ['200k 还是 1m', 'bot-usage-context'],

  // ---- 关于 / 数据 ----
  ['你们是谁', 'bot-account-who'], ['你们公司地址在哪', 'bot-account-who'], ['主体是谁', 'bot-account-who'],
  ['人工', 'bot-account-human'], ['人工客服', 'bot-account-human'], ['客服', 'bot-account-human'], ['客服微信', 'bot-account-human'],
  ['想找真人', 'bot-account-human'], ['客服什么时候回？', 'bot-account-human'], ['人工什么时候回？', 'bot-account-human'],
  ['联系人工要多久？', 'bot-account-human'], ['联系方式', 'bot-account-human'], ['加我微信', 'bot-account-human'], ['怎么联系你们？', 'bot-account-human'],
  ['套餐怎么换', 'bot-account-human'], ['退款', 'bot-account-human'], ['能退吗', 'bot-account-human'], ['退钱', 'bot-account-human'], ['怎么联系你们', 'bot-account-human'],
  ['你们是官方吗', 'bot-start-official'], ['是不是官方', 'bot-start-official'], ['靠谱吗', 'bot-start-official'],
  ['会存储我的数据吗', 'bot-account-store'], ['存你们那吗', 'bot-account-store'], ['会存我的对话吗', 'bot-account-store'], ['请求记录保留多久', 'bot-account-store'],
  ['会被用于训练吗', 'bot-account-train'], ['支持微调吗', 'bot-account-train'], ['会用来训练', 'bot-account-train'],
  ['新手从哪开始', 'bot-start-plan'], ['配置步骤', 'bot-start-plan'], ['教程', 'bot-start-plan'],

  // ---- 兜底 ----
  ['', FALLBACK], ['今天天气怎么样', FALLBACK], ['讲个笑话', FALLBACK], ['opus 和 sonnet 有什么区别', FALLBACK], 
  ['明天要下雨吗', FALLBACK], ['这个套餐适合团队用吗', FALLBACK], ['你们能开发游戏吗', FALLBACK], ['和 GPT 比怎么样', FALLBACK],
  ['有没有学生优惠', FALLBACK],
]

let fail = 0
const misses: string[] = []
for (const [q, want] of cases) {
  const hit = matchKefu(kefuItems, q)
  const got = hit?.id ?? FALLBACK
  const ok = got === want
  if (!ok) {
    fail++
    misses.push(`  ${q} -> ${got}（期望 ${want}）`)
    console.log(`FAIL ${q.padEnd(20)} -> ${got}  (期望 ${want})`)
  }
}

// 人工路由守卫：明确要人工的语料必须带 human 标记，KefuWidget 才会直接发客服卡。
// 2026-10 之前这里没有断言，答案文本里写了「点上面的按钮」但答案消息根本没有按钮，用户拿到的是死路。
for (const e of kefuItems) {
  if (e.human && e.id !== 'bot-account-human' && e.id !== 'bot-account-contact') {
    fail++
    console.log(`FAIL ${e.id} 标记了 human，请一并更新下面的守卫清单`)
  }
  if (e.human && /点上面的按钮|输入「人工」/.test(e.a)) {
    fail++
    console.log(`FAIL ${e.id} 的答案还在指向不存在的按钮或要求用户猜关键词`)
  }
}
for (const q of ['人工', '人工客服', '转人工', '找人工', '客服', '联系方式', '怎么联系你们', '客服微信', '退款']) {
  const hit = matchKefu(kefuItems, q)
  if (!hit?.human) {
    fail++
    console.log(`FAIL ${q.padEnd(12)} -> ${hit?.id ?? FALLBACK} 没有 human 标记，用户会拿到死路文本`)
  }
}
// 反向：普通问题不能被误判成人工请求，否则会给一堆无关问题弹客服卡
for (const q of ['429 怎么办', '怎么用 Claude Code', '支持哪些模型', 'Base URL 在哪', '有效期多久']) {
  const hit = matchKefu(kefuItems, q)
  if (hit?.human) {
    fail++
    console.log(`FAIL ${q.padEnd(12)} -> ${hit.id} 被误判成人工请求`)
  }
}

for (const id of kefuBotBadFaqIds()) {
  fail++
  console.log(`FAIL ${id} 指向不存在的 FAQ 条目`)
}

for (const id of kefuUncoveredFaqIds) {
  fail++
  console.log(`WARN FAQ ${id} 还没有对应语料，在 config/kefu_bot.ts 加一条 bot-*（keywords 会自动合并）`)
}

const hits = cases.length - fail
console.log(`
语料 ${kefuItems.length} 条，用例 ${cases.length} 条，命中 ${hits} 条`)
if (misses.length) console.log('未通过：\n' + misses.join('\n'))
console.log(fail ? `${fail} 条未通过` : '全部通过')
process.exit(fail ? 1 : 0)