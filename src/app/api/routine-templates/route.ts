import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET - pobierz wszystkie szablony rutyn
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Pobierz publiczne szablony oraz szablony utworzone przez użytkownika/gospodarstwo
    const templates = await prisma.routineTemplate.findMany({
      where: {
        OR: [
          { isPublic: true },
          { householdId: session.user.householdId },
          { createdBy: session.user.id },
        ],
      },
      orderBy: [
        { category: 'asc' },
        { name: 'asc' },
      ],
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error("Error fetching routine templates:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - utwórz własny szablon rutyny
export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, icon, category, tasks } = body;

    if (!name || !category || !tasks || !Array.isArray(tasks)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const template = await prisma.routineTemplate.create({
      data: {
        name,
        description,
        icon: icon || '📋',
        category,
        tasks,
        isPublic: false, // Własne szablony są prywatne
        householdId: session.user.householdId,
        createdBy: session.user.id,
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error("Error creating routine template:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

