@echo off
cd /d "%~dp0"

REM start Vite server in a new terminal using the working command
start "Vite" cmd /k node "%~dp0node_modules\vite\bin\vite.js" --host 0.0.0.0 --port 5173

REM give the server a moment to boot up (adjust if needed)
timeout /t 2 /nobreak >nul

REM open the preferred URL in the default browser
cmd /c start "" "http://192.168.0.201:5173"
