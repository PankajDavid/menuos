# 🔍 MenuOS System Status Checker

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  MenuOS System Status Verification   " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$allGood = $true

# Check Node.js
Write-Host "[1/7] Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Node.js installed: $nodeVersion" -ForegroundColor Green
    } else {
        Write-Host "❌ Node.js not found or not in PATH" -ForegroundColor Red
        $allGood = $false
    }
} catch {
    Write-Host "❌ Node.js check failed" -ForegroundColor Red
    $allGood = $false
}

# Check PostgreSQL
Write-Host ""
Write-Host "[2/7] Checking PostgreSQL..." -ForegroundColor Yellow
try {
    $psqlVersion = psql --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ PostgreSQL found: $psqlVersion" -ForegroundColor Green
        
        # Try to connect
        $dbCheck = psql -U postgres -c "\l" 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ PostgreSQL is running and accessible" -ForegroundColor Green
        } else {
            Write-Host "⚠️  PostgreSQL running but connection failed. Check credentials." -ForegroundColor Yellow
        }
    } else {
        Write-Host "❌ PostgreSQL not found in PATH" -ForegroundColor Red
        Write-Host "   Install from: https://www.postgresql.org/download/windows/" -ForegroundColor Gray
        $allGood = $false
    }
} catch {
    Write-Host "❌ PostgreSQL check failed" -ForegroundColor Red
    $allGood = $false
}

# Check database existence
Write-Host ""
Write-Host "[3/7] Checking MenuOS database..." -ForegroundColor Yellow
$dbExists = psql -U postgres -c "\l menuos" 2>&1 | Select-String -Pattern "menuos"
if ($dbExists) {
    Write-Host "✓ Database 'menuos' exists" -ForegroundColor Green
    
    # Check tables
    $tableCount = psql -U postgres -d menuos -c "\dt" 2>&1 | Measure-Object -Line
    if ($tableCount.Lines -gt 5) {
        Write-Host "✓ Database schema migrated ($($tableCount.Lines - 3) tables found)" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Database may need migration" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ Database 'menuos' not found" -ForegroundColor Red
    Write-Host "   Run: psql -U postgres -c 'CREATE DATABASE menuos;'" -ForegroundColor Gray
    $allGood = $false
}

# Check backend .env
Write-Host ""
Write-Host "[4/7] Checking backend configuration..." -ForegroundColor Yellow
if (Test-Path ".\menuos\backend\.env") {
    Write-Host "✓ Backend .env file exists" -ForegroundColor Green
    
    $envContent = Get-Content ".\menuos\backend\.env"
    if ($envContent -match "DATABASE_URL=") {
        Write-Host "✓ DATABASE_URL configured" -ForegroundColor Green
    } else {
        Write-Host "⚠️  DATABASE_URL missing in .env" -ForegroundColor Yellow
    }
    
    if ($envContent -match "JWT_SECRET=change_this") {
        Write-Host "⚠️  Using default JWT_SECRET - change for production!" -ForegroundColor Yellow
    } else {
        Write-Host "✓ JWT_SECRET configured" -ForegroundColor Green
    }
} else {
    Write-Host "❌ Backend .env file not found" -ForegroundColor Red
    Write-Host "   Run setup.ps1 or copy .env.example to .env" -ForegroundColor Gray
    $allGood = $false
}

# Check backend dependencies
Write-Host ""
Write-Host "[5/7] Checking backend dependencies..." -ForegroundColor Yellow
if (Test-Path ".\menuos\backend\node_modules") {
    Write-Host "✓ Backend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "❌ Backend dependencies not installed" -ForegroundColor Red
    Write-Host "   Run: cd menuos\backend; npm install" -ForegroundColor Gray
    $allGood = $false
}

# Check frontend dependencies
Write-Host ""
Write-Host "[6/7] Checking frontend dependencies..." -ForegroundColor Yellow
if (Test-Path ".\menuos\frontend\node_modules") {
    Write-Host "✓ Frontend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "❌ Frontend dependencies not installed" -ForegroundColor Red
    Write-Host "   Run: cd menuos\frontend; npm install" -ForegroundColor Gray
    $allGood = $false
}

# Check running servers
Write-Host ""
Write-Host "[7/7] Checking running services..." -ForegroundColor Yellow

# Check backend port
$backendPort = netstat -ano | Select-String ":4000" | Select-String "LISTENING"
if ($backendPort) {
    Write-Host "✓ Backend server running on port 4000" -ForegroundColor Green
} else {
    Write-Host "⚠️  Backend server not running on port 4000" -ForegroundColor Yellow
}

# Check frontend port
$frontendPort = netstat -ano | Select-String ":5173" | Select-String "LISTENING"
if ($frontendPort) {
    Write-Host "✓ Frontend server running on port 5173" -ForegroundColor Green
} else {
    Write-Host "⚠️  Frontend server not running on port 5173" -ForegroundColor Yellow
}

# Test health endpoint
try {
    $healthResponse = Invoke-WebRequest -Uri "http://localhost:4000/health" -TimeoutSec 3 -UseBasicParsing 2>&1
    if ($healthResponse.StatusCode -eq 200) {
        Write-Host "✓ Backend API responding (health check passed)" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Backend API returned status: $($healthResponse.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  Cannot reach backend API at http://localhost:4000" -ForegroundColor Yellow
}

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Status Summary                      " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

if ($allGood) {
    Write-Host "✅ All systems ready! Run '.\start.ps1' to launch the application." -ForegroundColor Green
} else {
    Write-Host "⚠️  Some issues detected. Please review the checks above." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Quick fix:" -ForegroundColor Yellow
    Write-Host "1. Install PostgreSQL if not already installed" -ForegroundColor White
    Write-Host "2. Run: .\setup.ps1" -ForegroundColor White
    Write-Host "3. Then run: .\start.ps1" -ForegroundColor White
}

Write-Host ""
Write-Host "Application URLs (when running):" -ForegroundColor Cyan
Write-Host "  Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "  Backend:  http://localhost:4000" -ForegroundColor White
Write-Host "  Health:   http://localhost:4000/health" -ForegroundColor White
Write-Host ""
Write-Host "Default login:" -ForegroundColor Cyan
Write-Host "  Email: admin@menuos.app" -ForegroundColor White
Write-Host "  Pass:  Admin@123" -ForegroundColor White
Write-Host ""
