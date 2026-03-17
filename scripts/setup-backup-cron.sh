#!/bin/bash

# Setup Automated Backups - Planner App
# Konfiguruje cron job dla automatycznych backupów

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🔧 Setting up automated database backups...${NC}"
echo ""

# Sprawdź uprawnienia
if [ "$EUID" -ne 0 ]; then
    echo -e "${YELLOW}⚠️  This script should be run with sudo${NC}"
    echo "Run: sudo ./setup-backup-cron.sh"
    exit 1
fi

# Ustaw ścieżki
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_SCRIPT="${SCRIPT_DIR}/backup-database.sh"

# Sprawdź czy skrypt backupu istnieje
if [ ! -f "$BACKUP_SCRIPT" ]; then
    echo "Backup script not found: $BACKUP_SCRIPT"
    exit 1
fi

# Nadaj uprawnienia wykonywania
chmod +x "$BACKUP_SCRIPT"
echo -e "${GREEN}✅ Made backup script executable${NC}"

# Pytaj o częstotliwość backupów
echo ""
echo "Select backup frequency:"
echo "  1. Daily at 2:00 AM (recommended)"
echo "  2. Daily at custom time"
echo "  3. Twice daily (2:00 AM and 2:00 PM)"
echo "  4. Every 6 hours"
echo "  5. Every hour"
echo -n "Enter choice (1-5): "
read -r choice

case $choice in
    1)
        CRON_SCHEDULE="0 2 * * *"
        DESCRIPTION="daily at 2:00 AM"
        ;;
    2)
        echo -n "Enter hour (0-23): "
        read -r hour
        CRON_SCHEDULE="0 ${hour} * * *"
        DESCRIPTION="daily at ${hour}:00"
        ;;
    3)
        CRON_SCHEDULE="0 2,14 * * *"
        DESCRIPTION="twice daily (2:00 AM and 2:00 PM)"
        ;;
    4)
        CRON_SCHEDULE="0 */6 * * *"
        DESCRIPTION="every 6 hours"
        ;;
    5)
        CRON_SCHEDULE="0 * * * *"
        DESCRIPTION="every hour"
        ;;
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac

# Utwórz wpis cron
CRON_COMMENT="# Planner App - Automated database backup ($DESCRIPTION)"
CRON_JOB="${CRON_SCHEDULE} ${BACKUP_SCRIPT} >> /var/log/planner-backup.log 2>&1"

# Dodaj do crontab
(crontab -l 2>/dev/null | grep -v "${BACKUP_SCRIPT}"; echo "$CRON_COMMENT"; echo "$CRON_JOB") | crontab -

echo ""
echo -e "${GREEN}✅ Cron job added successfully!${NC}"
echo ""
echo "Backup schedule: ${DESCRIPTION}"
echo "Cron expression: ${CRON_SCHEDULE}"
echo "Log file: /var/log/planner-backup.log"
echo ""
echo "Current crontab:"
crontab -l | grep -A1 "Planner App"
echo ""

# Utwórz folder backupów jeśli nie istnieje
BACKUP_DIR="/var/backups/planner"
if [ ! -d "$BACKUP_DIR" ]; then
    mkdir -p "$BACKUP_DIR"
    echo -e "${GREEN}✅ Created backup directory: ${BACKUP_DIR}${NC}"
fi

# Utwórz plik logu
touch /var/log/planner-backup.log
chmod 644 /var/log/planner-backup.log
echo -e "${GREEN}✅ Created log file${NC}"

echo ""
echo -e "${GREEN}════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Setup completed!${NC}"
echo -e "${GREEN}════════════════════════════════════${NC}"
echo ""
echo "Next steps:"
echo "  1. Test the backup: sudo ${BACKUP_SCRIPT}"
echo "  2. Monitor logs: tail -f /var/log/planner-backup.log"
echo "  3. List backups: ls -lh ${BACKUP_DIR}"
echo ""
echo "To disable backups:"
echo "  crontab -e  # Then remove the Planner App line"
echo ""

exit 0

