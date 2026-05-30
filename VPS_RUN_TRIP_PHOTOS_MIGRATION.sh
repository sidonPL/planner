#!/bin/bash

# 🚀 POLECENIE DO WYKONANIA NA VPS
# Uruchamia migrację add_trip_photos.sql bezpośrednio

ssh root@planner.sidon.pl

cd /var/www/planner

# ============================================================================
# SPOSÓB 1: Bezpośrednio (SZYBKO)
# ============================================================================

npx prisma db execute --stdin < prisma/migrations/add_trip_photos.sql

# Sprawdzenie czy się udało
psql -U $DATABASE_USER -d $DATABASE_NAME -h localhost -c "SELECT * FROM \"TripPhoto\" LIMIT 1;" 2>/dev/null && echo "✅ Tabela istnieje" || echo "❌ Coś poszło nie tak"

# ============================================================================
# SPOSÓB 2: Jeśli Sposób 1 nie zadziała
# ============================================================================

cat prisma/migrations/add_trip_photos.sql | npx prisma db execute --stdin

# ============================================================================
# SPOSÓB 3: Bezpośrednio przez psql
# ============================================================================

psql -U $DATABASE_USER -d $DATABASE_NAME -h localhost -f prisma/migrations/add_trip_photos.sql

# ============================================================================
# SPRAWDZENIE
# ============================================================================

# Sprawdź czy tabela powstała
psql -U $DATABASE_USER -d $DATABASE_NAME -h localhost -c "\dt+ \"TripPhoto\""

# Sprawdź strukturę tabeli
psql -U $DATABASE_USER -d $DATABASE_NAME -h localhost -c "\d \"TripPhoto\""

# ============================================================================
# JEŚLI WYŁĄCZ APLIKACJĘ, ZRESTARTUJ JĄ
# ============================================================================

pm2 stop all
npm run build
pm2 restart ecosystem.config.js --update-env
pm2 logs planner-app

