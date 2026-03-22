import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { subDays } from "date-fns";

const DEFAULT_RETENTION_DAYS = 90;
const MAX_BATCH_SIZE = 1000;

function parsePositiveInt(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

function parseBoolean(value: string | null, fallback: boolean): boolean {
  if (value === null) return fallback;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

// GET - usuwa stare ukończone zadania (nierutynowe)
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const retentionDays = parsePositiveInt(
      process.env.TASK_CLEANUP_RETENTION_DAYS ?? null,
      DEFAULT_RETENTION_DAYS
    );
    const batchSize = parsePositiveInt(
      process.env.TASK_CLEANUP_BATCH_SIZE ?? null,
      MAX_BATCH_SIZE
    );
    const dryRun = request.nextUrl.searchParams.get("dryRun") === "true";
    const protectCompletions = parseBoolean(
      request.nextUrl.searchParams.get("protectCompletions"),
      parseBoolean(process.env.TASK_CLEANUP_PROTECT_COMPLETIONS ?? null, false)
    );

    const cutoffDate = subDays(new Date(), retentionDays);

    const tasksToDelete = await prisma.task.findMany({
      where: {
        isRecurring: false,
        status: "COMPLETED",
        OR: [
          {
            completions: {
              some: {
                completedAt: {
                  lte: cutoffDate,
                },
              },
            },
          },
          {
            completions: {
              none: {},
            },
            updatedAt: {
              lte: cutoffDate,
            },
          },
        ],
      },
      select: {
        id: true,
        completions: {
          select: { id: true },
          take: 1,
        },
      },
      take: Math.min(batchSize, MAX_BATCH_SIZE),
    });

    if (tasksToDelete.length === 0) {
      return NextResponse.json({
        success: true,
        dryRun,
        message: "Brak zadań do czyszczenia",
        retentionDays,
        cutoffDate,
        matched: 0,
        protectedByGamification: 0,
        deleted: 0,
      });
    }

    // Po wdrożeniu trwałego licznika osiągnięć można usuwać także completiony.
    const safeToDeleteIds = protectCompletions
      ? tasksToDelete.filter((task) => task.completions.length === 0).map((task) => task.id)
      : tasksToDelete.map((task) => task.id);
    const protectedByGamification = protectCompletions
      ? tasksToDelete.length - safeToDeleteIds.length
      : 0;

    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun,
        message: `Dry run: znaleziono ${safeToDeleteIds.length} zadań do usunięcia`,
        retentionDays,
        cutoffDate,
        matched: tasksToDelete.length,
        protectCompletions,
        protectedByGamification,
        deleted: 0,
      });
    }

    if (safeToDeleteIds.length === 0) {
      return NextResponse.json({
        success: true,
        dryRun,
        message: "Pominięto cleanup: wszystkie kandydaty są chronione przez gamifikację",
        retentionDays,
        cutoffDate,
        matched: tasksToDelete.length,
        protectCompletions,
        protectedByGamification,
        deleted: 0,
      });
    }

    const deleted = await prisma.task.deleteMany({
      where: {
        id: {
          in: safeToDeleteIds,
        },
      },
    });

    return NextResponse.json({
      success: true,
      dryRun,
      message: `Usunięto ${deleted.count} starych ukończonych zadań`,
      retentionDays,
      cutoffDate,
      matched: tasksToDelete.length,
      protectCompletions,
      protectedByGamification,
      deleted: deleted.count,
    });
  } catch (error) {
    console.error("Error during task cleanup:", error);
    return NextResponse.json(
      { error: "Nie udało się wykonać cleanupu zadań" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}



