#!/bin/bash

# Verify Backup Script - Planner App
# Weryfikuje integralność backupów i wyświetla statystyki

set -e

BACKUP_DIR="/var/backups/planner"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔍 Backup Verification Report${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo ""

# Sprawdź czy folder istnieje
if [ ! -d "$BACKUP_DIR" ]; then
    echo -e "${RED}❌ Backup directory not found: ${BACKUP_DIR}${NC}"
    exit 1
fi

# Lista wszystkich backupów
BACKUPS=($(ls -t "$BACKUP_DIR"/planner_backup_*.sql.gz 2>/dev/null))

if [ ${#BACKUPS[@]} -eq 0 ]; then
    echo -e "${YELLOW}⚠️  No backups found${NC}"
    exit 0
fi

echo -e "${GREEN}📊 Total backups: ${#BACKUPS[@]}${NC}"
echo ""

# Statystyki
TOTAL_SIZE=0
OLDEST_BACKUP=""
NEWEST_BACKUP=""

echo -e "${BLUE}Backup List:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
printf "%-40s %-10s %-20s %s\n" "Filename" "Size" "Date" "Status"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

for BACKUP in "${BACKUPS[@]}"; do
    FILENAME=$(basename "$BACKUP")
    SIZE=$(du -h "$BACKUP" | cut -f1)
    SIZE_BYTES=$(du -b "$BACKUP" | cut -f1)
    TOTAL_SIZE=$((TOTAL_SIZE + SIZE_BYTES))
    DATE=$(stat -c %y "$BACKUP" 2>/dev/null || stat -f %Sm "$BACKUP" 2>/dev/null | cut -d' ' -f1,2 | cut -d'.' -f1)

    # Weryfikuj czy plik jest poprawny (gzip)
    if gzip -t "$BACKUP" 2>/dev/null; then
        STATUS="${GREEN}✓ OK${NC}"
    else
        STATUS="${RED}✗ Corrupted${NC}"
    fi

    printf "%-40s %-10s %-20s " "$FILENAME" "$SIZE" "$DATE"
    echo -e "$STATUS"

    # Zapisz najstarszy i najnowszy
    if [ -z "$NEWEST_BACKUP" ]; then
        NEWEST_BACKUP="$BACKUP"
    fi
    OLDEST_BACKUP="$BACKUP"
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Podsumowanie
TOTAL_SIZE_HR=$(numfmt --to=iec-i --suffix=B "$TOTAL_SIZE" 2>/dev/null || echo "$((TOTAL_SIZE / 1024 / 1024))MB")
echo -e "${BLUE}Summary:${NC}"
echo "  Total backups: ${#BACKUPS[@]}"
echo "  Total size: ${TOTAL_SIZE_HR}"
echo "  Newest: $(basename "$NEWEST_BACKUP")"
echo "  Oldest: $(basename "$OLDEST_BACKUP")"
echo ""

# Sprawdź miejsce na dysku
DISK_USAGE=$(df -h "$BACKUP_DIR" | tail -1 | awk '{print $5}')
DISK_AVAILABLE=$(df -h "$BACKUP_DIR" | tail -1 | awk '{print $4}')

echo -e "${BLUE}Disk Usage:${NC}"
echo "  Backup directory: ${BACKUP_DIR}"
echo "  Disk used: ${DISK_USAGE}"
echo "  Available space: ${DISK_AVAILABLE}"
echo ""

# Ostrzeżenia
if [ "$DISK_USAGE" -gt 90 ]; then
    echo -e "${RED}⚠️  WARNING: Disk usage is above 90%!${NC}"
    echo -e "${YELLOW}Consider cleaning old backups or increasing disk space${NC}"
    echo ""
fi

if [ ${#BACKUPS[@]} -lt 3 ]; then
    echo -e "${YELLOW}⚠️  WARNING: Less than 3 backups found${NC}"
    echo -e "${YELLOW}Recommended: Keep at least 7 daily backups${NC}"
    echo ""
fi

# Test restore (dry-run) najnowszego backupu
if [ -n "$1" ] && [ "$1" = "--test-restore" ]; then
    echo -e "${BLUE}🧪 Testing restore of newest backup (dry-run)...${NC}"

    TEMP_DB="planner_test_restore"

    # Utwórz tymczasową bazę
    echo "Creating temporary database..."
    createdb "$TEMP_DB" 2>/dev/null || true

    # Spróbuj restore
    if gunzip -c "$NEWEST_BACKUP" | psql -d "$TEMP_DB" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Restore test PASSED${NC}"

        # Sprawdź czy są dane
        TABLE_COUNT=$(psql -d "$TEMP_DB" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';")
        echo "  Tables found: ${TABLE_COUNT}"
    else
        echo -e "${RED}❌ Restore test FAILED${NC}"
    fi

    # Usuń tymczasową bazę
    dropdb "$TEMP_DB" 2>/dev/null || true
    echo ""
fi

echo -e "${GREEN}✅ Verification completed${NC}"
echo ""

# Rekomendacje
echo -e "${BLUE}Recommendations:${NC}"
echo "  • Keep at least 7 daily backups"
echo "  • Test restore monthly: $0 --test-restore"
echo "  • Monitor disk space regularly"
echo "  • Consider off-site backups (S3, etc.)"
echo ""

exit 0

