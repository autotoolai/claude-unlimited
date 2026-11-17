<!-- markdown mirror for AI / agents; HTML: https://claude-unlimited.aiautotools.com/guide/cc -->

# Claude Code 插件教程：VS Code、Cursor

> **一句话答案**：Claude Code 插件在 VS Code 与 Cursor 里是同一个 Anthropic 官方扩展：先用 CC Switch 一键导入配置并启用检测，再在编辑器的扩展面板里搜「Claude Code」、认准发布者 Anthropic 装上，用的就是前面配好的那把 Key。

装完官方插件就能在编辑器里用本卡的模型，这页把配置和安装一次做完。

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

## 3. 一键导入配置

管理后台里有「一键导入配置」按钮，不用手填 Base URL 和 Key，两边自动对上。

### 自动填好地址和 Key

手抄最容易把地址抄错，导入能跳过这一步。

- 回到管理后台 → 点「一键导入配置」→ CC Switch 弹出导入窗口 → 点「确认导入」。

## 4. 拉取并保存模型

导入的配置要再拉一次模型列表，CC Switch 才知道网关这边有哪些模型可用。

### 确认配置已导入

没导进来的话，后面拉不到模型。

- 打开 CC Switch → 左侧 Claude 那条配置标着「使用中」，就是导进来了。

### 拉取可用模型

模型名以网关返回的为准，手填容易填错。

- 双击这条配置进入「编辑供应商」→ 点「获取模型列表」。

### 选择你需要的模型并保存

把要用的模型加进来，不保存下一步启用后模型列表会是空的。

- 把 claude-fable-5-1、claude-opus-5-5、claude-opus-4-8、claude-sonnet-5-5 都添加进去，然后点「保存」。

## 5. 启用并检测链路

前面配完配置已经在 CC Switch 里但还没生效，这一步启用并检测一下，显示运行正常就完成了。

### 让配置生效

检测这一步能提前暴露地址填错的问题。

- 回到 CC Switch 主界面 → 点「启用」→ 再点「检测链路」，弹出「运行正常」即可。

## 6. 在 VS Code 里装插件

Anthropic 官方插件在扩展市场里，认准发布者是 Anthropic 就行——认错了装到的是同名的第三方仿冒品。

### 先装 VS Code

插件装在编辑器里，没有编辑器就无处可装。

- 打开下面这个官网，挑自己电脑的系统下载，一路下一步保持默认安装。

### 在扩展面板里装上插件，打开就能用

认准发布者 Anthropic 装上，确认插件读的是你刚配好的那把 Key，而不是让你再登一次 Anthropic 账号。

- 打开 VS Code 的扩展面板（Ctrl+Shift+X）→ 搜索「Claude Code」→ 确认发布者是 Anthropic → 点「安装」。
- 装完后左侧活动栏会出现 Claude Code 的图标（一个星形按钮）→ 点开 → 登录方式选「使用已有的 API 配置 / API Key」→ 直接发一句话试。

注意：
- 官方文档同时给了 VS Code 与 Cursor 两个安装入口，同一个扩展 ID（anthropic.claude-code），两边读的是同一份配置。
- 在 Cursor 里装的话，直接看下一节；只想在终端里用 Claude Code，看Claude Code CLI 教程。

## 7. 在 Cursor 里装同一个插件

Cursor 是 VS Code 的分支，同一个 Anthropic 官方插件能直接装——官方文档里就给了 Cursor 的安装入口。

### 装同一个官方扩展

和 VS Code 里是同一个扩展，配置也共用同一份。

- 打开 Cursor → 按 Ctrl+Shift+X → 搜「Claude Code」→ 认准发布者 Anthropic → 安装。

注意：
- 装好后的用法和 VS Code 一样：点左侧星形图标，登录方式选「使用已有的 API 配置 / API Key」。
- 插件自带一份命令行组件，聊天面板开箱即用；要在 Cursor 的集成终端里跑 claude 命令，另外装一次 CLI，见Claude Code CLI 教程。
- 不想装插件、只想让 Cursor 自己的补全用本卡的模型，是另一回事，填法见通用手动配置。

## 常见问题

### Claude Code 插件怎么配置 Claude 无限卡？

在管理后台换取 API Key，用 CC Switch 一键导入配置，拉一次模型列表并保存，启用后检测链路显示正常就算配好了；再到 VS Code 或 Cursor 的扩展面板装官方插件即可。

### VS Code 和 Cursor 用的是同一个插件吗？

是。扩展 ID 都是 anthropic.claude-code，Anthropic 官方文档同时给了 VS Code 与 Cursor 的安装入口，两个编辑器里读的是同一份配置。

### 一键导入后模型列表是空的？

点「获取模型列表」再拉一次，加进模型配置后点保存。列表为空通常是配置刚导入还没刷新，或者 Key 没生效。

### 插件里要填 API Key 吗？

不用。CC Switch 启用后配置已经写进 Claude Code 的用户配置，插件直接读它，登录方式选「使用已有的 API 配置 / API Key」就行。

## 相关阅读

- [Claude Code CLI 教程：终端安装与配置](https://claude-unlimited.aiautotools.com/guide/cli)
- [Claude Code 教程：第一次会话之后怎么用](https://claude-unlimited.aiautotools.com/knowledge/claude-code-tutorial)
- [Claude Code 命令与参数速查：会话内和命令行](https://claude-unlimited.aiautotools.com/knowledge/claude-code-cli-cheatsheet)
