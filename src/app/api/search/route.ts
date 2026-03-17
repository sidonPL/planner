import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!session.user.householdId) {
    console.log('[Search API] No household ID for user:', session.user.id);
    return NextResponse.json({
      recipes: [],
      tasks: [],
      transactions: [],
      inventory: [],
    });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  console.log('[Search API] Query:', query);
  console.log('[Search API] User:', session.user.id, 'Household:', session.user.householdId);

  if (!query || query.trim().length < 2) {
    return NextResponse.json({
      recipes: [],
      tasks: [],
      transactions: [],
      inventory: [],
    });
  }

  const searchTerm = query.trim();
  const householdId = session.user.householdId;

  try {
    // Wyszukiwanie równoległe
    const [recipes, tasks, transactions, inventory] = await Promise.all([
      // Przepisy
      prisma.recipe.findMany({
        where: {
          householdId,
          OR: [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { description: { contains: searchTerm, mode: 'insensitive' } },
            { category: { contains: searchTerm, mode: 'insensitive' } },
            { tips: { contains: searchTerm, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          name: true,
          description: true,
          category: true,
          difficulty: true,
          image: true,
        },
        take: 20,
      }),

      // Zadania
      prisma.task.findMany({
        where: {
          householdId,
          OR: [
            { title: { contains: searchTerm, mode: 'insensitive' } },
            { description: { contains: searchTerm, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          priority: true,
          dueDate: true,
        },
        take: 20,
      }),

      // Transakcje
      prisma.transaction.findMany({
        where: {
          householdId,
          OR: [
            { description: { contains: searchTerm, mode: 'insensitive' } },
            { category: { contains: searchTerm, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          description: true,
          amount: true,
          type: true,
          category: true,
          date: true,
        },
        take: 20,
        orderBy: {
          date: 'desc',
        },
      }),

      // Inwentarz
      prisma.inventoryItem.findMany({
        where: {
          householdId,
          OR: [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { category: { contains: searchTerm, mode: 'insensitive' } },
            { location: { contains: searchTerm, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          name: true,
          quantity: true,
          unit: true,
          category: true,
          location: true,
          expiryDate: true,
        },
        take: 20,
      }),
    ]);

    console.log('[Search API] Results:', {
      recipes: recipes.length,
      tasks: tasks.length,
      transactions: transactions.length,
      inventory: inventory.length,
    });

    return NextResponse.json({
      recipes,
      tasks,
      transactions,
      inventory,
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    );
  }
}

