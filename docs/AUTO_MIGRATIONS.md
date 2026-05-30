# 🚀 Automatyczne Migracje Bazy Danych

## Podsumowanie zmian

Skonfigurowano automatyczne wykonywanie migracji Prismy podczas startu aplikacji. Nowe rozwiązanie zapewnia:

✅ Migracje zawsze uruchamiane przed startem aplikacji  
✅ Bezpieczne - jeśli migracja się nie uda, aplikacja się nie uruchomi  
✅ Zalogowanie wszystkich zmian w plikach logów  
✅ Obsługa zarówno development jak i production  

---

## 🛠️ Konfiguracja

### Pliki zmodyfikowane:

1. **ecosystem.config.js** - Dodano dedykowane zadanie `prisma-migrate`
2. **package.json** - Dodano nowy skrypt `start:migrate`

### Nowe pliki:

- `start-with-migrations.js` - Skrypt Node.js (REKOMENDOWANE)
- `start-with-migrations.sh` - Skrypt Bash dla Linux/Mac
- `start-with-migrations.ps1` - Skrypt PowerShell dla Windows

---

## 📋 Jak używać

### Opcja 1: Skrypt Node.js (REKOMENDOWANA)

```bash
npm run start:migrate
```

To automatycznie:
1. Sprawdzi zależności npm
2. Wygeneruje klienta Prismy
3. Uruchomi migracje
4. Zbuduje aplikację
5. Uruchomi PM2

**Zaleta:** Działa na wszystkich systemach operacyjnych

### Opcja 2: Bash (Linux/Mac)

```bash
chmod +x start-with-migrations.sh
./start-with-migrations.sh
```

### Opcja 3: PowerShell (Windows)

```powershell
powershell -ExecutionPolicy Bypass -File start-with-migrations.ps1
```

### Opcja 4: Standardowy deploy

```bash
npm run deploy:prod
```

Ten skrypt już zawiera migracje:
```bash
npm run check:all && npm run db:migrate && npm run build && pm2 restart ecosystem.config.js --update-env
```

---

## 🔄 Automatyczne migracje w PM2

Jeśli chcesz, aby migracje uruchamiane były automatycznie zawsze podczas restartu PM2:

```bash
pm2 start ecosystem.config.js --update-env
```

Konfiguracja w `ecosystem.config.js` zawiera zadanie `prisma-migrate`, które będzie:
- Uruchamiane raz
- Wykonywane bez restartów
- Logowane w `logs/migrate-*.log`

---

## 📊 Monitorowanie

### Sprawdź status migracji

```bash
npm run db:migrate:status
```

### Sprawdź logi migracji

```bash
pm2 logs prisma-migrate
pm2 logs planner-app
```

### Sprawdź status aplikacji

```bash
npm run status
```

---

## ⚠️ Troubleshooting

### Migracja nie uruchamia się

**Problem:** Migracje się nie uruchamiają podczas startu

**Rozwiązanie:**
```bash
# Ręcznie uruchom migracje
npm run db:migrate

# Sprawdź status
npm run db:migrate:status

# Przebuduj aplikację
npm run build

# Zrestartuj PM2
pm2 restart all
```

### Błąd: "relation does not exist"

To oznacza, że migracja się nie wykonała. Wykonaj:

```bash
npm run db:migrate
npm run db:migrate:status
```

Jeśli migracja się nie uruchomiła na produkcji, wykonaj SSH na VPS i uruchom:

```bash
cd /var/www/planner
npm run db:migrate
pm2 restart all
```

### Błąd połączenia do bazy danych

**Problem:** Timeout lub brak połączenia

**Rozwiązanie:**
1. Sprawdź zmienne środowiskowe `.env`
2. Upewnij się, że PostgreSQL jest uruchomiony
3. Sprawdź firewall na VPS

```bash
# Na VPS
sudo systemctl status postgresql

# Testuj połączenie
psql -U $DATABASE_USER -d $DATABASE_NAME -h localhost -c "SELECT 1"
```

---

## 🔐 Production (VPS)

Na serwerze produkcji, podczas deploymentu:

```bash
cd /var/www/planner

# 1. Pobierz najnowszy kod
git pull origin main

# 2. Zainstaluj zależności
npm install

# 3. Uruchom migracje z nowym skryptem
npm run start:migrate

# LUB tradycyjnie:
npm run db:migrate && npm run build && pm2 restart ecosystem.config.js --update-env
```

---

## 📝 Schemat bazy danych

Model `TripPhoto` jest już w `schema.prisma`:

```prisma
model TripPhoto {
  id          String   @id @default(cuid())
  tripId      String
  trip        Trip     @relation(fields: [tripId], references: [id], onDelete: Cascade)
  uploadedBy  User     @relation("TripPhotoUploadedBy", fields: [uploadedById], references: [id], onDelete: Cascade)
  uploadedById String
  photoUrl    String
  caption     String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  photoLikes  TripPhotoLike[]

  @@index([tripId])
  @@index([uploadedById])
  @@map("TripPhoto")
}
```

---

## ✨ Podsumowanie

- ✅ Automatyczne migracje w `ecosystem.config.js`
- ✅ Dedykowany skrypt `npm run start:migrate`
- ✅ Logi migracji w `logs/migrate-*.log`
- ✅ Obsługa błędów i fallback do uruchomienia bez PM2
- ✅ Gotowe do production

**Rekomendacja:** Używaj `npm run start:migrate` lub `npm run deploy:prod` na serwerze produkcji.

