# 🚀 MenuOS Quick Start Script
# Run this after completing the initial setup

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Starting MenuOS Application         " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env exists in backend
if (-not (Test-Path ".\menuos\backend\.env")) {
    Write-Host "❌ Backend .env file not found!" -ForegroundColor Red
    Write-Host "Please run setup.ps1 first or manually create the .env file." -ForegroundColor Yellow
    exit 1
}

# Check if node_modules exist
if (-not (Test-Path ".\menuos\backend\node_modules")) {
    Write-Host "⚠️  Backend dependencies not installed. Installing now..." -ForegroundColor Yellow
    Set-Location ".\menuos\backend"
    npm install
    Set-Location "..\.."
}

if (-not (Test-Path ".\menuos\frontend\node_modules")) {
    Write-Host "⚠️  Frontend dependencies not installed. Installing now..." -ForegroundColor Yellow
    Set-Location ".\menuos\frontend"
    npm install
    Set-Location "..\.."
}

Write-Host "Starting backend server on http://localhost:4000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\menuos\backend'; Write-Host 'Backend starting...' -ForegroundColor Cyan; npm run dev"

Start-Sleep -Seconds 3

Write-Host "Starting frontend server on http://localhost:5173..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\menuos\frontend'; Write-Host 'Frontend starting...' -ForegroundColor Cyan; npm run dev"

Start-Sleep -Seconds 5

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  ✓ MenuOS is Running!                " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "🔧 Backend:  http://localhost:4000" -ForegroundColor White
Write-Host ""
Write-Host "Opening browser..." -ForegroundColor Cyan
Start-Process "http://localhost:5173"

Write-Host ""
Write-Host "Press any key to exit this window..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
