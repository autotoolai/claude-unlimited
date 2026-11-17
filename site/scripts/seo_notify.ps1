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

function Get-BingPushOrder {
  <#
    Bing 的 SubmitUrlBatch 额度按 URL 条数扣，账号级共享，一天约 100 条。
    与百度不同：Bing 配额相对宽裕，但原实现只截断前 10 条且按 sitemap 原序，
    结果末尾的新文章永远排在后面 —— 实测有 6 条 URL Bing 从未抓取过。
    规则与百度同源（重要页优先，文章页压后），并叠加台账：只重排还没推过的 URL，
    让每天的名额都花在没推过的页上。台账为空时（即首次运行）会全量推出去，
    那 6 条从未抓取的页也就顺带补推了；之后新页面才按此顺序排队。
  #>
  param([string[]]$AllUrls)

  # /console = 裸词 rsxermu666；/agency = Token 代理。两者都有独立搜索别名，优先。
  $priority = @('/console', '/agency', '/', '/pricing', '/models', '/contact', '/guide', '/about', '/faq', '/changelog', '/knowledge')
  $stateDir = Join-Path $RepoRoot 'temp\seo_push'
  $recordFile = Join-Path $stateDir 'bing_pushed.txt'
  $pushed = Get-PushedSet $recordFile

  $rows = New-Object 'System.Collections.Generic.List[object]'
  for ($i = 0; $i -lt $AllUrls.Count; $i++) {
    $u = [string]$AllUrls[$i]
    if ($pushed.Contains($u)) { continue }
    $path = ([uri]$u).AbsolutePath
    $rank = [array]::IndexOf($priority, $path)
    if ($rank -lt 0) { $rank = if ($path -like '*/knowledge/*') { 100 } else { 50 } }
    $rows.Add([pscustomobject]@{ Url = $u; Rank = $rank; Seq = $i })
  }
  if ($rows.Count -le 1) { return @($rows | ForEach-Object { $_.Url }) }

  $arr = $rows.ToArray()
  [Array]::Sort($arr, [System.Comparison[object]] {
    param($a, $b)
    if ($a.Rank -ne $b.Rank) {
      if ($a.Rank -lt $b.Rank) { return -1 }
      return 1
    }
    if ($a.Seq -lt $b.Seq) { return -1 }
    if ($a.Seq -gt $b.Seq) { return 1 }
    return 0
  })
  return @($arr | ForEach-Object { $_.Url })
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

  # 队列在 DryRun 下也要算出来并打印，否则预览时看不到推送顺序对不对。
  $stateDir = Join-Path $RepoRoot 'temp\seo_push'
  $recordFile = Join-Path $stateDir 'bing_pushed.txt'
  $MaxBingUrls = if ($env:BING_LIMIT) { [int]$env:BING_LIMIT } else { 50 }
  $ordered = @(Get-BingPushOrder -AllUrls $Urls)
  Write-Host "Bing: 待推 $($ordered.Count) 条（总 $($Urls.Count)，上限 $MaxBingUrls）"
  if ($ordered.Count -eq 0) {
    Write-Host 'Bing: 没有待推的新 URL（台账已覆盖全部页面）'
    return
  }
  $todo = @($ordered)[0..([Math]::Min($MaxBingUrls, $ordered.Count) - 1)]
  foreach ($u in $todo) { Write-Host "  队列: $u" }
  if ($DryRun) { Write-Host 'DryRun: SubmitFeed + SubmitUrlBatch'; return }

  $feedBody = @{ siteUrl = $siteUrl; feedUrl = $sitemapUrl } | ConvertTo-Json -Compress
  try {
    $r = Invoke-WebRequest -Uri "https://ssl.bing.com/webmaster/api.svc/json/SubmitFeed?apikey=$qKey" -Method POST -Body ([System.Text.Encoding]::UTF8.GetBytes($feedBody)) -ContentType 'application/json; charset=utf-8' -UseBasicParsing
    Write-Host "Bing SubmitFeed: HTTP $($r.StatusCode) $($r.Content)"
  } catch { Write-Warning "Bing SubmitFeed failed: $_" }

  # SubmitUrlBatch 的额度按 URL 条数扣（账号级共享，一天 100 条左右）。
  # 原实现固定截断前 10 条 —— 白扔 90% 配额，且 sitemap 尾部的文章永远排在后面。
  # 现在按推送顺序取，且跳过台账里已推过的 URL：默认上限 50，留一半余量给当天其它发布。
  # 超额时正文会带出 "Quota remaining ... Submitted: N"，那才是真正的诊断信息。
  $batchBody = @{ siteUrl = $siteUrl; urlList = $todo } | ConvertTo-Json -Compress
  try {
    $r = Invoke-WebRequest -Uri "https://ssl.bing.com/webmaster/api.svc/json/SubmitUrlBatch?apikey=$qKey" -Method POST -Body ([System.Text.Encoding]::UTF8.GetBytes($batchBody)) -ContentType 'application/json; charset=utf-8' -UseBasicParsing
    Write-Host "Bing SubmitUrlBatch: HTTP $($r.StatusCode) $($r.Content)"
    # 成功才记台账：失败的不能记，否则那一页永远推不出去。
    foreach ($u in $todo) { Add-Pushed -RecordFile $recordFile -Url $u }
    Write-Host "Bing: 本次提交 $($todo.Count) 条，台账 $recordFile（已累计 $((Get-PushedSet $recordFile).Count) 条）"
  } catch {
    $body = ''
    try { $body = $_.Exception.Response.GetResponseStream() | ForEach-Object { $sr = New-Object System.IO.StreamReader($_); $sr.ReadToEnd() } } catch { }
    Write-Warning "Bing SubmitUrlBatch failed: $body $_"
  }
}

