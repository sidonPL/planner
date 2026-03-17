import { prisma } from "@/lib/prisma";

// Lista popularnych składników do automatycznego seedowania
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

/**
 * Automatycznie seeduje składniki dla gospodarstwa jeśli ich nie ma
 */
export async function autoSeedIngredients(householdId: string): Promise<void> {
  try {
    // Sprawdź czy są jakiekolwiek składniki dla tego gospodarstwa
    const existingCount = await prisma.globalIngredient.count({
      where: { householdId },
    });

    // Jeśli są już składniki, nie seeduj ponownie
    if (existingCount > 0) {
      console.log(`✅ Gospodarstwo ${householdId} ma już ${existingCount} składników, pomijam seed`);
      return;
    }

    console.log(`🌱 Seedowanie składników dla gospodarstwa ${householdId}...`);

    let imported = 0;

    for (const ingredient of popularIngredients) {
      try {
        await prisma.globalIngredient.create({
          data: {
            name: ingredient.name,
            category: ingredient.category,
            commonUnit: ingredient.commonUnit,
            householdId,
            usageCount: 0,
          },
        });

        imported++;
      } catch (error) {
        // Ignoruj błędy duplikatów (mogą wystąpić w race conditions)
        console.error(`Błąd przy dodawaniu składnika ${ingredient.name}:`, error);
      }
    }

    console.log(`✅ Zaimportowano ${imported} składników dla gospodarstwa ${householdId}`);
  } catch (error) {
    console.error("Błąd podczas auto-seedowania składników:", error);
    // Nie rzucaj błędu - aplikacja powinna działać nawet jeśli seed się nie powiódł
  }
}

