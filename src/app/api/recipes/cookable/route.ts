import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { findCookableRecipes, getTodaysSuggestions } from "@/lib/cookable-recipes";

export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user || !session.user.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    // Parametry
    const mode = searchParams.get("mode") || "all"; // "all" | "today"
    const minAvailability = searchParams.get("minAvailability")
      ? parseInt(searchParams.get("minAvailability")!)
      : 50;
    const maxResults = searchParams.get("maxResults")
      ? parseInt(searchParams.get("maxResults")!)
      : 50;
    const includePartial = searchParams.get("includePartial") !== "false";
    const categories = searchParams.get("categories")
      ? searchParams.get("categories")!.split(",")
      : undefined;
    const maxPrepTime = searchParams.get("maxPrepTime")
      ? parseInt(searchParams.get("maxPrepTime")!)
      : undefined;
    const difficulty = searchParams.get("difficulty")
      ? searchParams.get("difficulty")!.split(",")
      : undefined;

    // Tryb "today" - sugestie na dziś
    if (mode === "today") {
      const mealType = searchParams.get("mealType") as 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK' | null;
      const suggestions = await getTodaysSuggestions(
        session.user.householdId,
        mealType || undefined
      );

      return NextResponse.json({
        mode: "today",
        suggestions,
        count: suggestions.length,
      });
    }

    // Tryb "all" - wszystkie możliwe przepisy
    const result = await findCookableRecipes(session.user.householdId, {
      minAvailability,
      maxResults,
      includePartial,
      categories,
      maxPrepTime,
      difficulty,
    });

    return NextResponse.json({
      mode: "all",
      ...result,
      filters: {
        minAvailability,
        maxResults,
        includePartial,
        categories,
        maxPrepTime,
        difficulty,
      },
    });
  } catch (error) {
    console.error("Error finding cookable recipes:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

