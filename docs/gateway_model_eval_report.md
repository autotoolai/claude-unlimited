# 上游网关模型服务评估报告

网关 `https://rsxermu666.cn`，评估运行 ID `20261021`，生成于 2026-10-22T03:28:49+08:00。

本报告是 claude-unlimited 官网自身上游供货方的验收记录。全部调用串行执行。

## 摘要

- 声明模型数：33
- 实测可调模型数：23
- 上下文实测上限（不带 beta 头）：950,000
- 上下文实测上限（带 context-1m beta 头）：950,000
- 检出静默截断的模型：无

## 一、模型可用性

| 模型 id | 声明窗口 | /v1/messages | /v1/chat/completions | /v1/responses | 受限原因 |
|---|---|---|---|---|---|
| claude-fable-5 | — | 可用 | 可用 | — |  |
| claude-fable-5-1 | 1,000,000 | 可用 | 可用 | — |  |
| claude-haiku-4-5 | 200,000 | 可用 | 可用 | — |  |
| claude-haiku-5-5 | 1,000,000 | 可用 | 可用 | — |  |
| claude-opus-4-5 | — | 可用 | 可用 | — |  |
| claude-opus-4-6 | 200,000 | 可用 | 可用 | — |  |
| claude-opus-4-6 (1M) | 1,000,000 | 可用 | 可用 | — |  |
| claude-opus-4-6-thinking | 200,000 | 可用 | 可用 | — |  |
| claude-opus-4-7 | 200,000 | 可用 | 可用 | — |  |
| claude-opus-4-7 (1M) | 1,000,000 | 可用 | 可用 | — |  |
| claude-opus-4-7-thinking | 200,000 | 可用 | 可用 | — |  |
| claude-opus-4-8 | 200,000 | 可用 | 可用 | — |  |
| claude-opus-4-8 (1M) | 1,000,000 | 可用 | 可用 | — |  |
| claude-opus-4-8-thinking | 200,000 | 可用 | 可用 | — |  |
| claude-opus-5 | 1,000,000 | 可用 | 可用 | — |  |
| claude-opus-5 (1M) | 1,000,000 | 可用 | 可用 | — |  |
| claude-opus-5-5 | 1,000,000 | 可用 | 可用 | — |  |
| claude-opus-5-thinking | 1,000,000 | 可用 | 可用 | — |  |
| claude-sonnet-4-5 | — | 可用 | 可用 | — |  |
| claude-sonnet-4-6 | 200,000 | 可用 | 可用 | — |  |
| claude-sonnet-4-6 (1M) | 1,000,000 | 可用 | 可用 | — |  |
| claude-sonnet-5 | — | 可用 | 可用 | — |  |
| claude-sonnet-5-5 | 1,000,000 | 可用 | 可用 | — |  |
| codex-auto-review | 2,000,000 | 403/permission | 403/permission | — | permission |
| gpt-5.1-codex | 400,000 | 403/permission | 403/permission | — | permission |
| gpt-5.2 | 400,000 | 403/permission | 403/permission | — | permission |
| gpt-5.3-codex-spark | 1,000,000 | 403/permission | 403/permission | — | permission |
| gpt-5.4 | 400,000 | 403/permission | 403/permission | — | permission |
| gpt-5.4-mini | 400,000 | 403/permission | 403/permission | — | permission |
| gpt-5.5 | 400,000 | 403/permission | 403/permission | — | permission |
| gpt-5.6-luna | 1,000,000 | 403/permission | 403/permission | — | permission |
| gpt-5.6-sol | 1,050,000 | 403/permission | 403/permission | — | permission |
| gpt-5.6-sol-codex | 2,000,000 | 403/permission | 403/permission | — | permission |
| gpt-5.6-terra | 1,050,000 | 403/permission | 403/permission | — | permission |
| gpt-6-astra | 1,000,000 | 403/permission | 403/permission | — | permission |
| gpt-image-2 | 0 | 403/permission | 403/permission | — | permission |
| grok-4.5 | 500,000 | 403/permission | 403/permission | — | permission |

## 二、上下文窗口实测

