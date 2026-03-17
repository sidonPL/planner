import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// PATCH - aktualizuj wydatek (i synchronizuj z transakcją)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; expenseId: string }> }
) {
  const session = await auth();

  if (!session?.user?.householdId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, expenseId } = await params;

  try {
    // Sprawdź czy wydatek istnieje i należy do gospodarstwa
    const existingExpense = await prisma.tripExpense.findFirst({
      where: {
        id: expenseId,
        tripId: id,
        trip: {
          householdId: session.user.householdId,
        },
      },
      include: {
        trip: true,
      },
    });

    if (!existingExpense) {
      return NextResponse.json({ error: "Wydatek nie znaleziony" }, { status: 404 });
    }

    const body = await request.json();
    const { name, amount, category, paidById, date, notes } = body;

    // Aktualizuj transakcję w głównym budżecie jeśli istnieje
    if (existingExpense.transactionId) {
      await prisma.transaction.update({
        where: { id: existingExpense.transactionId },
        data: {
          amount: amount ? parseFloat(amount) : undefined,
          category: category !== undefined ? (category || "Wyjazdy") : undefined,
          description: name || notes ? `${existingExpense.trip.name}: ${name || existingExpense.name}${notes ? ` - ${notes}` : ''}` : undefined,
          date: date ? new Date(date) : undefined,
          userId: paidById || undefined,
        },
      });
    }

    // Aktualizuj wydatek wyjazdu
    const expense = await prisma.tripExpense.update({
      where: { id: expenseId },
      data: {
        name: name?.trim(),
        amount: amount ? parseFloat(amount) : undefined,
        category: category !== undefined ? category : undefined,
        paidById: paidById !== undefined ? paidById : undefined,
        date: date ? new Date(date) : undefined,
        notes: notes !== undefined ? notes : undefined,
      },
    });

    return NextResponse.json(expense);
  } catch (error) {
    console.error("Błąd podczas aktualizacji wydatku:", error);
    return NextResponse.json(
      { error: "Nie udało się zaktualizować wydatku" },
      { status: 500 }
    );
  }
}

// DELETE - usuń wydatek (i powiązaną transakcję)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; expenseId: string }> }
) {
  const session = await auth();

  if (!session?.user?.householdId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, expenseId } = await params;

  try {
    // Sprawdź czy wydatek istnieje i należy do gospodarstwa
    const existingExpense = await prisma.tripExpense.findFirst({
      where: {
        id: expenseId,
        tripId: id,
        trip: {
          householdId: session.user.householdId,
        },
      },
    });

    if (!existingExpense) {
      return NextResponse.json({ error: "Wydatek nie znaleziony" }, { status: 404 });
    }

    // Usuń powiązaną transakcję z głównego budżetu
    if (existingExpense.transactionId) {
      await prisma.transaction.delete({
        where: { id: existingExpense.transactionId },
      });
    }

    // Usuń wydatek wyjazdu
    await prisma.tripExpense.delete({
      where: { id: expenseId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Błąd podczas usuwania wydatku:", error);
    return NextResponse.json(
      { error: "Nie udało się usunąć wydatku" },
      { status: 500 }
    );
  }
}

