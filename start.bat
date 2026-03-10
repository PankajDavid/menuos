@echo off
echo ========================================
echo   Starting MenuOS Application
echo ========================================
echo.

REM Check if backend is set up
if not exist menuos\backend\.env (
    echo [ERROR] Backend .env not found!
    echo Please run setup.bat first
    pause
    exit /b 1
)

REM Check dependencies
if not exist menuos\backend\node_modules (
    echo Installing backend dependencies...
    cd menuos\backend
    call npm install
    cd ..\..
)

if not exist menuos\frontend\node_modules (
    echo Installing frontend dependencies...
    cd menuos\frontend
    call npm install
    cd ..\..
)

echo.
echo Starting servers...
echo.
echo Backend: http://localhost:4000
echo Frontend: http://localhost:5173
echo.
echo Opening browser in 8 seconds...
echo.

REM Start backend in new window
start "MenuOS Backend" cmd /k "cd menuos\backend && npm run dev"

timeout /t 3 /nobreak >nul

REM Start frontend in new window
start "MenuOS Frontend" cmd /k "cd menuos\frontend && npm run dev"

timeout /t 5 /nobreak >nul

REM Open browser
start http://localhost:5173

echo.
echo ========================================
echo   MenuOS is Running!
echo ========================================
echo.
echo Two new windows opened:
echo   - Backend server (port 4000)
echo   - Frontend server (port 5173)
echo.
echo Browser should open automatically.
echo If not, visit: http://localhost:5173
echo.
echo Login credentials:
echo   Email: admin@menuos.app
echo   Pass:  Admin@123
echo.
echo Close these windows to stop the servers.
echo.
pause
