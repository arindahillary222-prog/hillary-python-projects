param(
    [Parameter(Mandatory = $true)]
    [string]$PublicUrl
)

$ErrorActionPreference = "Stop"
$uri = [System.Uri]$PublicUrl
$hostName = $uri.DnsSafeHost
if (-not $hostName.EndsWith(".trycloudflare.com")) {
    throw "The supplied address is not a HILLGRAM Cloudflare preview hostname."
}

$dnsUrl = "https://cloudflare-dns.com/dns-query?name=$hostName&type=A"
$dnsResult = Invoke-RestMethod -Uri $dnsUrl -Headers @{ accept = "application/dns-json" } -TimeoutSec 30
$address = @(
    $dnsResult.Answer |
        Where-Object { $_.type -eq 1 } |
        Select-Object -ExpandProperty data
)[0]
if (-not $address) {
    throw "Cloudflare did not return an IPv4 address for $hostName"
}

$hostsPath = Join-Path $env:SystemRoot "System32\drivers\etc\hosts"
$marker = "# HILLGRAM PUBLIC HTTPS"
$existingLines = [System.IO.File]::ReadAllLines($hostsPath)
$keptLines = @(
    $existingLines | Where-Object {
        $_ -notlike "*$marker*" -and $_ -notmatch [regex]::Escape($hostName)
    }
)
$updatedLines = @($keptLines) + "$address`t$hostName`t$marker"
[System.IO.File]::WriteAllLines(
    $hostsPath,
    $updatedLines,
    [System.Text.UTF8Encoding]::new($false)
)
Clear-DnsClientCache

Write-Host "HILLGRAM HTTPS name resolution repaired for:" -ForegroundColor Green
Write-Host $PublicUrl -ForegroundColor Green
Start-Sleep -Seconds 3
