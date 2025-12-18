@echo off
setlocal EnableDelayedExpansion

echo ========================================
echo  StocksVsSubscription - Local Dev Start
echo ========================================
echo.

:: Navigate to project root FIRST
cd /d "%~dp0"

:: Kill any existing processes on ports 3000, 5173, 5174
echo [INFO] Cleaning up old processes...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
    taskkill /PID %%a /F >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173') do (
    taskkill /PID %%a /F >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5174') do (
    taskkill /PID %%a /F >nul 2>&1
)
echo [OK] Old processes cleaned up.
echo.

:: Check for Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Node.js found:
call node --version

:: Check for npm
where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] npm is not installed or not in PATH.
    pause
    exit /b 1
)

echo [OK] npm found:
call npm --version
echo.

:: Install root dependencies if needed
if not exist "node_modules" (
    echo [INFO] Installing root dependencies...
    call npm install
    if !ERRORLEVEL! neq 0 (
        echo [ERROR] Failed to install root dependencies.
        pause
        exit /b 1
    )
)

:: Install frontend dependencies if needed
if not exist "frontend\node_modules" (
    echo [INFO] Installing frontend dependencies...
    pushd frontend
    call npm install
    if !ERRORLEVEL! neq 0 (
        echo [ERROR] Failed to install frontend dependencies.
        pause
        exit /b 1
    )
    popd
)

:: Install backend dependencies if needed
if not exist "backend\node_modules" (
    echo [INFO] Installing backend dependencies...
    pushd backend
    call npm install
    if !ERRORLEVEL! neq 0 (
        echo [ERROR] Failed to install backend dependencies.
        pause
        exit /b 1
    )
    popd
)

echo.
echo ========================================
echo  Starting servers...
echo ========================================
echo.
echo [INFO] Backend will run on http://localhost:3000
echo [INFO] Frontend will run on http://localhost:5173
echo.
echo Press Ctrl+C to stop both servers.
echo.

:: Run both servers concurrently - use cmd /k to keep running
cmd /c "npm run dev"

:: If we get here, something went wrong or user stopped
echo.
echo [INFO] Servers stopped.
pause
