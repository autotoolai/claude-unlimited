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

# --commit-dirty=true: required when the working tree is dirty or the repo has no commit metadata yet.
npx --yes wrangler@4 pages deploy .vitepress/dist --project-name=$ProjectName --branch=$Branch --commit-dirty=true
if ($LASTEXITCODE -ne 0) { throw 'wrangler deploy failed' }

Write-Host ''
Write-Host "Online URL (branch ${Branch}): https://${ProjectName}.pages.dev"
Write-Host 'Custom domain, GitHub backup, ICP filing and other post-launch items: see site/README.md'

if (-not $SkipNotify) {
  $seo = Join-Path $PSScriptRoot 'claude_unlimited_seo_notify.ps1'
  if (Test-Path $seo) {
    pwsh -NoProfile -File $seo
  } else {
    Write-Host 'Skip SEO notify: claude_unlimited_seo_notify.ps1 not found (not bundled in v1; copy from the reference project Product/scripts/marketing_seo_notify.ps1 when needed).'
  }
}
