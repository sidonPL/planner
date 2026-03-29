# 🗺️ MAPA WIZUALNA - Seedowanie Danych

## HIERARCHIA SEEDOWANIA

```
┌──────────────────────────────────────────────────────────────────┐
│                    STARTUP APPLICATION                            │
│                                                                    │
│  npm run dev  OR  npm start  OR  npm run deploy:prod             │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│              src/instrumentation.ts                               │
│                                                                    │
│  export async function register() {                              │
│    if (process.env.NEXT_RUNTIME === "nodejs") {                 │
│      const { checkAndSeedOnStartup } = await import("./lib/...") │
│      await checkAndSeedOnStartup()                               │
│    }                                                              │
│  }                                                                │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│           src/lib/check-seeds.ts                                  │
│                                                                    │
│  async function checkAndSeedOnStartup() {                        │
│    // NEW SYSTEM                                                 │
│    await checkAndSeedDatabase()                                  │
│                                                                   │
│    // LEGACY (będzie usunięty w v2.0)                            │
│    await seedQuestTemplates()                                    │
│    await seedTieredAchievements()                                │
│    await seedGlobalIngredients()                                 │
│    await seedRoutineTemplates()                                  │
│  }                                                                │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
        ┌────────────────────┴────────────────────┐
        │                                          │
        ▼                                          ▼
   ┌─────────────────┐               ┌──────────────────────┐
   │  GLOBAL SEEDS   │               │ PER-HOUSEHOLD SEEDS  │
   │  (1x per app)   │               │ (N x households)     │
   └────────┬────────┘               └──────────┬───────────┘
            │                                    │
    ┌───────┼────────┬─────────┐        ┌───────┼───────┬──────────┐
    │       │        │         │        │       │       │          │
    ▼       ▼        ▼         ▼        ▼       ▼       ▼          ▼
  QUEST   ACHIEVE-  ROUTINE   TIERED  REWARDS INGRED TEMPLATES  LEGACY
  TEMPL   MENTS     TEMPLATES ACHIEV           (30+)  (5-10)     SEEDS
  (50+)   (100+)    (7)       (3 ser)  (30+)   
   │       │        │         │        │       │       │
   │       │        │         │        │       │       │
   └───────┴────────┴─────────┴────────┴───────┴───────┴──────────┘
                              │
                              ▼
                    ┌──────────────────────┐
                    │  ✅ APP READY        │
                    │  All seeds applied   │
                    │  Zero duplicates     │
                    └──────────────────────┘
```

---

## DATABASE SCHEMA - 72 MODELI

