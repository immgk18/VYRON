@echo off
setlocal
cd /d "%~dp0frontend"
if not exist "node_modules" (
  echo Installing frontend packages...
  call npm install
  if errorlevel 1 pause & exit /b 1
)
call npm run dev
