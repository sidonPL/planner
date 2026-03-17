#!/bin/bash

# Daily Quests Auto-Generation Script
# Run this script daily at midnight via crontab
# Add to crontab: 0 0 * * * /path/to/scripts/generate-daily-quests.sh

# Configuration
API_URL="${API_URL:-http://localhost:3000}"
CRON_SECRET="${CRON_SECRET}"
LOG_FILE="/var/log/planner/daily-quests-cron.log"

# Create log directory if it doesn't exist
mkdir -p /var/log/planner

# Log function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "=== Starting Daily Quests Generation ==="

# Call the API endpoint
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X GET \
  -H "Authorization: Bearer $CRON_SECRET" \
  "$API_URL/api/cron/daily-quests")

# Extract HTTP status code
HTTP_STATUS=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

log "HTTP Status: $HTTP_STATUS"

if [ "$HTTP_STATUS" -eq 200 ]; then
    log "SUCCESS: Daily quests generated"
    log "Response: $BODY"
else
    log "ERROR: Failed to generate daily quests"
    log "Response: $BODY"
    exit 1
fi

log "=== Completed Daily Quests Generation ==="

