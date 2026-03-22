#!/usr/bin/env bash

set -euo pipefail

SCRIPT_NAME="$(basename "$0")"

APP_DIR="/opt/planner"
APP_USER="${SUDO_USER:-${USER}}"
APP_PORT="3000"
DOMAIN=""
ADMIN_EMAIL=""
REPO_URL=""
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="family_planner"
DB_USER="planner_user"
DB_PASSWORD=""
DB_SSL_MODE="disable"
DB_CA_CERT_PATH=""
RUN_SEED="false"
SKIP_CERTBOT="false"
NON_INTERACTIVE="false"

log() {
  echo "[INFO] $*"
}

warn() {
  echo "[WARN] $*"
}

error() {
  echo "[ERROR] $*" >&2
  exit 1
}

usage() {
  cat <<EOF
Uzycie:
  sudo ./${SCRIPT_NAME} --domain planner.example.com --email admin@example.com --repo-url <git_url>

Opcje:
  --domain <fqdn>             Domena aplikacji (wymagane)
  --email <email>             Email dla certyfikatu Let's Encrypt (wymagane, jesli certbot wlaczony)
  --repo-url <url>            URL repo (wymagane, jesli APP_DIR nie istnieje)
  --app-dir <path>            Katalog aplikacji (domyslnie: /opt/planner)
  --app-user <user>           Uzytkownik uruchamiajacy appke (domyslnie: aktualny)
  --app-port <port>           Port Next.js (domyslnie: 3000)
  --db-host <host>            Host PostgreSQL (domyslnie: localhost)
  --db-port <port>            Port PostgreSQL (domyslnie: 5432)
  --db-name <name>            Nazwa bazy (domyslnie: family_planner)
  --db-user <user>            Uzytkownik DB (domyslnie: planner_user)
  --db-password <password>    Haslo DB (domyslnie: generowane)
  --db-ssl-mode <mode>        disable|require|verify-full (domyslnie: disable)
  --db-ca-cert-path <path>    Sciezka do certyfikatu CA dla DB (opcjonalnie)
  --run-seed                  Wykonaj npm run db:seed po migracjach
  --skip-certbot              Pomin konfiguracje certyfikatu SSL
  --non-interactive           Bez pytan, fail gdy brakuje wymaganych parametrow
  --help                      Pokaz pomoc
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain)
      DOMAIN="${2:-}"
      shift 2
      ;;
    --email)
      ADMIN_EMAIL="${2:-}"
      shift 2
      ;;
    --repo-url)
      REPO_URL="${2:-}"
      shift 2
      ;;
    --app-dir)
      APP_DIR="${2:-}"
      shift 2
      ;;
    --app-user)
      APP_USER="${2:-}"
      shift 2
      ;;
    --app-port)
      APP_PORT="${2:-}"
      shift 2
      ;;
    --db-host)
      DB_HOST="${2:-}"
      shift 2
      ;;
    --db-port)
      DB_PORT="${2:-}"
      shift 2
      ;;
    --db-name)
      DB_NAME="${2:-}"
      shift 2
      ;;
    --db-user)
      DB_USER="${2:-}"
      shift 2
      ;;
    --db-password)
      DB_PASSWORD="${2:-}"
      shift 2
      ;;
    --db-ssl-mode)
      DB_SSL_MODE="${2:-}"
      shift 2
      ;;
    --db-ca-cert-path)
      DB_CA_CERT_PATH="${2:-}"
      shift 2
      ;;
    --run-seed)
      RUN_SEED="true"
      shift
      ;;
    --skip-certbot)
      SKIP_CERTBOT="true"
      shift
      ;;
    --non-interactive)
      NON_INTERACTIVE="true"
      shift
      ;;
    --help)
      usage
      exit 0
      ;;
    *)
      error "Nieznany parametr: $1"
      ;;
  esac
done

require_root() {
  if [[ "$EUID" -ne 0 ]]; then
    error "Uruchom skrypt jako root: sudo ./${SCRIPT_NAME} ..."
  fi
}

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

ask_if_empty() {
  local var_name="$1"
  local prompt="$2"
  local secret="${3:-false}"

  if [[ -n "${!var_name}" ]]; then
    return
  fi

  if [[ "$NON_INTERACTIVE" == "true" ]]; then
    error "Brak wymaganego parametru: ${var_name}"
  fi

  if [[ "$secret" == "true" ]]; then
    read -r -s -p "${prompt}: " value
    echo
  else
    read -r -p "${prompt}: " value
  fi

  if [[ -z "$value" ]]; then
    error "Wartosc nie moze byc pusta (${var_name})"
  fi

  printf -v "$var_name" '%s' "$value"
}

