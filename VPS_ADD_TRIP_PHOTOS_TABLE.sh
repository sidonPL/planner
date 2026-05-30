#!/bin/bash

# 🚀 POLECENIA NA VPS DO FAKTYCZNEGO DODANIA TABELI TripPhoto

cd /opt/planner

# ============================================================================
# KROK 1: Sprawdź czy tabela istnieje
# ============================================================================

echo "🔍 Sprawdzam czy tabela istnieje..."

psql -U postgres -d planner -h localhost -c "\d \"TripPhoto\"" 2>&1 | grep -q "TripPhoto" && {
    echo "✅ Tabela już istnieje!"
    psql -U postgres -d planner -h localhost -c "SELECT COUNT(*) as count FROM \"TripPhoto\";"
    exit 0
}

echo "❌ Tabela nie istnieje - tworzę..."

# ============================================================================
# KROK 2: Utwórz tabelę bezpośrednio (PRACUJE!)
# ============================================================================

echo "🔧 Tworzę tabelę TripPhoto..."

psql -U postgres -d planner -h localhost << 'EOF'

-- Utwórz tabelę TripPhoto
CREATE TABLE "TripPhoto" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "trip_id" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "caption" TEXT,
  "uploaded_by" TEXT NOT NULL,
  "likes" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TripPhoto_trip_id_fkey" FOREIGN KEY ("trip_id")
    REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TripPhoto_uploaded_by_fkey" FOREIGN KEY ("uploaded_by")
    REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Utwórz indeksy
CREATE INDEX "TripPhoto_trip_id_idx" ON "TripPhoto"("trip_id");
CREATE INDEX "TripPhoto_uploaded_by_idx" ON "TripPhoto"("uploaded_by");

-- Utwórz tabelę TripPhotoLike
CREATE TABLE "TripPhotoLike" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "photoId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TripPhotoLike_photoId_fkey" FOREIGN KEY ("photoId")
    REFERENCES "TripPhoto"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TripPhotoLike_userId_fkey" FOREIGN KEY ("userId")
    REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TripPhotoLike_photoId_userId_key" UNIQUE ("photoId", "userId")
);

CREATE INDEX "TripPhotoLike_photoId_idx" ON "TripPhotoLike"("photoId");
CREATE INDEX "TripPhotoLike_userId_idx" ON "TripPhotoLike"("userId");

EOF

if [ $? -eq 0 ]; then
    echo "✅ Tabele utworzone pomyślnie!"
else
    echo "❌ Błąd przy tworzeniu tabel"
    exit 1
fi

# ============================================================================
# KROK 3: Sprawdź czy się udało
# ============================================================================

echo ""
echo "✅ Sprawdzam strukturę tabel..."

psql -U postgres -d planner -h localhost -c "\d \"TripPhoto\""

echo ""
echo "✅ Sprawdzam referencje..."

psql -U postgres -d planner -h localhost -c "\d \"TripPhotoLike\""

# ============================================================================
# KROK 4: Zrestartuj aplikację
# ============================================================================

echo ""
echo "⚡ Restartuję aplikację..."

pm2 stop all
npm run build
pm2 restart ecosystem.config.js --update-env

echo "✨ Gotowe!"
echo ""
echo "Logi:"
pm2 logs planner-app --lines 50