```
┌────────────────────────────────────────────────────────────────┐
│                        HOUSEHOLD (Root)                          │
│  ├─ id (PK)                                                     │
│  ├─ name                                                        │
│  ├─ createdAt                                                   │
│  ├─ updatedAt                                                   │
│  └─ ownerId (FK → User)                                         │
└────────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
         ▼                    ▼                    ▼
    ┌──────────┐         ┌──────────┐        ┌──────────┐
    │   USER   │         │   TASK   │        │  RECIPE  │
    ├──────────┤         ├──────────┤        ├──────────┤
    │ id (PK)  │         │ id (PK)  │        │ id (PK)  │
    │ email    │         │ title    │        │ name     │
    │ role     │         │ status   │        │ image    │
    │ color    │         │ priority │        │ category │
    │ xp, level│         │ dueDate  │        │ difficulty
    │ createdAt│         │ assignee │        │ calories │
    │ household│         │ household│        │ household│
    └──────────┘         └──────────┘        └──────────┘
         │                    │                    │
         ├─ Relations         ├─ Relations        ├─ Relations
         │  • tasks           │  • comments       │  • ingredients
         │  • recipes         │  • attachments    │  • steps
         │  • achievements    │  • completions    │  • ratings
         │  • schedules       │  • timeEntries    │  • notes
         │  • transactions    │  • labels         │  • favorites
         │  • badges          │  • templates      │  • collections
         │  • settings        │  • subtasks       │  • comments
         └─ ...              └─ ...              └─ ...

    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
    │   SCHEDULE   │    │    TRIP      │    │  TRANSACTION │
    ├──────────────┤    ├──────────────┤    ├──────────────┤
    │ id, name     │    │ id, name     │    │ id, amount   │
    │ type         │    │ destination  │    │ type         │
    │ dayOfWeek    │    │ startDate    │    │ category     │
    │ startTime    │    │ endDate      │    │ date         │
    │ endTime      │    │ status       │    │ userId       │
    │ householdId  │    │ householdId  │    │ householdId  │
    │ userId       │    │ createdAt    │    │ accountId    │
    │ exceptions[] │    │ participants │    │ reminders[]  │
    └──────────────┘    └──────────────┘    └──────────────┘

    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
    │    MEAL      │    │   EVENT      │    │ ACHIEVEMENT  │
    ├──────────────┤    ├──────────────┤    ├──────────────┤
    │ id, date     │    │ id, title    │    │ id, name     │
    │ mealType     │    │ description  │    │ category     │
    │ recipeId     │    │ startDate    │    │ xpReward     │
    │ customName   │    │ allDay       │    │ tier         │
    │ assigneeId   │    │ householdId  │    │ seriesName   │
    │ householdId  │    │ userId       │    │ nextTierId   │
    │ simpleDishId │    │ linkedTripId │    │ previousTierId
    └──────────────┘    └──────────────┘    └──────────────┘

    ┌──────────────────┐   ┌──────────────────┐
    │      REWARD      │   │   DAILY_QUEST    │
    ├──────────────────┤   ├──────────────────┤
    │ id, name         │   │ id, title        │
    │ pointsCost       │   │ type             │
    │ type (COSMETIC)  │   │ target           │
    │ category         │   │ reward           │
    │ rarity           │   │ date             │
    │ effectData       │   │ isActive         │
    │ householdId      │   │ householdId      │
    │ isSeasonal       │   │ completions[]    │
    └──────────────────┘   └──────────────────┘

    ┌──────────────────────────────────────────┐
    │    GLOBAL_INGREDIENT  (Per-household)    │
    ├──────────────────────────────────────────┤
    │ id, name, category, commonUnit           │
    │ householdId (KEY with name)              │
    │ usageCount, createdAt, updatedAt         │
    │ Unique: [householdId, name]              │
    └──────────────────────────────────────────┘

    ┌──────────────────────────────────────────┐
    │     TASK_TEMPLATE (Per-household)        │
    ├──────────────────────────────────────────┤
    │ id, name, description, icon              │
    │ householdId, createdBy                   │
    │ taskTemplates[] (related items)          │
    └──────────────────────────────────────────┘

    ┌──────────────────────────────────────────┐
    │     ROUTINE_TEMPLATE (Semi-global)       │
    ├──────────────────────────────────────────┤
    │ id, name, description, icon              │
    │ category, tasks (JSON)                   │
    │ isPublic: true (global seedingu)         │
    │ householdId: null (unless overridden)    │
    └──────────────────────────────────────────┘
```

---

## FLOW SEEDOWANIA - KROKI

```
STEP 1: Aplikacja startuje
└─ npm run dev (lub npm start)

STEP 2: Instrumentation hook
└─ register() from src/instrumentation.ts
   └─ Sprawdzenie: NEXT_RUNTIME === "nodejs"?
      ├─ TAK: import check-seeds
      └─ NIE: skip (edge runtime)

STEP 3: Main seeding orchestrator
└─ checkAndSeedOnStartup() from src/lib/check-seeds.ts
   │
   ├─ TRY {
   │   │
   │   ├─ Faza 1: NEW SYSTEM (recommended)
   │   │  └─ checkAndSeedDatabase()
   │   │     │
   │   │     ├─ Check: RoutineTemplate.count(householdId=null)
   │   │     │  └─ if 0 → seedRoutineTemplates() [7 templates]
   │   │     │
   │   │     ├─ Check: Achievement.count()
   │   │     │  └─ if 0 → initializeAchievements() [100+]
   │   │     │
   │   │     ├─ Check: Achievement.count(hint IS NOT NULL)
   │   │     │  └─ if 0 → seedEnhancedAchievements()
   │   │     │
   │   │     └─ For EACH Household:
   │   │        ├─ Check: Reward.count(householdId)
   │   │        │  └─ if 0 → seedRewards() [30+]
   │   │        │
   │   │        ├─ Check: GlobalIngredient.count(householdId)
   │   │        │  └─ if 0 → autoSeedIngredients() [30+]
   │   │        │
   │   │        └─ Check: first user exists
   │   │           └─ if yes → ensureDefaultTaskTemplates() [5-10]
   │   │
   │   └─ Faza 2: LEGACY SYSTEM (będzie usunięty)
   │      ├─ Check: QuestTemplate.count()
   │      │  └─ if 0 → seedQuestTemplates() [50+]
   │      │
   │      ├─ Check: Achievement.count(tier IS NOT NULL)
   │      │  └─ if 0 → seedTieredAchievements() [3 series]
   │      │
   │      ├─ Check: GlobalIngredient.count()
   │      │  └─ if 0 → seedGlobalIngredients() [25 per HH]
   │      │
   │      └─ Check: RoutineTemplate.count()
   │         └─ if 0 → seedRoutineTemplates() [duplicate!]
   │
   └─ CATCH { console.error() }

STEP 4: All seeds applied
└─ 🎉 Application ready with full database!
```

