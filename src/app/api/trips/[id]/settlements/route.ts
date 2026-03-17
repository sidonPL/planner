import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { calculateSettlements } from '@/lib/settlement-calculator';

/**
 * GET /api/trips/[id]/settlements
 * Oblicza rozliczenia dla wyjazdu
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Pobierz wydatki z splitami
    const expenses = await prisma.tripExpense.findMany({
      where: { tripId: id },
      include: {
        TripExpenseSplit: true,
      },
      orderBy: { date: 'desc' },
    });

    // Pobierz uczestników
    const trip = await prisma.trip.findUnique({
      where: { id },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
          },
        },
      },
    });

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    // Przekształć do formatu dla kalkulatora
    const expensesForCalc = expenses.map((exp) => ({
      id: exp.id,
      amount: exp.amount,
      currency: exp.currency,
      paidById: exp.paidById,
      splits: exp.TripExpenseSplit.map((split) => ({
        userId: split.user_id,
        amount: split.amount,
      })),
    }));

    const participants = trip.participants.map((p) => ({
      id: p.user.id,
      name: p.user.name,
      color: p.user.color,
    }));

    // Oblicz rozliczenia
    const { balances, settlements } = calculateSettlements(expensesForCalc, participants);

    return NextResponse.json({
      balances,
      settlements,
      totalExpenses: expenses.reduce((sum, e) => sum + e.amount, 0),
    });
  } catch (error) {
    console.error('Error calculating settlements:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