function Get-BaiduPushOrder {
  <#
    百度配额小（约 10 条/天），所以推送顺序必须按商业价值排，不能按 sitemap 原序。
    规则：优先级列表里的路径在前；/knowledge/ 下的文章一律压到最后；其余按 sitemap 原序。
    只重排本次还没推过的 URL（台账见 Get-BaiduPushedSet），让每天的名额都花在没推过的页上。
    实现用 [Array]::Sort 而非 Sort-Object：后者经脚本作用域调用时会把结果退化成单个字符串。
  #>
  param([string[]]$AllUrls)

  # /console = 裸词 rsxermu666；/agency = Token 代理（含搜索别名 rsxermu666 代理）。配额紧，两页都须进优先队列。
  $priority = @('/console', '/agency', '/', '/pricing', '/contact', '/models', '/guide', '/about', '/faq', '/changelog', '/knowledge')
  $stateDir = Join-Path $RepoRoot 'temp\seo_push'
  $recordFile = Join-Path $stateDir 'baidu_pushed.txt'
  $pushed = Get-PushedSet $recordFile

  $rows = New-Object 'System.Collections.Generic.List[object]'
  for ($i = 0; $i -lt $AllUrls.Count; $i++) {
    $u = [string]$AllUrls[$i]
    if ($pushed.Contains($u)) { continue }
    $path = ([uri]$u).AbsolutePath
    $rank = [array]::IndexOf($priority, $path)
    if ($rank -lt 0) { $rank = if ($path -like '*/knowledge/*') { 100 } else { 50 } }
    $rows.Add([pscustomobject]@{ Url = $u; Rank = $rank; Seq = $i })
  }
  if ($rows.Count -le 1) { return @($rows | ForEach-Object { $_.Url }) }

  $arr = $rows.ToArray()
  [Array]::Sort($arr, [System.Comparison[object]] {
    param($a, $b)
    if ($a.Rank -ne $b.Rank) {
      if ($a.Rank -lt $b.Rank) { return -1 }
      return 1
    }
    if ($a.Seq -lt $b.Seq) { return -1 }
    if ($a.Seq -gt $b.Seq) { return 1 }
    return 0
  })
  return @($arr | ForEach-Object { $_.Url })
}

function Get-PushedSet {
  param([string]$RecordFile)
  $set = New-Object 'System.Collections.Generic.HashSet[string]'
  if (Test-Path -LiteralPath $RecordFile) {
    foreach ($line in (Get-Content -LiteralPath $RecordFile -Encoding UTF8)) {
      $u = $line.Trim()
      if ($u) { [void]$set.Add($u) }
    }
  }
  # The comma keeps PowerShell from unrolling the HashSet into individual strings;
  # an empty set would otherwise come back as $null and $pushed.Contains() would throw.
  return ,$set
}

function Add-Pushed {
  param([string]$RecordFile, [string]$Url)
  $dir = Split-Path -Parent $RecordFile
  if (-not (Test-Path -LiteralPath $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
  Add-Content -LiteralPath $RecordFile -Value $Url -Encoding UTF8
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
  # 注意：PS 5.1 不允许 "$(...)" 后面紧跟 &，两段 query 必须分开拼
  $endpoint = "http://data.zz.baidu.com/urls?site=$([uri]::EscapeDataString($site))"
  $endpoint = $endpoint + '&token=' + [uri]::EscapeDataString($token)

  # 重要页优先，文章页压后；已推过的跳过
  $stateDir = Join-Path $RepoRoot 'temp\seo_push'
  $recordFile = Join-Path $stateDir 'baidu_pushed.txt'
  $ordered = @(Get-BaiduPushOrder -AllUrls $Urls)
  $limit = if ($env:BAIDU_LIMIT) { [int]$env:BAIDU_LIMIT } else { 10 }   # 账号级日配额约 10 条
  Write-Host ''
  Write-Host "Baidu: 待推 $($ordered.Count) 条（总 $($Urls.Count)，今日上限 $limit，site=$site）"
  $todo = @($ordered)[0..([Math]::Min($limit, $ordered.Count) - 1)]
  foreach ($u in $todo) { Write-Host "  队列: $u" }
  if ($DryRun) { return }

  # 新站日配额很小；整批易 over quota，改为逐条直到超额。超过 limit 提前停，避免撞到 over quota 后才 break。
  $ok = 0
  foreach ($u in $todo) {
    try {
      $resp = Invoke-WebRequest -Uri $endpoint -Method POST -Body $u -ContentType 'text/plain' -UseBasicParsing
      Write-Host "Baidu OK: $u -> $($resp.Content)"
      Add-Pushed -RecordFile $recordFile -Url $u
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
  Write-Host "Baidu: 本次提交 $ok 条，台账 $recordFile（已累计 $((Get-PushedSet $recordFile).Count) 条）"
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