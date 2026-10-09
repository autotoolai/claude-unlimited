# vpns.beer 代理平台自动化

> 自动化脚本说明（原「项目总览」，2026-10-09 拆出）。脚本与用法保持不变，后续本节内的细节更新请只改本文件。

## 目标网站

- 登录页：https://vpns.beer/agent/
- 登录接口：`POST /api/agent/login`，请求体 `{"username": "...", "password": "..."}`，返回体含 `token`
- 登录态：`localStorage` / `sessionStorage` 中的 `covs_agent_session_token`，后续请求用 `Authorization: Bearer <token>`
- 站点不使用 Cookie 做登录态；Cookie 只在会话文件里用来记录新鲜期（脚本自写入，30 天有效）

## 文件

- `scripts/agent_login.py`：登录 / 校验 / 保存会话。已保存账号时默认无头自动登录，token 失效自动重新登录
- `scripts/agent_login_keep.py`：只读查看器，用已保存的 token 打开浏览器窗口并保持，可直接操作
- `scripts/agent_session_helper.py`：把脚本转到交互桌面会话（RustDesk 所在）运行；`--session` 查看会话信息
- `config/agent_session.json`：账号密码 + token + localStorage（明文，已 gitignore）
- `config/agent_storage_state.json`：标准 Playwright storageState，给其它脚本 / Playwright MCP 复用
- `config/mcp_playwright_config.json`：Playwright MCP 配置，让 MCP 浏览器自动加载 storageState
- `temp/`：临时文件（页面快照、下载内容、窗口日志），无需清理

## 用法

在 RustDesk 能看到的桌面（会话 1）里打开 PowerShell 或 CMD：

```powershell
cd C:\Users\Administrator\Documents\Token_Platform

# 打开已登录的浏览器窗口并保持，可直接在上面操作；关掉窗口即退出
python scripts\agent_login_keep.py

# 只校验已保存的 token 是否还有效（无头）
python scripts\agent_login.py --check

# 手动重新登录并覆盖保存（会弹出登录窗口）
python scripts\agent_login.py --save

# 更新保存的密码
python scripts\agent_login.py --password "新密码"
```

在 Claude Code 的工具进程里执行 `python scripts\agent_login_keep.py --save` 这类需要弹窗的命令时，脚本会自动转到交互桌面会话再启动，日志写到 `temp/login_window.log`。

依赖：`pip install playwright && python -m playwright install chromium`

## Playwright MCP 自动登录

MCP 服务器启动时加上 `--config config/mcp_playwright_config.json`，浏览器会带着 storageState 里的 token 打开页面。token 过期时先跑一次 `python scripts\agent_login.py` 刷新。

## 安全提醒

`config/agent_session.json` 里是明文账号密码和 token，`config/agent_storage_state.json` 里是 token。只在本机使用，不要提交 git、不要发给别人或贴到聊天记录里。

---

# Claude 无限卡官网（`site/`）

> 本节只保留入口；完整细节（技术栈、命令、路由、验收项、上线前清单、已知问题）见 `site/README.md`。

独立的静态展示站：介绍商品与接入方式，把购买导流到第三方发卡站。不处理支付、不接数据库、零后端。

- 代码：`site/`（VitePress 1.6.4 + Vue 3 + 原生 CSS，Cloudflare Pages）
- 细节与上线清单：`site/README.md`
- 方案与信息架构：`~/.claude/plans/claude-stateless-lamport.md`
- 采集素材（不入库）：`temp/aiprimetech_site/`（竞品资产，仅作选题参考，禁止直搬）

## 上线状态（2026-10-09）

- Pages 项目 `claude-unlimited-site`（直接上传模式，生产分支 `master`，域 `claude-unlimited-site.pages.dev`）
- 部署命令：`cd site && pwsh -File scripts/deploy_claude_unlimited_site.ps1`（本机环境变量 `CLOUDFLARE_API_TOKEN`）
- 自定义域、GitHub 备份仓库、ICP 备案与运营主体：见 `site/README.md`「上线前必须确认」
