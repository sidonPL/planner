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
    const expenses = await prisma.tripExpense.findMany({
      where: {
        tripId: id,
        trip: {
          householdId: session.user.householdId,
        },
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json(expenses);
  } catch (error) {
    console.error("Błąd podczas pobierania wydatków:", error);
    return NextResponse.json(
      { error: "Nie udało się pobrać wydatków" },
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
    const { name, amount, category, paidById, date, notes, currency, splits } = body;

    if (!name?.trim() || !amount) {
      return NextResponse.json(
        { error: "Nazwa i kwota są wymagane" },
        { status: 400 }
      );
    }

    // Utwórz transakcję w głównym budżecie
    const transaction = await prisma.transaction.create({
      data: {
        amount: parseFloat(amount),
        type: "EXPENSE",
        category: category || "Wyjazdy",
        description: `${trip.name}: ${name.trim()}${notes ? ` - ${notes}` : ''}`,
        date: date ? new Date(date) : new Date(),
        householdId: session.user.householdId,
        userId: paidById || session.user.id,
      },
    });

    // Utwórz wydatek wyjazdu połączony z transakcją
    const expense = await prisma.tripExpense.create({
      data: {
        tripId: id,
        name: name.trim(),
        amount: parseFloat(amount),
        currency: currency || 'PLN',
        category: category || null,
        paidById: paidById || null,
        date: date ? new Date(date) : new Date(),
        notes: notes || null,
        transactionId: transaction.id,
        // Dodaj splits jeśli są
        TripExpenseSplit: splits && splits.length > 0 ? {
          create: splits.map((split: { userId: string; amount: number }) => ({
            id: `${id}_${split.userId}_${Date.now()}`,
            user_id: split.userId,
            amount: split.amount,
          })),
        } : undefined,
      },
      include: {
        TripExpenseSplit: true,
      },
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error("Błąd podczas tworzenia wydatku:", error);
    return NextResponse.json(
      { error: "Nie udało się utworzyć wydatku" },
      { status: 500 }
    );
  }
}

