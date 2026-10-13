#Requires -Version 5.1
<#
.SYNOPSIS
  官网发版后通知搜索引擎：IndexNow + Bing API + 百度推送（可选）+ GSC 交 sitemap。

.DESCRIPTION
  URL 列表从已构建的 sitemap.xml 读取，避免手写清单与站点内容脱节。

.EXAMPLE
  pwsh -File scripts/seo_notify.ps1
  pwsh -File scripts/seo_notify.ps1 -DryRun
#>
param(
  [switch]$DryRun,
  [string]$SitemapPath = '.vitepress\dist\sitemap.xml'
)

$ErrorActionPreference = 'Stop'
$SiteDir = Split-Path -Parent $PSScriptRoot
$RepoRoot = Split-Path -Parent $SiteDir   # 仓库根：密钥与 robots 里的站点定义在 ../config
Set-Location $SiteDir

function Import-DotEnv([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path)) { return }
  Get-Content -LiteralPath $Path -Encoding UTF8 | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith('#')) { return }
    $i = $line.IndexOf('=')
    if ($i -lt 1) { return }
    $k = $line.Substring(0, $i).Trim()
    $v = $line.Substring($i + 1).Trim().Trim('"').Trim("'")
    Set-Item -Path "Env:$k" -Value $v
  }
}

# 先示例默认，再本地覆盖（真密钥只放 local）
Import-DotEnv (Join-Path $RepoRoot 'config\seo_secrets.example.env')
Import-DotEnv (Join-Path $RepoRoot 'config\local\seo_secrets.env')

$Origin = if ($env:WEBSITE_ORIGIN) { $env:WEBSITE_ORIGIN.TrimEnd('/') } else { 'https://claude-unlimited.aiautotools.com' }
$HostName = if ($env:WEBSITE_HOST) { $env:WEBSITE_HOST } else { 'claude-unlimited.aiautotools.com' }
$IndexNowKey = $env:INDEXNOW_KEY

# URL 清单：从 sitemap 读
$Urls = @()
if (Test-Path -LiteralPath $SitemapPath) {
  [xml]$map = Get-Content -LiteralPath $SitemapPath -Raw -Encoding UTF8
  $Urls = @($map.urlset.url.loc | ForEach-Object { $_.Trim() })
} else {
  Write-Warning "未找到 $SitemapPath，退回只推送首页"
  $Urls = @("$Origin/")
}

Write-Host "site: $Origin"
Write-Host "urls: $($Urls.Count)"

function Submit-IndexNow {
  if (-not $IndexNowKey) {
    Write-Host ''
    Write-Host 'IndexNow: skip (未设 INDEXNOW_KEY)'
    return
  }
  $keyLocation = "$Origin/$IndexNowKey.txt"
  $payload = @{
    host        = $HostName
    key         = $IndexNowKey
    keyLocation = $keyLocation
    urlList     = $Urls
  } | ConvertTo-Json -Compress
  Write-Host ''
  Write-Host "IndexNow: POST api.indexnow.org (key file: $keyLocation)"
  if ($DryRun) { Write-Host "DryRun: $payload"; return }
  try {
    $resp = Invoke-WebRequest -Uri 'https://api.indexnow.org/indexnow' -Method POST -Body ([System.Text.Encoding]::UTF8.GetBytes($payload)) -ContentType 'application/json; charset=utf-8' -UseBasicParsing
    Write-Host "IndexNow: HTTP $($resp.StatusCode) OK"
  } catch {
    $resp = $_.Exception.Response
    if ($null -ne $resp) {
      $code = [int]$resp.StatusCode
      if ($code -eq 200 -or $code -eq 202) { Write-Host "IndexNow: HTTP $code accepted"; return }
    }
    Write-Warning "IndexNow failed: $_"
  }
}

function Submit-Bing {
  $apiKey = $env:BING_API_KEY
  if (-not $apiKey) {
    Write-Host ''
    Write-Host 'Bing: skip (未设 BING_API_KEY)'
    return
  }
  $siteUrl = if ($env:BING_SITE_URL) { $env:BING_SITE_URL } else { "$Origin/" }
  if (-not $siteUrl.EndsWith('/')) { $siteUrl = "$siteUrl/" }
  $sitemapUrl = "$Origin/sitemap.xml"
  $qKey = [uri]::EscapeDataString($apiKey)

  Write-Host ''
  Write-Host "Bing: SubmitFeed $sitemapUrl (site=$siteUrl)"
  if ($DryRun) { Write-Host 'DryRun: SubmitFeed + SubmitUrlBatch'; return }

  $feedBody = @{ siteUrl = $siteUrl; feedUrl = $sitemapUrl } | ConvertTo-Json -Compress
  try {
    $r = Invoke-WebRequest -Uri "https://ssl.bing.com/webmaster/api.svc/json/SubmitFeed?apikey=$qKey" -Method POST -Body ([System.Text.Encoding]::UTF8.GetBytes($feedBody)) -ContentType 'application/json; charset=utf-8' -UseBasicParsing
    Write-Host "Bing SubmitFeed: HTTP $($r.StatusCode) $($r.Content)"
  } catch { Write-Warning "Bing SubmitFeed failed: $_" }

  # SubmitUrlBatch 的额度按 URL 条数扣（账号级共享，一天 100 条左右），一次把全站推上去必然超额报 400。
  # 这里截断到 MaxBingUrls，默认 10；超额时把正文打出来，那句 "Quota remaining ... Submitted: N" 才是真正的诊断信息。
  $MaxBingUrls = 10
  $batch = @($Urls)[0..([Math]::Min($MaxBingUrls, $Urls.Count) - 1)]
  $batchBody = @{ siteUrl = $siteUrl; urlList = $batch } | ConvertTo-Json -Compress
  try {
    $r = Invoke-WebRequest -Uri "https://ssl.bing.com/webmaster/api.svc/json/SubmitUrlBatch?apikey=$qKey" -Method POST -Body ([System.Text.Encoding]::UTF8.GetBytes($batchBody)) -ContentType 'application/json; charset=utf-8' -UseBasicParsing
    Write-Host "Bing SubmitUrlBatch: HTTP $($r.StatusCode) $($r.Content)"
  } catch {
    $body = ''
    try { $body = $_.Exception.Response.GetResponseStream() | ForEach-Object { $sr = New-Object System.IO.StreamReader($_); $sr.ReadToEnd() } } catch { }
    Write-Warning "Bing SubmitUrlBatch failed: $body $_"
  }
}

