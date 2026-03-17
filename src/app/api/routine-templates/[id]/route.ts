import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

// GET - pobierz szczegóły szablonu
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const template = await prisma.routineTemplate.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    // Sprawdź dostęp
    if (!template.isPublic &&
        template.householdId !== session.user.householdId &&
        template.createdBy !== session.user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json(template);
  } catch (error) {
    console.error("Error fetching routine template:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH - edytuj szablon rutyny
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name, description, icon, category, tasks } = body;

    // Sprawdź czy szablon istnieje i czy użytkownik ma prawo go edytować
    const existingTemplate = await prisma.routineTemplate.findUnique({
      where: { id },
    });

    if (!existingTemplate) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    // Tylko twórca lub członek gospodarstwa może edytować niepubliczne szablony
    if (existingTemplate.isPublic) {
      return NextResponse.json({
        error: "Cannot edit public templates"
      }, { status: 403 });
    }

    if (existingTemplate.createdBy !== session.user.id &&
        existingTemplate.householdId !== session.user.householdId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const updatedTemplate = await prisma.routineTemplate.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(icon && { icon }),
        ...(category && { category }),
        ...(tasks && { tasks }),
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Log audit
    await logAudit({
      userId: session.user.id,
      householdId: session.user.householdId,
      action: "UPDATE",
      entityType: "RoutineTemplate",
      entityId: id,
      entityName: updatedTemplate.name,
    });

    return NextResponse.json(updatedTemplate);
  } catch (error) {
    console.error("Error updating routine template:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - usuń szablon rutyny
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Sprawdź czy szablon istnieje i czy użytkownik ma prawo go usunąć
    const existingTemplate = await prisma.routineTemplate.findUnique({
      where: { id },
    });

    if (!existingTemplate) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    // Nie można usuwać publicznych szablonów
    if (existingTemplate.isPublic) {
      return NextResponse.json({
        error: "Cannot delete public templates"
      }, { status: 403 });
    }

    // Tylko twórca może usunąć szablon
    if (existingTemplate.createdBy !== session.user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    await prisma.routineTemplate.delete({
      where: { id },
    });

    // Log audit
    await logAudit({
      userId: session.user.id,
      householdId: session.user.householdId,
      action: "DELETE",
      entityType: "RoutineTemplate",
      entityId: id,
      entityName: existingTemplate.name,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting routine template:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

