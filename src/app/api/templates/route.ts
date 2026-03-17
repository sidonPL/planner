import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET - Pobierz wszystkie szablony gospodarstwa
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const templates = await prisma.taskTemplate.findMany({
      where: {
        householdId: session.user.householdId,
      },
      include: {
        taskTemplates: {
          orderBy: {
            position: "asc",
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
            avatar: true,
            color: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error("Error fetching templates:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Utwórz nowy szablon
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, icon, taskTemplates } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (!taskTemplates || !Array.isArray(taskTemplates) || taskTemplates.length === 0) {
      return NextResponse.json({ error: "At least one task template is required" }, { status: 400 });
    }

    // Utwórz szablon z zadaniami
    const template = await prisma.taskTemplate.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        icon: icon || null,
        householdId: session.user.householdId,
        createdBy: session.user.id,
        taskTemplates: {
          create: taskTemplates.map((task: any, index: number) => ({
            title: task.title.trim(),
            description: task.description?.trim() || null,
            priority: task.priority || "MEDIUM",
            estimatedMinutes: task.estimatedMinutes || null,
            categoryId: task.categoryId || null,
            position: index,
          })),
        },
      },
      include: {
        taskTemplates: {
          orderBy: {
            position: "asc",
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
            avatar: true,
            color: true,
          },
        },
      },
    });

    return NextResponse.json(template);
  } catch (error) {
    console.error("Error creating template:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

