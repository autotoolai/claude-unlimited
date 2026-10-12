# 套餐价格同步流程（发卡站 → 官网）

官网无限卡的档位名、价格、划线原价、折扣、库存全部来自第三方发卡站
`https://catfk.com/shop/2Z0CEP7C`。**不要手改这些字段**，跑一次同步脚本即可。

## 怎么用

```bash
cd site
npm run sync:plans                      # 拉价并写回 config/plans.ts
npm run sync:plans -- --dry-run         # 只看对照表，不改文件
npm run sync:plans -- --stock           # 额外打印在售库存
```

写完看一下 `git diff config/plans.ts`，确认只有价格字段变了，文案一个字没动，
再提交。价格同步属于事实性更新，可以单独成一个 commit。

## 字段归属：哪些能改，哪些不能

| 字段 | 归属 | 说明 |
|---|---|---|
| `id` | 脚本 | 形如 `shop-<goods_key>`，与发卡站商品绑定，**不要手改** |
| `name` | 脚本 | 原样搬商品名，不翻译不改写 |
| `period` / `days` | 脚本 | 由商品名结尾的周期后缀推断 |
| `price` / `amount` | 脚本 | `amount` 是 JSON-LD 用的数字 |
| `original` / `discount` | 脚本 | 发卡站划线价比现价高时才有，否则字段被删除 |
| `stock` | 脚本 | 仅展示，不参与下单判断 |
| `features` | **人工** | 卖点文案，取自发卡站 description 但要符合官网语气 |
| `badge` / `featured` | **人工** | 角标与主推高亮 |
| `cta` | **人工** | 按钮文案 |
| `status` | **人工** | `live` / `coming-soon`，决定是否走灰化占位卡 |

## 接口细节

该站是 Vue SPA，服务端只返回空 HTML 壳，**抓网页拿不到商品**，必须走 JSON 接口。
脚本就是复刻它前端那几次请求，全部无需登录。

| 步骤 | 方法 | 路径 | 请求体 |
|---|---|---|---|
| 1 | POST | `/shopApi/Shop/info` | `{token}` |
| 2 | POST | `/shopApi/Shop/categoryList` | `{token, goods_type}` |
| 3 | POST | `/shopApi/Shop/goodsList` | `{token, goods_type, category_id, current, pageSize}` |

关键点：

- **`category_id` 必须来自步骤 2。** 硬传 `-1` 会拿到空列表（返回 `total: 0` 而不是报错），
  这是最容易踩的坑。
- 商品类型是 `card`（卡密）/ `article`（图文）/ `resource`（资源）/ `equity`（权益）。
  本站商品都在 `card` 下，脚本仍会扫全部四种，防止发卡站改版搬家。
- 商品对象可用字段：`name`、`price`、`market_price`（0 表示无划线价）、
  `goods_key`、`link`、`extend.stock_count`、`extend.limit_count`、`description`（HTML）。
- 店铺 token 在 `config/plans.ts` 的 `shopToken` 里，换店铺只改那一处。

## 商品归组规则

脚本只自动接管**无限卡**：商品名里含「无限」或「不限」，且结尾是已知周期后缀
（天卡 / 周卡 / 月卡 / 季卡 / 半年卡 / 年卡）。其余商品会在 stdout 打 WARN 列出
goods_key，需要人工归组并新建档位 id。

新建档位时在 `plans.ts` 里手写一个对象，`id` 填 `shop-<goods_key>`，
价格字段随便填占位值（下次同步会覆盖），**文案字段要认真写**：

```ts
{
  id: 'shop-abc123',
  name: '占位',      // 下次同步会覆盖
  period: '7 天',    // 下次同步会覆盖
  days: 7,          // 下次同步会覆盖
  price: '¥0',      // 下次同步会覆盖
  amount: 0,        // 下次同步会覆盖
  features: ['这里写你写的卖点'],   // 脚本不碰
  cta: '立即订阅',                // 脚本不碰
}
```

## 新增分组 / 改上线状态

`cycleTiers`、`quotaTiers` 里的档位带 `status: 'coming-soon'`，渲染成虚线灰卡 +
「暂未开放」不可点按钮。发卡站真的上架对应商品后，把 `status` 去掉或改回 `live`，
并把 `price` 填成真实数字——`npm run check:plans` 会拦住「在售档位 amount 为 0」
和「未上线档位却挂着划线价」这两类错配。

## 故障排除

| 现象 | 原因 | 处理 |
|---|---|---|
| `店铺链接不存在` | `shopToken` 变了 | 找新店铺 token，改 `config/plans.ts` 的 `shopToken` |
| 取到 0 个商品但没报错 | `category_id` 没从 categoryList 拿 | 检查步骤 2 返回的分类数组是否非空 |
| 「未识别为无限卡，已跳过」 | 商品名不含「无限/不限」，或周期后缀不认识 | 建人工档位，或往 `PERIOD_SUFFIXES` 加后缀 |
| 脚本 exit 1 但官网没坏 | 取数失败时脚本不写文件 | 这是设计如此：宁可不同步，也不要把价格清成「待定」 |

**构建不依赖这个脚本**，`npm run build` 只跑 `check:plans` 的静态校验。
所以同步失败不会影响已发布的站点。

## 已对齐的规则（以发卡站商品详情为准）

发卡站是实际收款方，用户付款后按卖家商品描述主张权利。以下三类规则**以商品详情 `description` 为唯一准绳**，
站内其余位置全部是它的派生物，改卖家那边之后必须回来同步：

| 规则 | 权威来源 | 站内派生物 |
|---|---|---|
| 退款条款 | 商品详情「退款项要求」 | `config/plans.ts` 的 `refundNotes`；`config/rules.ts` 的 `refundRules` / `refundSummary` |
| 支持模型 | 商品名「fable5.1+opus5.5无限」 | `config/plans.ts` 的 `unlimitedTiers[].name`；`config/models.ts` 的 `modelIds` / `tierRows` |
| 会话窗口与售前条件 | 商品详情「限制一个会话窗口」「重要提醒」 | `config/rules.ts` 的 `limits.sessions` / `purchaseConditions` |

`npm run sync:plans` 只自动同步第一行（价格）。**后两行需要人工同步**：模型名会跟着商品名变，
会话窗口与售前条件是 `description` 里的文字，脚本不解析 HTML。

## 手工核对清单（每次同步后过一遍）

1. 商品名里的模型名是否变了？变了就改 `config/models.ts` 与 `config/site.ts` 的相关文案。
2. `description` 里的限制条款是否变了？变了就改 `config/rules.ts`。
3. `public/llms.txt` 的「事实要点」是**手写的**，不像 `plans.ts` 那样自动同步，改规则时必须手动跟。
4. `scripts/check_dist.mjs` 的档位数断言已改成读 `config/plans.ts`，不需要手改；
   但 `scripts/verify_build.py` 里的 FAQ 数量断言若因改答案而变动，需要手改。
