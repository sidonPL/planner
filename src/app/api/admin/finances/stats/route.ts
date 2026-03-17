import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const transactions = await prisma.transaction.findMany({
      select: {
        amount: true,
        type: true,
        category: true,
      },
    });

    const totalTransactions = transactions.length;
    const totalIncome = transactions
      .filter((t) => t.type === 'INCOME')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = transactions
      .filter((t) => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0);
    const balance = totalIncome - totalExpense;

    // Top expense categories
    const categoryTotals = transactions
      .filter((t) => t.type === 'EXPENSE')
      .reduce((acc: Record<string, { amount: number; count: number }>, t) => {
        const cat = t.category || 'Inne';
        if (!acc[cat]) {
          acc[cat] = { amount: 0, count: 0 };
        }
        acc[cat].amount += t.amount;
        acc[cat].count += 1;
        return acc;
      }, {});

    const topCategories = Object.entries(categoryTotals)
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    return NextResponse.json({
      stats: {
        totalTransactions,
        totalIncome,
        totalExpense,
        balance,
        topCategories,
      },
    });
  } catch (error) {
    console.error('Error fetching finance stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

