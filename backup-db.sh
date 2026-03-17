#!/bin/bash

# Database Backup Script
# Tworzy backup bazy danych PostgreSQL

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Kolory
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🔄 Database Backup Script"
echo "========================="
echo ""

# Load .env file
if [ -f .env ]; then
    export $(cat .env | grep -v '#' | grep DATABASE_URL | xargs)
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ ERROR: DATABASE_URL not set${NC}"
    echo "Set it in .env or environment variable"
    exit 1
fi

# Parse DATABASE_URL
# Format: postgresql://user:password@host:port/database
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Backup filename
BACKUP_FILE="$BACKUP_DIR/backup_${DB_NAME}_${TIMESTAMP}.sql.gz"

echo "📊 Backup Details:"
echo "  Database: $DB_NAME"
echo "  Host: $DB_HOST:$DB_PORT"
echo "  User: $DB_USER"
echo "  Backup file: $BACKUP_FILE"
echo ""

# Create backup
echo "🔄 Creating backup..."
export PGPASSWORD="$DB_PASS"

if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo -e "${GREEN}✅ Backup created successfully!${NC}"
    echo "  Size: $BACKUP_SIZE"
    echo "  File: $BACKUP_FILE"
else
    echo -e "${RED}❌ Backup failed!${NC}"
    exit 1
fi

# Clean old backups
echo ""
echo "🗑️  Cleaning old backups (older than $RETENTION_DAYS days)..."
DELETED_COUNT=$(find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete -print | wc -l)

if [ $DELETED_COUNT -gt 0 ]; then
    echo -e "${YELLOW}Deleted $DELETED_COUNT old backup(s)${NC}"
else
    echo "No old backups to delete"
fi

# List current backups
echo ""
echo "📁 Current backups:"
ls -lh "$BACKUP_DIR"/backup_*.sql.gz 2>/dev/null | awk '{print "  " $9 " (" $5 ")"}' || echo "  No backups found"

echo ""
echo -e "${GREEN}🎉 Backup completed!${NC}"

# Unset password
unset PGPASSWORD

