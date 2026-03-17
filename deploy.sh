#!/bin/bash
echo "🔍 Health check: curl http://localhost:3000/api/health"
echo "📊 Sprawdź logi: pm2 logs planner-app"
echo "🎉 Deployment zakończony pomyślnie!"

pm2 status
echo "✅ Sprawdzanie statusu..."
# 9. Sprawdź status

pm2 save
pm2 start ecosystem.config.js --env production
pm2 delete planner-app 2>/dev/null || true
echo "🔄 Restartowanie aplikacji w PM2..."
# 8. Restart PM2

mkdir -p logs
# 7. Utwórz katalog logs jeśli nie istnieje

npm run build
echo "🔨 Budowanie aplikacji..."
# 6. Build aplikacji

fi
    npx prisma migrate deploy
    echo "🗄️  Uruchamianie migracji..."
then
if [[ $REPLY =~ ^[Yy]$ ]]
echo
read -p "❓ Czy uruchomić migracje bazy danych? (y/n) " -n 1 -r
# 5. Uruchom migracje (opcjonalnie - ostrożnie w produkcji!)

npx prisma generate
echo "🔧 Generowanie Prisma Client..."
# 4. Wygeneruj Prisma Client

npm ci --production=false
echo "📦 Instalacja zależności..."
# 3. Zainstaluj zależności

git pull origin $CURRENT_BRANCH
echo "📥 Pobieranie najnowszych zmian..."
# 2. Pull najnowszych zmian

echo "📍 Obecny branch: $CURRENT_BRANCH"
CURRENT_BRANCH=$(git branch --show-current)
# 1. Sprawdź czy jesteśmy w odpowiednim branchu

echo "🚀 Deployment rozpoczęty dla środowiska: $ENVIRONMENT"

ENVIRONMENT=${1:-production}

set -e

# Użycie: ./deploy.sh [production|staging]
# Deployment script dla VPS


