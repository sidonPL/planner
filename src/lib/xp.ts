import { prisma } from './prisma';
import type { PointsTransactionType } from '@prisma/client';

/**
 * Dodaje XP użytkownikowi z uwzględnieniem aktywnych boostów
 */
export async function addXP(
  userId: string,
  baseAmount: number,
  reason: string,
  type: PointsTransactionType = 'EARNED'
) {
  try {
    // Pobierz użytkownika i sprawdź aktywne boosty z ClaimedReward
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        xp: true,
        level: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Sprawdź czy użytkownik ma aktywny XP boost z nagród
    const activeBoost = await prisma.claimedReward.findFirst({
      where: {
        userId,
        isActive: true,
        // Nie może być wygasły
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      include: {
        reward: {
          select: {
            effectData: true,
            category: true,
          },
        },
      },
    });

    // Sprawdź czy boost jest typu xp_boost
    let finalMultiplier = 1.0;
    if (activeBoost && activeBoost.reward.category === 'PERK') {
      const effectData = activeBoost.reward.effectData as any;
      if (effectData?.type === 'xp_boost' && effectData?.multiplier) {
        finalMultiplier = effectData.multiplier;
      }
    }

    // Oblicz finalną kwotę XP
    const finalAmount = Math.floor(baseAmount * finalMultiplier);
    const bonusAmount = finalAmount - baseAmount;

    // Dodaj XP w transakcji
    const result = await prisma.$transaction(async (tx) => {
      // Aktualizuj XP użytkownika
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { xp: { increment: finalAmount } },
        select: { xp: true, level: true },
      });

      // Dodaj do historii punktów
      await tx.pointsHistory.create({
        data: {
          userId,
          amount: finalAmount,
          reason: bonusAmount > 0
            ? `${reason} (+${bonusAmount} bonus)`
            : reason,
          type,
        },
      });

      // Oblicz nowy poziom bazując na XP
      const newLevel = calculateLevel(updatedUser.xp);
      let leveledUp = false;

      if (newLevel > updatedUser.level) {
        await tx.user.update({
          where: { id: userId },
          data: { level: newLevel },
        });
        leveledUp = true;
      }

      return {
        xpAdded: finalAmount,
        bonusXP: bonusAmount,
        totalXP: updatedUser.xp,
        level: newLevel,
        leveledUp,
        boostActive: finalMultiplier > 1.0,
      };
    });

    return result;
  } catch (error) {
    console.error('Error adding XP:', error);
    throw error;
  }
}

/**
 * Oblicza poziom bazując na XP
 * Używa progresji: 100 XP na poziom 1, potem +50 XP na każdy kolejny poziom
 */
export function calculateLevel(xp: number): number {
  if (xp < 100) return 1;

  let level = 1;
  let xpRequired = 100;
  let remainingXP = xp;

  while (remainingXP >= xpRequired) {
    remainingXP -= xpRequired;
    level++;
    xpRequired += 50; // Każdy poziom wymaga o 50 XP więcej
  }

  return level;
}

/**
 * Oblicza ile XP potrzeba do następnego poziomu
 */
export function xpToNextLevel(currentXP: number): number {
  const currentLevel = calculateLevel(currentXP);
  let xpRequired = 100;
  let totalXPForLevel = 0;

  for (let i = 1; i < currentLevel; i++) {
    totalXPForLevel += xpRequired;
    xpRequired += 50;
  }

  const xpForNextLevel = totalXPForLevel + xpRequired;
  return xpForNextLevel - currentXP;
}

/**
 * Oblicza procent postępu do następnego poziomu
 */
export function xpProgressPercent(currentXP: number): number {
  const currentLevel = calculateLevel(currentXP);
  let xpRequired = 100;
  let totalXPForCurrentLevel = 0;

  for (let i = 1; i < currentLevel; i++) {
    totalXPForCurrentLevel += xpRequired;
    xpRequired += 50;
  }

  const xpInCurrentLevel = currentXP - totalXPForCurrentLevel;
  const percentProgress = (xpInCurrentLevel / xpRequired) * 100;

  return Math.min(100, Math.max(0, percentProgress));
}

/**
 * Aktywuje XP boost dla użytkownika
 * Uwaga: Ta funkcja jest przestarzała. XP boosty są teraz zarządzane przez ClaimedReward.
 * Użyj zamiast tego aktywacji nagrody typu PERK z effectData.type === 'xp_boost'
 */
export async function activateXPBoost(
  userId: string,
  multiplier: number,
  durationSeconds: number
) {
  console.warn('activateXPBoost jest przestarzałe. Użyj systemu ClaimedReward zamiast tego.');

  // Dla kompatybilności wstecznej, zwróć informacje ale nie rób nic
  const expiresAt = new Date(Date.now() + durationSeconds * 1000);
  return { multiplier, expiresAt };
}

/**
 * Dezaktywuje XP boost dla użytkownika
 * Uwaga: Ta funkcja jest przestarzała. XP boosty są teraz zarządzane przez ClaimedReward.
 */
export async function deactivateXPBoost(userId: string) {
  console.warn('deactivateXPBoost jest przestarzałe. Użyj systemu ClaimedReward zamiast tego.');

  // Dezaktywuj wszystkie aktywne boosty XP
  await prisma.claimedReward.updateMany({
    where: {
      userId,
      isActive: true,
      reward: {
        category: 'PERK',
      },
    },
    data: {
      isActive: false,
    },
  });
}

/**
 * Sprawdza czy użytkownik ma aktywny XP boost
 */
export async function hasActiveXPBoost(userId: string): Promise<{
  active: boolean;
  multiplier: number;
  expiresAt: Date | null;
}> {
  const activeBoost = await prisma.claimedReward.findFirst({
    where: {
      userId,
      isActive: true,
      // Nie może być wygasły
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
    include: {
      reward: {
        select: {
          effectData: true,
          category: true,
        },
      },
    },
  });

  if (!activeBoost || activeBoost.reward.category !== 'PERK') {
    return { active: false, multiplier: 1.0, expiresAt: null };
  }

  const effectData = activeBoost.reward.effectData as any;
  if (effectData?.type === 'xp_boost' && effectData?.multiplier) {
    return {
      active: true,
      multiplier: effectData.multiplier,
      expiresAt: activeBoost.expiresAt,
    };
  }

  return { active: false, multiplier: 1.0, expiresAt: null };
}

