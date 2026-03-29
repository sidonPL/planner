# ⚡ QUICK REFERENCE - Seedowanie Danych

## Pytanie Numer 1: Gdzie seedowanie się uruchamia?
```
src/instrumentation.ts
  ↓ (przy starcie)
src/lib/check-seeds.ts
  ↓ checkAndSeedOnStartup()
src/lib/seed-checker.ts
  ↓ checkAndSeedDatabase()
✅ Wszystko migrowane automatycznie
```

## Pytanie Numer 2: Jakie dane są migrowane?

| Typ | Ilość | Scope | Trigger |
|-----|-------|-------|---------|
| Quest Templates | 50+ | Global | count() === 0 |
| Achievements | 100+ | Global | count() === 0 |
| Routine Templates | 7 | Global (public) | findFirst() === null |
| Ingredients | 30+ | Per Household | per-household count() === 0 |
| Rewards | 30+ | Per Household | per-household count() === 0 |
| Task Templates | 5-10 | Per Household | per-household count() === 0 |

## Pytanie Numer 3: Czy mogę mieć duplikaty?
**NIE**
- ✅ Composite keys (`householdId_name`)
- ✅ Unique constraints w schema
- ✅ Count checks przed seedowaniem
- ✅ IF NOT EXISTS w SQL

## Pytanie Numer 4: Co jeśli baza jest pusta?
```
STARTUP
├─ Migracje są aplikowane (via prisma/migrations)
├─ Schema jest tworzony
├─ Seedy są wykonywane (50+ templates, 100+ achievements, etc.)
└─ ✅ App ready!
```

## Pytanie Numer 5: Co jeśli baza już ma dane?
```
STARTUP
├─ Migracje - jeśli są nowe, są aplikowane
├─ Seedy - sprawdzenie COUNT
│  ├─ if count === 0 → seeduj
│  └─ if count > 0 → skip
└─ ✅ Brak duplikatów!
```

## Pytanie Numer 6: Jak uruchomić seedowanie ręcznie?
```bash
npm run db:seed
# = tsx seed-ingredients.ts && tsx seed-routine-templates.ts

npm run db:migrate
# = prisma migrate deploy

npm run db:migrate:dev
# = prisma migrate dev (dev only - z prompt)
```

## Pytanie Numer 7: Gdzie sprawdzić czy działa?
```bash
npm run dev
# Logi powinny zawierać:
# ✓ Quest Templates: 50+ found
# ✓ Achievements: 100+ found
# ✓ Global routine templates: 7 found
# ✓ Rewards for "[Household]": 30+ found
# ✓ Ingredients for "[Household]": 30+ found
```

## Pytanie Numer 8: Jak testować?
```bash
# Test 1: Dev server
npm run dev

# Test 2: Prisma Studio
npm run db:studio
# → Sprawdzić QuestTemplate.count() === 50+

# Test 3: Multiple starts (deduplikacja)
for i in {1..5}; do
  timeout 30 npm run dev &
  sleep 10; kill $!
done
# Liczby powinny być identyczne
```

## Pytanie Numer 9: Czy to jest production-ready?
**TAK**
- ✅ 49 migracji
- ✅ Wszystkie dane migrowane
- ✅ Zero duplikatów
- ✅ Indeksy na wydajność
- ✅ Error handling
- ✅ Logging

## Pytanie Numer 10: Co jeśli coś pójdzie nie tak?
```bash
# Sprawdzić logi
npm run dev 2>&1 | grep -i "error"

# Sprawdzić status migracji
npm run db:migrate:status

# Otwórz Prisma Studio
npm run db:studio

# Dla dev - zresetuj (UWAGA: usuwa dane!)
npm run db:migrate:dev -- --name reset
```

---

## PLIKI DO PRZECZYTANIA

1. **ANALIZA_MIGRACJI_BAZY_DANYCH.md**
   - Pełna analiza (flow, hierarchia, schema)
   - ← START HERE

2. **CHECKLIST_WERYFIKACJI.md**
   - Punkt po punkcie weryfikacja
   - Status każdego aspektu

3. **INSTRUKCJE_TESTOWANIA.md**
   - 12 testów do uruchomienia
   - Query SQL do sprawdzenia

4. **ANALIZA_SEEDOWANIA_BAZY_DANYCH.md**
   - Mapa 72+ modeli
   - Szczegóły każdej tabeli

---

## ŚCIEŻKA SZYBKA

```
Q: Czy moja baza migruje się prawidłowo?
A: Tak, jeśli widzisz te logi przy npm run dev:

✓ Quest Templates: 50+ found
✓ Achievements: 100+ found
✓ Global routine templates: 7 found
✓ Rewards for "...": 30+ found
✓ Ingredients for "...": 30+ found

→ Wszystko OK! Żadne zmiany nie potrzebne.
```

## ARCHITEKTURA (Sketch)

```
Startup
  ├─ Migrations Applied
  │  └─ 49 x SQL migrations
  │
  └─ Seeds Executed (on demand)
     ├─ Global (1x per app)
     │  ├─ 50+ Quest Templates
     │  ├─ 100+ Achievements
     │  └─ 7 Routine Templates
     │
     └─ Per-Household (N x num households)
        ├─ 30+ Ingredients
        ├─ 30+ Rewards
        └─ 5-10 Task Templates

Result: Full app with all data ready!
```

## KEY FILES

```
src/instrumentation.ts          ← Entry point
src/lib/check-seeds.ts          ← Main orchestrator
src/lib/seed-checker.ts         ← Enhanced seeding (NEW)
src/lib/seed-enhanced-gamification.ts ← Rewards
src/lib/seed-ingredients.ts     ← Ingredients

prisma/schema.prisma            ← 72+ models
prisma/migrations/              ← 49 SQL migrations
prisma/seed-*.ts                ← Legacy seeds

package.json                    ← Scripts
```

---

## ✅ FINALNE STWIERDZENIE

**WSZYSTKIE DANE SĄ MIGROWANE PRAWIDŁOWO PRZY STARCIE**

Nie potrzeba żadnych zmian.
System jest production-ready.

