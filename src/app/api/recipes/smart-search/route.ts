import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/api-error-handler";

export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";

    if (query.length < 2) {
      return NextResponse.json({ recipes: [], suggestions: [] });
    }

    // Search recipes
    const recipes = await prisma.recipe.findMany({
      where: {
        householdId: session.user.householdId,
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
          { tags: { hasSome: [query] } },
          { cuisine: { contains: query, mode: "insensitive" } },
          { category: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        image: true,
        category: true,
        difficulty: true,
        prepTime: true,
        cookTime: true,
        totalTime: true,
        servings: true,
        tags: true,
        cuisine: true,
        isVegetarian: true,
        isVegan: true,
      },
      take: 10,
      orderBy: [
        { favorites: { _count: "desc" } }, // Most favorited first
        { createdAt: "desc" },
      ],
    });

    // Generate suggestions based on other recipes
    const allRecipes = await prisma.recipe.findMany({
      where: { householdId: session.user.householdId },
      select: {
        name: true,
        tags: true,
        cuisine: true,
        category: true,
      },
    });

    // Extract unique tags, cuisines, categories
    const allTags = new Set<string>();
    const allCuisines = new Set<string>();
    const allCategories = new Set<string>();

    allRecipes.forEach((recipe) => {
      recipe.tags.forEach((tag) => allTags.add(tag.toLowerCase()));
      if (recipe.cuisine) allCuisines.add(recipe.cuisine.toLowerCase());
      if (recipe.category) allCategories.add(recipe.category.toLowerCase());
    });

    const queryLower = query.toLowerCase();

    // Find similar terms
    const suggestions = {
      tags: Array.from(allTags)
        .filter((tag) => tag.includes(queryLower) && tag !== queryLower)
        .slice(0, 5),
      cuisines: Array.from(allCuisines)
        .filter((cuisine) => cuisine.includes(queryLower) && cuisine !== queryLower)
        .slice(0, 3),
      categories: Array.from(allCategories)
        .filter((cat) => cat.includes(queryLower) && cat !== queryLower)
        .slice(0, 3),
    };

    // Search by ingredients
    const ingredientMatches = await prisma.recipe.findMany({
      where: {
        householdId: session.user.householdId,
        ingredients: {
          some: {
            name: { contains: query, mode: "insensitive" },
          },
        },
      },
      select: {
        id: true,
        name: true,
        image: true,
        ingredients: {
          where: {
            name: { contains: query, mode: "insensitive" },
          },
          select: {
            name: true,
          },
        },
      },
      take: 5,
    });

    // NEW: Cookable Now - recipes you can make with current inventory
    const inventory = await prisma.inventoryItem.findMany({
      where: { householdId: session.user.householdId },
      select: {
        name: true,
        quantity: true,
        unit: true,
      },
    });

    const inventoryNames = new Set(inventory.map(item => item.name.toLowerCase()));

    // Find recipes where ALL non-optional ingredients are in inventory
    const cookableRecipes = await prisma.recipe.findMany({
      where: {
        householdId: session.user.householdId,
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
        ],
      },
      include: {
        ingredients: true,
      },
      take: 20, // Check more to find cookable ones
    });

    const cookableNow = cookableRecipes.filter(recipe => {
      const requiredIngredients = recipe.ingredients.filter(ing => !ing.optional);
      if (requiredIngredients.length === 0) return false;

      const availableCount = requiredIngredients.filter(ing =>
        inventoryNames.has(ing.name.toLowerCase())
      ).length;

      return availableCount === requiredIngredients.length;
    }).slice(0, 3).map(r => ({
      id: r.id,
      name: r.name,
      image: r.image,
      category: r.category,
      difficulty: r.difficulty,
      totalTime: r.totalTime,
      servings: r.servings,
    }));

    return NextResponse.json({
      recipes,
      suggestions,
      ingredientMatches: ingredientMatches.map((r) => ({
        id: r.id,
        name: r.name,
        image: r.image,
        matchedIngredients: r.ingredients.map((i) => i.name),
      })),
      cookableNow, // NEW: Recipes you can cook right now!
    });
  } catch (error) {
    return handleApiError(error);
  }
}