---

## DEDUPLIKACJA - MECHANIZMY

```
POZIOM 1: Schema Constraints
├─ GlobalIngredient
│  └─ @@unique([householdId, name])
│     └─ Prevents: Same ingredient twice in same household
│
├─ Reward
│  └─ @@unique([householdId, name])
│     └─ Prevents: Same reward twice in same household
│
├─ Achievement
│  └─ @@unique([name, category])
│     └─ Prevents: Same achievement in same category
│
├─ User
│  └─ @@unique(email)
│     └─ Prevents: Duplicate email accounts
│
└─ TaskLabel
   └─ @@unique([householdId, name])
      └─ Prevents: Duplicate labels in household

POZIOM 2: Application Logic
├─ Count Checks
│  └─ if (count === 0) { seed() }
│     └─ Skip if ANY records exist
│
├─ FindUnique Checks
│  └─ existing = findUnique({ where: { householdId_name } })
│     └─ Check composite key before insert
│
├─ FindFirst Checks
│  └─ existing = findFirst({ where: { name, isPublic } })
│     └─ Flexible search before insert
│
└─ Loop Protection
   └─ for (const ingredient of list) {
       if (!exists) { create() }
      }
      └─ Check each item individually

POZIOM 3: SQL Migrations
├─ IF NOT EXISTS
│  └─ CREATE INDEX IF NOT EXISTS ...
│     └─ Won't fail if exists
│
├─ INSERT ... ON CONFLICT DO NOTHING
│  └─ Skip if unique constraint violated
│
└─ Backfill with WHERE NOT EXISTS
   └─ UPDATE ... WHERE id NOT IN (SELECT ...)
      └─ Only update missing records
```

---

## TABELE - SEEDOWANIE MAPA

