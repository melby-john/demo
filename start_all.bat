@echo off
set PATH=C:\Program Files\nodejs;%PATH%
echo ========================================================
echo        Starting SignConnect AI (Every Sign. Every Voice.)
echo ========================================================
echo.

echo [1/2] Starting FastAPI Backend on http://127.0.0.1:8000 ...
start "SignConnect Backend (FastAPI)" cmd /k "cd /d "%~dp0backend" && python run_server.py"

timeout /t 2 /nobreak >nul

echo [2/2] Starting Frontend Vite on http://localhost:3000 ...
start "SignConnect Frontend (Vite React)" cmd /k "cd /d "%~dp0frontend" && set PATH=C:\Program Files\nodejs;%%PATH%% && npm.cmd run dev -- --host 127.0.0.1 --port 3000"

echo.
echo SignConnect AI is now running!
echo Backend API:  http://127.0.0.1:8000
echo Frontend App: http://localhost:3000
echo API Docs:     http://127.0.0.1:8000/docs
echo.
pause
