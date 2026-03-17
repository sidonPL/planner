#!/bin/bash

# Database Restore Script for Planner App
# Przywraca bazę danych z backupu

set -e  # Exit on error

# Konfiguracja
BACKUP_DIR="/var/backups/planner"
DB_NAME="${DB_NAME:-family_planner}"
DB_USER="${DB_USER:-postgres}"

# Kolory
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Funkcja pomocy
show_help() {
    echo "Usage: $0 [BACKUP_FILE]"
    echo ""
    echo "Restore database from backup file."
    echo ""
    echo "Examples:"
    echo "  $0                           # Show available backups and prompt for selection"
    echo "  $0 planner_backup_20260105_120000.sql.gz"
    echo ""
}

# Lista dostępnych backupów
list_backups() {
    echo -e "${GREEN}Available backups:${NC}"
    echo ""

    BACKUPS=($(ls -t "$BACKUP_DIR"/planner_backup_*.sql.gz 2>/dev/null))

    if [ ${#BACKUPS[@]} -eq 0 ]; then
        echo -e "${RED}No backups found in ${BACKUP_DIR}${NC}"
        exit 1
    fi

    for i in "${!BACKUPS[@]}"; do
        BACKUP="${BACKUPS[$i]}"
        SIZE=$(du -h "$BACKUP" | cut -f1)
        DATE=$(stat -c %y "$BACKUP" | cut -d' ' -f1,2 | cut -d'.' -f1)
        echo "  $((i+1)). $(basename "$BACKUP") - ${SIZE} - ${DATE}"
    done

    echo ""
}

# Jeśli nie podano argumentu, pokaż listę
if [ $# -eq 0 ]; then
    list_backups

    echo -n "Select backup number (or 'q' to quit): "
    read -r selection

    if [ "$selection" = "q" ]; then
        exit 0
    fi

    BACKUPS=($(ls -t "$BACKUP_DIR"/planner_backup_*.sql.gz 2>/dev/null))
    INDEX=$((selection - 1))

    if [ $INDEX -lt 0 ] || [ $INDEX -ge ${#BACKUPS[@]} ]; then
        echo -e "${RED}Invalid selection${NC}"
        exit 1
    fi

    BACKUP_FILE="${BACKUPS[$INDEX]}"
else
    # Użyj podanego pliku
    if [[ "$1" == /* ]]; then
        BACKUP_FILE="$1"
    else
        BACKUP_FILE="${BACKUP_DIR}/$1"
    fi

    if [ ! -f "$BACKUP_FILE" ]; then
        echo -e "${RED}Backup file not found: ${BACKUP_FILE}${NC}"
        exit 1
    fi
fi

# Potwierdzenie
echo ""
echo -e "${YELLOW}⚠️  WARNING: This will REPLACE the current database!${NC}"
echo -e "${YELLOW}Database: ${DB_NAME}${NC}"
echo -e "${YELLOW}Backup: $(basename "$BACKUP_FILE")${NC}"
echo ""
echo -n "Are you sure? (yes/no): "
read -r confirmation

if [ "$confirmation" != "yes" ]; then
    echo -e "${YELLOW}Restore cancelled${NC}"
    exit 0
fi

# Utwórz backup bieżącej bazy przed restore
echo ""
echo -e "${GREEN}📦 Creating safety backup of current database...${NC}"
SAFETY_BACKUP="${BACKUP_DIR}/pre_restore_$(date +%Y%m%d_%H%M%S).sql.gz"
PGPASSWORD="${DB_PASSWORD}" pg_dump -U "${DB_USER}" -h localhost "${DB_NAME}" | gzip > "$SAFETY_BACKUP"
echo -e "${GREEN}✅ Safety backup created: $(basename "$SAFETY_BACKUP")${NC}"

# Restore z backupu
echo ""
echo -e "${GREEN}🔄 Restoring database...${NC}"

# Rozpoznaj czy plik jest skompresowany
if [[ "$BACKUP_FILE" == *.gz ]]; then
    echo -e "${GREEN}📦 Decompressing and restoring...${NC}"
    if gunzip -c "$BACKUP_FILE" | PGPASSWORD="${DB_PASSWORD}" psql -U "${DB_USER}" -h localhost -d "${DB_NAME}" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Database restored successfully!${NC}"
    else
        echo -e "${RED}❌ Restore failed!${NC}"
        echo -e "${YELLOW}Rolling back to safety backup...${NC}"
        gunzip -c "$SAFETY_BACKUP" | PGPASSWORD="${DB_PASSWORD}" psql -U "${DB_USER}" -h localhost -d "${DB_NAME}"
        exit 1
    fi
else
    echo -e "${GREEN}📥 Restoring from uncompressed backup...${NC}"
    if PGPASSWORD="${DB_PASSWORD}" psql -U "${DB_USER}" -h localhost -d "${DB_NAME}" < "$BACKUP_FILE" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Database restored successfully!${NC}"
    else
        echo -e "${RED}❌ Restore failed!${NC}"
        echo -e "${YELLOW}Rolling back to safety backup...${NC}"
        gunzip -c "$SAFETY_BACKUP" | PGPASSWORD="${DB_PASSWORD}" psql -U "${DB_USER}" -h localhost -d "${DB_NAME}"
        exit 1
    fi
fi

echo ""
echo -e "${GREEN}════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Restore completed successfully!${NC}"
echo -e "${GREEN}════════════════════════════════════${NC}"
echo ""
echo "Restored from: $(basename "$BACKUP_FILE")"
echo "Safety backup: $(basename "$SAFETY_BACKUP")"
echo ""
echo -e "${YELLOW}Don't forget to restart the application!${NC}"
echo ""

exit 0

