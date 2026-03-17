import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import type { RewardCategory, RewardRarity } from '@prisma/client';

/**
 * GET /api/admin/rewards/[id]
 * Get specific reward (admin only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const reward = await prisma.reward.findUnique({
      where: { id },
      include: {
        claims: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
          orderBy: {
            claimedAt: 'desc',
          },
        },
        _count: {
          select: {
            claims: true,
          },
        },
      },
    });

    if (!reward) {
      return NextResponse.json({ error: 'Reward not found' }, { status: 404 });
    }

    return NextResponse.json(reward);
  } catch (error) {
    console.error('Error fetching reward:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reward' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/rewards/[id]
 * Update reward (admin only)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
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

    // Check if reward exists and belongs to household
    const existing = await prisma.reward.findFirst({
      where: {
        id,
        householdId: session.user.householdId!,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Reward not found' }, { status: 404 });
    }

    const reward = await prisma.reward.update({
      where: { id },
      data: {
        name: name || existing.name,
        description: description !== undefined ? description : existing.description,
        icon: icon || existing.icon,
        category: (category as RewardCategory) || existing.category,
        pointsCost: pointsCost !== undefined ? parseInt(pointsCost) : existing.pointsCost,
        rarity: (rarity as RewardRarity) || existing.rarity,
        requiredLevel: requiredLevel !== undefined ? (requiredLevel ? parseInt(requiredLevel) : null) : existing.requiredLevel,
        requiredAchievementId: requiredAchievementId !== undefined ? requiredAchievementId : existing.requiredAchievementId,
        stock: stock !== undefined ? (stock !== null ? parseInt(stock) : null) : existing.stock,
        availableFrom: availableFrom !== undefined ? (availableFrom ? new Date(availableFrom) : null) : existing.availableFrom,
        availableUntil: availableUntil !== undefined ? (availableUntil ? new Date(availableUntil) : null) : existing.availableUntil,
        effectData: effectData !== undefined ? effectData : existing.effectData,
        isActive: isActive !== undefined ? isActive : existing.isActive,
      },
    });

    return NextResponse.json(reward);
  } catch (error) {
    console.error('Error updating reward:', error);
    return NextResponse.json(
      { error: 'Failed to update reward' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/rewards/[id]
 * Delete reward (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Check if reward exists and belongs to household
    const existing = await prisma.reward.findFirst({
      where: {
        id,
        householdId: session.user.householdId!,
      },
      include: {
        _count: {
          select: {
            claims: true,
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Reward not found' }, { status: 404 });
    }

    // Check if reward has claims
    if (existing._count.claims > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete reward with claims',
          message: 'Ta nagroda została już odebrana przez użytkowników. Możesz ją dezaktywować zamiast usuwać.',
          claimsCount: existing._count.claims,
        },
        { status: 400 }
      );
    }

    await prisma.reward.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Reward deleted successfully' });
  } catch (error) {
    console.error('Error deleting reward:', error);
    return NextResponse.json(
      { error: 'Failed to delete reward' },
      { status: 500 }
    );
  }
}

