# Rack Five — minimal static file server, plus a tiny JSON-file-backed API for
# the local leaderboard so scores survive a server restart.
#
# The app is plain ES modules, so it needs to be served over http rather than
# opened from the file system. This uses a raw TcpListener so it needs no admin
# rights, no URL ACL and no runtime beyond Windows PowerShell.
#
#   powershell -ExecutionPolicy Bypass -File serve.ps1 [-Port 8123]

# $env:PORT is honoured when -Port is not given, so a second copy can be started
# alongside one that already holds the default.
param(
  [int]$Port = $(if ($env:PORT) { [int]$env:PORT } else { 8123 }),
  [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$leaderboardPath = Join-Path $root 'data\leaderboard.json'
$maxEntries = 500

$mime = @{
  '.html' = 'text/html; charset=utf-8'
  '.js'   = 'text/javascript; charset=utf-8'
  '.mjs'  = 'text/javascript; charset=utf-8'
  '.css'  = 'text/css; charset=utf-8'
  '.json' = 'application/json; charset=utf-8'
  '.webmanifest' = 'application/manifest+json; charset=utf-8'
  '.txt'  = 'text/plain; charset=utf-8'
  '.woff2'= 'font/woff2'
  '.woff' = 'font/woff'
  '.svg'  = 'image/svg+xml'
  '.png'  = 'image/png'
  '.ico'  = 'image/x-icon'
}

$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
$listener.Start()
Write-Host ""
Write-Host "  Rack Five is serving $root" -ForegroundColor Yellow
Write-Host "  http://localhost:$Port/" -ForegroundColor Green
Write-Host "  Press Ctrl+C to stop."
Write-Host ""

if (-not $NoBrowser) { Start-Process "http://localhost:$Port/" | Out-Null }

function Send-Response {
  param($stream, [int]$status, [string]$statusText, [string]$contentType, [byte[]]$body)
  $header = "HTTP/1.1 $status $statusText`r`n" +
            "Content-Type: $contentType`r`n" +
            "Content-Length: $($body.Length)`r`n" +
            "Cache-Control: no-cache`r`n" +
            "Connection: close`r`n`r`n"
  $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
  $stream.Write($headerBytes, 0, $headerBytes.Length)
  if ($body.Length -gt 0) { $stream.Write($body, 0, $body.Length) }
  $stream.Flush()
}

function Send-Json {
  param($stream, [int]$status, [string]$statusText, [string]$json)
  Send-Response $stream $status $statusText 'application/json; charset=utf-8' ([System.Text.Encoding]::UTF8.GetBytes($json))
}

function Read-LeaderboardFile {
  if (-not (Test-Path -LiteralPath $leaderboardPath)) { return '[]' }
  $text = [System.IO.File]::ReadAllText($leaderboardPath, [System.Text.Encoding]::UTF8)
  if (-not $text.Trim()) { return '[]' }
  return $text
}

function Write-LeaderboardFile {
  param([string]$json)
  $dir = Split-Path -Parent $leaderboardPath
  if (-not (Test-Path -LiteralPath $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
  [System.IO.File]::WriteAllText($leaderboardPath, $json, [System.Text.Encoding]::UTF8)
}

# Read one HTTP request (headers + body) directly off the raw stream — no
# StreamReader, so buffering never eats bytes we still need for the body.
function Read-HttpRequest {
  param($stream)
  $ms = New-Object System.IO.MemoryStream
  $buf = New-Object byte[] 1
  while ($true) {
    $n = $stream.Read($buf, 0, 1)
    if ($n -le 0) { return $null }
    $ms.WriteByte($buf[0])
    if ($ms.Length -ge 4) {
      $arr = $ms.ToArray()
      $t = $arr[($arr.Length - 4)..($arr.Length - 1)]
      if ($t[0] -eq 13 -and $t[1] -eq 10 -and $t[2] -eq 13 -and $t[3] -eq 10) { break }
    }
    if ($ms.Length -gt 65536) { return $null }
  }
  $headerText = [System.Text.Encoding]::ASCII.GetString($ms.ToArray())
  $lines = $headerText -split "`r`n"
  $requestLine = $lines[0]
  $headers = @{}
  for ($i = 1; $i -lt $lines.Length; $i++) {
    if ($lines[$i] -match '^([^:]+):\s*(.*)$') { $headers[$matches[1].ToLower()] = $matches[2] }
  }
  $contentLength = 0
  if ($headers.ContainsKey('content-length')) { [void][int]::TryParse($headers['content-length'], [ref]$contentLength) }
  $bodyBytes = New-Object byte[] $contentLength
  $offset = 0
  while ($offset -lt $contentLength) {
    $n = $stream.Read($bodyBytes, $offset, $contentLength - $offset)
    if ($n -le 0) { break }
    $offset += $n
  }
  $parts = $requestLine.Split(' ')
  return @{
    Method = if ($parts.Length -ge 1) { $parts[0] } else { 'GET' }
    Path   = if ($parts.Length -ge 2) { $parts[1].Split('?')[0] } else { '/' }
    Body   = [System.Text.Encoding]::UTF8.GetString($bodyBytes)
  }
}

try {
  while ($true) {
    $client = $listener.AcceptTcpClient()
    try {
      $client.ReceiveTimeout = 5000
      $stream = $client.GetStream()
      $req = Read-HttpRequest $stream
      if (-not $req) { continue }

      $path = [System.Uri]::UnescapeDataString($req.Path)
      $method = $req.Method

      if ($path -eq '/api/leaderboard') {
        if ($method -eq 'GET') {
          Send-Json $stream 200 'OK' (Read-LeaderboardFile)
          Write-Host "  200 GET $path" -ForegroundColor DarkGray
        } elseif ($method -eq 'POST') {
          try {
            $parsed = $req.Body | ConvertFrom-Json -ErrorAction Stop
            $list = @($parsed)
            # Newest-first cap keeps the file bounded without needing a database.
            if ($list.Length -gt $maxEntries) { $list = $list[0..($maxEntries - 1)] }
            $json = ConvertTo-Json -InputObject $list -Depth 10
            if ($list.Length -eq 0) { $json = '[]' }
            Write-LeaderboardFile $json
            Send-Json $stream 200 'OK' $json
            Write-Host "  200 POST $path ($($list.Length) entries)" -ForegroundColor DarkGray
          } catch {
            Send-Json $stream 400 'Bad Request' '{"error":"invalid json"}'
          }
        } elseif ($method -eq 'DELETE') {
          Write-LeaderboardFile '[]'
          Send-Json $stream 200 'OK' '[]'
          Write-Host "  200 DELETE $path" -ForegroundColor DarkGray
        } else {
          Send-Json $stream 405 'Method Not Allowed' '{"error":"method not allowed"}'
        }
      } else {
        if ($path -eq '/') { $path = '/index.html' }
        $relative = $path.TrimStart('/').Replace('/', [System.IO.Path]::DirectorySeparatorChar)
        $full = Join-Path $root $relative
        $resolvedRoot = [System.IO.Path]::GetFullPath($root)
        $resolved = [System.IO.Path]::GetFullPath($full)

        if (-not $resolved.StartsWith($resolvedRoot) -or -not (Test-Path -LiteralPath $resolved -PathType Leaf)) {
          $body = [System.Text.Encoding]::UTF8.GetBytes('Not found')
          Send-Response $stream 404 'Not Found' 'text/plain; charset=utf-8' $body
        } else {
          $ext = [System.IO.Path]::GetExtension($resolved).ToLower()
          $type = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { 'application/octet-stream' }
          $body = [System.IO.File]::ReadAllBytes($resolved)
          Send-Response $stream 200 'OK' $type $body
          Write-Host "  200 $path" -ForegroundColor DarkGray
        }
      }
    } catch {
      Write-Host "  error: $($_.Exception.Message)" -ForegroundColor DarkRed
    } finally {
      $client.Close()
    }
  }
} finally {
  $listener.Stop()
}
