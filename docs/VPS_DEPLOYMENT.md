# Deployment Guide - VPS

## Wymagania

- Node.js 18+ lub 20+
- PostgreSQL 14+
- PM2 (Process Manager)
- Nginx (opcjonalnie, jako reverse proxy)
- Git

## Krok 1: Przygotowanie VPS

### Instalacja Node.js
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Instalacja PostgreSQL
```bash
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Instalacja PM2
```bash
sudo npm install -g pm2
```

### Instalacja Nginx (opcjonalnie)
```bash
sudo apt install nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### Setup SWAP (ważne dla małych VPS!)
Na małych serwerach (<2GB RAM) jest to konieczne dla build'u:
```bash
# Sprawdź czy swap już istnieje
swapon --show
free -h

# Jeśli brak - dodaj 4GB swap
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Utrwal w /etc/fstab
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Weryfikuj
free -h
```

## Krok 2: Konfiguracja PostgreSQL

```bash
sudo -u postgres psql
```

W PostgreSQL:
```sql
CREATE DATABASE family_planner;
CREATE USER planner_user WITH PASSWORD 'strong_password_here';
GRANT ALL PRIVILEGES ON DATABASE family_planner TO planner_user;
\q
```

## Krok 3: Klonowanie repozytorium

```bash
cd /var/www
sudo git clone <your-repo-url> planner
sudo chown -R $USER:$USER planner
cd planner
```

## Krok 4: Konfiguracja środowiska

Skopiuj i edytuj plik .env:
```bash
cp .env.example .env
nano .env
```

Ustaw następujące zmienne:
```env
# Database
DATABASE_URL="postgresql://planner_user:strong_password_here@localhost:5432/family_planner"

# Database Pool
DB_POOL_MAX=10
DB_POOL_MIN=2

# NextAuth
NEXTAUTH_URL="https://yourdomain.com"
NEXTAUTH_SECRET="<generate-with-openssl-rand-base64-32>"

# Rate Limiting
RATE_LIMIT_WINDOW=60000
MAX_REQUESTS_PER_WINDOW=100
API_RATE_LIMIT=60

# CRON Security
CRON_SECRET="<generate-another-secret>"

# Build
BUILD_STANDALONE=true
NODE_ENV=production
```

## Krok 5: Instalacja i Build

```bash
# Instalacja zależności (ze świeżych node_modules)
npm ci

# Generowanie Prisma Client
npx prisma generate

# Migracje bazy danych
npx prisma migrate deploy

# Build aplikacji (z zwiększonym heapem dla Node)
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build

# Seed początkowych danych (opcjonalnie)
# Uwaga: seedy budują się oddzielnie przez tsx, nie przez next build
npm run db:seed
```

**⚠️ Ważne:** Jeśli build pada z `SIGKILL` lub `Ineffective mark-compacts`:
- Upewnij się że swap jest zainstalowany (patrz Krok 1)
- Zwiększ `--max-old-space-size` (np. do 8192 na większych VPS)
- Poczekaj na wolne zasoby: `free -h` i `pm2 monit`

## Krok 6: Uruchomienie z PM2

```bash
# Utwórz katalog na logi
mkdir -p logs

# Uruchom aplikację
pm2 start ecosystem.config.js --env production

# Zapisz konfigurację PM2
pm2 save

# Automatyczne uruchamianie przy starcie systemu
pm2 startup
# Wykonaj komendę którą PM2 wyświetli
```

## Krok 7: Konfiguracja Nginx (Reverse Proxy)

Utwórz plik konfiguracyjny:
```bash
sudo nano /etc/nginx/sites-available/planner
```

Wklej konfigurację:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Configuration (użyj certbot dla Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # SSL Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;

    # Logs
    access_log /var/log/nginx/planner-access.log;
    error_log /var/log/nginx/planner-error.log;

    # Client body size
    client_max_body_size 50M;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml font/truetype font/opentype application/vnd.ms-fontobject image/svg+xml;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Cache static files
    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 60m;
        add_header Cache-Control "public, immutable";
    }

    # Health check endpoint
    location /api/health {
        proxy_pass http://localhost:3000;
        access_log off;
    }
}
```

Aktywuj konfigurację:
```bash
sudo ln -s /etc/nginx/sites-available/planner /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Krok 8: SSL Certificate (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

## Zarządzanie aplikacją

### Podstawowe komendy PM2
```bash
# Status
pm2 status

# Logi
pm2 logs planner-app

# Restart
pm2 restart planner-app

# Stop
pm2 stop planner-app

# Monitoring
pm2 monit
```

### Update aplikacji
```bash
cd /var/www/planner
./deploy.sh production
```

## Monitoring i utrzymanie

### Cron dla PM2 resurrection
Dodaj do crontab:
```bash
crontab -e
```

Dodaj linię:
```
@reboot pm2 resurrect
```

### Rotacja logów
PM2 automatycznie rotuje logi. Możesz skonfigurować:
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### Backup bazy danych
Utwórz skrypt backup:
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/planner"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

pg_dump -U planner_user family_planner | gzip > $BACKUP_DIR/backup_$DATE.sql.gz

# Usuń backupy starsze niż 7 dni
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +7 -delete
```

Dodaj do crontab (codziennie o 2:00):
```
0 2 * * * /path/to/backup-script.sh
```

## Troubleshooting

### Sprawdź logi aplikacji
```bash
pm2 logs planner-app --lines 100
```

### Sprawdź health check
```bash
curl http://localhost:3000/api/health
```

### Sprawdź status bazy danych
```bash
sudo systemctl status postgresql
```

### Sprawdź użycie zasobów
```bash
pm2 monit
htop
```

## Bezpieczeństwo

1. ✅ Firewall (ufw):
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

2. ✅ Fail2ban:
```bash
sudo apt install fail2ban
sudo systemctl enable fail2ban
```

3. ✅ Regularne aktualizacje:
```bash
sudo apt update && sudo apt upgrade -y
```

4. ✅ Zmienne środowiskowe - nigdy nie commituj .env do repo!

5. ✅ Używaj silnych haseł dla PostgreSQL

6. ✅ Regularnie rób backupy bazy danych

