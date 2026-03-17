import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET - Historia wejść/wyjść
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || session.user.id;
    const zoneId = searchParams.get("zoneId");
    const limit = parseInt(searchParams.get("limit") || "100");
    const days = parseInt(searchParams.get("days") || "7");

    const since = new Date();
    since.setDate(since.getDate() - days);

    const events = await prisma.geofenceEvent.findMany({
      where: {
        userId,
        ...(zoneId && { zoneId }),
        timestamp: { gte: since },
        zone: {
          householdId: session.user.householdId,
        },
      },
      include: {
        zone: {
          select: {
            id: true,
            name: true,
            type: true,
            color: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
      orderBy: { timestamp: "desc" },
      take: limit,
    });

    return NextResponse.json(events);
  } catch (error) {
    console.error("Error fetching history:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

