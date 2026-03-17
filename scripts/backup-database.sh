#!/bin/bash

# Database Backup Script for Planner App
# Wykonuje backup PostgreSQL i przechowuje w folderze backups/

set -e  # Exit on error

# Konfiguracja
BACKUP_DIR="/var/backups/planner"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="planner_backup_${TIMESTAMP}.sql"
DB_NAME="${DB_NAME:-family_planner}"
DB_USER="${DB_USER:-postgres}"
RETENTION_DAYS=30  # Ile dni przechowywać backupy

# Kolory dla output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔄 Starting database backup...${NC}"
echo "Database: ${DB_NAME}"
echo "Timestamp: ${TIMESTAMP}"
echo ""

# Sprawdź czy folder backupów istnieje
if [ ! -d "$BACKUP_DIR" ]; then
    echo -e "${YELLOW}📁 Creating backup directory: ${BACKUP_DIR}${NC}"
    mkdir -p "$BACKUP_DIR"
fi

# Wykonaj backup
echo -e "${GREEN}💾 Creating backup...${NC}"
if PGPASSWORD="${DB_PASSWORD}" pg_dump -U "${DB_USER}" -h localhost "${DB_NAME}" > "${BACKUP_DIR}/${BACKUP_FILE}"; then
    echo -e "${GREEN}✅ Backup created successfully!${NC}"

    # Kompresuj backup
    echo -e "${GREEN}📦 Compressing backup...${NC}"
    gzip "${BACKUP_DIR}/${BACKUP_FILE}"
    BACKUP_FILE="${BACKUP_FILE}.gz"

    # Pokaż rozmiar
    SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_FILE}" | cut -f1)
    echo -e "${GREEN}📊 Backup size: ${SIZE}${NC}"
    echo -e "${GREEN}📂 Location: ${BACKUP_DIR}/${BACKUP_FILE}${NC}"
else
    echo -e "${RED}❌ Backup failed!${NC}"
    exit 1
fi

# Usuń stare backupy (starsze niż RETENTION_DAYS)
echo ""
echo -e "${YELLOW}🧹 Cleaning old backups (older than ${RETENTION_DAYS} days)...${NC}"
OLD_BACKUPS=$(find "$BACKUP_DIR" -name "planner_backup_*.sql.gz" -type f -mtime +${RETENTION_DAYS})

if [ -z "$OLD_BACKUPS" ]; then
    echo -e "${GREEN}✨ No old backups to delete${NC}"
else
    echo "$OLD_BACKUPS" | while read -r file; do
        echo -e "${YELLOW}  Deleting: $(basename "$file")${NC}"
        rm -f "$file"
    done
    echo -e "${GREEN}✅ Cleanup completed${NC}"
fi

# Podsumowanie
echo ""
echo -e "${GREEN}════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Backup completed successfully!${NC}"
echo -e "${GREEN}════════════════════════════════════${NC}"
echo ""
echo "Backup details:"
echo "  File: ${BACKUP_FILE}"
echo "  Size: ${SIZE}"
echo "  Location: ${BACKUP_DIR}"
echo ""
echo "To restore from this backup, run:"
echo "  gunzip -c ${BACKUP_DIR}/${BACKUP_FILE} | psql -U ${DB_USER} -d ${DB_NAME}"
echo ""

# Opcjonalnie: wyślij do cloud storage
if [ -n "$BACKUP_TO_S3" ] && [ "$BACKUP_TO_S3" = "true" ]; then
    echo -e "${GREEN}☁️  Uploading to S3...${NC}"
    if command -v aws &> /dev/null; then
        aws s3 cp "${BACKUP_DIR}/${BACKUP_FILE}" "s3://${S3_BUCKET}/backups/${BACKUP_FILE}"
        echo -e "${GREEN}✅ Uploaded to S3${NC}"
    else
        echo -e "${YELLOW}⚠️  AWS CLI not installed, skipping S3 upload${NC}"
    fi
fi

exit 0

