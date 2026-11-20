<!-- markdown mirror for AI / agents; HTML: https://claude-unlimited.aiautotools.com/guide/cli -->

# Claude Code CLI 教程：终端安装与配置

> **一句话答案**：Claude Code CLI 只要五步：把卡密换成 API Key，用官方安装脚本装上 CLI，设 ANTHROPIC_BASE_URL 与 ANTHROPIC_API_KEY 两个环境变量，在项目目录里跑 claude 验证，最后用 /init 生成 CLAUDE.md 开始第一段会话。

终端里跑 Claude Code，跟着走完这五步就能开始第一段会话。

## 1. 换取 API Key

卡密在发货信息里，到 rsxermu666.cn（管理后台）换成一把 sk- 开头的 API Key，后面全程只用它。

### 把卡密换成 API Key

后面每一步都要填这把 Key，别提前改。

- 打开下面的管理后台 → 在「我的面板」或「提取 Key」页面粘贴激活码 → 提交激活 → 复制拿到的 Key。

注意：
- 激活码、API Key、用量记录都存在后台里：换设备、换浏览器都不影响，忘了就回后台用同一把激活码再看。
- 主域名打不开时，用后台里的备用域名（bxcv.store），API Key 不用换。

## 2. 安装 Claude Code CLI

官方推荐用安装脚本装，Windows、macOS、Linux 各一条命令，装完就有 claude 这个命令。

### 按你的系统跑一条安装命令

装完先确认版本，别用旧版本。

- Windows（PowerShell）：irm https://claude.ai/install.ps1 | iex
- macOS / Linux：curl -fsSL https://claude.ai/install.sh | bash
- 也可以用包管理器：macOS 跑 brew install --cask claude-code，Windows 跑 winget install Anthropic.ClaudeCode

### 验证一下装好了

确认命令能跑，版本号出来了就说明装成功。

- 新开一个终端窗口 → 输入 claude --version → 看到版本号就成了。

## 3. 设置地址与 Key

CLI 只认两个环境变量：ANTHROPIC_BASE_URL 指向网关，ANTHROPIC_API_KEY 放那把 sk- 开头的密钥。

### 在当前终端里先临时设置两个变量

先验证这条路走得通，再决定要不要长期保存。

- Windows（PowerShell）：$env:ANTHROPIC_BASE_URL = "https://rsxermu666.cn"
- Windows（PowerShell）：$env:ANTHROPIC_API_KEY = "sk-你的Key"
- macOS / Linux：export ANTHROPIC_BASE_URL=https://rsxermu666.cn
- macOS / Linux：export ANTHROPIC_API_KEY=sk-你的Key

### 要长期用，就写进配置文件

每次开新终端都自动带着这两个变量，不用再手敲。

- 编辑用户配置文件 ~/.claude/settings.json（Windows 在 %USERPROFILE%\.claude\settings.json），在 env 块里写这两个变量。

注意：
- 想让 CC Switch 帮你写配置（地址、Key、模型一次到位），见插件教程的一键导入；这一步是纯手填的做法，两条路等效。

## 4. 验证链路

发一句话就能验证：能正常回答，说明地址、Key、模型三样都对。

### 确认连的是本卡

没走本卡的话，会去连官方地址要你登录。

- cd 进你的项目目录 → 输入 claude → 会话里输入 /status → 看 Anthropic base URL 和鉴权那两行。

### 发一句话试

真正走通一次请求。

- 随便问一句，比如「你是什么模型」，能正常回答就说明整条链路通了。

## 5. 第一次会话怎么开始

进项目第一件事是 /init，让它先读懂你的仓库再动手。

### 先让它读懂项目

把项目约定写成文件，之后每个会话都自动带着它。

- 在项目目录里输入 /init → 它会扫描仓库并起草 CLAUDE.md → 花一分钟把构建命令、测试命令、约定改对。

### 大改动先看计划

改动大的时候先看它的计划，确认了再让它改。

- 按 Shift+Tab 切到计划模式，或输入 /plan 让它先给方案；模型用 /model 切，比如 /model claude-opus-5-5。

## 常见问题

### Claude Code CLI 怎么装？

Windows 在 PowerShell 里跑 irm https://claude.ai/install.ps1 | iex，macOS 与 Linux 跑 curl -fsSL https://claude.ai/install.sh | bash，装完开个新终端输入 claude --version 验证。

### 不用 CC Switch 能配吗？

能。CLI 认两个环境变量：ANTHROPIC_BASE_URL 填网关根地址（不带 /v1），ANTHROPIC_API_KEY 填 sk- 开头的 Key。也可以写进 ~/.claude/settings.json 的 env 块长期生效。

### 装完提示找不到 claude 命令？

安装目录还没进 PATH。关掉当前终端窗口重开一个再试；还不行就把安装目录加进系统 PATH，或者去 CC Switch 一键导入配置，它会替你把配置写好。

### 怎么确认它连的是本卡而不是官方？

进会话后输入 /status，看 Anthropic base URL 那行是不是管理后台的地址、鉴权那行是不是 ANTHROPIC_API_KEY，对了就是走的本卡。

## 相关阅读

- [Claude Code 命令与参数速查：会话内和命令行](../knowledge/claude-code-cli-cheatsheet.md)
- [Claude Code 插件教程：VS Code 与 Cursor](cc.md)
- [Claude Code 教程：第一次会话之后怎么用](../knowledge/claude-code-tutorial.md)
