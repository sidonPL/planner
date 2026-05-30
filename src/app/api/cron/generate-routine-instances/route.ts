import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateRoutineInstances } from "@/lib/recurrence";
import { verifyCronAuth } from "@/lib/web-push";


type RoutineTaskInput = Parameters<typeof generateRoutineInstances>[0];

/**
 * GET - Codzienny cron do generowania instancji rutyn
 * Sprawdza wszystkie rutyny i generuje brakujące instancje na miesiąc do przodu
 *
 * Ustaw w vercel.json lub cron-job.org:
 * Uruchamiaj codziennie o 00:00
 */
export async function GET(req: Request) {
  try {
    // Weryfikacja autoryzacji crona
    if (!verifyCronAuth(req.headers.get("authorization"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[Daily Routine Generator] Starting daily routine instance generation...");

    // Znajdź wszystkie aktywne rutyny
    const routines = await prisma.task.findMany({
      where: {
        isRecurring: true,
        recurrenceType: { not: null },
        parentTaskId: null, // tylko główne rutyny
        OR: [
          { recurrenceEndDate: null }, // bez daty końcowej
          { recurrenceEndDate: { gte: new Date() } }, // lub data końcowa w przyszłości
        ],
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

    console.log(`[Daily Routine Generator] Found ${routines.length} active routines`);

    const results = [];
    let totalInstances = 0;

    for (const routine of routines) {
      try {
        const instances = await generateRoutineInstances(routine as RoutineTaskInput);

        if (instances.length > 0) {
          console.log(`[Daily Routine Generator] Created ${instances.length} instances for "${routine.title}"`);
          totalInstances += instances.length;
        }

        results.push({
          routineId: routine.id,
          routineTitle: routine.title,
          instancesCreated: instances.length,
          success: true,
        });
      } catch (error) {
        console.error(`[Daily Routine Generator] Error for routine ${routine.id}:`, error);
        results.push({
          routineId: routine.id,
          routineTitle: routine.title,
          instancesCreated: 0,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;

    console.log(`[Daily Routine Generator] Completed: ${successCount} success, ${errorCount} errors, ${totalInstances} instances created`);

    return NextResponse.json({
      success: true,
      message: `Processed ${routines.length} routines, created ${totalInstances} instances`,
      stats: {
        routinesProcessed: routines.length,
        successCount,
        errorCount,
        totalInstancesCreated: totalInstances,
      },
      results,
    });
  } catch (error) {
    console.error("[Daily Routine Generator] Fatal error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Opcjonalnie: ręczne wywołanie przez cron (wymaga autoryzacji)
export async function POST(request: Request) {
  if (!verifyCronAuth(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return GET(request);
}

