# Skrypt do uruchomienia aplikacji z automatyczną migracją (Windows)

$ErrorActionPreference = "Stop"

Write-Host "🚀 Uruchamianie Plannera z migracją bazy danych..." -ForegroundColor Cyan

# 1. Upewnij się, że node_modules są zainstalowane
Write-Host "📦 Sprawdzanie zależności..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    Write-Host "Instaluję zależności..."
    npm install
    if ($LASTEXITCODE -ne 0) { exit 1 }
}

# 2. Generuj klienta Prismy
Write-Host "🔧 Generowanie klienta Prismy..." -ForegroundColor Yellow
npm run db:generate
if ($LASTEXITCODE -ne 0) { exit 1 }

# 3. Uruchom migracje
Write-Host "🔄 Uruchamianie migracji bazy danych..." -ForegroundColor Yellow
npm run db:migrate
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️ UWAGA: Migracja nie powiodła się!" -ForegroundColor Red
    exit 1
}

# 4. Sprawdź status migracji
Write-Host "✅ Sprawdzanie statusu migracji..." -ForegroundColor Yellow
npm run db:migrate:status

# 5. Zbuduj aplikację
Write-Host "🏗️ Budowanie aplikacji..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) { exit 1 }

# 6. Uruchom PM2
Write-Host "⚡ Uruchamianie aplikacji za pomocą PM2..." -ForegroundColor Yellow
pm2 start ecosystem.config.js --update-env
if ($LASTEXITCODE -ne 0) { exit 1 }

# 7. Wyświetl status
pm2 status

Write-Host "✨ Aplikacja uruchomiona!" -ForegroundColor Green
Write-Host "Logi dostępne za pomocą: pm2 logs" -ForegroundColor Green

