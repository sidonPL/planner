import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { RecipesClient } from "./RecipesClient";

export default async function RecipesPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (!session.user.householdId) {
    redirect("/");
  }

  const [recipes, inventoryItems] = await Promise.all([
    prisma.recipe.findMany({
      where: {
        householdId: session.user.householdId,
      },
      include: {
        ingredients: {
          include: {
            stepIngredients: true,
          },
        },
        steps: {
          include: {
            stepIngredients: {
              include: {
                ingredient: true,
              },
            },
          },
          orderBy: { order: "asc" },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
        favorites: {
          where: {
            userId: session.user.id,
          },
        },
        ratings: {
          select: {
            rating: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
    prisma.inventoryItem.findMany({
      where: {
        householdId: session.user.householdId,
      },
      select: {
        name: true,
        quantity: true,
        unit: true,
      },
    }),
  ]);

  // Calculate average rating for each recipe
  const recipesWithRatings = recipes.map((recipe) => {
    const ratings = recipe.ratings || [];
    const avgRating = ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
      : 0;

    return {
      ...recipe,
      avgRating,
    };
  });

  return (
    <RecipesClient
      recipes={recipesWithRatings}
      currentUserId={session.user.id}
      inventoryItems={inventoryItems}
    />
  );
}

