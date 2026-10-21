# 维护说明

给维护这个仓库的人看的操作笔记。踩过的坑与原因。

## 改 `.github/workflows/` 需要带 `workflow` scope 的凭据

OAuth 令牌（`gho_`）默认只带 `gist` / `read:org` / `repo`，推 workflow 文件会被 GitHub 整次拒绝：

```
! [remote rejected] master -> master (refusing to allow an OAuth App to create
  or update workflow `.github/workflows/ci.yml` without `workflow` scope)
```

本机可用的凭据是 `futianren` 的 `ghp_` PAT。

**全局 git config 里挂着 `gh` 的凭据助手，它优先于 `GIT_ASKPASS` 回答凭据**，所以必须 `git -c credential.helper= push` 清空 helper 链，否则 askpass 不生效、仍然会用到没有 workflow scope 的令牌。

## 本地验收

```bash
cd site
npm run build        # 构建链：结构门禁、SEO 与地理门禁、死链、CSS 检查
npm run verify       # 逐页验收断言
npm run check:links  # 死链
npm run check:css    # 改了 .vitepress/theme/**/*.css 必跑
```

## 部署

`site/scripts/deploy_claude_unlimited_site.ps1`（先 `npm run build`，再 `wrangler pages deploy`）。站点域名 `claude-unlimited.aiautotools.com` 绑在 Cloudflare Pages 项目 `claude-unlimited-site` 上。

**部署前先清掉 `site/public/videos/*.mp4`**。这些是本地草稿预览用的副本，gitignore 了、不在版本库里，但真实仓库里它们会被复制进 dist。Cloudflare Pages 单文件上限 25 MiB，本地那批 mp4 超过这个上限，会让部署直接失败。线上视频的真实地址是 R2 CDN（`media.claude-unlimited.aiautotools.com`），本地副本只给端口 41802 的草稿预览用。

## 搜索推送

`site/scripts/seo_notify.ps1` 走 IndexNow + Bing + 百度 + GSC。百度的每日配额与 GSC 的服务账号权限见 [`seo_geo_infrastructure.md`](seo_geo_infrastructure.md)。

## README 是生成的

仓库根 `README.md` 里的清单区块（知识库、教程索引、套餐价格、精选 FAQ、站点页面）由 `site/scripts/gen_readme_index.ts` 从 `site/config/` 生成。

```bash
cd site
npm run gen:readme    # 重新生成
npm run check:readme  # 校验 README 与生成结果一致（CI 跑的就是这条）
```

**不要手改 `<!-- readme:xxx:start -->` 与 `<!-- readme:xxx:end -->` 之间的内容**，改数据源后跑 `gen:readme`。手写区在哨兵之外，脚本永不触碰。

CI 在 build 之前跑 `check:readme`，只依赖 `config/` 与 `docs/`，不依赖 dist，失败得快。

## 门禁数字不要手写

`site/CLAUDE.md` 的硬规则之一是「数字不许手写进文档」。README 里原有的「22 篇 / 17 步 / 55 处断言」已经漂过：PR 模板写「20 步」而构建链是 17 步；「55 处断言」是写 README 时的快照，`scripts/verify_build.py` 里的断言点已经更多。

现在这些数字都由脚本派生。断言数暂时不在 README 出现——`check()` 调用点在循环里会展开，静态计数不等于运行时条数，写上去仍然是漂移点。
