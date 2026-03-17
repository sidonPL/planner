import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const questTemplates = [
  // TASKS Category - Daily Productivity
  {
    title: "Ukończ 3 zadania",
    description: "Wykonaj 3 dowolne zadania dzisiaj",
    type: "TASKS",
    requirementValue: 3,
    xpReward: 15,
    category: "DAILY",
    difficulty: "EASY",
    weight: 10, // Very common
  },
  {
    title: "Ukończ 5 zadań",
    description: "Wykonaj 5 zadań w ciągu dnia",
    type: "TASKS",
    requirementValue: 5,
    xpReward: 25,
    category: "DAILY",
    difficulty: "MEDIUM",
    weight: 8,
  },
  {
    title: "Ukończ 10 zadań",
    description: "Wykonaj aż 10 zadań dzisiaj!",
    type: "TASKS",
    requirementValue: 10,
    xpReward: 50,
    category: "DAILY",
    difficulty: "HARD",
    weight: 3,
  },
  {
    title: "Produktywny poranek",
    description: "Ukończ 3 zadania przed 10:00",
    type: "TASKS_MORNING",
    requirementValue: 3,
    xpReward: 30,
    category: "DAILY",
    difficulty: "MEDIUM",
    weight: 5,
  },

  // COOKING Category - Recipes & Meals
  {
    title: "Zaplanuj 2 posiłki",
    description: "Dodaj 2 posiłki do planu na ten tydzień",
    type: "MEALS",
    requirementValue: 2,
    xpReward: 15,
    category: "COOKING",
    difficulty: "EASY",
    weight: 8,
  },
  {
    title: "Zaplanuj 5 posiłków",
    description: "Zaplanuj 5 posiłków na nadchodzący tydzień",
    type: "MEALS",
    requirementValue: 5,
    xpReward: 30,
    category: "COOKING",
    difficulty: "MEDIUM",
    weight: 5,
  },
  {
    title: "Stwórz nowy przepis",
    description: "Dodaj własny przepis do kolekcji",
    type: "RECIPES",
    requirementValue: 1,
    xpReward: 25,
    category: "COOKING",
    difficulty: "MEDIUM",
    weight: 6,
  },
  {
    title: "Oceń 3 przepisy",
    description: "Dodaj oceny do 3 przepisów",
    type: "RATING",
    requirementValue: 3,
    xpReward: 20,
    category: "COOKING",
    difficulty: "EASY",
    weight: 7,
  },
  {
    title: "Wypróbuj nowy przepis",
    description: "Ugotuj przepis, którego jeszcze nie robiłeś",
    type: "NEW_RECIPE",
    requirementValue: 1,
    xpReward: 35,
    category: "COOKING",
    difficulty: "MEDIUM",
    weight: 5,
  },

  // SHOPPING Category
  {
    title: "Zrób zakupy",
    description: "Ukończ listę zakupów",
    type: "SHOPPING",
    requirementValue: 1,
    xpReward: 20,
    category: "SHOPPING",
    difficulty: "EASY",
    weight: 7,
  },
  {
    title: "Sprawdź inwentarz",
    description: "Aktualizuj stan magazynu składników",
    type: "INVENTORY",
    requirementValue: 5,
    xpReward: 15,
    category: "SHOPPING",
    difficulty: "EASY",
    weight: 6,
  },
  {
    title: "Zero waste",
    description: "Użyj 3 składniki, które wkrótce się psują",
    type: "EXPIRING",
    requirementValue: 3,
    xpReward: 30,
    category: "SHOPPING",
    difficulty: "MEDIUM",
    weight: 4,
  },

  // ROUTINES Category
  {
    title: "Wykonaj poranne rutyny",
    description: "Ukończ wszystkie poranne rutyny",
    type: "ROUTINES",
    requirementValue: 1,
    xpReward: 20,
    category: "DAILY",
    difficulty: "EASY",
    weight: 8,
  },
  {
    title: "Perfekcyjny dzień",
    description: "Ukończ wszystkie zaplanowane zadania dzisiaj",
    type: "PERFECT_DAY",
    requirementValue: 1,
    xpReward: 50,
    category: "DAILY",
    difficulty: "HARD",
    weight: 2,
  },

  // SOCIAL Category - Collaboration
  {
    title: "Pomóż rodzinie",
    description: "Ukończ 2 zadania przypisane innym",
    type: "HELP",
    requirementValue: 2,
    xpReward: 25,
    category: "SOCIAL",
    difficulty: "MEDIUM",
    weight: 5,
  },
  {
    title: "Dodaj komentarz",
    description: "Skomentuj przepis lub zadanie",
    type: "COMMENT",
    requirementValue: 1,
    xpReward: 15,
    category: "SOCIAL",
    difficulty: "EASY",
    weight: 6,
  },

  // PLANNING Category - Future focus
  {
    title: "Zaplanuj jutro",
    description: "Stwórz plan na jutrzejszy dzień",
    type: "PLAN_TOMORROW",
    requirementValue: 3,
    xpReward: 20,
    category: "PLANNING",
    difficulty: "EASY",
    weight: 7,
  },
  {
    title: "Early Bird",
    description: "Ukończ pierwsze zadanie przed 9:00",
    type: "EARLY",
    requirementValue: 1,
    xpReward: 25,
    category: "DAILY",
    difficulty: "MEDIUM",
    weight: 4,
  },

  // HEALTH Category
  {
    title: "Zdrowy dzień",
    description: "Zaplanuj 3 zdrowe posiłki",
    type: "HEALTHY_DAY",
    requirementValue: 3,
    xpReward: 30,
    category: "HEALTH",
    difficulty: "MEDIUM",
    weight: 5,
  },
  {
    title: "Szybki lunch",
    description: "Przygotuj posiłek w < 30 minut",
    type: "QUICK_MEAL",
    requirementValue: 1,
    xpReward: 20,
    category: "COOKING",
    difficulty: "EASY",
    weight: 6,
  },

  // EVENING Category
  {
    title: "Gotowanie wieczorne",
    description: "Przygotuj kolację po 17:00",
    type: "EVENING_COOK",
    requirementValue: 1,
    xpReward: 20,
    category: "COOKING",
    difficulty: "EASY",
    weight: 7,
  },

  // DOCUMENTATION Category
  {
    title: "Dodaj zdjęcie",
    description: "Dodaj zdjęcie do przepisu lub posiłku",
    type: "PHOTO",
    requirementValue: 1,
    xpReward: 15,
    category: "DOCUMENTATION",
    difficulty: "EASY",
    weight: 5,
  },

  // ADVANCED Category
  {
    title: "Mistrz kuchni",
    description: "Ugotuj 3 różne przepisy dzisiaj",
    type: "RECIPES_COOKED",
    requirementValue: 3,
    xpReward: 40,
    category: "COOKING",
    difficulty: "HARD",
    weight: 3,
  },
  {
    title: "Organizacja tygodnia",
    description: "Zaplanuj wszystkie posiłki na cały tydzień (21 posiłków)",
    type: "WEEK_PLANNING",
    requirementValue: 21,
    xpReward: 100,
    category: "PLANNING",
    difficulty: "HARD",
    weight: 1,
  },
];

async function main() {
  console.log('🌱 Seeding Quest Templates...');

  // Clear existing templates (optional)
  const deleteCount = await prisma.questTemplate.deleteMany();
  console.log(`🗑️  Deleted ${deleteCount.count} existing templates`);

  // Create new templates
  for (const template of questTemplates) {
    await prisma.questTemplate.create({
      data: template,
    });
  }

  console.log(`✅ Created ${questTemplates.length} quest templates`);

  // Display summary by category
  const categories = [...new Set(questTemplates.map(t => t.category))];
  console.log('\n📊 Summary by category:');
  for (const category of categories) {
    const count = questTemplates.filter(t => t.category === category).length;
    console.log(`   ${category}: ${count} templates`);
  }

  console.log('\n✅ Quest Templates seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding quest templates:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

