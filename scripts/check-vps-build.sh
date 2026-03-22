#!/usr/bin/env bash

# Diagnostic script to check VPS readiness for building planner
# Usage: chmod +x check-vps-build.sh && ./check-vps-build.sh

set -euo pipefail

echo "🔍 Diagnoza VPS dla budowania Planner"
echo "======================================"
echo ""

# 1. Sprawdź pamięć
echo "📊 Pamięć RAM:"
total_ram=$(free -h | awk 'NR==2{print $2}')
used_ram=$(free -h | awk 'NR==2{print $3}')
available_ram=$(free -h | awk 'NR==2{print $7}')
available_mb=$(free -m | awk 'NR==2{print $7}')
echo "  Całkowita: $total_ram"
echo "  Używana: $used_ram"
echo "  Dostępna: $available_ram ($available_mb MB)"

if [[ "$available_mb" -lt 1024 ]]; then
  echo "  ⚠️  UWAGA: Dostępne < 1GB, rekomendowany SWAP!"
  echo "     Uruchom: sudo fallocate -l 4G /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile"
fi

echo ""

# 2. Sprawdź SWAP
echo "💾 SWAP:"
swap_total=$(free -h | awk 'NR==3{print $2}')
swap_used=$(free -h | awk 'NR==3{print $3}')
echo "  Całkowity: $swap_total"
echo "  Używany: $swap_used"

if [[ "$swap_total" == "0B" ]]; then
  echo "  ⚠️  UWAGA: Brak SWAP! Utwórz, aby uniknąć OOM."
fi

echo ""

# 3. Sprawdź Node.js
echo "🟢 Node.js:"
if command -v node &>/dev/null; then
  node_version=$(node -v)
  node_heap=$(node -e "console.log(require('v8').getHeapStatistics().heap_size_limit / 1024 / 1024)")
  echo "  Wersja: $node_version"
  echo "  Domyślny max heap: ${node_heap:.0f} MB"
else
  echo "  ❌ Node.js nie zainstalowany!"
fi

echo ""

# 4. Sprawdź npm
echo "📦 npm:"
if command -v npm &>/dev/null; then
  npm_version=$(npm -v)
  echo "  Wersja: $npm_version"
else
  echo "  ❌ npm nie zainstalowany!"
fi

echo ""

# 5. Sprawdź disk space
echo "💿 Dysk:"
disk_usage=$(df -h . | awk 'NR==2{print $2}')
disk_used=$(df -h . | awk 'NR==2{print $3}')
disk_available=$(df -h . | awk 'NR==2{print $4}')
echo "  Całkowity: $disk_usage"
echo "  Używany: $disk_used"
echo "  Dostępny: $disk_available"

if [[ $(df . | awk 'NR==2{print $4}') -lt 5242880 ]]; then
  echo "  ⚠️  UWAGA: < 5GB dostępne, bild może się nie zmieścić!"
fi

echo ""

# 6. Rekomendacje
echo "✅ Rekomendacje:"
echo ""
if [[ "$available_mb" -ge 2048 ]]; then
  echo "  ✓ Memória OK, build powinien przejść"
elif [[ "$available_mb" -ge 1024 ]]; then
  echo "  ~ Marginalne, użyj: NODE_OPTIONS='--max-old-space-size=1024' npm run build"
else
  echo "  ✗ Za mało RAM, koniecznie:"
  echo "    1) Utwórz SWAP (4GB)"
  echo "    2) Użyj: NODE_OPTIONS='--max-old-space-size=1024' npm run build"
fi

echo ""
echo "🎯 Sugerowana komenda do budowania:"
if [[ "$available_mb" -ge 4096 ]]; then
  heap_size=4096
elif [[ "$available_mb" -ge 2048 ]]; then
  heap_size=2048
else
  heap_size=1024
fi
echo "   NODE_OPTIONS=\"--max-old-space-size=$heap_size\" npm run build"

echo ""
echo "======================================"
echo "✨ Diagnoza zakończona"

