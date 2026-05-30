#!/bin/bash

# 🔍 SPRAWDZENIE CZY TABELA TripPhoto ISTNIEJE

echo "Sprawdzam tabelę TripPhoto..."

# Metoda 1: Lista tabel
echo ""
echo "=== Lista tabel (grep TripPhoto) ==="
psql -U postgres -d planner -h localhost -c "\dt+" | grep -i trippoto || echo "❌ Tabela nie znaleziona"

# Metoda 2: Bezpośrednio
echo ""
echo "=== Bezpośrednie sprawdzenie ==="
psql -U postgres -d planner -h localhost -c "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'TripPhoto');"

# Metoda 3: Struktura tabeli
echo ""
echo "=== Struktura tabeli ==="
psql -U postgres -d planner -h localhost -c "\d \"TripPhoto\"" 2>&1

# Metoda 4: Liczba kolumn
echo ""
echo "=== Kolumny ==="
psql -U postgres -d planner -h localhost -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'TripPhoto' ORDER BY ordinal_position;" 2>&1

# Metoda 5: Bezpośrednie SQL
echo ""
echo "=== SELECT z tabeli ==="
psql -U postgres -d planner -h localhost -c "SELECT * FROM \"TripPhoto\" LIMIT 1;" 2>&1

