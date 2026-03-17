import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { RecipeDetailClient } from "./RecipeDetailClient";

interface RecipeDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function RecipeDetailPage({ params }: RecipeDetailPageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (!session.user.householdId) {
    redirect("/");
  }

  const { id } = await params;

  const recipe = await prisma.recipe.findFirst({
    where: {
      id,
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
          avatar: true,
          color: true,
        },
      },
      favorites: {
        where: { userId: session.user.id },
      },
    },
  });

  if (!recipe) {
    notFound();
  }

  // Pobierz członków gospodarstwa z alergenami
  const householdMembers = await prisma.user.findMany({
    where: {
      householdId: session.user.householdId,
    },
    select: {
      id: true,
      name: true,
      allergens: true,
    },
  });

  // Agreguj alergeny z przepisu (ze składników które są w inwentarzu)
  const allergens: string[] = [];
  for (const ingredient of recipe.ingredients) {
    const inventoryItem = await prisma.inventoryItem.findFirst({
      where: {
        householdId: session.user.householdId,
        name: {
          contains: ingredient.name,
          mode: "insensitive",
        },
      },
      include: {
        scannedProduct: {
          select: {
            allergens: true,
          },
        },
      },
    });

    if (inventoryItem?.scannedProduct?.allergens) {
      allergens.push(...inventoryItem.scannedProduct.allergens);
    }
  }

  // Usuń duplikaty
  const uniqueAllergens = Array.from(new Set(allergens));

  return (
    <RecipeDetailClient
      recipe={recipe}
      currentUserId={session.user.id}
      householdMembers={householdMembers}
      allergens={uniqueAllergens}
    />
  );
}

