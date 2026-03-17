import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const recipes = await prisma.recipe.findMany({
      include: {
        createdBy: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const recipesWithUserName = recipes.map((recipe) => ({
      id: recipe.id,
      name: recipe.name,
      category: recipe.category,
      difficulty: recipe.difficulty,
      prepTime: recipe.prepTime,
      cookTime: recipe.cookTime,
      servings: recipe.servings,
      isPublic: recipe.isPublic,
      createdById: recipe.createdById,
      createdAt: recipe.createdAt,
      userName: recipe.createdBy?.name || 'Unknown',
    }));

    return NextResponse.json({ recipes: recipesWithUserName });
  } catch (error) {
    console.error('Error fetching recipes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

