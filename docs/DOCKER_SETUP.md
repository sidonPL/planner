# Docker Setup - Planner App

**Data**: 2026-01-06  
**Status**: ✅ Skonfigurowane  
**Środowisko**: Development + Production

---

## 🎯 Przegląd

Konteneryzacja aplikacji Planner z Docker Compose:
- ✅ PostgreSQL database container
- ✅ Next.js application container
- ✅ Nginx reverse proxy (production)
- ✅ Hot reload w development
- ✅ Health checks
- ✅ Auto-restart
- ✅ Persystentne volume'y

---

## 📁 Utworzone Pliki

### Docker Files:
1. `Dockerfile` - Production build (multi-stage)
2. `Dockerfile.dev` - Development build (hot reload)
3. `docker-compose.yml` - Production setup
4. `docker-compose.dev.yml` - Development setup
5. `.dockerignore` - Ignorowanie niepotrzebnych plików

### Configuration:
1. `nginx/nginx.conf` - Nginx reverse proxy config
2. `src/app/api/health/route.ts` - Health check endpoint

---

## 🚀 Quick Start

### Development Mode (Rekomendowane dla lokalnego developmentu)

```bash
# 1. Uruchom wszystkie serwisy
docker-compose -f docker-compose.dev.yml up

# Lub w tle
docker-compose -f docker-compose.dev.yml up -d

# 2. Sprawdź logi
docker-compose -f docker-compose.dev.yml logs -f app

# 3. Aplikacja dostępna na http://localhost:3000
```

**Co się dzieje:**
- PostgreSQL uruchamia się na porcie 5432
- Next.js app z hot reload na porcie 3000
- pgAdmin (opcjonalnie) na porcie 5050

### Production Mode

```bash
# 1. Build image
docker-compose build

# 2. Uruchom serwisy
docker-compose up -d

# 3. Sprawdź status
docker-compose ps

# 4. Zobacz logi
docker-compose logs -f app
```

**Co się działa:**
- PostgreSQL w kontenerze
- Next.js app (optimized build)
- Nginx reverse proxy (opcjonalnie)

---

## 🛠️ Detailed Commands

### Zarządzanie Kontenerami

```bash
# Start wszystkich serwisów
docker-compose up

# Start w tle (detached)
docker-compose up -d

# Stop wszystkich serwisów
docker-compose down

# Stop i usuń volumes (UWAGA: usuwa dane!)
docker-compose down -v

# Restart konkretnego serwisu
docker-compose restart app

# Rebuild image
docker-compose build app

# Rebuild bez cache
docker-compose build --no-cache app
```

### Logi i Debugging

```bash
# Wszystkie logi
docker-compose logs

# Logi z follow
docker-compose logs -f

# Logi konkretnego serwisu
docker-compose logs -f app

# Ostatnie 100 linii
docker-compose logs --tail=100 app

# Wejdź do kontenera (bash)
docker-compose exec app sh

# Wejdź do PostgreSQL
docker-compose exec postgres psql -U postgres -d family_planner
```

### Database

```bash
# Backup bazy danych
docker-compose exec postgres pg_dump -U postgres family_planner > backup.sql

# Restore bazy danych
cat backup.sql | docker-compose exec -T postgres psql -U postgres -d family_planner

# Dostęp do PostgreSQL CLI
docker-compose exec postgres psql -U postgres

# Sprawdź połączenie
docker-compose exec app npx prisma db pull
```

### Prisma Migrations

```bash
# Generate Prisma Client
docker-compose exec app npx prisma generate

# Run migrations
docker-compose exec app npx prisma migrate deploy

# Create new migration
docker-compose exec app npx prisma migrate dev --name migration_name

# Reset database (UWAGA: usuwa wszystkie dane!)
docker-compose exec app npx prisma migrate reset
```

---

## ⚙️ Configuration

### Environment Variables

Utwórz plik `.env` w root projektu:

```bash
# Database
DB_NAME=family_planner
DB_USER=postgres
DB_PASSWORD=strong-password-here
DB_PORT=5432

# Application
APP_PORT=3000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-min-32-chars

# Sentry (opcjonalnie)
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_ORG=
SENTRY_PROJECT=

# Nginx (production)
NGINX_HTTP_PORT=80
NGINX_HTTPS_PORT=443
```

