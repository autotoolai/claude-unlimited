<!-- markdown mirror for AI / agents; HTML: https://claude-unlimited.aiautotools.com/guide/cursor -->

# 通用手动配置：Cursor 等客户端怎么填三个值

> **一句话答案**：任何支持自定义 API 的客户端都只要填三个值——接口地址、sk- 开头的 API Key、模型名称；Cursor 这类 OpenAI 兼容端点的地址要带 /v1，各客户端的差异见页面末尾的速查表。

三个值填进任何支持自定义 API 的客户端就能用，末尾附各家的填法差异速查表。

## 1. 换取 API Key

卡密在发货信息里，到 rsxermu666.cn（管理后台）换成一把 sk- 开头的 API Key，后面全程只用它。

### 把卡密换成 API Key

后面每一步都要填这把 Key，别提前改。

- 打开下面的管理后台 → 在「我的面板」或「提取 Key」页面粘贴激活码 → 提交激活 → 复制拿到的 Key。

注意：
- 激活码、API Key、用量记录都存在后台里：换设备、换浏览器都不影响，忘了就回后台用同一把激活码再看。
- 主域名打不开时，用后台里的备用域名（bxcv.store），API Key 不用换。

## 2. 手动配置三个值

不用 CC Switch 的话，所有客户端都只要这三个值，区别只在地址写法与上游格式。

注意：
- 接口地址不要自己加 /chat/completions，也别漏掉 /v1。OpenAI 兼容端点漏 /v1 会 404，Claude Code 与桌面版那边加了 /v1 反而会 404。
- 模型不用背：工具里的「获取模型列表」是网关实时返回的，最全也最新。
- 没装 CC Switch、也没法用一键导入，就照这一页手动填即可，各客户端的差异见下一节的速查表。

## 3. 各客户端填法差异速查

同一个 Key 在不同客户端里，地址写法、上游格式和要不要开路由都不一样，对照这张表填。

注意：
- 只给 Cursor 这类客户端用的：直接看上一节的三个值就够，不用装 CC Switch。
- 拿不准自己用哪个客户端，看使用教程首页的场景列表，每个客户端都有独立的图文步骤。

## 常见问题

### 在 Cursor 里怎么用 Claude 无限卡？

在 Cursor 的模型设置里添加自定义模型：接口地址填管理后台地址带 /v1、API Key 填 sk- 开头那把、模型名填 claude-opus-5-5 之类的真实 ID，保存后即可使用。

### 三个值到底填什么？

接口地址是管理后台首页顶部那一行（OpenAI 兼容端点要带 /v1），API Key 是后台「提取 Key」页面那把 sk- 开头的密钥，模型名是网关真实返回的 model ID。

### 模型名称填什么？

填网关真实返回的 ID，比如 claude-opus-5-5、claude-fable-5-1。填错客户端就选不到这个模型，完整清单见模型广场。

### 各家客户端的地址写法都一样吗？

不一样。Claude Code 与桌面版用不带 /v1 的地址，Codex、WorkBuddy、Cursor 这类用带 /v1 的地址。页面末尾的速查表列了全部差异。

## 相关阅读

- [模型广场：model ID 一览](https://claude-unlimited.aiautotools.com/models)
- [Claude Code 与 Codex CLI 怎么选](https://claude-unlimited.aiautotools.com/knowledge/claude-code-vs-codex)
- [常见问题：日常使用](https://claude-unlimited.aiautotools.com/faq#cat-usage)
