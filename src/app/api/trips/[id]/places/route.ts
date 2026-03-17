import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.householdId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const places = await prisma.tripPlace.findMany({
      where: {
        tripId: id,
        trip: {
          householdId: session.user.householdId,
        },
      },
      orderBy: [
        { isVisited: "asc" },
        { visitOrder: "asc" },
        { createdAt: "asc" },
      ],
    });

    return NextResponse.json(places);
  } catch (error) {
    console.error("Błąd podczas pobierania miejsc:", error);
    return NextResponse.json(
      { error: "Nie udało się pobrać miejsc" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.householdId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Sprawdź czy trip należy do gospodarstwa
    const trip = await prisma.trip.findFirst({
      where: {
        id,
        householdId: session.user.householdId,
      },
    });

    if (!trip) {
      return NextResponse.json({ error: "Wyjazd nie znaleziony" }, { status: 404 });
    }

    const body = await request.json();
    const { 
      name, 
      description, 
      category, 
      address, 
      latitude, 
      longitude,
      visitDate,
      websiteUrl,
      phoneNumber,
      openingHours,
      estimatedDuration,
      estimatedCost,
    } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Nazwa miejsca jest wymagana" },
        { status: 400 }
      );
    }

    // Pobierz maksymalny visitOrder
    const maxOrder = await prisma.tripPlace.aggregate({
      where: { tripId: id },
      _max: { visitOrder: true },
    });

    const place = await prisma.tripPlace.create({
      data: {
        tripId: id,
        name: name.trim(),
        description: description || null,
        category: category || "ATTRACTION",
        address: address || null,
        latitude: latitude || null,
        longitude: longitude || null,
        visitDate: visitDate ? new Date(visitDate) : null,
        visitOrder: (maxOrder._max.visitOrder || 0) + 1,
        websiteUrl: websiteUrl || null,
        phoneNumber: phoneNumber || null,
        openingHours: openingHours || null,
        estimatedDuration: estimatedDuration || null,
        estimatedCost: estimatedCost || null,
      },
    });

    return NextResponse.json(place, { status: 201 });
  } catch (error) {
    console.error("Błąd podczas tworzenia miejsca:", error);
    return NextResponse.json(
      { error: "Nie udało się utworzyć miejsca" },
      { status: 500 }
    );
  }
}

