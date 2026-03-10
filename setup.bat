@echo off
echo ========================================
echo   MenuOS Quick Setup - Windows Batch
echo ========================================
echo.

REM Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found! Please install from https://nodejs.org/
    pause
    exit /b 1
)
echo [OK] Node.js found

REM Check if PostgreSQL is installed
where psql >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [WARNING] PostgreSQL not found in PATH!
    echo Please install from: https://www.postgresql.org/download/windows/
    echo.
    echo After installation, run this script again.
    pause
    exit /b 1
)
echo [OK] PostgreSQL found

echo.
echo ========================================
echo   Step 1: Create Database
echo ========================================
echo.
echo Enter your PostgreSQL postgres user password when prompted:
set /p PGPASSWORD="PostgreSQL Password: "
set PGPASSWORD=%PGPASSWORD%

psql -U postgres -c "DROP DATABASE IF EXISTS menuos;"
psql -U postgres -c "CREATE DATABASE menuos;"
if %errorlevel% neq 0 (
    echo [ERROR] Failed to create database
    pause
    exit /b 1
)
echo [OK] Database created

echo.
echo ========================================
echo   Step 2: Run Migrations
echo ========================================
echo.
set PGPASSWORD=%PGPASSWORD%
psql -U postgres -d menuos -f menuos\backend\src\db\migrations\schema.sql
if %errorlevel% neq 0 (
    echo [ERROR] Migration failed
    pause
    exit /b 1
)
echo [OK] Database migrated

echo.
echo ========================================
echo   Step 3: Setup Backend
echo ========================================
echo.
cd menuos\backend
if not exist .env copy .env.example .env
echo Installing backend dependencies...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Backend installation failed
    pause
    exit /b 1
)
echo [OK] Backend ready
cd ..\..

echo.
echo ========================================
echo   Step 4: Setup Frontend
echo ========================================
echo.
cd menuos\frontend
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
echo   Setup Complete!
echo ========================================
echo.
echo To start the application:
echo   1. Run: start.bat
echo   2. Or manually:
echo      - Terminal 1: cd menuos\backend ^&^& npm run dev
echo      - Terminal 2: cd menuos\frontend ^&^& npm run dev
echo.
echo Default login:
echo   Email: admin@menuos.app
echo   Pass:  Admin@123
echo.
pause
