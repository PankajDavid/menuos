@echo off
echo ========================================
echo   MenuOS Cloud Setup (No PostgreSQL!)
echo ========================================
echo.
echo This setup uses Neon.tech cloud database
echo NO local PostgreSQL installation needed!
echo.
pause

REM Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found!
    pause
    exit /b 1
)
echo [OK] Node.js found

echo.
echo ========================================
echo   Step 1: Create Free Cloud Database
echo ========================================
echo.
echo 1. Open browser to: https://neon.tech
echo 2. Sign up with GitHub (FREE)
echo 3. Create new project named: menuos
echo 4. Copy the Connection String
echo.
echo Press any key when you have the connection string...
pause >nul

echo.
echo ========================================
echo   Step 2: Configure Backend
echo ========================================
echo.

cd menuos\backend
if not exist .env copy .env.example .env

echo.
echo Paste your Neon database connection string:
echo (Example: postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/menuos?sslmode=require)
echo.
set /p DBURL="Connection String: "

echo Configuring .env file...
(
echo PORT=4000
echo NODE_ENV=development
echo DATABASE_URL=%DBURL%
echo JWT_SECRET=cloud_setup_secret_key_abc123xyz
echo JWT_REFRESH_SECRET=cloud_refresh_secret_xyz789
echo FRONTEND_URL=http://localhost:5173
echo QR_BASE_URL=http://localhost:5173
echo PAYMENT_MODE=mock
) > .env

echo [OK] Backend configured with cloud database

echo.
echo ========================================
echo   Step 3: Install Dependencies
echo ========================================
echo.
echo Installing backend dependencies...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Backend installation failed
    pause
    exit /b 1
)
echo [OK] Backend ready

cd ..\frontend

echo.
echo Installing frontend dependencies...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Frontend installation failed
    pause
    exit /b 1
)
echo [OK] Frontend ready

cd ..\..

echo.
echo ========================================
echo   Run Database Migrations
echo ========================================
echo.
echo Your cloud database needs initial setup.
echo.
echo Run this command manually:
echo psql "%DBURL%" -f menuos\backend\src\db\migrations\schema.sql
echo.
echo Or use the Railway deployment guide which automates this!
echo.

echo ========================================
echo   Setup Complete!
echo ========================================
echo.
echo To start the application:
echo   1. Run: start.bat
echo   2. Or manually start both servers
echo.
echo Next Steps:
echo   - Test locally
echo   - Push to GitHub
echo   - Deploy to Railway (see RAILWAY_DEPLOY.md)
echo.
echo Default login:
echo   Email: admin@menuos.app
echo   Pass:  Admin@123
echo.
pause
