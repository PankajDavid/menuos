@echo off
echo ========================================
echo   MenuOS Cloud Setup (Auto Mode)
echo ========================================
echo.
echo Using your Neon database connection string...
echo.

REM Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found!
    pause
    exit /b 1
)
echo [OK] Node.js found

cd menuos\backend
if not exist .env copy .env.example .env

echo.
echo Configuring backend with Neon database...
echo.

(
echo PORT=4000
echo NODE_ENV=development
echo DATABASE_URL=postgresql://neondb_owner:npg_V6SOPAQx2Jgv@ep-jolly-heart-a14qhdx0-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require^&channel_binding=require
echo JWT_SECRET=menuos_neon_setup_secret_abc123xyz789
echo JWT_REFRESH_SECRET=menuos_refresh_secret_xyz789abc123
echo FRONTEND_URL=http://localhost:5173
echo QR_BASE_URL=http://localhost:5173
echo PAYMENT_MODE=mock
) > .env

echo [OK] Backend configured with Neon database

echo.
echo Installing backend dependencies...
echo.
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Backend installation failed
    pause
    exit /b 1
)
echo [OK] Backend dependencies installed

cd ..\frontend

echo.
echo Installing frontend dependencies...
echo.
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Frontend installation failed
    pause
    exit /b 1
)
echo [OK] Frontend dependencies installed

cd ..\..

echo.
echo ========================================
echo   Setup Complete!
echo ========================================
echo.
echo Your Neon database is configured!
echo.
echo Next Steps:
echo   1. Run database migrations manually:
echo      psql "postgresql://neondb_owner:npg_V6SOPAQx2Jgv@ep-jolly-heart-a14qhdx0-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require" -f menuos\backend\src\db\migrations\schema.sql
echo.
echo   2. Or deploy to Railway which handles migrations automatically
echo.
echo To start the app now:
echo   Run: start.bat
echo.
echo Default login:
echo   Email: admin@menuos.app
echo   Pass:  Admin@123
echo.
pause
