import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getHouseholdAuditLogs } from "@/lib/audit";
import { AuditAction } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!session.user.householdId) {
      return NextResponse.json({ error: "No household" }, { status: 400 });
    }

    // Pobierz parametry zapytania
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const userId = searchParams.get("userId") || undefined;
    const action = searchParams.get("action") as AuditAction | undefined;
    const entityType = searchParams.get("entityType") || undefined;
    const startDate = searchParams.get("startDate")
      ? new Date(searchParams.get("startDate")!)
      : undefined;
    const endDate = searchParams.get("endDate")
      ? new Date(searchParams.get("endDate")!)
      : undefined;

    const { logs, total } = await getHouseholdAuditLogs(
      session.user.householdId,
      {
        limit,
        offset,
        userId,
        action,
        entityType,
        startDate,
        endDate,
      }
    );

    return NextResponse.json({
      logs,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

