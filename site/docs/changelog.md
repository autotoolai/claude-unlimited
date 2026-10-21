# 变更历史

倒序记录。每条一行，说清「改了什么、为什么、影响谁」。当前状态与操作方式看 `README.md`，不在这份里。

## 2026-10-20

- **官网源码公开**：本仓库（`github.com/autotoolai/claude-unlimited`）以 MIT 许可公开，
  含全部站点源码、22 篇知识库正文与构建门禁。页脚「关于」列新增「源码（GitHub）」入口，
  结构化数据的 Organization.sameAs 与 `llms.txt` 同步指认同一实体，官网与仓库互相可指。
  开源的只有前端展示层：调用通道、额度分发与服务由运营方独立运营，仓库里没有后端代码与密钥。
  购买、兑换与售后一律以官网与管理后台为准。
- **教程页重构为索引页 + 5 个客户端场景页**：买家拿到手的问题是「我想在我用的那个工具里跑起来」，
  而不是「我是新手还是高手」。教程改为按客户端分流（Claude Code / 桌面版 / Codex / WorkBuddy / Cursor），
  每条路线都从换取 API Key 到检测链路给完整步骤与真实截图。旧锚点（如 `/guide#models`）由客户端
  读 hash 后整页跳转到对应场景页，爬虫与无 JS 客户端拿到的是索引页本身。
- **教程索引页瘦身**：索引页不再显示页内目录（客户端场景页的目录保留），也删掉了
  「所有客户端都从这一步开始」与「不确定用哪个？」两段说明。换 Key 的步骤与选型建议
  在各自场景页里说，索引页只留「选一个你用的客户端」这一段。
- **内网信息脱敏**：内网地址与本机主机名改为占位符，代码侧改从 `config/local/dev_endpoints.json`
  读取本机端点（该文件只在本机保留，不入库）；构建门禁新增「引用了但没定义也没兜底的 CSS 变量」
  一类检查，修掉截图框在深浅两套模式下都无边框的缺陷。

## 2026-10-13

- **知识库封面重选**：22 篇封面全部换过一轮。原映射里 tutorial 与 cli-cheatsheet 用了同一张图，
  skills 用了 ECC 安装教程封面、usage-limit 用了版本功能封面、529 用了订阅涨价公告图，语义都跑偏。
  现按文章主题逐篇重挑。素材与来源台账见 `config/knowledge_cover_map.json` 与 `config/knowledge_cover_sources.json`。
- **封面来源可追溯**：`scripts/fetch_knowledge_covers.py` 新增来源台账写入，
  每张封面记录 `blog:<末段>`（源站直抓）或 `cover_map:<素材名>`（本地素材）。
- **埋点 channel id 内联**：`analytics_snippets.ts` 填入 Umami website id 与百度统计 id，换站只改这一处。
- **教程页信息结构重构**：轨内取消重新分流，只留轨级分段切换。规范见 `docs/guide_design_spec.md`。

## 2026-10-12

- **教程页两级编号定规**：编号只出现在 H2；多子步骤的组才画次级墨色徽标；截图前加「子步骤 N」；全页 kicker 归零。
- **流量统计三通道定案**：Cloudflare Web Analytics 出站点级请求量，Umami 出真人访问与 CTA 事件，
  百度只作国内参照且不进本地看板。三者口径不同，绝不合并。详见 `README.md`「流量统计与看板」。
- **教程页数据源切换**：教程正文从卖家教程站改为买家腾讯文档《AI工具使用教程》的 9 张真实截图。

## 2026-10-10

- **知识库上线**：22 篇原创文章，`/knowledge` 列表页 + 文章页，四分类 start / how / cost / troubleshoot。
  配图脚本 `gen_knowledge_og.py` / `gen_knowledge_routes.mjs` / `fetch_knowledge_covers.py`。
- **内容结构第三轮重构**：
  - 首页从 9 块降到 5 块，删掉六个纯导航或重复块。
  - `/unlimited` 并入 `/pricing` 并 301。
  - 模型广场从 6 块降到 4 块。
  - 主导航从 6 项降到 4 项，管理后台移出主导航。
  - 新增 `config/rules.ts`，限流数字单点化。此前这些数字在 4 处各写一份。
  - 定价页 JSON-LD 改为 Product + FAQPage。
  - 规范落进 `docs/content_structure.md`。
- **套餐定价改由发卡站商品详情为准**，流程见 `docs/plans_sync.md`。

## 2026-10-09

- **上线**：https://claude-unlimited.aiautotools.com ，Cloudflare Pages 直接上传模式。
- **内容结构第一、二轮**：正文从 markdown 迁到 `.vue` 页面组件（`docs/README.md`「历史」一节有原因）。
- **体验改动**：购买入口收敛为页头一处；FAQ 分层折叠与「买之前五个问题」常开区；正文限宽 44rem；
  深色模式跟随系统；分享卡片 OG 图；在线助手浮标上线，人工客服并入助手面板。
- **设计语言定案**：从「暖纸底 + 品牌橙」改为近乎无彩的墨色体系。
  token 定义集中在 `.vitepress/theme/styles/00_base.css`，头部注释即规范原文。

## 2026-10-08 及以前

- 官网初版，正文写在 markdown 里。原文已归档到 `archive/docs_before_20261008/`，不再维护。
