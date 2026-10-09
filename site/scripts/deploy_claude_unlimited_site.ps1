#Requires -Version 5.1
<#
.SYNOPSIS
  构建并部署 Claude 无限卡官网到 Cloudflare Pages（直接上传模式），随后可选通知搜索引擎。
.DESCRIPTION
  托管抽象层：Pages / Workers Static Assets 的差异全部收敛在本文件，站点源码无需改动即可切换托管方式。
  与仓库根目录无关，只依赖 site/ 自身；可从任意目录调用。
#>
param(
  [switch]$SkipNotify,
  [string]$ProjectName = 'claude-unlimited-site',
  # 部署到生产分支才会更新 <project>.pages.dev；传 -Branch 得到的是预览地址。
  [string]$Branch = 'master'
)

$ErrorActionPreference = 'Stop'
$SiteDir = Split-Path -Parent $PSScriptRoot
Set-Location $SiteDir

if (-not $env:CLOUDFLARE_API_TOKEN) {
  throw '缺少环境变量 CLOUDFLARE_API_TOKEN。请在本机 PowerShell 配置文件 / 会话里设置（参考项目 Product 用的同一个 token），不要写进仓库。'
}

npm run build
if ($LASTEXITCODE -ne 0) { throw 'build 失败，已中止部署' }

# --commit-dirty=true：当前仓库尚未设置 git remote，wrangler 拿不到提交信息，不加这个参数会直接拒绝部署。
npx --yes wrangler@4 pages deploy .vitepress/dist --project-name=$ProjectName --branch=$Branch --commit-dirty=true
if ($LASTEXITCODE -ne 0) { throw 'wrangler 部署失败' }

Write-Host ''
Write-Host "线上地址（分支 $Branch）：https://$ProjectName.pages.dev"
Write-Host '自定义域、GitHub 备份、ICP 备案等上线后事项见 site/README.md「上线前必须确认」。'

if (-not $SkipNotify) {
  $seo = Join-Path $PSScriptRoot 'claude_unlimited_seo_notify.ps1'
  if (Test-Path $seo) {
    pwsh -NoProfile -File $seo
  } else {
    Write-Host '跳过 SEO 通知：未找到 claude_unlimited_seo_notify.ps1（首版未内置，需要时按参考项目 scripts/marketing_seo_notify.ps1 复制一份）'
  }
}
