import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateDailyQuests } from "@/lib/cron/generate-daily-quests";

/**
 * Manual trigger for daily quest generation (Admin only)
 * POST /api/admin/quests/generate
 */
export async function POST(): Promise<NextResponse> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
    }

    // Generate quests
    await generateDailyQuests();

    return NextResponse.json({
      success: true,
      message: "Daily quests generated successfully",
    });
  } catch (error) {
    console.error("Error generating quests:", error);
    return NextResponse.json(
      { error: "Failed to generate quests" },
      { status: 500 }
    );
  }
}

