@echo off
echo ========================================
echo   MenuOS Frontend Demo
echo ========================================
echo.
echo Starting development server...
echo.
echo Access at: http://localhost:5173
echo.
echo Press Ctrl+C to stop
echo.

cd /d "%~dp0menuos\frontend"
call npm run dev