function Submit-Baidu {
  $site = $env:BAIDU_SITE
  $token = $env:BAIDU_TOKEN
  if (-not $site -or -not $token) {
    Write-Host ''
    Write-Host 'Baidu: skip (未设 BAIDU_SITE / BAIDU_TOKEN，需先在 ziyuan.baidu.com 加站并验证)'
    return
  }
  # 百度 API 的 site 不能带协议，否则 site init fail
  $site = $site.Trim() -replace '^https?://', '' -replace '/$', ''
  $endpoint = "http://data.zz.baidu.com/urls?site=$([uri]::EscapeDataString($site))&token=$([uri]::EscapeDataString($token))"
  Write-Host ''
  Write-Host "Baidu: push up to $($Urls.Count) urls one-by-one (site=$site)"
  if ($DryRun) { Write-Host "DryRun: site=$site"; return }
  # 新站日配额很小；整批易 over quota，改为逐条直到超额
  $ok = 0
  foreach ($u in $Urls) {
    try {
      $resp = Invoke-WebRequest -Uri $endpoint -Method POST -Body $u -ContentType 'text/plain' -UseBasicParsing
      Write-Host "Baidu OK: $u -> $($resp.Content)"
      $ok++
      $j = $null
      try { $j = $resp.Content | ConvertFrom-Json } catch { }
      if ($null -ne $j -and $null -ne $j.remain -and [int]$j.remain -le 0) {
        Write-Host 'Baidu: daily quota exhausted; remaining urls tomorrow'
        break
      }
    } catch {
      $body = ''
      try {
        $stream = $_.Exception.Response.GetResponseStream()
        if ($null -ne $stream) {
          $reader = New-Object System.IO.StreamReader($stream)
          $body = $reader.ReadToEnd()
        }
      } catch { }
      if ($body -match 'over quota') {
        Write-Warning "Baidu over quota after $ok urls; rest tomorrow. $body"
        break
      }
      Write-Warning "Baidu failed ($u): $body $_"
      break
    }
  }
}

# 把 dotenv 里读到的代理变量显式传给 python 子进程。PowerShell 5.1 的子进程默认继承父进程环境变量，
# 但如果调用方（如某些 IDE 终端）自身带了空的 HTTP(S)_PROXY，会把 dotenv 里的真值盖掉，
# 结果是 gsc_submit_sitemap.py 直连 oauth2.googleapis.com 超时。显式设置后不再依赖继承。
foreach ($name in 'HTTPS_PROXY', 'HTTP_PROXY', 'https_proxy', 'http_proxy') {
  $v = [System.Environment]::GetEnvironmentVariable($name)
  if ($v) { Set-Item -Path "Env:$name" -Value $v -Force }
}

function Resolve-SeoPython {
  $candidates = @(
    (Join-Path $SiteDir 'temp\seo_probe\.venv\Scripts\python.exe')
    (Join-Path $SiteDir '.venv\Scripts\python.exe')
  )
  foreach ($c in $candidates) {
    if (Test-Path -LiteralPath $c) { return $c }
  }
  return 'python'
}

function Submit-GscSitemap {
  $credPath = $env:GOOGLE_APPLICATION_CREDENTIALS
  if (-not $credPath) { $credPath = 'config/local/website_gsc_service_account.json' }
  if (-not [System.IO.Path]::IsPathRooted($credPath)) { $credPath = Join-Path $SiteDir $credPath }
  if (-not (Test-Path -LiteralPath $credPath)) {
    Write-Host ''
    Write-Host 'GSC: skip (没有服务账号 JSON)'
    return
  }
  $siteUrl = $env:GSC_SITE_URL
  if (-not $siteUrl) {
    Write-Host ''
    Write-Host 'GSC: skip (未设 GSC_SITE_URL)'
    return
  }
  $sitemapUrl = "$Origin/sitemap.xml"
  $py = Resolve-SeoPython
  $helper = Join-Path $SiteDir 'scripts\gsc_submit_sitemap.py'
  Write-Host ''
  Write-Host "GSC: submit $sitemapUrl -> $siteUrl"
  Write-Host "GSC: python=$py"
  if ($DryRun) { Write-Host "DryRun: $helper"; return }
  & $py $helper --credentials $credPath --site-url $siteUrl --sitemap-url $sitemapUrl
  if ($LASTEXITCODE -ne 0) {
    Write-Warning 'GSC submit failed (常见原因：服务账号无 Full 权限、属性类型写错、国内需代理)'
  }
}

Submit-IndexNow
Submit-Bing
Submit-Baidu
Submit-GscSitemap
Write-Host ''
Write-Host 'done.'