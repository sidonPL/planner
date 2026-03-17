import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const documentUpdateSchema = z.object({
  name: z.string().min(1).optional(),
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
  ]).optional(),
  url: z.string().url().optional(),
  fileUrl: z.string().optional(),
  notes: z.string().optional(),
  validFrom: z.string().optional(),
  validUntil: z.string().optional(),
});

// PATCH - aktualizuj dokument
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, documentId } = await params;
    const body = await req.json();
    const validatedData = documentUpdateSchema.parse(body);

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

    // Sprawdź czy dokument należy do tego wyjazdu
    const existingDocument = await prisma.tripDocument.findFirst({
      where: {
        id: documentId,
        tripId: id,
      },
    });

    if (!existingDocument) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const document = await prisma.tripDocument.update({
      where: { id: documentId },
      data: {
        ...validatedData,
        validFrom: validatedData.validFrom ? new Date(validatedData.validFrom) : undefined,
        validUntil: validatedData.validUntil ? new Date(validatedData.validUntil) : undefined,
      },
    });

    return NextResponse.json(document);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: error.issues }, { status: 400 });
    }
    console.error("Error updating trip document:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - usuń dokument
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, documentId } = await params;

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

    // Sprawdź czy dokument należy do tego wyjazdu
    const existingDocument = await prisma.tripDocument.findFirst({
      where: {
        id: documentId,
        tripId: id,
      },
    });

    if (!existingDocument) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    await prisma.tripDocument.delete({
      where: { id: documentId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting trip document:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

