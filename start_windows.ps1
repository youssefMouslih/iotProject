# start_windows.ps1 - Start backend (uvicorn) and frontend (Vite) on Windows
# Usage: Open PowerShell, cd to project root and run: .\start_windows.ps1

[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

Write-Output "Cleaning up ports 8003 and 5173..."
foreach($port in 8003,5173){ $conns = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue; if($conns){ foreach($c in $conns){ try { Stop-Process -Id $c.OwningProcess -Force -ErrorAction Stop; Write-Output "Killed PID $($c.OwningProcess) on port $port" } catch { Write-Output "Could not kill PID $($c.OwningProcess): $_" } } } else { Write-Output "No process on port $port" } }

# Ensure venv
if (-not (Test-Path .\.venv\Scripts\python.exe)) {
    if (-not (Get-Command python -ErrorAction SilentlyContinue)) { Write-Error 'Python not found in PATH'; exit 1 }
    python -m venv .venv
    Write-Output '.venv created'
} else {
    Write-Output '.venv exists'
}

# Install requirements
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r requirements.txt

# Start backend
$backendLog = Join-Path $PWD 'backend.log'
$backendPidFile = Join-Path $PWD 'backend.pid'
$pythonExe = Resolve-Path .\.venv\Scripts\python.exe
$backendStart = Start-Process -FilePath $pythonExe -ArgumentList '-m','uvicorn','backend.main:app','--host','127.0.0.1','--port','8003' -NoNewWindow -RedirectStandardOutput $backendLog -RedirectStandardError $backendLog -PassThru
$backendStart.Id | Out-File -FilePath $backendPidFile -Encoding ascii
Write-Output "Backend started with PID: $($backendStart.Id)"
Start-Sleep -Seconds 2

# Prepare frontend
$frontendDir = Join-Path $PWD 'frontend\react-dashboard'
if (-not (Test-Path $frontendDir)) { Write-Error "Frontend dir not found: $frontendDir"; exit 1 }
Set-Location $frontendDir
$envFile = Join-Path $frontendDir '.env.local'
"VITE_API_BASE_URL=http://127.0.0.1:8003`r`nVITE_BACKEND_BASE_URL=http://127.0.0.1:8003" | Out-File -FilePath $envFile -Encoding utf8

# Start frontend using npm.cmd
$npmPS = Get-Command npm -ErrorAction SilentlyContinue
if (-not $npmPS) { Write-Error 'npm not found in PATH'; exit 1 }
$npmDir = Split-Path $npmPS.Source
$npmCmd = Join-Path $npmDir 'npm.cmd'
if (-not (Test-Path $npmCmd)) { Write-Error "npm.cmd not found at $npmCmd"; exit 1 }
$frontendLog = Join-Path $PWD '..\..\frontend.log' -Resolve
$frontendPidFile = Join-Path $PWD '..\..\frontend.pid' -Resolve
$frontendProc = Start-Process -FilePath $npmCmd -ArgumentList 'run','dev','--','--port','5173','--host' -WorkingDirectory $frontendDir -NoNewWindow -RedirectStandardOutput $frontendLog -RedirectStandardError $frontendLog -PassThru
$frontendProc.Id | Out-File -FilePath $frontendPidFile -Encoding ascii
Write-Output "Frontend started with PID: $($frontendProc.Id)"

Write-Output "\nServices started:\nFrontend -> http://localhost:5173\nBackend  -> http://127.0.0.1:8003\nLogs: $backendLog, $frontendLog"

Write-Output "Press Ctrl+C in this terminal to stop services."

# Wait and trap Ctrl+C
try {
    while ($true) { Start-Sleep -Seconds 3600 }
} finally {
    Write-Output 'Stopping services...'
    if (Test-Path $backendPidFile) { Stop-Process -Id (Get-Content $backendPidFile) -Force -ErrorAction SilentlyContinue; Remove-Item $backendPidFile -ErrorAction SilentlyContinue }
    if (Test-Path $frontendPidFile) { Stop-Process -Id (Get-Content $frontendPidFile) -Force -ErrorAction SilentlyContinue; Remove-Item $frontendPidFile -ErrorAction SilentlyContinue }
}
