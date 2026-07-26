# Rack Five — minimal static file server.
#
# The app is plain ES modules, so it needs to be served over http rather than
# opened from the file system. This uses a raw TcpListener so it needs no admin
# rights, no URL ACL and no runtime beyond Windows PowerShell.
#
#   powershell -ExecutionPolicy Bypass -File serve.ps1 [-Port 8123]

param(
  [int]$Port = 8123,
  [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

$mime = @{
  '.html' = 'text/html; charset=utf-8'
  '.js'   = 'text/javascript; charset=utf-8'
  '.mjs'  = 'text/javascript; charset=utf-8'
  '.css'  = 'text/css; charset=utf-8'
  '.json' = 'application/json; charset=utf-8'
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

try {
  while ($true) {
    $client = $listener.AcceptTcpClient()
    try {
      $client.ReceiveTimeout = 5000
      $stream = $client.GetStream()
      $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::ASCII)
      $requestLine = $reader.ReadLine()
      if (-not $requestLine) { continue }

      $parts = $requestLine.Split(' ')
      $path = if ($parts.Length -ge 2) { $parts[1] } else { '/' }
      $path = $path.Split('?')[0]
      $path = [System.Uri]::UnescapeDataString($path)
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
    } catch {
      Write-Host "  error: $($_.Exception.Message)" -ForegroundColor DarkRed
    } finally {
      $client.Close()
    }
  }
} finally {
  $listener.Stop()
}
