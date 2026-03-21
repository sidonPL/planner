import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { autoSeedIngredients } from "@/lib/seed-ingredients";
import { findIngredientCaseInsensitiveMatch } from "@/lib/ingredient-dedup";

// GET - pobierz globalne składniki dla gospodarstwa
export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Auto-seed składników przy pierwszym użyciu
    await autoSeedIngredients(session.user.householdId);

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const limit = parseInt(searchParams.get("limit") || "50");

    const ingredients = await prisma.globalIngredient.findMany({
      where: {
        householdId: session.user.householdId,
        ...(search && {
          name: {
            contains: search,
            mode: "insensitive" as const,
          },
        }),
      },
      orderBy: [
        { usageCount: "desc" }, // Najpopularniejsze na górze
        { name: "asc" },
      ],
      take: limit,
    });

    return NextResponse.json(ingredients);
  } catch (error) {
    console.error("Error fetching global ingredients:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - stwórz nowy globalny składnik (lub zwiększ licznik użycia jeśli istnieje)
export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, category, commonUnit } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();

    // Sprawdź czy składnik już istnieje
    const existingCandidates = await prisma.globalIngredient.findMany({
      where: {
        householdId: session.user.householdId,
        name: {
          equals: trimmedName,
          mode: "insensitive",
        },
      },
      take: 10,
    });

    const existing = findIngredientCaseInsensitiveMatch(existingCandidates, trimmedName);

    if (existing) {
      // Zwiększ licznik użycia
      const updated = await prisma.globalIngredient.update({
        where: { id: existing.id },
        data: {
          usageCount: { increment: 1 },
          commonUnit: existing.commonUnit || commonUnit?.trim() || null,
        },
      });
      return NextResponse.json(updated);
    }

    // Stwórz nowy składnik
    const ingredient = await prisma.globalIngredient.create({
      data: {
        name: trimmedName,
        category: category?.trim() || null,
        commonUnit: commonUnit?.trim() || null,
        householdId: session.user.householdId,
        usageCount: 1,
      },
    });

    return NextResponse.json(ingredient, { status: 201 });
  } catch (error) {
    console.error("Error creating global ingredient:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

