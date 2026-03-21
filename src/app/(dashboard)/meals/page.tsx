import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { MealsClient } from "./MealsClient";

export default async function MealsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (!session.user.householdId) {
    redirect("/");
  }

  const [meals, recipes] = await Promise.all([
    prisma.meal.findMany({
      where: {
        householdId: session.user.householdId,
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
    }),
    prisma.recipe.findMany({
      where: {
        householdId: session.user.householdId,
      },
      select: {
        id: true,
        name: true,
        category: true,
        prepTime: true,
        cookTime: true,
        image: true,
      },
      orderBy: {
        name: "asc",
      },
    }),
  ]);

  return (
    <MealsClient
        initialMeals={meals}
      recipes={recipes}
    />
  );
}