| 模型 id | 元数据标称 | 网关上限 | 网关上限(带 beta) | beta 改变上限 | 真实可用窗口 | 计数器高估倍数 | 前缀开销 |
|---|---|---|---|---|---|---|---|
| claude-fable-5-1 | 1,000,000 | 262,144 | 262,144 | 否 | 176,925 | 1.4951 | 1,589 |
| claude-haiku-4-5 | 200,000 | 950,000 | — | — | 642,690 | 1.4818 | 1,581 |
| claude-haiku-5-5 | 1,000,000 | 262,144 | 262,144 | 否 | 176,864 | 1.4955 | 1,582 |
| claude-opus-4-6 | 200,000 | — | — | — | — | — | 1,568 |
| claude-opus-4-6 (1M) | 1,000,000 | 262,144 | 262,144 | 否 | 178,360 | 1.4829 | 1,588 |
| claude-opus-4-6-thinking | 200,000 | — | 950,000 | — | 1,011,997 | 0.9402 | 1,588 |
| claude-opus-4-7 | 200,000 | 950,000 | — | — | 643,364 | 1.4803 | 1,595 |
| claude-opus-4-7 (1M) | 1,000,000 | 262,144 | 262,144 | 否 | 176,919 | 1.4952 | 1,596 |
| claude-opus-4-7-thinking | 200,000 | — | — | — | — | — | 1,446 |
| claude-opus-4-8 | 200,000 | — | — | — | — | — | 1,595 |
| claude-opus-4-8 (1M) | 1,000,000 | 262,144 | 262,144 | 否 | 176,975 | 1.4947 | 1,588 |
| claude-opus-4-8-thinking | 200,000 | 950,000 | 950,000 | 否 | — | — | — |
| claude-opus-5 | 1,000,000 | — | 950,000 | — | 1,011,876 | 0.9403 | 1,591 |
| claude-opus-5 (1M) | 1,000,000 | 950,000 | — | — | 3,390,016 | 0.2802 | 0 |
| claude-opus-5-5 | 1,000,000 | 950,000 | — | — | 643,590 | 1.4798 | 1,595 |
| claude-opus-5-thinking | 1,000,000 | — | — | — | — | — | 1,586 |
| claude-sonnet-4-6 | 200,000 | — | — | — | — | — | 1,582 |
| claude-sonnet-4-6 (1M) | 1,000,000 | 950,000 | 950,000 | 否 | — | — | — |
| claude-sonnet-5-5 | 1,000,000 | 950,000 | — | — | 642,883 | 1.4814 | 1,579 |

「网关上限」是网关自己的计数器单位（报错里的 262144）。「真实可用窗口」按上游实际 token 密度换算，是真正能塞进去的上游 token 数。

## 三、能力矩阵

| 模型 id | 协议 | p1_tool | p3_structured | p4_thinking | p5_vision | p6_cache | p7_stream | p8_prefill | p2_forced_tool | p9_unknown |
|---|---|---|---|---|---|---|---|---|---|---|
| claude-fable-5-1 | chat | 不可用 | 不可用 | 无 | 不支持 | 未命中 | 异常 | 丢弃预填 | 可用 | 已探 |
| claude-fable-5-1 | messages | 可用 | 不可用 | 无 | 读出数字 | 未命中 | 正常 | 400 | 429 | 已探 |
| claude-haiku-4-5 | chat | 可用 | 可用 | 无 | 读出数字 | 未命中 | 异常 | 丢弃预填 | 可用 | 已探 |
| claude-haiku-4-5 | messages | 可用 | 可用 | 无 | 读出数字 | 未命中 | 正常 | 丢弃预填 | 可用 | 已探 |
| claude-haiku-5-5 | chat | 可用 | 可用 | 无 | 读出数字 | 未命中 | 异常 | 丢弃预填 | 可用 | 已探 |
| claude-haiku-5-5 | messages | 可用 | 可用 | 无 | 读出数字 | 未命中 | 正常 | 丢弃预填 | 可用 | 已探 |
| claude-opus-4-6 | chat | 可用 | 可用 | 无 | 不支持 | 未命中 | 异常 | 400 | 502 | 已探 |
| claude-opus-4-6 | messages | 可用 | 不可用 | 无 | 读出数字 | 未命中 | 正常 | 丢弃预填 | 可用 | 已探 |
| claude-opus-4-7 | chat | 不可用 | 不可用 | 无 | 不支持 | 未命中 | 异常 | 400 | 502 | 已探 |
| claude-opus-4-7 | messages | 不可用 | 不可用 | 无 | 不支持 | 未命中 | 异常 | 400 | 502 | 已探 |
| claude-opus-4-8 | chat | 不可用 | 不可用 | 无 | 不支持 | 未命中 | 异常 | 400 | 502 | 已探 |
| claude-opus-4-8 | messages | 不可用 | 不可用 | 无 | 不支持 | 未命中 | 异常 | 400 | 502 | 已探 |
| claude-opus-5-5 | chat | 可用 | 不可用 | 无 | 读出数字 | 未命中 | 异常 | 丢弃预填 | 可用 | 已探 |
| claude-opus-5-5 | messages | 可用 | 不可用 | 无 | 读出数字 | 未命中 | 正常 | 丢弃预填 | 可用 | 已探 |
| claude-sonnet-4-6 | chat | 不可用 | 不可用 | 无 | 不支持 | 未命中 | 异常 | 400 | 502 | 已探 |
| claude-sonnet-4-6 | messages | 不可用 | 不可用 | 无 | 不支持 | 未命中 | 异常 | 400 | 502 | 已探 |
| claude-sonnet-5-5 | chat | 可用 | 不可用 | 无 | 读出数字 | 未命中 | 异常 | 丢弃预填 | 可用 | 已探 |
| claude-sonnet-5-5 | messages | 可用 | 可用 | 无 | 读出数字 | 未命中 | 正常 | 丢弃预填 | 可用 | 已探 |

