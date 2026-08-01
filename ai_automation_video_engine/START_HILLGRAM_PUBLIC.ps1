$ErrorActionPreference = "Stop"
$project = Split-Path -Parent $MyInvocation.MyCommand.Path
$python = Join-Path $project ".venv\Scripts\python.exe"
$cloudflared = Join-Path $project "tools\cloudflared.exe"
$healthUrl = "http://127.0.0.1:8501/_stcore/health"

if (-not (Test-Path -LiteralPath $python)) {
    throw "HILLGRAM could not find its Python environment at $python"
}
if (-not (Test-Path -LiteralPath $cloudflared)) {
    throw "HILLGRAM could not find cloudflared at $cloudflared"
}

try {
    Invoke-WebRequest -UseBasicParsing $healthUrl -TimeoutSec 3 | Out-Null
} catch {
    Start-Process -FilePath $python `
        -ArgumentList @(
            "-m", "streamlit", "run", "app.py",
            "--server.port", "8501",
            "--server.address", "0.0.0.0",
            "--server.headless", "true",
            "--browser.gatherUsageStats", "false"
        ) `
        -WorkingDirectory $project `
        -WindowStyle Hidden

    $ready = $false
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        Start-Sleep -Seconds 1
        try {
            Invoke-WebRequest -UseBasicParsing $healthUrl -TimeoutSec 2 | Out-Null
            $ready = $true
            break
        } catch {
            continue
        }
    }
    if (-not $ready) {
        throw "HILLGRAM did not start on port 8501."
    }
}

Write-Host ""
Write-Host "Creating HILLGRAM public HTTPS access..." -ForegroundColor Cyan
Write-Host "Keep this window open while people use HILLGRAM." -ForegroundColor Yellow
Write-Host ""

$startInfo = [System.Diagnostics.ProcessStartInfo]::new()
$startInfo.FileName = $cloudflared
$startInfo.WorkingDirectory = $project
$startInfo.UseShellExecute = $false
$startInfo.CreateNoWindow = $true
$startInfo.RedirectStandardError = $true
$runtimeLog = Join-Path $project "cloudflared-runtime.log"
$startInfo.Arguments = "tunnel --no-autoupdate --protocol http2 --edge-ip-version 4 --loglevel info --logfile `"$runtimeLog`" --url http://127.0.0.1:8501"

$tunnel = [System.Diagnostics.Process]::new()
$tunnel.StartInfo = $startInfo
$publicUrl = $null

try {
    $null = $tunnel.Start()
    while (-not $tunnel.StandardError.EndOfStream) {
        $line = $tunnel.StandardError.ReadLine()
        Write-Host $line
        if (-not $publicUrl -and $line -match "https://[a-z0-9-]+\.trycloudflare\.com") {
            $publicUrl = $Matches[0]
            Set-Clipboard -Value $publicUrl
            Set-Content -LiteralPath (Join-Path $project "PUBLIC_HILLGRAM_LINK.txt") -Value $publicUrl
            Write-Host ""
            Write-Host "HILLGRAM IS PUBLIC:" -ForegroundColor Green
            Write-Host $publicUrl -ForegroundColor Green
            Write-Host "The HTTPS link was copied and saved to PUBLIC_HILLGRAM_LINK.txt." -ForegroundColor Cyan
            Write-Host ""
            try {
                [System.Net.Dns]::GetHostAddresses(([System.Uri]$publicUrl).DnsSafeHost) | Out-Null
            } catch {
                Write-Host "The active network is blocking this temporary hostname in DNS." -ForegroundColor Yellow
                Write-Host "Approve the Windows prompt so HILLGRAM can repair local DNS." -ForegroundColor Yellow
                $dnsFixer = Join-Path $project "FIX_HILLGRAM_DNS.ps1"
                $fixArguments = "-NoProfile -ExecutionPolicy Bypass -File `"$dnsFixer`" -PublicUrl `"$publicUrl`""
                Start-Process -FilePath "powershell.exe" -Verb RunAs -ArgumentList $fixArguments -Wait
            }
            Start-Process $publicUrl
        }
    }
    $tunnel.WaitForExit()
} finally {
    if (-not $tunnel.HasExited) {
        $tunnel.Kill()
    }
}
