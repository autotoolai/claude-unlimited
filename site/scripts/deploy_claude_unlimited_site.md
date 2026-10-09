# deploy_claude_unlimited_site.ps1 说明

## 作用

构建 `site/` 并把 `.vitepress/dist` 以「直接上传」方式推到 Cloudflare Pages 的生产分支，只依赖 `site/` 自身，不硬编码仓库根路径，可从任意目录调用。

```powershell
# 需要本机已设置 CLOUDFLARE_API_TOKEN（与参考项目 Product 共用同一个 token，不要写进仓库）
cd site
pwsh -File scripts/deploy_claude_unlimited_site.ps1 -SkipNotify

# 只发到预览地址，不更新 pages.dev
pwsh -File scripts/deploy_claude_unlimited_site.ps1 -Branch preview -SkipNotify
```

参数：`-SkipNotify` 跳过 SEO 通知；`-ProjectName` 默认 `claude-unlimited-site`；`-Branch` 默认 `master`（生产分支，只有它会更新 `<project>.pages.dev`）。

## 为什么脚本里没有中文

本机 `pwsh` 指向 **Windows PowerShell 5.1**，它按系统 ANSI 代码页（936）读取**无 BOM** 的 `.ps1`，中文注释里的字会被解成乱码，个别字节恰好落到引号 / 反引号等语法符号上就会 ParserError（典型报错：`表达式或语句中包含意外的标记`、位置指向 `throw` 或参数默认值，与中文所在的行无关）。加 UTF-8 BOM 也救不了参考项目 `Product/scripts/deploy_marketing_site.ps1` 之外的场景，因为不同机器的 ANSI 代码页不同。

结论：**脚本逻辑与注释全用 ASCII**，中文说明放在这个 `.md` 里。参考项目的脚本能跑，是因为它的注释恰好没有触发那种字节组合，不要据此以为 5.1 能处理中文。

`Write-Host` 里拼变量要用 `${Branch}` 而不是 `$Branch:`，否则 5.1 会把 `Branch:` 当成驱动器限定语法。

## 流程

1. 检查 `CLOUDFLARE_API_TOKEN`，缺则直接抛错。
2. `npm run build`：VitePress 构建 → `gen_sitemap.ts` 生成 sitemap → `copy_public.mjs` 复制 `public/` 并清理 SSR 注释标记 → `check_dist.mjs` 结构门禁（外壳齐全、外壳内 H1 唯一、目录锚点全部命中、无未渲染模板）。任一步失败即中止，不部署。
3. `wrangler@4 pages deploy .vitepress/dist --project-name=claude-unlimited-site --branch=master --commit-dirty=true`。
4. 打印线上地址；若存在 `claude_unlimited_seo_notify.ps1` 则调用（首版未内置，脚本会提示跳过）。

## Pages 项目

`claude-unlimited-site`，直接上传模式，生产分支 `master`，项目 ID `3b3e80aa-3a64-4d73-bdec-64ce9314ca83`。因为是直接上传，Cloudflare 后台的构建命令 / 输出目录 / Node 版本对线上站点不生效，只有切到 Git 集成时才需要填。
