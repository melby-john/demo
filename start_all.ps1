Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "       Starting SignConnect AI (Every Sign. Every Voice.)" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$env:PATH = "C:\Program Files\nodejs;" + $env:PATH

Write-Host "`n[1/2] Starting FastAPI Backend on http://127.0.0.1:8000 ..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; python run_server.py"

Start-Sleep -Seconds 2

Write-Host "[2/2] Starting Frontend Vite on http://localhost:3000 ..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "$env:PATH = 'C:\Program Files\nodejs;' + $env:PATH; cd '$PSScriptRoot\frontend'; npm.cmd run dev -- --host 127.0.0.1 --port 3000"

Write-Host "`nSignConnect AI is running!" -ForegroundColor Cyan
Write-Host "Backend API:  http://127.0.0.1:8000" -ForegroundColor White
Write-Host "Frontend App: http://localhost:3000" -ForegroundColor White
Write-Host "API Docs:     http://127.0.0.1:8000/docs" -ForegroundColor Yellow