```
┌────────────────────────────────────────────────────────────────┐
│                     GLOBAL SEEDS (1x)                          │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  QuestTemplate (50+)           [from: check-seeds.ts]         │
│  ├─ Query: QuestTemplate.count()                              │
│  ├─ Trigger: === 0                                            │
│  ├─ Data: 50 quests w/ categories: DAILY, COOKING, etc        │
│  └─ Records in DB: Should be 50+ (never duplicated)           │
│                                                                 │
│  Achievement (100+)             [from: seed-checker.ts]       │
│  ├─ Query: Achievement.count()                                │
│  ├─ Trigger: === 0                                            │
│  ├─ Data: 100+ achievements w/ categories: TASKS, RECIPES, etc│
│  ├─ Rarity: COMMON, RARE, EPIC, LEGENDARY                    │
│  └─ Records in DB: Should be 100+ (never duplicated)          │
│                                                                 │
│  Tiered Achievements (3 series) [from: check-seeds.ts]       │
│  ├─ Series: Mistrz Pizzy, Wykonawca, Człowiek Nawyku        │
│  ├─ Query: Achievement.count(tier IS NOT NULL)               │
│  ├─ Trigger: === 0                                            │
│  ├─ Linking: nextTierId ↔ previousTierId (after creation)    │
│  └─ Records in DB: Should be 10+ (series linked)              │
│                                                                 │
│  Routine Templates (7) [PUBLIC]  [from: check-seeds.ts]      │
│  ├─ Query: RoutineTemplate.count(householdId=null)           │
│  ├─ Trigger: === 0                                            │
│  ├─ Templates: 🌅 Morning, 🌙 Evening, 🧹 Cleaning, etc     │
│  ├─ isPublic: true                                            │
│  └─ Records in DB: Should be 7 (never duplicated)             │
│                                                                 │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│               PER-HOUSEHOLD SEEDS (N x households)              │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Reward (30+ per household)     [from: seed-enhanced-gamif...]│
│  ├─ Query: Reward.count(householdId)                          │
│  ├─ Trigger: === 0 (per household)                            │
│  ├─ Data: 30+ rewards w/ types & rarities                     │
│  ├─ Rarity: COMMON (100-300 pts) → LEGENDARY (5000+ pts)     │
│  └─ Records in DB: 30+ × N households (no duplicates)         │
│                                                                 │
│  Global Ingredients (30+ per household)                       │
│  │                   [from: seed-ingredients.ts]              │
│  ├─ Query: GlobalIngredient.count(householdId)               │
│  ├─ Trigger: === 0 (per household)                            │
│  ├─ Data: 30+ ingredients (mąki, warzywa, przyprawy, etc)    │
│  ├─ Unique: [householdId, name] (composite key)              │
│  └─ Records in DB: 30+ × N households (no duplicates)         │
│                                                                 │
│  Task Templates (5-10 per household)                          │
│  │                   [from: seed-checker.ts]                  │
│  ├─ Query: TaskTemplate.count(householdId)                   │
│  ├─ Trigger: === 0 (per household)                            │
│  ├─ Categories: work, personal, health, shopping, cooking    │
│  └─ Records in DB: 5-10 × N households (no duplicates)        │
│                                                                 │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│  BACKFILL MIGRATIONS (via SQL)                                 │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  CalendarImportedEvent.householdId  [20260322183000]         │
│  ├─ Migration: add householdId column                         │
│  ├─ Backfill: UPDATE ... SET householdId = (via JOIN User)    │
│  ├─ Protection: WHERE householdId IS NULL (only missing)      │
│  └─ Result: All events have householdId assigned              │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

---

## DIAGRAM RELACJI

```
              ┌─────────────────────────────────┐
              │        HOUSEHOLD (1)             │
              │     [Root Organization]         │
              └────────────┬────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
    ┌──────────┐      ┌──────────┐    ┌──────────┐
    │ USER (N) │      │ TASK (N) │    │RECIPE(N) │
    │   1:N    │      │   1:N    │    │  1:N     │
    └──────────┘      └──────────┘    └──────────┘
         │                 │
         ├─ email          ├─ title
         ├─ role           ├─ priority
         ├─ xp             ├─ status
         ├─ level          ├─ dueDate
         └─ household --┐  └─ household
                        │
                        ▼ (FK)
                 ┌──────────────┐
                 │ HOUSEHOLD    │
                 ├──────────────┤
                 │ id (PK)      │
                 │ name         │
                 │ createdAt    │
                 │ ownerId (FK) │
                 └──────────────┘

    Every table with householdId:
    - ShoppingItem (1:N)
    - Meal (1:N)
    - Schedule (1:N)
    - Transaction (1:N)
    - Event (1:N)
    - Reward (1:N)
    - GlobalIngredient (1:N)
    - TaskTemplate (1:N)
    - Budget (1:N)
    - Category (1:N)
    - Trip (1:N)
    - etc...
```

---

## SUMMARY TABLE

```
┌─────────────────────┬──────────┬───────────────┬──────────────────┐
│ Tabela              │ Ilość    │ Typ Seedingu  │ Deduplikacja     │
├─────────────────────┼──────────┼───────────────┼──────────────────┤
│ QuestTemplate       │ 50+      │ Global (1x)   │ COUNT check      │
│ Achievement         │ 100+     │ Global (1x)   │ COUNT check      │
│ AchievementTiered   │ 3 series │ Global (1x)   │ COUNT check      │
│ RoutineTemplate     │ 7        │ Global (1x)   │ UNIQUE + FIND    │
│ Reward              │ 30+      │ Per HH (N)    │ Composite key    │
│ GlobalIngredient    │ 30+      │ Per HH (N)    │ Composite key    │
│ TaskTemplate        │ 5-10     │ Per HH (N)    │ COUNT check      │
│ Badge               │ 10+      │ Manual        │ N/A              │
│ User                │ Manual   │ Manual        │ UNIQUE (email)   │
│ Household           │ Manual   │ Manual        │ N/A              │
└─────────────────────┴──────────┴───────────────┴──────────────────┘
```

---

## STATUS

✅ ALL SYSTEMS GO - Production Ready

