@echo off
echo ========================================
echo   MenuOS Quick Demo (No Database!)
echo ========================================
echo.
echo This will start a demo version with sample data
echo so you can see the UI without setting up a database.
echo.

cd menuos\frontend

REM Check if dependencies exist
if not exist node_modules (
    echo Installing frontend dependencies...
    call npm install
)

echo.
echo Starting frontend in DEMO mode...
echo.
echo NOTE: Backend features won't work without database setup.
echo You'll see the UI, but login/actions will fail.
echo.
echo Press Ctrl+C to stop
echo.

npm run dev
