# 🚀 MenuOS One-Click Setup Script for Windows
# This script automates the entire setup process

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  MenuOS - Restaurant SaaS Platform   " -ForegroundColor Cyan
Write-Host "  Automated Setup Script              " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check PostgreSQL installation
Write-Host "[1/6] Checking PostgreSQL installation..." -ForegroundColor Yellow
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue

if (-not $psqlPath) {
    Write-Host "❌ PostgreSQL not found in PATH!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install PostgreSQL first:" -ForegroundColor Yellow
    Write-Host "1. Download from: https://www.postgresql.org/download/windows/" -ForegroundColor White
    Write-Host "2. Install and remember your postgres password" -ForegroundColor White
    Write-Host "3. Add PostgreSQL bin folder to PATH (usually: C:\Program Files\PostgreSQL\<version>\bin)" -ForegroundColor White
    Write-Host ""
    Write-Host "After installation, run this script again." -ForegroundColor Green
    exit 1
} else {
    Write-Host "✓ PostgreSQL found: $($psqlPath.Source)" -ForegroundColor Green
}

# Step 2: Create database
Write-Host ""
Write-Host "[2/6] Creating MenuOS database..." -ForegroundColor Yellow
$postgresPassword = Read-Host "Enter your PostgreSQL 'postgres' user password" -AsSecureString
$secureString = ConvertFrom-SecureString -SecureString $postgresPassword -AsPlainText

try {
    psql -U postgres -c "DROP DATABASE IF EXISTS menuos;" 2>&1 | Out-Null
    psql -U postgres -c "CREATE DATABASE menuos;" 2>&1 | Out-Null
    Write-Host "✓ Database 'menuos' created successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to create database. Please check your PostgreSQL credentials." -ForegroundColor Red
    exit 1
}

# Step 3: Run migrations
Write-Host ""
Write-Host "[3/6] Running database migrations..." -ForegroundColor Yellow
$env:PGPASSWORD = $secureString
psql -U postgres -d menuos -f ".\menuos\backend\src\db\migrations\schema.sql" 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Database schema migrated successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Migration failed" -ForegroundColor Red
    exit 1
}

# Step 4: Setup backend
Write-Host ""
Write-Host "[4/6] Setting up backend..." -ForegroundColor Yellow
Set-Location ".\menuos\backend"
Copy-Item ".env.example" ".env" -ErrorAction SilentlyContinue
Write-Host "Creating .env file..." -ForegroundColor Gray

# Generate secure JWT secrets
$jwtSecret = [System.Web.Security.Membership]::GeneratePassword(64, 8)
$refreshSecret = [System.Web.Security.Membership]::GeneratePassword(64, 8)

$envContent = Get-Content ".env.example"
$envContent = $envContent -replace "change_this_to_256_bit_random_secret", $jwtSecret
$envContent = $envContent -replace "change_this_too_another_256_bit_secret", $refreshSecret
$envContent = $envContent -replace "password", $secureString
$envContent | Set-Content ".env"

Write-Host "✓ Backend environment configured" -ForegroundColor Green
Write-Host "Installing npm dependencies..." -ForegroundColor Gray
npm install
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Backend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "❌ Backend installation failed" -ForegroundColor Red
    exit 1
}
Set-Location "..\.."

# Step 5: Setup frontend
Write-Host ""
Write-Host "[5/6] Setting up frontend..." -ForegroundColor Yellow
Set-Location ".\menuos\frontend"
Write-Host "Installing npm dependencies..." -ForegroundColor Gray
npm install
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Frontend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "❌ Frontend installation failed" -ForegroundColor Red
    exit 1
}
Set-Location "..\.."

# Step 6: Start servers
Write-Host ""
Write-Host "[6/6] Starting application servers..." -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  ✓ Setup Complete!                   " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Starting backend server (port 4000)..." -ForegroundColor Cyan
Write-Host "Starting frontend server (port 5173)..." -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop all servers" -ForegroundColor Yellow
Write-Host ""

# Start backend in new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\menuos\backend'; npm run dev"

# Wait a moment for backend to start
Start-Sleep -Seconds 3

# Start frontend in new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\menuos\frontend'; npm run dev"

# Open browser after a delay
Start-Sleep -Seconds 5
Start-Process "http://localhost:5173"

Write-Host "🎉 MenuOS is now running!" -ForegroundColor Green
Write-Host ""
Write-Host "Backend API:  http://localhost:4000" -ForegroundColor White
Write-Host "Frontend App: http://localhost:5173" -ForegroundColor White
Write-Host ""
Write-Host "Default Platform Admin:" -ForegroundColor Yellow
Write-Host "  Email:    admin@menuos.app" -ForegroundColor White
Write-Host "  Password: Admin@123" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  Change the default password immediately!" -ForegroundColor Red
