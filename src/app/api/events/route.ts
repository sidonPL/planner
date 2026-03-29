import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const eventSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  startDate: z.string(),
  endDate: z.string().optional(),
  allDay: z.boolean(),
  color: z.string().optional(),
  type: z.enum(["GENERAL", "TASK", "MEAL", "TRIP", "WORK", "SCHOOL", "REMINDER"]),
  location: z.string().optional(),
  reminderMinutes: z.array(z.number().int().nonnegative()).optional(),
});

// GET - pobierz wydarzenia
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const events = await prisma.event.findMany({
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
      },
      orderBy: {
        startDate: "asc",
      },
    });

    return NextResponse.json(events);
  } catch (error) {
    console.error("Error fetching events:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - utwórz wydarzenie
export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = eventSchema.parse(body);

    const event = await prisma.event.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        startDate: new Date(validatedData.startDate),
        endDate: validatedData.endDate ? new Date(validatedData.endDate) : null,
        allDay: validatedData.allDay,
        color: validatedData.color,
        type: validatedData.type,
        location: validatedData.location,
        reminderMinutes: validatedData.reminderMinutes ?? [],
        householdId: session.user.householdId,
        userId: session.user.id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    });

    // Revalidate calendar page
    revalidatePath('/calendar');

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: error.issues }, { status: 400 });
    }
    console.error("Error creating event:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

