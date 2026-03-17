import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const connectionString = process.env.DATABASE_URL!;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

// Lista popularnych składników do zaimportowania
const popularIngredients = [
  // Mąki i skrobie
  { name: "mąka pszenna", category: "mąki", commonUnit: "g" },
  { name: "mąka kukurydziana", category: "mąki", commonUnit: "g" },
  { name: "mąka ziemniaczana", category: "mąki", commonUnit: "g" },
  { name: "mąka ryżowa", category: "mąki", commonUnit: "g" },

  // Nabiał
  { name: "mleko", category: "nabiał", commonUnit: "ml" },
  { name: "śmietana", category: "nabiał", commonUnit: "ml" },
  { name: "masło", category: "nabiał", commonUnit: "g" },
  { name: "ser żółty", category: "nabiał", commonUnit: "g" },
  { name: "ser biały", category: "nabiał", commonUnit: "g" },
  { name: "jogurt naturalny", category: "nabiał", commonUnit: "g" },

  // Mięso i ryby
  { name: "pierś z kurczaka", category: "mięso", commonUnit: "g" },
  { name: "filet z kurczaka", category: "mięso", commonUnit: "g" },
  { name: "mięso mielone", category: "mięso", commonUnit: "g" },
  { name: "łosoś", category: "ryby", commonUnit: "g" },

  // Warzywa
  { name: "cebula", category: "warzywa", commonUnit: "szt" },
  { name: "czosnek", category: "warzywa", commonUnit: "ząbek" },
  { name: "pomidor", category: "warzywa", commonUnit: "szt" },
  { name: "papryka", category: "warzywa", commonUnit: "szt" },
  { name: "marchew", category: "warzywa", commonUnit: "szt" },
  { name: "ziemniak", category: "warzywa", commonUnit: "szt" },
  { name: "brokuł", category: "warzywa", commonUnit: "szt" },
  { name: "kalafior", category: "warzywa", commonUnit: "szt" },

  // Przyprawy i dodatki
  { name: "sól", category: "przyprawy", commonUnit: "szczypta" },
  { name: "pieprz", category: "przyprawy", commonUnit: "szczypta" },
  { name: "cukier", category: "dodatki", commonUnit: "g" },
  { name: "oliwa z oliwek", category: "oleje", commonUnit: "ml" },
  { name: "olej", category: "oleje", commonUnit: "ml" },

  // Makarony i ryż
  { name: "makaron", category: "makarony", commonUnit: "g" },
  { name: "ryż", category: "ryże", commonUnit: "g" },
  { name: "kasza", category: "kasze", commonUnit: "g" },

  // Jaja
  { name: "jajko", category: "jaja", commonUnit: "szt" },

  // Przyprawy
  { name: "papryka słodka", category: "przyprawy", commonUnit: "łyżeczka" },
  { name: "kurkuma", category: "przyprawy", commonUnit: "łyżeczka" },
  { name: "kminek", category: "przyprawy", commonUnit: "łyżeczka" },
  { name: "bazylia", category: "zioła", commonUnit: "łyżeczka" },
  { name: "oregano", category: "zioła", commonUnit: "łyżeczka" },
  { name: "tymianek", category: "zioła", commonUnit: "łyżeczka" },
];

async function seedGlobalIngredients(householdId: string) {
  console.log(`🌱 Importowanie popularnych składników dla gospodarstwa: ${householdId}`);

  let imported = 0;
  let skipped = 0;

  for (const ingredient of popularIngredients) {
    try {
      // Sprawdź czy składnik już istnieje
      const existing = await prisma.globalIngredient.findUnique({
        where: {
          householdId_name: {
            householdId,
            name: ingredient.name,
          },
        },
      });

      if (existing) {
        console.log(`⏭️  Pominięto: ${ingredient.name} (już istnieje)`);
        skipped++;
        continue;
      }

      // Stwórz nowy składnik
      await prisma.globalIngredient.create({
        data: {
          name: ingredient.name,
          category: ingredient.category,
          commonUnit: ingredient.commonUnit,
          householdId,
          usageCount: 0,
        },
      });

      console.log(`✅ Dodano: ${ingredient.name}`);
      imported++;
    } catch (error) {
      console.error(`❌ Błąd przy dodawaniu: ${ingredient.name}`, error);
    }
  }

  console.log(`\n📊 Podsumowanie:`);
  console.log(`   ✅ Zaimportowano: ${imported}`);
  console.log(`   ⏭️  Pominięto: ${skipped}`);
  console.log(`   📦 Razem: ${popularIngredients.length}`);
}

// Pobierz householdId z argumentu wiersza poleceń
let householdId = process.argv[2];

if (!householdId) {
  console.log("🔍 Nie podano householdId, szukam pierwszego gospodarstwa...");

  // Pobierz pierwsze gospodarstwo
  prisma.household.findFirst({
    select: { id: true, name: true }
  }).then(async (household) => {
    if (!household) {
      console.error("❌ Błąd: Nie znaleziono żadnego gospodarstwa w bazie");
      process.exit(1);
    }

    console.log(`✅ Znaleziono gospodarstwo: ${household.name} (${household.id})`);
    householdId = household.id;

    await seedGlobalIngredients(householdId);
    console.log("\n🎉 Import zakończony!");
    await prisma.$disconnect();
    process.exit(0);
  }).catch((error) => {
    console.error("❌ Błąd podczas importu:", error);
    prisma.$disconnect();
    process.exit(1);
  });
} else {
  seedGlobalIngredients(householdId)
    .then(() => {
      console.log("\n🎉 Import zakończony!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Błąd podczas importu:", error);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
}

