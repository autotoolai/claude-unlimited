<!-- markdown mirror for AI / agents; HTML: https://claude-unlimited.aiautotools.com/knowledge/claude-code-permission-modes -->
---
layout: page
knowledge: true
title: Claude Code 权限模式有哪些
description: default、acceptEdits、plan、auto、dontAsk、bypassPermissions 六种权限模式的差别，跳过权限到底跳过了什么，无人值守任务怎么配。
category: start
kicker: Claude Code
head:
  - - meta
    - property: og:title
      content: Claude Code 权限模式有哪些 · Claude 知识库
  - - meta
    - property: og:description
      content: 六种权限模式的差别、--dangerously-skip-permissions 跳过了什么、无人值守任务怎么配。
---

# Claude Code 权限模式有哪些

> 正式发布地址：[claude-unlimited.aiautotools.com/knowledge/claude-code-permission-modes](https://claude-unlimited.aiautotools.com/knowledge/claude-code-permission-modes) ｜ 源码与文档：[GitHub 仓库](https://github.com/autotoolai/claude-unlimited)

> **一句话答案**：Claude Code 有 6 种权限模式——default、acceptEdits、plan、auto、dontAsk、bypassPermissions，它们决定「哪些动作要问你」。default 在界面上叫 Manual（也接受 manual 作别名），acceptEdits 自动接受文件编辑与 mkdir/touch/mv/cp 这类常见文件操作，plan 只读探索（auto 可用时分类器放行的命令也能跑），auto 由后台分类器判断动作是否对齐你的请求，dontAsk 把所有会触发询问的调用直接拒绝，bypassPermissions 跳过常规审批但仍保留「没有任何模式会自动批准」的那部分保护。无人值守的长时间任务用 auto 加 `--permission-prompts none` 最稳，再用 `--max-turns 30` 兜住失控循环；跳过权限只在容器或一次性沙箱里做。

多数人把权限模式当成「安全等级刻度」，其实它是一组**行为开关**：每种模式改的是「哪些动作停下来问你」，而不是整体收紧或放宽。六种模式的边界经常被混为一谈，选错一个的代价不是「不够安全」，而是「本该拦的没拦，或者本该做的被卡住」。

## 六种权限模式

**结论**：六种模式的差别只在「哪些动作会停下来问你」。

| 模式 | 基线行为 | 什么时候用 |
|---|---|---|
| `default` | 每个工具调用都等你批准（界面里叫 Manual） | 不确定场景的默认值 |
| `acceptEdits` | 自动接受文件编辑与 `mkdir`、`touch`、`mv`、`cp` 等常见文件操作；命令仍要批准 | 信任代码库，想少点几下 |
| `plan` | 只读规划，不改任何东西 | 动手前先看方案 |
| `auto` | 分类器判断，对齐你请求的动作直接跑，其余拦下来 | 长时间无人值守 |
| `dontAsk` | 需要询问的动作一律拒绝，其余直接做 | 脚本与 CI |
| `bypassPermissions` | 跳过常规审批 | 只在容器或一次性沙箱里 |

`default` 会话内按 `Shift+Tab` 循环切换，也可以用 `/permissions` 随时改。切换到 `auto` 需要对应的模型与账号支持；不满足时用启动参数指定它不会生效。

### 六种模式的作用域对照

**结论**：模式决定「问不问你」，规则（`allow` / `ask` / `deny`）决定「允不允许」。两者正交，规则优先级更高。

| 能力 | default | acceptEdits | plan | auto | dontAsk | bypassPermissions |
|---|---|---|---|---|---|---|
| 读文件（工作目录内） | 直接跑 | 直接跑 | 直接跑 | 直接跑 | 直接跑 | 直接跑 |
| 改文件 | 询问 | 自动 | 不做 | 分类器判 | 询问→拒绝 | 跳过询问 |
| 执行 shell 命令 | 询问 | 询问 | 只读命令直接跑 | 分类器判 | 询问→拒绝 | 跳过询问 |
| 网络请求 | 询问 | 询问 | 询问 | 分类器判 | 询问→拒绝 | 跳过询问 |
| 已知只读命令（`ls`/`cat`/`grep`/`git status` 等） | 直接跑 | 直接跑 | 直接跑 | 可能等分类器 | 直接跑 | 直接跑 |

注意最后一行：有一组内置的只读命令（`ls`、`cat`、`echo`、`pwd`、`head`、`tail`、`grep`、`find`、`wc`、`which`、`diff`、`stat`、`du`、`cd` 以及只读形式的 `git`），Claude Code 在几乎所有模式下都不为它们弹提示。这个集合**不可配置**——想让它询问，得自己加 `ask` 或 `deny` 规则。

## --dangerously-skip-permissions 到底跳过了什么

**结论**：它跳过的是常规权限审批，不是所有检查。

```bash
claude --dangerously-skip-permissions
# 等价写法
claude --permission-mode bypassPermissions
```

这两个都不会导致「每个动作都必须成功」或「Claude Code 再也不会问你任何问题」。官方明确建议只在隔离环境（容器、一次性沙箱、可以随时丢弃的虚拟机）里用。

在 bypass 模式下，Claude Code 会跳过权限提示，**包括**对 `.git`、`.claude` 这类受保护路径的写入。但仍有两层不随 bypass 消失：

- **跨会话消息的安全措施**（cross-session messaging safeguards）始终生效；
- **没有任何模式会自动批准的动作**（except for the actions no mode auto-approves）依然会被拦。

## --allow-dangerously-skip-permissions 是什么

**结论**：它只是让 bypass 模式「可用」，不会立刻激活。

```bash
claude --permission-mode plan --allow-dangerously-skip-permissions
```

这条命令以计划模式启动，同时保留中途切到 bypass 的能力。`allow` 这个词是关键：没有它，`bypassPermissions` 在很多账号上压根不能被选中。

反过来，组织可以用 `permissions.disableBypassPermissionsMode` 或 `permissions.disableAutoMode` 把这两个模式彻底关掉：

```json
{
  "permissions": {
    "disableBypassPermissionsMode": "disable",
    "disableAutoMode": "disable"
  }
}
```

这两个键放在托管设置（managed settings）里最有用——那是开发者覆盖不了的地方。

## 「不问我」有两种意思

**结论**：「自动批准动作」和「永不因权限提示停下」是两个不同目标，配置方式不同。

- 想自动批准 → `auto` 模式，由分类器逐个判断。
- 想永不因权限提示停下 → `auto` 加 `--permission-prompts none`：本来会弹提示的动作一律拒绝，会话在允许的范围内继续。
- 想全部放行 → `bypassPermissions`，只在隔离环境。

官方还提供了一个更精确的开关 `permissions.denyInsteadOfPrompting`：设成 `true` 之后，本来会停下来问你的调用一律按拒绝处理，**而不会切到你当前所在的权限模式**。区别在于 `dontAsk` 本身就是一种模式，`denyInsteadOfPrompting` 是一个可以叠加在任意模式上的键。

`dontAsk` 模式比「一律拒绝」要精细一些：

- 工作目录内的文件读取、以及本来就不需要审批的动作照常执行；
- 通过 `/permissions` 或 `permissions.allow` 规则预授权的工具照常执行；
- 但 `AskUserQuestion`、`requiresUserInteraction` 标记的 MCP 工具、网络路径读取、组织设为 `ask` 的连接器工具，一律拒绝——**即使你已经 allow 过它们**。

## 无人值守跑长任务怎么配

**结论**：稳的组合是「自动执行 + 不问 + 限制轮次 + 非交互」四件套：`--permission-mode auto` 让它按安全规则自己走，`--permission-prompts none` 把没人能点的询问直接拒绝，`--max-turns` 给失控的循环封顶，`-p` 让它输出完就退出。

一个比较稳的组合：

```bash
claude \
  --permission-mode auto \
  --permission-prompts none \
  --max-turns 30 \
  -p "重构 src/legacy 目录下的三个模块，保持公开 API 不变，跑测试"
```

- `--permission-mode auto`：安全的自动做；
- `--permission-prompts none`：不会有人来点批准，不会的东西直接拒绝；
- `--max-turns`：即使它绕不出来也只烧 30 轮；
- `-p`：非交互，输出完就退出，适合 cron 与 CI。

这组参数的完整列表在[Claude Code 命令与参数速查：会话内和命令行](https://claude-unlimited.aiautotools.com/knowledge/claude-code-cli-cheatsheet)；`--max-turns` 为什么能兜住失控的循环，见[Claude Code 报 429 限流怎么办](https://claude-unlimited.aiautotools.com/knowledge/claude-code-429-rate-limit)。

## 为什么在项目设置里配 auto 没反应

**结论**：`defaultMode` 在项目的 `.claude/settings.json` 和 `.claude/settings.local.json` 里不接受 `auto` 和 `bypassPermissions`，出于安全设计这两项被限制。

要设为默认，写到用户设置 `~/.claude/settings.json`；或每次启动用 `--permission-mode auto` 显式指定。

这是「设置作用域」这套机制的一部分。Claude Code 一共读 4 类设置文件：

| 作用域 | 文件 | 影响谁 |
|---|---|---|
| 用户 | `~/.claude/settings.json` | 你在这台机器的所有项目 |
| 项目共享 | `.claude/settings.json` | 所有在这个目录工作的人（提交进仓库） |
| 项目本地 | `.claude/settings.local.json` | 只有你，只有这一个项目 |
| 托管 | `managed-settings.json` 等 | 组织部署到的所有人 |

改完不用重启——Claude Code 会监视设置文件并热重载，`permissions`、`hooks` 这类改动对运行中的会话直接生效。确认是否生效看 `/status` 的 **Setting sources** 行，它列出本次会话实际加载了哪些设置文件。

## 用 allow / ask / deny 规则收紧范围

**结论**：权限模式决定「问不问你」，规则决定「允不允许」。规则比模式优先。

```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "permissions": {
    "allow": [
      "Bash(npm run lint)",
      "Bash(npm run test *)"
    ],
    "deny": [
      "Read(./.env)",
      "Read(./.env.*)"
    ]
  }
}
```

规则语法是 `Tool` 或 `Tool(specifier)`，括号里的内容按字面匹配，所以路径里带括号也不用转义。

几个容易踩的点：

- **复合命令按子命令拆**。`safe-cmd && other-cmd` 需要**每一个**子命令都被允许才不弹提示。Claude Code 认识的分隔符是 `&&`、`||`、`;`、`|`、`|&`、`&` 和换行。
- **deny 与 ask 命中任何子命令就生效**，包括嵌在子 shell、命令替换或 `for` 循环里的那条。所以 `Bash(git clean *)` 这条 ask 规则，连 `cd /tmp && git clean -f` 和 `echo "$(git clean -f)"` 都会照样问。
- **批准复合命令会拆成多条规则**。批准 `git status && npm test` 实际存下的是 `npm test` 那条规则，这样以后无论前面接什么都能识别。单条复合命令最多存 5 条规则。
- **MCP 工具的通配写法**是 `mcp__<server>__*`，例如 `mcp__reports__v2__*`。裸的 `mcp__reports` 匹配不到工具，只匹配「名为 reports 的这个服务器」。

规则写错了不会整份文件失效：单独某条规则格式错误时，Claude Code 报 Settings Warning，跳过那一条，其余照常生效；只有 JSON 本身语法错误才会报 Settings Error。

## 和隔离措施一起用

**结论**：权限模式只是其中一层，容器与沙箱是另一层。跳过权限 + 一次性容器，是跑陌生代码或批量任务时唯一稳妥的组合。先在本地把动作验证过再放进这个组合，见[Claude Code 教程：第一次会话之后怎么用](https://claude-unlimited.aiautotools.com/knowledge/claude-code-tutorial)。

至少把工作目录放在容器里、网络出站限制到 API 端点、容器可随时销毁。

需要「不依赖命令文本」的强制边界时，用沙箱；要「在命令真正跑之前检查完整命令内容」，用 PreToolUse 钩子。权限规则解决的是「按工具和路径匹配」，这两者覆盖的是规则管不到的部分。

## 实战案例

**结论**：三个案例对应三种典型处境：新项目不敢用 auto 就先按命令粒度放行；CI 里不想被改文件就用 `dontAsk` 而不是 `bypass`；批量跑陌生仓库的脚本就放进一次性容器，用容器内的 bypass 换宿主机干净。

### 案例 1：先收紧，再放开

**问题**：新项目不敢用 auto，但 default 点得太累。

**做法**：先在项目设置里只放行你要跑的那几条命令，其余走 default：

```json
{
  "permissions": {
    "allow": ["Bash(npm run test *)", "Bash(git status)", "Bash(git diff *)"]
  }
}
```

确认几条都不弹提示之后，再决定要不要切到 `acceptEdits` 或 `auto`。

### 案例 2：CI 里跑一次性格式检查

**问题**：CI 无人值守，但不希望它顺手改代码。

**做法**：用 `dontAsk` 而不是 bypass——它会把「会触发询问」的动作直接拒绝，任务跑不完会明确失败，而不是偷偷改了文件。

```bash
claude --permission-mode dontAsk --max-turns 10 \
  -p "只读取 src/ 下的文件并报告 lint 问题，不要修改任何文件"
```

### 案例 3：批量任务跑在一次性容器里

**问题**：批量跑陌生仓库的脚本，宿主机不能被污染。

**做法**：容器内用 bypass，宿主机不留痕。

```bash
docker run --rm -v "$PWD:/work" -w /work my-image \
  claude --dangerously-skip-permissions \
  --max-turns 50 \
  -p "按 README 执行构建步骤并修复报错"
```

`--rm` 保证容器退出即销毁，宿主机不留任何残留。

## 怎么选（决策矩阵）

**结论**：按「要不要有人盯着」和「能不能承受被改文件」两个维度选，不用死记模式名。

| 你的处境 | 建议模式 | 原因 |
|---|---|---|
| 第一次用这个项目 | `default` | 每一步都能看清它要干什么 |
| 熟悉代码库，只想少点几下 | `acceptEdits` | 文件编辑自动，命令仍受控 |
| 想先看方案再决定 | `plan` | 零写入，看完再切回来 |
| 长任务、中途不方便盯 | `auto` | 分类器兜底，不安全动作会拦 |
| CI / 脚本，要确定性 | `dontAsk` | 不批准就失败，行为可预期 |
| 一次性容器里的批量任务 | `bypassPermissions` | 隔离已经承担了风险 |
| 团队项目，要统一约束 | `default` + `allow`/`deny` 规则 | 规则随仓库提交，队友一致 |
| 组织要求禁用 auto / bypass | 用托管设置关掉 | `disableAutoMode` / `disableBypassPermissionsMode` |

## 最佳实践

**结论**：权限配置是长期资产，不是临时开关。

1. **先在 `default` 下把规则写好**：`.claude/settings.json` 提交进仓库，队友和 CI 行为一致；个人例外放 `.claude/settings.local.json`。
2. **用 `/status` 确认加载**：改完设置先看 Setting sources 行，别猜。
3. **危险动作写 deny 而非 omit**：不写规则不等于禁止，只是回到「询问」。`.env`、`secrets` 这类路径要显式 deny。
4. **长任务必须加 `--max-turns`**：这是唯一能兜住「它绕不出去」的硬上限。

## 进阶技巧

**结论**：模式、规则、钩子、沙箱是四层防护，组合用才有意义。

### 用 PreToolUse 钩子做命令级检查

权限规则按工具名和路径匹配，看不到命令的完整内容。要在命令真正跑之前检查它到底要干什么，用 PreToolUse 钩子——它拿到的是完整命令文本，可以自己写判断逻辑。

### 用沙箱兜住规则覆盖不到的路径

符号链接是规则最容易漏的地方：当被编辑的路径本身是软链时，Edit 与 Write 工具会拒绝写入并转向链接目标；但如果路径上的**中间目录**是软链，或者写入是通过 Bash / PowerShell 命令完成的，就可能绕过去。要彻底堵住这类路径，用沙箱。

### 会话内用 /permissions 即时调

`/permissions` 可以随时加规则，且不写文件。它适合「这次会话临时放行一下」的场景；要固化再写进设置文件。

### 注意 Shift+Tab 在权限框里的行为

在权限提示的输入框里按 `Shift+Tab`，作用是关闭输入框而不回答——它和「批准本次会话剩余全部」的选项不是一回事（v2.1.235 之前的行为不同，现在以输入框内的实际提示为准）。这个差异在 v2.1.235 起已经调整，误按会丢掉你写的评论。

## 常见问答

**结论**：三个最高频的追问，答案都在上面，这里给出可以直接引用的短版本。

**Q：dontAsk 和 auto 有什么不同？**

auto 由后台分类器逐个判断动作是否对齐你的请求，不安全的拦下来并让 Claude 换一种做法；dontAsk 不做安全判断，把所有本来会触发询问的调用一律拒绝。两者都不会停下来问你，但前者更可能把任务做完，后者遇到需要确认的动作就直接失败。

**Q：权限规则 allow、ask、deny 哪个优先级高？**

规则比权限模式优先。deny 和 ask 命中复合命令里的任何子命令就生效，包括嵌在子 shell、命令替换或 `for` 循环里的那条；而 allow 要求**每一个**子命令都被允许，复合命令才不弹提示。

**Q：怎么在组织里禁用 bypassPermissions？**

在托管设置里设 `permissions.disableBypassPermissionsMode` 为 `disable`，auto 则用 `permissions.disableAutoMode`。这两个键放在托管设置里开发者覆盖不了，是组织级管控的标准做法。
