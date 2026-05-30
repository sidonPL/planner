#!/bin/bash

# Skrypt do uruchomienia aplikacji z automatyczną migracją

set -e

echo "🚀 Uruchamianie Plannera z migracją bazy danych..."

# 1. Upewnij się, że node_modules są zainstalowane
echo "📦 Sprawdzanie zależności..."
if [ ! -d "node_modules" ]; then
    echo "Instaluję zależności..."
    npm install
fi

# 2. Generuj klienta Prismy
echo "🔧 Generowanie klienta Prismy..."
npm run db:generate

# 3. Uruchom migracje
echo "🔄 Uruchamianie migracji bazy danych..."
npm run db:migrate

# 4. Sprawdź status migracji
echo "✅ Sprawdzanie statusu migracji..."
npm run db:migrate:status

# 5. Zbuduj aplikację
echo "🏗️ Budowanie aplikacji..."
npm run build

# 6. Uruchom PM2
echo "⚡ Uruchamianie aplikacji za pomocą PM2..."
pm2 start ecosystem.config.js --update-env

# 7. Wyświetl status
pm2 status

echo "✨ Aplikacja uruchomiona!"
echo "Logi dostępne za pomocą: pm2 logs"