validate_inputs() {
  ask_if_empty "DOMAIN" "Podaj domene (np. planner.example.com)"

  if [[ "$SKIP_CERTBOT" != "true" ]]; then
    ask_if_empty "ADMIN_EMAIL" "Podaj email dla Let's Encrypt"
  fi

  if [[ ! -d "$APP_DIR" && -z "$REPO_URL" ]]; then
    if [[ "$NON_INTERACTIVE" == "true" ]]; then
      error "APP_DIR nie istnieje i nie podano --repo-url"
    fi

    read -r -p "APP_DIR nie istnieje. Podaj URL repo do sklonowania: " REPO_URL
    [[ -n "$REPO_URL" ]] || error "Repo URL jest wymagany"
  fi

  if [[ -z "$DB_PASSWORD" ]]; then
    DB_PASSWORD="$(openssl rand -hex 24)"
    log "Wygenerowano losowe haslo bazy danych"
  fi

  if [[ "$DB_SSL_MODE" != "disable" && "$DB_SSL_MODE" != "require" && "$DB_SSL_MODE" != "verify-full" ]]; then
    error "Niepoprawny --db-ssl-mode. Dozwolone: disable|require|verify-full"
  fi

  if [[ -n "$DB_CA_CERT_PATH" && ! -f "$DB_CA_CERT_PATH" ]]; then
    error "Nie znaleziono certyfikatu CA: $DB_CA_CERT_PATH"
  fi
}

install_system_packages() {
  log "Instalacja pakietow systemowych"
  apt-get update
  apt-get install -y curl git nginx certbot python3-certbot-nginx postgresql postgresql-contrib build-essential

  if ! command_exists node || [[ "$(node -v | sed 's/v//; s/\..*//')" -lt 20 ]]; then
    log "Instalacja Node.js 20"
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
  fi

  if ! command_exists pm2; then
    log "Instalacja PM2"
    npm install -g pm2
  fi
}

configure_postgres_local() {
  if [[ "$DB_HOST" != "localhost" && "$DB_HOST" != "127.0.0.1" ]]; then
    warn "Pominieto automatyczne tworzenie DB (zdalny host: $DB_HOST)"
    return
  fi

  log "Konfiguracja lokalnej bazy PostgreSQL"
  systemctl enable postgresql
  systemctl restart postgresql

  local escaped_password
  escaped_password="${DB_PASSWORD//\'/\'\'}"

  sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
DO
\$\$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${DB_USER}') THEN
      CREATE ROLE ${DB_USER} LOGIN PASSWORD '${escaped_password}';
   ELSE
      ALTER ROLE ${DB_USER} WITH PASSWORD '${escaped_password}';
   END IF;
END
\$\$;
SQL

  sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1 || sudo -u postgres createdb -O "${DB_USER}" "${DB_NAME}"
  sudo -u postgres psql -v ON_ERROR_STOP=1 -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};"
}

ensure_app_user() {
  if ! id -u "$APP_USER" >/dev/null 2>&1; then
    error "Nie znaleziono uzytkownika systemowego: $APP_USER"
  fi
}

clone_or_update_repo() {
  if [[ -d "$APP_DIR/.git" ]]; then
    log "Repozytorium juz istnieje: $APP_DIR"
    return
  fi

  if [[ -d "$APP_DIR" && -n "$(find "$APP_DIR" -mindepth 1 -maxdepth 1 2>/dev/null)" ]]; then
    error "Katalog $APP_DIR istnieje i nie jest pusty"
  fi

  mkdir -p "$APP_DIR"

  if [[ -z "$REPO_URL" ]]; then
    error "Brak --repo-url do klonowania"
  fi

  log "Klonowanie repozytorium do $APP_DIR"
  git clone "$REPO_URL" "$APP_DIR"
}

run_as_app_user() {
  local cmd="$1"
  sudo -u "$APP_USER" -H bash -lc "$cmd"
}

build_database_url() {
  local base_url="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=public"

  if [[ "$DB_SSL_MODE" != "disable" ]]; then
    base_url="${base_url}&sslmode=${DB_SSL_MODE}"
  fi

  echo "$base_url"
}

write_env_files() {
  log "Generowanie .env i .env.production"

  local auth_secret
  local cron_secret
  auth_secret="$(openssl rand -base64 32 | tr -d '\n')"
  cron_secret="$(openssl rand -base64 32 | tr -d '\n')"

  local database_url
  database_url="$(build_database_url)"

  local env_file="$APP_DIR/.env.production"

  cat > "$env_file" <<EOF
NODE_ENV=production
PORT=${APP_PORT}
NEXTAUTH_URL=https://${DOMAIN}
AUTH_SECRET=${auth_secret}
NEXTAUTH_SECRET=${auth_secret}
CRON_SECRET=${cron_secret}
DATABASE_URL=${database_url}
DB_POOL_MAX=10
DB_POOL_MIN=2
BUILD_STANDALONE=false
GEMINI_API_KEY=
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
NEXT_PUBLIC_SENTRY_DSN=
EOF

  if [[ -n "$DB_CA_CERT_PATH" ]]; then
    cat >> "$env_file" <<EOF
DATABASE_CA_CERT_PATH=${DB_CA_CERT_PATH}
EOF
  fi

  cp "$env_file" "$APP_DIR/.env"
  chown "$APP_USER:$APP_USER" "$APP_DIR/.env" "$APP_DIR/.env.production"
}

