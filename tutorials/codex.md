<!-- markdown mirror for AI / agents; HTML: https://claude-unlimited.aiautotools.com/guide/codex -->

# Codex 教程：接入 Claude 无限卡并配置模型列表

> **一句话答案**：Codex 要在 CC Switch 里新增一个 Codex 供应商，上游格式必须选 Anthropic Messages 并开启路由，配置好模型列表后启用并检测链路，最后彻底重启 Codex 才会生效。

Codex 接入本卡比别的客户端多两个关键动作，这一页逐节标出来。

## 1. 安装 CC Switch

装好 CC Switch 就算准备好了一半：它是个专门管 API 配置的小工具，全程默认安装。

### 挑对系统的安装包

装完先别动配置，下一步才需要填值。

- 打开下面的官网 → 下载 Windows 或 macOS 版 → 双击运行，一路默认。

## 2. 换取 API Key

卡密在发货信息里，到 rsxermu666.cn（管理后台）换成一把 sk- 开头的 API Key，后面全程只用它。

### 把卡密换成 API Key

后面每一步都要填这把 Key，别提前改。

- 打开下面的管理后台 → 在「我的面板」或「提取 Key」页面粘贴激活码 → 提交激活 → 复制拿到的 Key。

注意：
- 激活码、API Key、用量记录都存在后台里：换设备、换浏览器都不影响，忘了就回后台用同一把激活码再看。
- 主域名打不开时，用后台里的备用域名（bxcv.store），API Key 不用换。

## 3. 新增 Codex 供应商

Codex 要在 CC Switch 里单独建一个供应商，不能用一键导入，也不能用桌面版那条配置。

### 选对供应商类型

类型选错，后面能填的字段就对不上。

- 顶部应用栏切到 Codex → 点「+」→ 页签选「Codex 供应商」→ 预设里选「自定义配置」。

## 4. 填入地址、Key 与默认模型

Codex 的请求地址要带 /v1，和 Claude Code 那边不一样；默认模型填一个网关确实返回的模型名。

### 填三个值

填错的表现是连不上，或报模型不存在。

- API 请求地址填 https://rsxermu666.cn/v1（Codex 这里要带 /v1）
- API Key 填上一步换来的 sk- 开头那把
- 默认模型填 claude-opus-5-5

## 5. 把上游格式设为 Anthropic Messages

这是 Codex 专有的一步，也是最关键的一步：本卡是 Anthropic 兼容端点，选错格式请求就发不出去。

### 改请求协议

默认是 OpenAI 协议，本卡不认。

- 编辑供应商 → 展开「高级选项」→「上游格式」→ 选「Anthropic Messages」→ 按提示先开启路由。

## 6. 配置模型列表

把网关有的模型加进列表，Codex 的 /model 命令才会列出这些模型名。

### 把模型加进列表

这一步决定 Codex 请求时发哪个模型。

- 编辑供应商 → 「获取模型列表」→ 选「添加模型」→ 填菜单显示名与实际请求模型。

### 生成模型目录

不生成目录文件，/model 里还是看不到这些名字。

- 同一页的「模型映射」里填菜单显示名与实际请求模型 → 勾上「生成 Codex model_catalog.json」→ 保存。

## 7. 开启路由

Codex 走本地路由转发，和桌面版一样：总开关与 Codex 应用开关都要开。

### 打开两个开关

Codex 的请求必须被路由接管，否则不会发往网关。

- CC Switch → 设置 →「路由」→ 打开「路由总开关」→ 在「路由启用」里打开「Codex」。

### 确认路由已生效

看到这个标记，才说明请求会走本地转发。

- 回到主界面，这条配置名字旁边有蓝色小标「需要路由」。

## 8. 启用并检测链路

配置齐了启用一下，检测显示连通正常再往下走。

### 让配置生效

不启用的话配置不会写进 Codex。

- 回到 CC Switch 主界面 → 点「启用」→ 再点右侧波形图标检测链路，弹出「连通正常」即可。

## 9. 彻底重启 Codex

Codex 只在启动时读一次配置，这一步不做，前面所有配置都不会生效。

### 彻底退出再打开

关窗口不算退出，它还会在后台驻留。

- 完全退出 Codex → 打开任务管理器确认没有残留的 Codex 进程 → 结束它 → 重新启动 Codex。

## 常见问题

### Codex 怎么配置 Claude 无限卡？

在 CC Switch 新增 Codex 供应商，填接口地址（带 /v1）与 API Key，默认模型填 claude-opus-5-5，上游格式选 Anthropic Messages，开启路由里的 Codex 开关，启用检测后彻底重启 Codex。

### Codex 改了配置不生效？

Codex 只在启动时读一次配置，改完必须彻底退出（任务管理器里结束进程）再打开，单纯关窗口不算。

### 上游格式为什么必须选 Anthropic Messages？

本卡是 Anthropic 兼容端点，Codex 选 Chat Completions 或 Responses 会按 OpenAI 协议发请求而连不上。选 Anthropic Messages 时必须同时开启路由。

### 检测链路显示正常但 Codex 里报错？

先确认路由总开关和 Codex 那个应用开关都打开了；只有总开关开着、应用开关没开，请求不会被转发。

## 相关阅读

- [Claude Code 与 Codex CLI 怎么选](../knowledge/claude-code-vs-codex.md)
- [Claude Code 教程：第一次会话之后怎么用](../knowledge/claude-code-tutorial.md)
- [常见问题：开通与配置](https://claude-unlimited.aiautotools.com/faq#cat-setup)
