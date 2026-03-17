 #!/bin/bash

# Simple Monitoring Script
# Sprawdza status aplikacji i wysyła alerty jeśli coś jest nie tak

# Configuration
APP_URL="${APP_URL:-http://localhost:3000}"
HEALTH_ENDPOINT="${APP_URL}/api/health"
ALERT_EMAIL="${ALERT_EMAIL:-}"
MAX_RESPONSE_TIME=5000  # ms
MIN_FREE_MEMORY=200     # MB
MAX_CPU_PERCENT=90      # %

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
ISSUES=0

echo "🔍 Family Planner - Health Monitor"
echo "=================================="
echo "Time: $TIMESTAMP"
echo ""

# 1. Health Check Endpoint
echo "🏥 Checking health endpoint..."
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}\n%{time_total}" "${HEALTH_ENDPOINT}" 2>/dev/null)
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -2 | head -1)
RESPONSE_TIME=$(echo "$HEALTH_RESPONSE" | tail -1)
RESPONSE_TIME_MS=$(echo "$RESPONSE_TIME * 1000" | bc | cut -d'.' -f1)

if [ "$HTTP_CODE" == "200" ]; then
    if [ "$RESPONSE_TIME_MS" -lt "$MAX_RESPONSE_TIME" ]; then
        echo -e "${GREEN}✅ Health check OK (${RESPONSE_TIME_MS}ms)${NC}"
    else
        echo -e "${YELLOW}⚠️  Slow response: ${RESPONSE_TIME_MS}ms${NC}"
        ISSUES=$((ISSUES + 1))
    fi
else
    echo -e "${RED}❌ Health check FAILED (HTTP $HTTP_CODE)${NC}"
    ISSUES=$((ISSUES + 1))
fi

# 2. PM2 Status
echo ""
echo "⚙️  Checking PM2 processes..."
if command -v pm2 &> /dev/null; then
    PM2_STATUS=$(pm2 jlist 2>/dev/null)

    if echo "$PM2_STATUS" | grep -q "planner-app"; then
        APP_STATUS=$(echo "$PM2_STATUS" | jq -r '.[] | select(.name=="planner-app") | .pm2_env.status' 2>/dev/null)

        if [ "$APP_STATUS" == "online" ]; then
            RESTARTS=$(echo "$PM2_STATUS" | jq -r '.[] | select(.name=="planner-app") | .pm2_env.restart_time' 2>/dev/null)
            echo -e "${GREEN}✅ PM2 process online (restarts: $RESTARTS)${NC}"

            if [ "$RESTARTS" -gt 10 ]; then
                echo -e "${YELLOW}⚠️  High restart count: $RESTARTS${NC}"
                ISSUES=$((ISSUES + 1))
            fi
        else
            echo -e "${RED}❌ PM2 process not online: $APP_STATUS${NC}"
            ISSUES=$((ISSUES + 1))
        fi
    else
        echo -e "${RED}❌ PM2 process not found${NC}"
        ISSUES=$((ISSUES + 1))
    fi
else
    echo -e "${YELLOW}⚠️  PM2 not installed${NC}"
fi

# 3. Memory Check
echo ""
echo "💾 Checking memory..."
if command -v free &> /dev/null; then
    FREE_MEM=$(free -m | awk 'NR==2 {print $7}')
    TOTAL_MEM=$(free -m | awk 'NR==2 {print $2}')
    USED_PERCENT=$(free | awk 'NR==2 {printf "%.0f", $3/$2 * 100}')

    if [ "$FREE_MEM" -gt "$MIN_FREE_MEMORY" ]; then
        echo -e "${GREEN}✅ Free memory: ${FREE_MEM}MB / ${TOTAL_MEM}MB (${USED_PERCENT}% used)${NC}"
    else
        echo -e "${YELLOW}⚠️  Low memory: ${FREE_MEM}MB free${NC}"
        ISSUES=$((ISSUES + 1))
    fi
fi

