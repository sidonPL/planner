#!/bin/bash

# 🚀 POLECENIA DLA BAZY: family_planner (USER: planner_user)

cd /opt/planner

# ============================================================================
# KROK 1: Sprawdź czy TripPhoto istnieje
# ============================================================================

echo "🔍 Sprawdzam tabelę TripPhoto w family_planner..."

psql -U planner_user -d family_planner -h localhost -c "\d \"TripPhoto\"" 2>&1

# Jeśli tabela istnieje, wyjdź
if [ $? -eq 0 ]; then
    echo "✅ Tabela już istnieje!"
    exit 0
fi

echo "❌ Tabela nie istnieje - tworzę..."

# ============================================================================
# KROK 2: Utwórz TripPhoto i TripPhotoLike
# ============================================================================

echo "🔧 Tworzę tabele TripPhoto i TripPhotoLike..."

psql -U planner_user -d family_planner -h localhost << 'EOF'

-- Utwórz tabelę TripPhoto
CREATE TABLE IF NOT EXISTS "TripPhoto" (
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
CREATE INDEX IF NOT EXISTS "TripPhoto_trip_id_idx" ON "TripPhoto"("trip_id");
CREATE INDEX IF NOT EXISTS "TripPhoto_uploaded_by_idx" ON "TripPhoto"("uploaded_by");

-- Utwórz tabelę TripPhotoLike
CREATE TABLE IF NOT EXISTS "TripPhotoLike" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "photoId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TripPhotoLike_photoId_fkey" FOREIGN KEY ("photoId")
    REFERENCES "TripPhoto"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TripPhotoLike_userId_fkey" FOREIGN KEY ("userId")
    REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "TripPhotoLike_photoId_userId_key"
  ON "TripPhotoLike"("photoId", "userId");
CREATE INDEX IF NOT EXISTS "TripPhotoLike_photoId_idx" ON "TripPhotoLike"("photoId");
CREATE INDEX IF NOT EXISTS "TripPhotoLike_userId_idx" ON "TripPhotoLike"("userId");

EOF

if [ $? -eq 0 ]; then
    echo "✅ Tabele utworzone pomyślnie!"
else
    echo "❌ Błąd przy tworzeniu tabel"
    exit 1
fi

# ============================================================================
# KROK 3: Sprawdź strukturę
# ============================================================================

echo ""
echo "✅ Struktura TripPhoto:"
psql -U planner_user -d family_planner -h localhost -c "\d \"TripPhoto\""

echo ""
echo "✅ Struktura TripPhotoLike:"
psql -U planner_user -d family_planner -h localhost -c "\d \"TripPhotoLike\""

# ============================================================================
# KROK 4: Zrestartuj aplikację
# ============================================================================

echo ""
echo "⚡ Restartuję aplikację..."

pm2 stop all
npm run build
pm2 restart ecosystem.config.js --update-env

echo ""
echo "✨ Gotowe!"
pm2 logs planner-app --lines 30

