#!/bin/bash

# Database Restore Script
# Przywraca backup bazy danych PostgreSQL

set -e

# Kolory
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🔄 Database Restore Script"
echo "=========================="
echo ""

# Check arguments
if [ $# -eq 0 ]; then
    echo -e "${RED}❌ ERROR: No backup file specified${NC}"
    echo ""
    echo "Usage: $0 <backup-file.sql.gz>"
    echo ""
    echo "Available backups:"
    ls -lh backups/backup_*.sql.gz 2>/dev/null | awk '{print "  " $9 " (" $5 ", " $6 " " $7 ")"}' || echo "  No backups found"
    exit 1
fi

BACKUP_FILE="$1"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}❌ ERROR: Backup file not found: $BACKUP_FILE${NC}"
    exit 1
fi

# Load .env file
if [ -f .env ]; then
    export $(cat .env | grep -v '#' | grep DATABASE_URL | xargs)
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ ERROR: DATABASE_URL not set${NC}"
    exit 1
fi

# Parse DATABASE_URL
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

echo "⚠️  WARNING: This will restore the database and OVERWRITE all current data!"
echo ""
echo "📊 Restore Details:"
echo "  Database: $DB_NAME"
echo "  Host: $DB_HOST:$DB_PORT"
echo "  Backup file: $BACKUP_FILE"
echo "  File size: $(du -h "$BACKUP_FILE" | cut -f1)"
echo ""

# Confirmation
read -p "Are you sure you want to continue? (type 'yes' to confirm): " -r
echo
if [[ ! $REPLY == "yes" ]]; then
    echo -e "${YELLOW}Restore cancelled${NC}"
    exit 0
fi

# Create a safety backup first
echo "🔒 Creating safety backup of current database..."
SAFETY_BACKUP="backups/safety_backup_$(date +%Y%m%d_%H%M%S).sql.gz"
mkdir -p backups
export PGPASSWORD="$DB_PASS"

if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" | gzip > "$SAFETY_BACKUP"; then
    echo -e "${GREEN}✅ Safety backup created: $SAFETY_BACKUP${NC}"
else
    echo -e "${RED}❌ Failed to create safety backup!${NC}"
    echo "Aborting restore for safety"
    exit 1
fi

# Drop and recreate database (if you have permissions)
echo ""
echo "🗑️  Dropping existing database..."
dropdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" 2>/dev/null || true

echo "🆕 Creating fresh database..."
createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"

# Restore backup
echo ""
echo "🔄 Restoring backup..."
if gunzip -c "$BACKUP_FILE" | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Database restored successfully!${NC}"
else
    echo -e "${RED}❌ Restore failed!${NC}"
    echo ""
    echo "Attempting to restore safety backup..."
    if gunzip -c "$SAFETY_BACKUP" | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Safety backup restored${NC}"
    else
        echo -e "${RED}❌ Failed to restore safety backup!${NC}"
        echo "Database may be in inconsistent state!"
    fi
    exit 1
fi

# Run migrations to ensure schema is up to date
echo ""
echo "🔧 Running migrations..."
npx prisma migrate deploy

echo ""
echo -e "${GREEN}🎉 Restore completed successfully!${NC}"
echo ""
echo "Safety backup kept at: $SAFETY_BACKUP"

# Unset password
unset PGPASSWORD

