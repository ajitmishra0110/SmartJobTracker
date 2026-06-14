# Starts every Smart Job Tracker service in order (each in its own terminal).
# Usage: .\start-all.ps1
#
# DB and API credentials: copy .env.example to .env in this folder and edit values there.

$Root = $PSScriptRoot
$EnvFile = Join-Path $Root ".env"

function Import-DotEnv {
    param([string]$Path)

    if (-not (Test-Path $Path)) {
        Write-Warning ".env not found at $Path"
        Write-Warning "Copy .env.example to .env and set DB_USERNAME / DB_PASSWORD (and OPENAI_API_KEY)."
        return
    }

    Get-Content $Path | ForEach-Object {
        $line = $_.Trim()
        if ($line -eq "" -or $line.StartsWith("#")) {
            return
        }
        if ($line -match '^\s*([^=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            Set-Item -Path "env:$name" -Value $value
        }
    }

    Write-Host "Loaded environment from .env"
}

function Start-ServiceWindow {
    param(
        [string]$Title,
        [string]$RelativePath,
        [string]$Command,
        [int]$WaitSeconds = 12
    )

    $serviceDir = Join-Path $Root $RelativePath
    if (-not (Test-Path $serviceDir)) {
        throw "Service directory not found: $serviceDir"
    }

    $inner = @"
Set-Location '$serviceDir'
if (Test-Path '$EnvFile') {
  Get-Content '$EnvFile' | ForEach-Object {
    `$line = `$_.Trim()
    if (`$line -eq '' -or `$line.StartsWith('#')) { return }
    if (`$line -match '^\s*([^=]+)=(.*)$') {
      Set-Item -Path "env:`$(`$matches[1].Trim())" -Value `$matches[2].Trim()
    }
  }
}
`$Host.UI.RawUI.WindowTitle = '$Title'
$Command
"@

    Start-Process powershell.exe -ArgumentList "-NoExit", "-Command", $inner
    Write-Host "Started $Title"
    Start-Sleep -Seconds $WaitSeconds
}

Import-DotEnv -Path $EnvFile

Write-Host ""
Write-Host "Starting Smart Job Tracker stack..."
Write-Host "Eureka dashboard: http://localhost:8761"
Write-Host "UI:               http://localhost:3000"
Write-Host ""

Start-ServiceWindow -Title "SJT - Eureka (8761)"      -RelativePath "eureka-server"   -Command ".\mvnw.cmd spring-boot:run" -WaitSeconds 15
Start-ServiceWindow -Title "SJT - Auth (8081)"        -RelativePath "smartJobTracker" -Command ".\mvnw.cmd spring-boot:run" -WaitSeconds 12
Start-ServiceWindow -Title "SJT - Job Service (8082)" -RelativePath "job-service"     -Command ".\mvnw.cmd spring-boot:run" -WaitSeconds 12
Start-ServiceWindow -Title "SJT - AI Service (8083)"  -RelativePath "ai-service"      -Command ".\mvnw.cmd spring-boot:run" -WaitSeconds 12
Start-ServiceWindow -Title "SJT - API Gateway (8080)" -RelativePath "api-gateway"     -Command ".\mvnw.cmd spring-boot:run" -WaitSeconds 10
Start-ServiceWindow -Title "SJT - React UI (3000)"    -RelativePath "job-tracker-ui"  -Command "npm start" -WaitSeconds 0

Write-Host ""
Write-Host "All launch commands sent. Wait for each window to finish starting before using the app."
Write-Host "Close the terminal windows to stop each service."
