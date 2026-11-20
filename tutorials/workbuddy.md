<!-- markdown mirror for AI / agents; HTML: https://claude-unlimited.aiautotools.com/guide/workbuddy -->

# WorkBuddy 教程：添加自定义模型并切换使用

> **一句话答案**：WorkBuddy 不用装 CC Switch——换取 API Key 后，在设置里添加自定义模型，接口地址填管理后台地址带 /v1、API Key 填 sk- 开头那把、模型名称填 claude-opus-5-5，保存后在模型列表里选中它就能用。

不用装 CC Switch、不用开路由，填三个值就能在 WorkBuddy 里用上本卡的模型。

## 1. 换取 API Key

卡密在发货信息里，到 rsxermu666.cn（管理后台）换成一把 sk- 开头的 API Key，后面全程只用它。

### 把卡密换成 API Key

后面每一步都要填这把 Key，别提前改。

- 打开下面的管理后台 → 在「我的面板」或「提取 Key」页面粘贴激活码 → 提交激活 → 复制拿到的 Key。

注意：
- 激活码、API Key、用量记录都存在后台里：换设备、换浏览器都不影响，忘了就回后台用同一把激活码再看。
- 主域名打不开时，用后台里的备用域名（bxcv.store），API Key 不用换。

## 2. 添加自定义模型

WorkBuddy 的自定义模型只认 OpenAI 兼容协议，所以接口地址要带 /v1。

### 填三个值

填完先别用，等模型列表里能选中它。

- 打开 WorkBuddy → 设置 → 模型 → 「自定义模型」→「添加模型」
- 接口地址填 https://rsxermu666.cn/v1
- API Key 填上一步换来的 sk- 开头那把
- 模型名称填 claude-opus-5-5

## 3. 切换到自定义模型开始用

添加完要在模型列表里选中它才会生效，填完不选还是用的原来的模型。

### 切过去试一句

问它是什么模型，答 Claude 就说明走的是本卡。

- 回到对话框的模型选择器 → 在「自定义模型」下选中刚加的那个 → 发一句话。

## 常见问题

### WorkBuddy 怎么用 Claude 无限卡？

换取 API Key 后，进 WorkBuddy 的设置添加自定义模型：接口地址填管理后台地址带 /v1、API Key 填 sk- 开头那把、模型名称填 claude-opus-5-5，保存后在模型列表里选中它即可。

### WorkBuddy 需要装 CC Switch 吗？

不需要。WorkBuddy 支持 OpenAI 兼容协议，自定义模型里直接填三个值就能连；装 CC Switch 是 Claude Code、桌面版、Codex 这几条路才需要的。

### 接口地址后面要加 /v1 吗？

要。WorkBuddy 的接口地址填管理后台地址加 /v1，界面上也有这句提示，不加会 404。

### 保存后模型列表里看不到？

模型名称要和网关返回的 ID 完全一致（claude-opus-5-5），填错就不出现在列表里。填好后记得在模型列表里选中它。

## 相关阅读

- [Claude Code 与 Codex CLI 怎么选](../knowledge/claude-code-vs-codex.md)
- [模型广场：model ID 一览](https://claude-unlimited.aiautotools.com/models)
- [常见问题：开通与配置](https://claude-unlimited.aiautotools.com/faq#cat-setup)