### Docker Compose Profiles

```bash
# Production z Nginx
docker-compose --profile production up

# Development z pgAdmin
docker-compose -f docker-compose.dev.yml --profile tools up
```

---

## 📊 Architecture

### Development Setup

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ :3000
       ▼
┌─────────────┐     :5432    ┌─────────────┐
│  Next.js    ├──────────────►│ PostgreSQL  │
│  (dev mode) │              │             │
└─────────────┘              └─────────────┘
       │
       │ hot reload
       ▼
┌─────────────┐
│ Local Files │
└─────────────┘
```

### Production Setup

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ :80/:443
       ▼
┌─────────────┐
│    Nginx    │ (reverse proxy, cache, SSL)
└──────┬──────┘
       │ :3000
       ▼
┌─────────────┐     :5432    ┌─────────────┐
│  Next.js    ├──────────────►│ PostgreSQL  │
│ (optimized) │              │             │
└─────────────┘              └─────────────┘
```

---

## 🔧 Customization

### Change PostgreSQL Version

W `docker-compose.yml` zmień:
```yaml
postgres:
  image: postgres:16-alpine  # Zmień na 15, 14, etc.
```

### Add Redis Cache

Dodaj do `docker-compose.yml`:
```yaml
redis:
  image: redis:alpine
  container_name: planner-redis
  ports:
    - "6379:6379"
  networks:
    - planner-network
```

### Custom Nginx Config

Edytuj `nginx/nginx.conf` lub zamontuj własny:
```yaml
nginx:
  volumes:
    - ./my-custom-nginx.conf:/etc/nginx/nginx.conf:ro
```

---

## 🐛 Troubleshooting

### Problem: Container nie startuje

**Diagnoza:**
```bash
# Sprawdź logi
docker-compose logs app

# Sprawdź status
docker-compose ps

# Sprawdź health check
docker inspect planner-app | grep -A 20 Health
```

**Rozwiązania:**
1. Sprawdź czy porty nie są zajęte: `netstat -ano | findstr :3000`
2. Sprawdź zmienne środowiskowe: `docker-compose config`
3. Rebuild z clean slate: `docker-compose down -v && docker-compose build --no-cache`

### Problem: Database connection failed

**Diagnoza:**
```bash
# Sprawdź czy PostgreSQL działa
docker-compose exec postgres pg_isready

# Sprawdź logi PostgreSQL
docker-compose logs postgres

# Test połączenia z app
docker-compose exec app npx prisma db pull
```

**Rozwiązania:**
1. Poczekaj aż PostgreSQL health check przejdzie (może trwać 10-20s)
2. Sprawdź `DATABASE_URL` w `.env`
3. Sprawdź czy hasło się zgadza

### Problem: Hot reload nie działa (development)

**Rozwiązanie:**
```yaml
# W docker-compose.dev.yml sprawdź volumes:
volumes:
  - .:/app
  - /app/node_modules  # To jest ważne!
  - /app/.next
```

### Problem: Brak miejsca na dysku

**Cleanup:**
```bash
# Usuń nieużywane images
docker image prune -a

# Usuń nieużywane volumes
docker volume prune

# Usuń wszystko (UWAGA!)
docker system prune -a --volumes
```

---

## 📈 Performance Tips

### Optimize Build Time

```dockerfile
# W Dockerfile użyj cache dla dependencies
COPY package*.json ./
RUN npm ci
# Dopiero potem kopiuj resztę
COPY . .
```

### Reduce Image Size

Obecny production image: **~300MB** (dzięki multi-stage build)

```bash
# Sprawdź rozmiar
docker images planner-app

# Analyze layers
docker history planner-app
```

### Health Checks

Już skonfigurowane! Endpoint: `/api/health`

```bash
# Test health check
curl http://localhost:3000/api/health

# Response:
# {
#   "status": "healthy",
#   "timestamp": "2026-01-06T00:00:00.000Z",
#   "database": "connected",
#   "uptime": 123.45
# }
```

---

## 🚢 Deployment na VPS

### 1. Przygotowanie

