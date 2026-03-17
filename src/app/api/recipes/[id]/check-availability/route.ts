import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { checkRecipeAvailability } from "@/lib/recipe-availability";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id: recipeId } = await params;

    if (!session?.user || !session.user.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const servingsParam = searchParams.get("servings");
    const servings = servingsParam ? parseInt(servingsParam) : undefined;

    // Sprawdź dostępność składników
    const availability = await checkRecipeAvailability(
      recipeId,
      session.user.householdId,
      servings
    );

    return NextResponse.json(availability);
  } catch (error) {
    console.error("Error checking recipe availability:", error);

    if (error instanceof Error && error.message === "Recipe not found") {
      return NextResponse.json(
        { error: "Recipe not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

