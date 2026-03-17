import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET - pobierz wszystkie gotowe dania
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const simpleDishes = await prisma.simpleDish.findMany({
      where: {
        householdId: session.user.householdId,
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(simpleDishes);
  } catch (error) {
    console.error("Error fetching simple dishes:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - utwórz nowe gotowe danie
export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, category, description, icon } = body;

    if (!name || name.trim() === "") {
      return NextResponse.json({ error: "Nazwa jest wymagana" }, { status: 400 });
    }

    const simpleDish = await prisma.simpleDish.create({
      data: {
        name: name.trim(),
        category: category || "other",
        description: description || null,
        icon: icon || "🍽️",
        householdId: session.user.householdId,
      },
    });

    return NextResponse.json(simpleDish);
  } catch (error) {
    console.error("Error creating simple dish:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