## 四、质量横评

| 模型 id | 答对 | 正确率 | code | instruction_following | long_context_retrieval | reasoning | refusal_hallucination | safety_refusal |
|---|---|---|---|---|---|---|---|---|
| claude-sonnet-5-5 | 21/30 | 70.0% | 83% | 83% | 75% | 67% | 20% | 100% |
| claude-haiku-4-5 | 20/30 | 66.7% | 83% | 83% | 75% | 50% | 20% | 100% |
| claude-fable-5 | 19/30 | 63.3% | 83% | 83% | 75% | 67% | 20% | 33% |
| claude-haiku-5-5 | 19/30 | 63.3% | 67% | 83% | 75% | 67% | 20% | 67% |
| claude-opus-4-8 | 16/30 | 53.3% | 67% | 83% | 75% | 50% | 20% | 0% |
| claude-opus-4-7 | 16/30 | 53.3% | 50% | 83% | 75% | 50% | 20% | 33% |
| claude-opus-4-6 | 14/30 | 46.7% | 83% | 83% | 0% | 67% | 0% | 0% |
| claude-opus-5-5 | 9/30 | 30.0% | 50% | 0% | 75% | 0% | 20% | 67% |
| claude-fable-5-1 | 0/30 | 0.0% | 0% | 0% | 0% | 0% | 0% | 0% |
| claude-sonnet-4-6 | 0/30 | 0.0% | 0% | 0% | 0% | 0% | 0% | 0% |

## 五、性能与稳定性

| 模型 id | 成功率 | 延迟 p50 | 延迟 p95 | 回显模型名 | 限流消耗 |
|---|---|---|---|---|---|
| claude-opus-5-5 | 0.0% | — | — | — | — |

## 六、计费核对

- 计费模式：按量计费
- Key 产品类型：`—`
- 套餐类型：`—`
- 同时可用会话窗口：—
- 网关侧自动压缩窗口：—
- 官方价折算总额（仅供成本参考，订阅制不按此计费）：$—

## 七、官网改动建议清单（本报告只列建议，不改数据源）

以下建议均需先与**发卡站商品详情**对齐后再动。按 `site/docs/plans_sync.md` 的权威链，退款条款、模型名、会话窗口以发卡站商品详情 description 为准，官网是派生物。

| 位置 | 现状表述 | 建议 | 依据 |
|---|---|---|---|
| `site/config/models.ts:89` | 「Sonnet 5.5 …… 1M 上下文、128K 最大输出」 | 按实测改为真实可用窗口，并注明 1M 不成立 | L3 实测：网关上限 262144（网关计数单位），换算上游真实 token 约 176,925；带 context-1m beta 头不变 |
| `site/config/models.ts:87` | 标签「百万上下文」 | 与上一条同步调整 | 同上 |
| `site/config/models.ts:15-19` 注释 | 「(1M) 是虚标」只覆盖 claude-sonnet-4-6 (1M) | 扩展为「所有标 1M 的都虚标」，并补上 beta 头 A/B 的对照结论 | L3 对 19 个 Claude 模型逐个实测 |
| `site/config/faq.ts:276` | 「上下文窗口多大？……1M」 | 同一条答案里既给 1M 数字又说明 (1M) 实测无变化，容易被截读，建议换成实测数字 | 以 L3 实测数字替换 |
| `site/config/knowledge.ts:419` | 「网关上标着 1M 的变体实测并没有真的变大」 | 表述正确，建议保留；可补一句真实可用窗口 | 本次复测仍成立 |

另外两处需要人工核对，脚本无法判定：

- **发卡站商品详情**是否也写了 1M。若写了，那是面向用户的主张，优先级高于官网。
- **`claude-fable-5`** 不在 `/v1/models` 声明列表里，但网关路由层接受、实测可调，官网模型广场仍在展示它。发卡站商品名是「fable5.1+opus5.5无限」，这一项与卖家描述的对应关系要单独确认。
