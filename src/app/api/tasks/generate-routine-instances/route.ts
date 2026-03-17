import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateRoutineInstances } from "@/lib/recurrence";

/**
 * POST - Generuj instancje dla wszystkich rutyn w gospodarstwie
 * Przydatne do naprawy starych rutyn bez instancji
 */
export async function POST() {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Znajdź wszystkie rutyny (zadania cykliczne bez parentTaskId - są to "główne" rutyny)
    const routines = await prisma.task.findMany({
      where: {
        householdId: session.user.householdId,
        isRecurring: true,
        recurrenceType: { not: null },
        parentTaskId: null, // tylko główne rutyny, nie instancje
      },
      select: {
        id: true,
        title: true,
        description: true,
        priority: true,
        dueDate: true,
        dueTime: true,
        isRecurring: true,
        recurrenceType: true,
        recurrenceInterval: true,
        recurrenceEndDate: true,
        recurrenceDays: true,
        reminderMinutes: true,
        householdId: true,
        categoryId: true,
        assigneeId: true,
        creatorId: true,
        parentTaskId: true,
      },
    });

    const results = [];

    for (const routine of routines) {
      try {
        const instances = await generateRoutineInstances(routine as any);
        results.push({
          routineId: routine.id,
          routineTitle: routine.title,
          instancesCreated: instances.length,
          success: true,
        });
      } catch (error) {
        console.error(`Error generating instances for routine ${routine.id}:`, error);
        results.push({
          routineId: routine.id,
          routineTitle: routine.title,
          instancesCreated: 0,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const totalInstances = results.reduce((sum, r) => sum + r.instancesCreated, 0);

    return NextResponse.json({
      message: `Processed ${routines.length} routines, created ${totalInstances} instances`,
      results,
    });
  } catch (error) {
    console.error("Error generating routine instances:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