```bash
# Na VPS zainstaluj Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Zainstaluj Docker Compose
sudo apt-get install docker-compose-plugin

# Dodaj użytkownika do grupy docker
sudo usermod -aG docker $USER
```

### 2. Transfer plików

```bash
# Z lokalnego komputera
scp -r . user@vps:/var/www/planner

# Lub użyj Git
git clone your-repo.git /var/www/planner
```

### 3. Konfiguracja

```bash
cd /var/www/planner

# Utwórz .env
nano .env
# Dodaj production values

# Build
docker-compose build

# Uruchom migrations
docker-compose run --rm app npx prisma migrate deploy
```

### 4. Start aplikacji

```bash
# Start w tle
docker-compose up -d

# Sprawdź logi
docker-compose logs -f

# Sprawdź status
docker-compose ps
```

### 5. SSL/HTTPS (Let's Encrypt)

```bash
# Zainstaluj Certbot
sudo apt-get install certbot

# Uzyskaj certyfikat
sudo certbot certonly --standalone -d twoja-domena.pl

# Certyfikaty będą w:
# /etc/letsencrypt/live/twoja-domena.pl/

# Odkomentuj HTTPS server w nginx.conf
# i zmontuj certyfikaty w docker-compose.yml
```

---

## 🔄 Update i Maintenance

### Aktualizacja aplikacji

```bash
# 1. Pull latest code
git pull

# 2. Rebuild
docker-compose build app

# 3. Restart
docker-compose up -d

# 4. Run migrations (jeśli są)
docker-compose exec app npx prisma migrate deploy
```

### Backup

```bash
# Database backup
docker-compose exec postgres pg_dump -U postgres family_planner | gzip > backup_$(date +%Y%m%d).sql.gz

# Restore
gunzip < backup_20260106.sql.gz | docker-compose exec -T postgres psql -U postgres -d family_planner
```

### Monitoring

```bash
# Resources usage
docker stats

# Logs size
docker-compose logs --tail=0 -t 2>&1 | wc -l

# Cleanup old logs
docker-compose down && docker-compose up -d
```

---

## 📋 Checklist Production

### Pre-Deployment:
- [ ] `.env` z production values
- [ ] `NEXTAUTH_SECRET` min 32 znaki
- [ ] Database password silne
- [ ] Sentry DSN ustawiony
- [ ] SSL certyfikaty gotowe

### Deployment:
- [ ] Docker zainstalowany na VPS
- [ ] Pliki transferowane
- [ ] `.env` utworzony
- [ ] Build przeszedł pomyślnie
- [ ] Migrations wykonane
- [ ] App startuje bez błędów
- [ ] Health check zwraca "healthy"

### Post-Deployment:
- [ ] Aplikacja dostępna przez przeglądarkę
- [ ] SSL/HTTPS działa
- [ ] Database backups skonfigurowane
- [ ] Monitoring działa
- [ ] Logi są sprawdzone

---

## 💡 Best Practices

### ✅ DO:
- Używaj `.env` dla secrets (nie commituj!)
- Regularnie rób backup bazy
- Monitoruj logs i resources
- Aktualizuj images (bezpieczeństwo)
- Używaj health checks
- Testuj lokalnie przed deploymentem

### ❌ DON'T:
- Nie commituj `.env` do Git
- Nie używaj `latest` tags w production
- Nie wystawiaj PostgreSQL na internet
- Nie ignoruj błędów w logach
- Nie zapomnij o backup przed update
- Nie używaj default passwords

---

## 🎓 Przydatne Komendy

```bash
# Sprawdź wersję Docker
docker --version
docker-compose --version

# Wyświetl wszystkie kontenery
docker ps -a

# Wyświetl wszystkie volumes
docker volume ls

# Wyświetl wszystkie networks
docker network ls

# Inspect container
docker inspect planner-app

# Exec jako root (jeśli potrzeba)
docker-compose exec --user root app sh

# Kopiuj pliki z/do kontenera
docker cp planner-app:/app/file.txt ./
docker cp ./file.txt planner-app:/app/
```

---

**Setup zakończony**: 2026-01-06  
**Status**: ✅ Gotowe do użycia  
**Następny krok**: Test lokalnie, potem deploy na VPS!

