import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const documentSchema = z.object({
  name: z.string().min(1),
  type: z.enum([
    "FLIGHT",
    "TRAIN",
    "BUS",
    "CAR_RENTAL",
    "HOTEL",
    "INSURANCE",
    "TICKET",
    "PASSPORT",
    "VISA",
    "OTHER",
  ]),
  url: z.string().url().optional(),
  fileUrl: z.string().optional(),
  notes: z.string().optional(),
  validFrom: z.string().optional(),
  validUntil: z.string().optional(),
});

// GET - pobierz dokumenty wyjazdu
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Sprawdź czy wyjazd należy do gospodarstwa domowego użytkownika
    const trip = await prisma.trip.findFirst({
      where: {
        id,
        householdId: session.user.householdId,
      },
    });

    if (!trip) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const documents = await prisma.tripDocument.findMany({
      where: {
        tripId: id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(documents);
  } catch (error) {
    console.error("Error fetching trip documents:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - dodaj dokument do wyjazdu
export async function POST(
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
    const validatedData = documentSchema.parse(body);

    // Sprawdź czy wyjazd należy do gospodarstwa domowego użytkownika
    const trip = await prisma.trip.findFirst({
      where: {
        id,
        householdId: session.user.householdId,
      },
    });

    if (!trip) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const document = await prisma.tripDocument.create({
      data: {
        tripId: id,
        name: validatedData.name,
        type: validatedData.type,
        url: validatedData.url,
        fileUrl: validatedData.fileUrl,
        notes: validatedData.notes,
        validFrom: validatedData.validFrom ? new Date(validatedData.validFrom) : null,
        validUntil: validatedData.validUntil ? new Date(validatedData.validUntil) : null,
      },
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: error.issues }, { status: 400 });
    }
    console.error("Error creating trip document:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

