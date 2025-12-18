@echo off
setlocal EnableDelayedExpansion

echo ========================================
echo  StocksVsSubscription - Stop Local Servers
echo ========================================
echo.

echo [INFO] Stopping Node.js processes on ports 3000, 5173, 5174...
echo.

set "found=0"

:: Kill processes on port 3000 (backend)
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr :3000 ^| findstr LISTENING') do (
    echo [INFO] Killing process on port 3000 (PID: %%a)
    taskkill /F /PID %%a >nul 2>nul
    set "found=1"
)

:: Kill processes on port 5173 (frontend Vite)
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr :5173 ^| findstr LISTENING') do (
    echo [INFO] Killing process on port 5173 (PID: %%a)
    taskkill /F /PID %%a >nul 2>nul
    set "found=1"
)

:: Also check 5174 in case Vite used fallback port
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr :5174 ^| findstr LISTENING') do (
    echo [INFO] Killing process on port 5174 (PID: %%a)
    taskkill /F /PID %%a >nul 2>nul
    set "found=1"
)

echo.
if "!found!"=="1" (
    echo [OK] Local servers stopped.
) else (
    echo [INFO] No servers were running on ports 3000, 5173, or 5174.
)
echo.
pause
