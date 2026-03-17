#!/bin/bash

# Pre-deployment checker
# Sprawdza czy środowisko jest gotowe do deploymentu

echo "🔍 Family Planner - Pre-deployment Check"
echo "========================================"
echo ""

ERRORS=0
WARNINGS=0

# Kolory
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Funkcje pomocnicze
error() {
    echo -e "${RED}❌ ERROR: $1${NC}"
    ERRORS=$((ERRORS + 1))
}

warning() {
    echo -e "${YELLOW}⚠️  WARNING: $1${NC}"
    WARNINGS=$((WARNINGS + 1))
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

info() {
    echo -e "ℹ️  $1"
}

# 1. Sprawdź Node.js
echo "📦 Checking Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -ge 20 ]; then
        success "Node.js $(node -v) installed"
    else
        error "Node.js version too old. Need v20+, have v$(node -v)"
    fi
else
    error "Node.js not installed"
fi

# 2. Sprawdź npm
echo ""
echo "📦 Checking npm..."
if command -v npm &> /dev/null; then
    success "npm $(npm -v) installed"
else
    error "npm not installed"
fi

# 3. Sprawdź PostgreSQL
echo ""
echo "🗄️  Checking PostgreSQL..."
if command -v psql &> /dev/null; then
    PSQL_VERSION=$(psql -V | grep -oP '\d+' | head -1)
    if [ "$PSQL_VERSION" -ge 14 ]; then
        success "PostgreSQL $(psql -V | grep -oP '\d+\.\d+' | head -1) installed"
    else
        warning "PostgreSQL version might be too old. Recommended 14+"
    fi
else
    warning "PostgreSQL client not found (might be OK if using remote DB)"
fi

# 4. Sprawdź PM2
echo ""
echo "🔧 Checking PM2..."
if command -v pm2 &> /dev/null; then
    success "PM2 $(pm2 -v) installed"
else
    warning "PM2 not installed (required for production deployment)"
    info "Install with: sudo npm install -g pm2"
fi

# 5. Sprawdź .env file
echo ""
echo "🔐 Checking environment variables..."
if [ -f ".env" ]; then
    success ".env file exists"

    # Sprawdź kluczowe zmienne
    source .env 2>/dev/null || true

    if [ -z "$DATABASE_URL" ]; then
        error "DATABASE_URL not set in .env"
    else
        success "DATABASE_URL is set"
    fi

    if [ -z "$NEXTAUTH_SECRET" ]; then
        error "NEXTAUTH_SECRET not set in .env"
    else
        success "NEXTAUTH_SECRET is set"
    fi

    if [ -z "$NEXTAUTH_URL" ]; then
        warning "NEXTAUTH_URL not set in .env"
    else
        success "NEXTAUTH_URL is set"
    fi

    if [ -z "$CRON_SECRET" ]; then
        warning "CRON_SECRET not set (CRON jobs won't be protected)"
    else
        success "CRON_SECRET is set"
    fi
else
    error ".env file not found"
    info "Copy .env.example to .env and configure"
fi

# 6. Sprawdź node_modules
echo ""
echo "📚 Checking dependencies..."
if [ -d "node_modules" ]; then
    success "node_modules exists"
else
    warning "node_modules not found - run 'npm install'"
fi

# 7. Sprawdź Prisma
echo ""
echo "🔧 Checking Prisma setup..."
if [ -f "node_modules/.prisma/client/index.js" ]; then
    success "Prisma Client generated"
else
    warning "Prisma Client not generated - run 'npx prisma generate'"
fi

# 8. Sprawdź build
echo ""
echo "🏗️  Checking build..."
if [ -d ".next" ]; then
    success ".next build directory exists"

    # Sprawdź czy build jest świeży (nie starszy niż 7 dni)
    BUILD_AGE=$(find .next -maxdepth 0 -mtime +7 2>/dev/null)
    if [ -n "$BUILD_AGE" ]; then
        warning "Build older than 7 days - consider rebuilding"
    fi
else
    warning "No build found - run 'npm run build' before deployment"
fi

# 9. Sprawdź logs directory
echo ""
echo "📝 Checking logs directory..."
if [ -d "logs" ]; then
    success "logs directory exists"
else
    warning "logs directory not found - will be created on first run"
    mkdir -p logs 2>/dev/null && success "Created logs directory"
fi

# 10. Sprawdź uprawnienia
echo ""
echo "🔒 Checking permissions..."
if [ -w "." ]; then
    success "Write permissions OK"
else
    error "No write permissions in current directory"
fi

# 11. Sprawdź dostępność portu
echo ""
echo "🌐 Checking port availability..."
PORT=${PORT:-3000}
if command -v lsof &> /dev/null; then
    if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        warning "Port $PORT is already in use"
    else
        success "Port $PORT is available"
    fi
else
    info "lsof not available, skipping port check"
fi

# 12. Sprawdź miejsce na dysku
echo ""
echo "💾 Checking disk space..."
if command -v df &> /dev/null; then
    DISK_USAGE=$(df -h . | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ "$DISK_USAGE" -lt 80 ]; then
        success "Disk usage: ${DISK_USAGE}%"
    elif [ "$DISK_USAGE" -lt 90 ]; then
        warning "Disk usage high: ${DISK_USAGE}%"
    else
        error "Disk usage critical: ${DISK_USAGE}%"
    fi
fi

# 13. Sprawdź pamięć
echo ""
echo "💻 Checking memory..."
if command -v free &> /dev/null; then
    TOTAL_MEM=$(free -m | awk 'NR==2 {print $2}')
    if [ "$TOTAL_MEM" -ge 2048 ]; then
        success "Total memory: ${TOTAL_MEM}MB"
    elif [ "$TOTAL_MEM" -ge 1024 ]; then
        warning "Low memory: ${TOTAL_MEM}MB (recommended: 2GB+)"
    else
        error "Insufficient memory: ${TOTAL_MEM}MB (minimum: 1GB)"
    fi
fi

# Podsumowanie
echo ""
echo "========================================"
echo "📊 Summary"
echo "========================================"
echo -e "Errors: ${RED}${ERRORS}${NC}"
echo -e "Warnings: ${YELLOW}${WARNINGS}${NC}"
echo ""

if [ $ERRORS -eq 0 ]; then
    if [ $WARNINGS -eq 0 ]; then
        echo -e "${GREEN}🎉 All checks passed! Ready for deployment.${NC}"
        exit 0
    else
        echo -e "${YELLOW}⚠️  Some warnings found. Review before deployment.${NC}"
        exit 0
    fi
else
    echo -e "${RED}❌ Critical errors found. Fix them before deployment.${NC}"
    exit 1
fi