# 4. CPU Check
echo ""
echo "🖥️  Checking CPU..."
if command -v mpstat &> /dev/null; then
    CPU_IDLE=$(mpstat 1 1 | awk '/Average/ {print $NF}')
    CPU_USED=$(echo "100 - $CPU_IDLE" | bc | cut -d'.' -f1)

    if [ "$CPU_USED" -lt "$MAX_CPU_PERCENT" ]; then
        echo -e "${GREEN}✅ CPU usage: ${CPU_USED}%${NC}"
    else
        echo -e "${RED}❌ High CPU usage: ${CPU_USED}%${NC}"
        ISSUES=$((ISSUES + 1))
    fi
elif command -v top &> /dev/null; then
    CPU_USED=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1}' | cut -d'.' -f1)

    if [ "$CPU_USED" -lt "$MAX_CPU_PERCENT" ]; then
        echo -e "${GREEN}✅ CPU usage: ${CPU_USED}%${NC}"
    else
        echo -e "${RED}❌ High CPU usage: ${CPU_USED}%${NC}"
        ISSUES=$((ISSUES + 1))
    fi
fi

# 5. Disk Space Check
echo ""
echo "💿 Checking disk space..."
DISK_USAGE=$(df -h . | awk 'NR==2 {print $5}' | sed 's/%//')
DISK_FREE=$(df -h . | awk 'NR==2 {print $4}')

if [ "$DISK_USAGE" -lt 80 ]; then
    echo -e "${GREEN}✅ Disk usage: ${DISK_USAGE}% (${DISK_FREE} free)${NC}"
elif [ "$DISK_USAGE" -lt 90 ]; then
    echo -e "${YELLOW}⚠️  Disk usage: ${DISK_USAGE}% (${DISK_FREE} free)${NC}"
    ISSUES=$((ISSUES + 1))
else
    echo -e "${RED}❌ Critical disk usage: ${DISK_USAGE}% (${DISK_FREE} free)${NC}"
    ISSUES=$((ISSUES + 1))
fi

# 6. Database Connection
echo ""
echo "🗄️  Checking database..."
if [ -f .env ]; then
    source .env 2>/dev/null

    if [ -n "$DATABASE_URL" ]; then
        DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
        DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')

        if timeout 3 bash -c "cat < /dev/null > /dev/tcp/$DB_HOST/$DB_PORT" 2>/dev/null; then
            echo -e "${GREEN}✅ Database connection OK${NC}"
        else
            echo -e "${RED}❌ Cannot connect to database${NC}"
            ISSUES=$((ISSUES + 1))
        fi
    fi
fi

# 7. Recent Errors in Logs
echo ""
echo "📝 Checking recent errors..."
if [ -d "logs" ]; then
    RECENT_ERRORS=$(find logs/ -name "*error*.log" -mmin -60 -exec grep -i "error" {} \; 2>/dev/null | wc -l)

    if [ "$RECENT_ERRORS" -eq 0 ]; then
        echo -e "${GREEN}✅ No recent errors${NC}"
    elif [ "$RECENT_ERRORS" -lt 10 ]; then
        echo -e "${YELLOW}⚠️  ${RECENT_ERRORS} errors in last hour${NC}"
    else
        echo -e "${RED}❌ ${RECENT_ERRORS} errors in last hour${NC}"
        ISSUES=$((ISSUES + 1))
    fi
fi

# Summary
echo ""
echo "=================================="
echo "📊 Summary"
echo "=================================="

if [ $ISSUES -eq 0 ]; then
    echo -e "${GREEN}🎉 All checks passed!${NC}"
    EXIT_CODE=0
else
    echo -e "${RED}⚠️  Found $ISSUES issue(s)${NC}"
    EXIT_CODE=1

    # Send alert email if configured
    if [ -n "$ALERT_EMAIL" ] && command -v mail &> /dev/null; then
        echo "Sending alert email to $ALERT_EMAIL..."
        echo "Family Planner monitoring detected $ISSUES issues at $TIMESTAMP" | \
            mail -s "⚠️ Family Planner Alert: $ISSUES Issues Detected" "$ALERT_EMAIL"
    fi
fi

echo ""
exit $EXIT_CODE

