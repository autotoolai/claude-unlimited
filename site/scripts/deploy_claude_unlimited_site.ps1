#Requires -Version 5.1
<#
.SYNOPSIS
  Build the Claude unlimited-card site and deploy dist to Cloudflare Pages (direct upload).
.DESCRIPTION
  Hosting abstraction only: the Pages / Workers Static Assets differences are confined to this file.
  Chinese notes live in scripts/deploy_claude_unlimited_site.md, because PowerShell 5.1 reads BOM-less
  .ps1 files as ANSI and any non-ASCII char (even inside a comment) may trigger a ParserError.
#>
param(
  [switch]$SkipNotify,
  [string]$ProjectName = 'claude-unlimited-site',
  # Only the production branch updates <project>.pages.dev; any other branch yields a preview URL.
  [string]$Branch = 'master'
)

$ErrorActionPreference = 'Stop'
$SiteDir = Split-Path -Parent $PSScriptRoot
Set-Location $SiteDir

if (-not $env:CLOUDFLARE_API_TOKEN) {
  throw 'Missing env var CLOUDFLARE_API_TOKEN. Set it in your PowerShell profile / session (same token as the Product project); never commit it.'
}

npm run build
if ($LASTEXITCODE -ne 0) { throw 'build failed, deploy aborted' }

# Guard: the build chain copies site/public/ into dist at the very last step
# (scripts/copy_public.mjs). If any earlier step fails, dist holds only the
# VitePress html/assets and every public file is missing: _redirects gone, so
# retired URLs 404 instead of 301; favicon.svg 404; robots.txt replaced by the
# Cloudflare managed one; og images and public/**/*.md mirrors 404.
# The HTML pages still look correct, so this is invisible unless asserted here.
$RequiredDistFiles = @('_redirects', '_headers', 'favicon.svg', 'robots.txt', 'llms.txt')
$MissingDistFiles = @()
foreach ($f in $RequiredDistFiles) {
  if (-not (Test-Path (Join-Path $SiteDir ".vitepress/dist/$f"))) { $MissingDistFiles += $f }
}
if ($MissingDistFiles.Count -gt 0) {
  throw ("dist is missing public files: " + ($MissingDistFiles -join ', ') + ". " +
    "The build did not reach scripts/copy_public.mjs. Abort before deploying a partial dist.")
}

# --commit-dirty=true: required when the working tree is dirty or the repo has no commit metadata yet.
npx --yes wrangler@4 pages deploy .vitepress/dist --project-name=$ProjectName --branch=$Branch --commit-dirty=true
if ($LASTEXITCODE -ne 0) { throw 'wrangler deploy failed' }

Write-Host ''
Write-Host "Online URL (branch ${Branch}): https://${ProjectName}.pages.dev"
Write-Host 'Custom domain, GitHub backup, ICP filing and other post-launch items: see site/README.md'

if (-not $SkipNotify) {
  # 部署成功后通知 IndexNow / Bing / GSC（百度未配 token 会自动跳过）
  $seo = Join-Path $PSScriptRoot 'seo_notify.ps1'
  if (Test-Path $seo) {
    pwsh -NoProfile -File $seo
  } else {
    Write-Host 'Skip SEO notify: scripts/seo_notify.ps1 not found.'
  }
}
