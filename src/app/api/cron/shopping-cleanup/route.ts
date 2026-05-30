import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { subHours } from "date-fns";
import { verifyCronAuth } from "@/lib/web-push";

const DEFAULT_RETENTION_HOURS = 48;
const MAX_BATCH_SIZE = 500;

function parsePositiveInt(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const retentionHours = parsePositiveInt(
      process.env.SHOPPING_PURCHASED_RETENTION_HOURS ?? null,
      DEFAULT_RETENTION_HOURS
    );
    const batchSize = parsePositiveInt(
      process.env.SHOPPING_CLEANUP_BATCH_SIZE ?? null,
      MAX_BATCH_SIZE
    );
    const dryRun = request.nextUrl.searchParams.get("dryRun") === "true";
    const cutoffDate = subHours(new Date(), retentionHours);

    const itemsToDelete = await prisma.shoppingItem.findMany({
      where: {
        isPurchased: true,
        updatedAt: {
          lte: cutoffDate,
        },
      },
      select: {
        id: true,
        householdId: true,
        name: true,
        updatedAt: true,
      },
      take: Math.min(batchSize, MAX_BATCH_SIZE),
      orderBy: { updatedAt: "asc" },
    });

    if (itemsToDelete.length === 0) {
      return NextResponse.json({
        success: true,
        dryRun,
        message: "Brak kupionych produktów do usunięcia",
        retentionHours,
        cutoffDate,
        matched: 0,
        deleted: 0,
      });
    }

    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun,
        message: `Dry run: znaleziono ${itemsToDelete.length} kupionych produktów do usunięcia`,
        retentionHours,
        cutoffDate,
        matched: itemsToDelete.length,
        deleted: 0,
        sample: itemsToDelete.slice(0, 10),
      });
    }

    const deleted = await prisma.shoppingItem.deleteMany({
      where: {
        id: {
          in: itemsToDelete.map((item) => item.id),
        },
      },
    });

    return NextResponse.json({
      success: true,
      dryRun,
      message: `Usunięto ${deleted.count} kupionych produktów z listy zakupów`,
      retentionHours,
      cutoffDate,
      matched: itemsToDelete.length,
      deleted: deleted.count,
    });
  } catch (error) {
    console.error("Error during shopping cleanup:", error);
    return NextResponse.json(
      { error: "Nie udało się wyczyścić listy zakupów" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
