@echo off
setlocal
cd /d "%~dp0"
call npm install
if errorlevel 1 goto :error
call npm run dev
exit /b 0
:error
echo Failed to install or start the project. Verify Node.js 20+ and internet access.
pause
exit /b 1
