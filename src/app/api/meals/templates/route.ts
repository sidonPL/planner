import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/api-error-handler";
import { addDays, startOfWeek } from "date-fns";
import { pl } from "date-fns/locale";

/**
 * GET /api/meals/templates
 *
 * Zwraca dostępne szablony planów posiłków
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Wbudowane szablony (możliwe do rozszerzenia o user-created templates)
    const templates = [
      {
        id: "balanced-week",
        name: "Zrównoważony tydzień",
        description: "Różnorodne posiłki na cały tydzień - śniadanie, obiad, kolacja",
        icon: "⚖️",
        category: "balanced",
        mealPattern: [
          { day: 0, mealType: "BREAKFAST", search: "jajecznica" },
          { day: 0, mealType: "LUNCH", search: "zupa" },
          { day: 0, mealType: "DINNER", search: "kurczak" },

          { day: 1, mealType: "BREAKFAST", search: "owsianka" },
          { day: 1, mealType: "LUNCH", search: "makaron" },
          { day: 1, mealType: "DINNER", search: "ryba" },

          { day: 2, mealType: "BREAKFAST", search: "tosty" },
          { day: 2, mealType: "LUNCH", search: "ryż" },
          { day: 2, mealType: "DINNER", search: "sałatka" },

          { day: 3, mealType: "BREAKFAST", search: "naleśniki" },
          { day: 3, mealType: "LUNCH", search: "kotlet" },
          { day: 3, mealType: "DINNER", search: "pierogi" },

          { day: 4, mealType: "BREAKFAST", search: "omlet" },
          { day: 4, mealType: "LUNCH", search: "pizza" },
          { day: 4, mealType: "DINNER", search: "burger" },

          { day: 5, mealType: "BREAKFAST", search: "jogurt" },
          { day: 5, mealType: "LUNCH", search: "spaghetti" },
          { day: 5, mealType: "DINNER", search: "gulasz" },

          { day: 6, mealType: "BREAKFAST", search: "kanapka" },
          { day: 6, mealType: "LUNCH", search: "rosół" },
          { day: 6, mealType: "DINNER", search: "kotlet schabowy" },
        ],
      },
      {
        id: "student-budget",
        name: "Tania dieta studencka",
        description: "Ekonomiczne posiłki na cały tydzień",
        icon: "💰",
        category: "budget",
        mealPattern: [
          { day: 0, mealType: "BREAKFAST", search: "owsianka" },
          { day: 0, mealType: "LUNCH", search: "makaron" },
          { day: 0, mealType: "DINNER", search: "jajecznica" },

          { day: 1, mealType: "BREAKFAST", search: "kanapka" },
          { day: 1, mealType: "LUNCH", search: "ryż z warzywami" },
          { day: 1, mealType: "DINNER", search: "naleśniki" },

          { day: 2, mealType: "BREAKFAST", search: "płatki" },
          { day: 2, mealType: "LUNCH", search: "zupa pomidorowa" },
          { day: 2, mealType: "DINNER", search: "ziemniaki" },

          { day: 3, mealType: "BREAKFAST", search: "tosty" },
          { day: 3, mealType: "LUNCH", search: "fasolka" },
          { day: 3, mealType: "DINNER", search: "omlet" },

          { day: 4, mealType: "BREAKFAST", search: "owsianka" },
          { day: 4, mealType: "LUNCH", search: "kasza" },
          { day: 4, mealType: "DINNER", search: "pierogi" },

          { day: 5, mealType: "BREAKFAST", search: "kanapka" },
          { day: 5, mealType: "LUNCH", search: "spaghetti" },
          { day: 5, mealType: "DINNER", search: "pizza" },

          { day: 6, mealType: "BREAKFAST", search: "jajka" },
          { day: 6, mealType: "LUNCH", search: "rosół" },
          { day: 6, mealType: "DINNER", search: "kurczak" },
        ],
      },
      {
        id: "fit-week",
        name: "Fit tydzień",
        description: "Zdrowe, zbilansowane posiłki dla aktywnych",
        icon: "💪",
        category: "healthy",
        mealPattern: [
          { day: 0, mealType: "BREAKFAST", search: "owsianka z owocami" },
          { day: 0, mealType: "LUNCH", search: "grillowany kurczak z sałatką" },
          { day: 0, mealType: "DINNER", search: "łosoś z warzywami" },

          { day: 1, mealType: "BREAKFAST", search: "smoothie bowl" },
          { day: 1, mealType: "LUNCH", search: "quinoa z warzywami" },
          { day: 1, mealType: "DINNER", search: "pierś z indyka" },

          { day: 2, mealType: "BREAKFAST", search: "jajka na twardo" },
          { day: 2, mealType: "LUNCH", search: "sałatka z tuńczykiem" },
          { day: 2, mealType: "DINNER", search: "kurczak z brokułami" },

          { day: 3, mealType: "BREAKFAST", search: "jogurt grecki z orzechami" },
          { day: 3, mealType: "LUNCH", search: "grillowane warzywa" },
          { day: 3, mealType: "DINNER", search: "ryba z ryżem" },

          { day: 4, mealType: "BREAKFAST", search: "omlet z warzywami" },
          { day: 4, mealType: "LUNCH", search: "kasza gryczana" },
          { day: 4, mealType: "DINNER", search: "kurczak teriyaki" },

          { day: 5, mealType: "BREAKFAST", search: "tost z awokado" },
          { day: 5, mealType: "LUNCH", search: "sałatka cezar" },
          { day: 5, mealType: "DINNER", search: "stir-fry z kurczakiem" },

          { day: 6, mealType: "BREAKFAST", search: "pankejki owsiane" },
          { day: 6, mealType: "LUNCH", search: "sushi bowl" },
          { day: 6, mealType: "DINNER", search: "łosoś pieczony" },
        ],
      },
      {
        id: "family-dinners",
        name: "Rodzinne obiady",
        description: "Tradycyjne polskie obiady dla całej rodziny",
        icon: "👨‍👩‍👧‍👦",
        category: "family",
        mealPattern: [
          { day: 0, mealType: "LUNCH", search: "rosół" },
          { day: 1, mealType: "LUNCH", search: "kotlet schabowy" },
          { day: 2, mealType: "LUNCH", search: "pierogi" },
          { day: 3, mealType: "LUNCH", search: "gulasz" },
          { day: 4, mealType: "LUNCH", search: "pizza" },
          { day: 5, mealType: "LUNCH", search: "spaghetti" },
          { day: 6, mealType: "LUNCH", search: "zrazy" },
        ],
      },
      {
        id: "quick-meals",
        name: "Szybkie posiłki (30 min)",
        description: "Wszystkie posiłki do 30 minut przygotowania",
        icon: "⏱️",
        category: "quick",
        mealPattern: [
          { day: 0, mealType: "BREAKFAST", search: "tosty", maxTime: 30 },
          { day: 0, mealType: "LUNCH", search: "makaron", maxTime: 30 },
          { day: 0, mealType: "DINNER", search: "jajecznica", maxTime: 30 },

          { day: 1, mealType: "BREAKFAST", search: "kanapka", maxTime: 30 },
          { day: 1, mealType: "LUNCH", search: "sałatka", maxTime: 30 },
          { day: 1, mealType: "DINNER", search: "omlet", maxTime: 30 },

          { day: 2, mealType: "BREAKFAST", search: "płatki", maxTime: 30 },
          { day: 2, mealType: "LUNCH", search: "zupa instant", maxTime: 30 },
          { day: 2, mealType: "DINNER", search: "naleśniki", maxTime: 30 },

          { day: 3, mealType: "BREAKFAST", search: "jogurt", maxTime: 30 },
          { day: 3, mealType: "LUNCH", search: "burger", maxTime: 30 },
          { day: 3, mealType: "DINNER", search: "quesadilla", maxTime: 30 },

          { day: 4, mealType: "BREAKFAST", search: "smoothie", maxTime: 30 },
          { day: 4, mealType: "LUNCH", search: "wrap", maxTime: 30 },
          { day: 4, mealType: "DINNER", search: "pizza", maxTime: 30 },

          { day: 5, mealType: "BREAKFAST", search: "jajka", maxTime: 30 },
          { day: 5, mealType: "LUNCH", search: "pasta", maxTime: 30 },
          { day: 5, mealType: "DINNER", search: "kurczak z patelni", maxTime: 30 },

          { day: 6, mealType: "BREAKFAST", search: "owsianka", maxTime: 30 },
          { day: 6, mealType: "LUNCH", search: "sałatka", maxTime: 30 },
          { day: 6, mealType: "DINNER", search: "smażony ryż", maxTime: 30 },
        ],
      },
    ];

    return NextResponse.json({ templates });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/meals/templates/apply
 *
 * Aplikuje template do planu posiłków
 *
 * Body: {
 *   templateId: string;
 *   weekStart: string (ISO date);
 *   overwrite: boolean;
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { templateId, weekStart, overwrite = false } = await req.json();

    if (!templateId || !weekStart) {
      return NextResponse.json(
        { error: "Template ID and week start date required" },
        { status: 400 }
      );
    }

    const weekStartDate = startOfWeek(new Date(weekStart), { locale: pl });

    // Pobierz template (w przyszłości z bazy, teraz hardcoded)
    const templateRes = await GET();
    const { templates } = await templateRes.json();
    const template = templates.find((t: { id: string }) => t.id === templateId);

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    // Pobierz przepisy użytkownika do smart matching
    const recipes = await prisma.recipe.findMany({
      where: { householdId: session.user.householdId },
      select: {
        id: true,
        name: true,
        category: true,
        tags: true,
        prepTime: true,
        cookTime: true,
        totalTime: true,
      },
    });

    // Funkcja do znajdowania najlepszego dopasowania przepisu
    const findBestRecipe = (search: string, maxTime?: number) => {
      const searchLower = search.toLowerCase();

      let candidates = recipes.filter(recipe => {
        const matchesSearch =
          recipe.name.toLowerCase().includes(searchLower) ||
          recipe.category?.toLowerCase().includes(searchLower) ||
          recipe.tags.some(tag => tag.toLowerCase().includes(searchLower));

        if (!matchesSearch) return false;

        if (maxTime) {
          const totalTime = (recipe.totalTime || (recipe.prepTime || 0) + (recipe.cookTime || 0));
          return totalTime <= maxTime;
        }

        return true;
      });

      // Jeśli nie znaleziono, zwróć losowy przepis
      if (candidates.length === 0) {
        candidates = recipes;
      }

      // Zwróć losowy z dopasowanych
      return candidates[Math.floor(Math.random() * candidates.length)];
    };

    // Jeśli overwrite, usuń istniejące posiłki
    if (overwrite) {
      const weekEnd = addDays(weekStartDate, 7);
      await prisma.meal.deleteMany({
        where: {
          householdId: session.user.householdId,
          date: {
            gte: weekStartDate,
            lt: weekEnd,
          },
        },
      });
    }

    // Utwórz posiłki z template
    const mealsToCreate = template.mealPattern.map((pattern: {
      day: number;
      mealType: string;
      search: string;
      maxTime?: number;
    }) => {
      const recipe = findBestRecipe(pattern.search, pattern.maxTime);
      const mealDate = addDays(weekStartDate, pattern.day);

      return {
        date: mealDate,
        mealType: pattern.mealType,
        recipeId: recipe?.id,
        customName: recipe ? null : pattern.search,
        householdId: session.user.householdId!,
      };
    });

    await prisma.meal.createMany({
      data: mealsToCreate,
      skipDuplicates: true,
    });

    // Pobierz nowo utworzone posiłki z relacjami
    const weekEnd = addDays(weekStartDate, 7);
    const createdMeals = await prisma.meal.findMany({
      where: {
        householdId: session.user.householdId,
        date: {
          gte: weekStartDate,
          lt: weekEnd,
        },
      },
      include: {
        recipe: {
          select: {
            id: true,
            name: true,
            prepTime: true,
            cookTime: true,
            image: true,
          },
        },
        simpleDish: {
          select: {
            id: true,
            name: true,
            description: true,
            icon: true,
            calories: true,
            protein: true,
            carbs: true,
            fat: true,
            fiber: true,
          },
        },
      },
      orderBy: {
        date: "asc",
      },
    });

    // Revalidate calendar and meals pages
    revalidatePath('/calendar');
    revalidatePath('/meals');

    return NextResponse.json({
      message: `Szablon "${template.name}" został zastosowany`,
      mealsCreated: createdMeals.length,
      meals: createdMeals,
    });
  } catch (error) {
    console.error("Error applying template:", error);
    return handleApiError(error);
  }
}