install_app_dependencies_and_build() {
  log "Instalacja zaleznosci i build aplikacji"

  run_as_app_user "cd '$APP_DIR' && npm ci"
  run_as_app_user "cd '$APP_DIR' && npx prisma generate"
  run_as_app_user "cd '$APP_DIR' && npx prisma migrate deploy"

  if [[ "$RUN_SEED" == "true" ]]; then
    run_as_app_user "cd '$APP_DIR' && npm run db:seed"
  fi

  # Szacuj dostępną pamięć i ustaw NODE_OPTIONS dla budowania
  local available_memory_mb
  available_memory_mb=$(free -m | awk 'NR==2{print int($7 * 0.8)}')  # 80% dostępnej RAM
  local node_heap_size=$([[ "$available_memory_mb" -ge 4096 ]] && echo 4096 || echo "$available_memory_mb")
  node_heap_size=$(([[ "$node_heap_size" -lt 512 ]] && echo 512 || echo "$node_heap_size"))

  log "Dostępna pamięć: ${available_memory_mb}MB, ustawianie Node.js heap na ${node_heap_size}MB"
  run_as_app_user "cd '$APP_DIR' && NODE_OPTIONS='--max-old-space-size=${node_heap_size}' npm run build"
}

configure_nginx() {
  log "Konfiguracja Nginx"

  local nginx_conf="/etc/nginx/sites-available/planner"

  cat > "$nginx_conf" <<EOF
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};

    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection upgrade;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    client_max_body_size 50M;
}
EOF

  ln -sfn "$nginx_conf" /etc/nginx/sites-enabled/planner
  rm -f /etc/nginx/sites-enabled/default
  nginx -t
  systemctl reload nginx
}

configure_ssl() {
  if [[ "$SKIP_CERTBOT" == "true" ]]; then
    warn "Pominieto konfiguracje certyfikatu SSL (--skip-certbot)"
    return
  fi

  log "Pobieranie certyfikatu Let's Encrypt"
  certbot --nginx --non-interactive --agree-tos --redirect -m "$ADMIN_EMAIL" -d "$DOMAIN" -d "www.$DOMAIN"
}

configure_pm2() {
  log "Uruchamianie aplikacji przez PM2"

  run_as_app_user "cd '$APP_DIR' && mkdir -p logs"
  run_as_app_user "cd '$APP_DIR' && set -a && source .env.production && set +a && pm2 delete planner-app || true"
  run_as_app_user "cd '$APP_DIR' && set -a && source .env.production && set +a && pm2 start ecosystem.config.js --env production"
  run_as_app_user "pm2 save"

  local app_home
  app_home="$(getent passwd "$APP_USER" | cut -d: -f6)"
  env PATH="$PATH" pm2 startup systemd -u "$APP_USER" --hp "$app_home" >/tmp/pm2-startup.txt || true

  if grep -q "sudo" /tmp/pm2-startup.txt; then
    bash -lc "$(grep 'sudo' /tmp/pm2-startup.txt | tail -n1)" || true
  fi
}

configure_firewall() {
  if ! command_exists ufw; then
    apt-get install -y ufw
  fi

  log "Konfiguracja firewall (UFW)"
  ufw allow OpenSSH
  ufw allow 'Nginx Full'
  ufw --force enable
}

print_summary() {
  cat <<EOF

Instalacja zakonczona.

Aplikacja:
  URL: https://${DOMAIN}
  Katalog: ${APP_DIR}
  Uzytkownik: ${APP_USER}

Baza danych:
  Host: ${DB_HOST}
  Port: ${DB_PORT}
  Nazwa: ${DB_NAME}
  Uzytkownik: ${DB_USER}
  Haslo: ${DB_PASSWORD}

Przydatne komendy:
  sudo -u ${APP_USER} -H bash -lc 'pm2 status'
  sudo -u ${APP_USER} -H bash -lc 'pm2 logs planner-app --lines 100'
  curl -I https://${DOMAIN}
EOF
}

main() {
  require_root
  validate_inputs
  ensure_app_user
  install_system_packages
  configure_postgres_local
  clone_or_update_repo
  chown -R "$APP_USER:$APP_USER" "$APP_DIR"
  write_env_files
  install_app_dependencies_and_build
  configure_nginx
  configure_ssl
  configure_pm2
  configure_firewall
  print_summary
}

main

