import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import type { RewardCategory, RewardRarity } from '@prisma/client';

/**
 * GET /api/admin/rewards
 * Get all rewards (admin only)
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rewards = await prisma.reward.findMany({
      where: {
        householdId: session.user.householdId!,
      },
      include: {
        _count: {
          select: {
            claims: true,
          },
        },
      },
      orderBy: [
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json(rewards);
  } catch (error) {
    console.error('Error fetching rewards:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rewards' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/rewards
 * Create a new reward (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'ADMIN' || !session.user.householdId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const {
      name,
      description,
      icon,
      category,
      pointsCost,
      rarity,
      requiredLevel,
      requiredAchievementId,
      stock,
      availableFrom,
      availableUntil,
      effectData,
      isActive,
    } = body;

    // Validation
    if (!name || !category || pointsCost === undefined) {
      return NextResponse.json(
        { error: 'Name, category, and pointsCost are required' },
        { status: 400 }
      );
    }

    const reward = await prisma.reward.create({
      data: {
        name,
        description: description || null,
        icon: icon || '🎁',
        category: category as RewardCategory,
        pointsCost: parseInt(pointsCost),
        rarity: (rarity as RewardRarity) || 'COMMON',
        requiredLevel: requiredLevel ? parseInt(requiredLevel) : null,
        requiredAchievementId: requiredAchievementId || null,
        stock: stock !== undefined && stock !== null ? parseInt(stock) : null,
        availableFrom: availableFrom ? new Date(availableFrom) : null,
        availableUntil: availableUntil ? new Date(availableUntil) : null,
        effectData: effectData || {},
        isActive: isActive !== false,
        householdId: session.user.householdId,
      },
    });

    return NextResponse.json(reward, { status: 201 });
  } catch (error) {
    console.error('Error creating reward:', error);
    return NextResponse.json(
      { error: 'Failed to create reward' },
      { status: 500 }
    );
  }
}

