import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const scheduleSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["WORK", "SCHOOL", "UNIVERSITY", "COURSE", "OTHER"]),
  userId: z.string(),
  dayOfWeek: z.array(z.number().min(0).max(6)),
  startTime: z.string(),
  endTime: z.string(),
  location: z.string().nullable().optional(),
});

// GET - pobierz harmonogramy
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const schedules = await prisma.schedule.findMany({
      where: {
        householdId: session.user.householdId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        exceptions: {
          orderBy: { date: "asc" },
        },
      },
      orderBy: {
        startTime: "asc",
      },
    });

    return NextResponse.json(schedules);
  } catch (error) {
    console.error("Error fetching schedules:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - dodaj harmonogram
export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = scheduleSchema.parse(body);

    // Sprawdź czy użytkownik należy do tego gospodarstwa
    const targetUser = await prisma.user.findFirst({
      where: {
        id: validatedData.userId,
        householdId: session.user.householdId,
      },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const schedule = await prisma.schedule.create({
      data: {
        name: validatedData.name,
        type: validatedData.type,
        userId: validatedData.userId,
        dayOfWeek: validatedData.dayOfWeek,
        startTime: validatedData.startTime,
        endTime: validatedData.endTime,
        location: validatedData.location,
        isOneTime: body.isOneTime || false,
        oneTimeDate: body.oneTimeDate ? new Date(body.oneTimeDate) : null,
        householdId: session.user.householdId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        exceptions: true,
      },
    });

    return NextResponse.json(schedule, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: error.issues }, { status: 400 });
    }
    console.error("Error creating schedule:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

