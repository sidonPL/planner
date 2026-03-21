import { PrismaClient } from '@prisma/client';
import { resolveThemeIdFromRewardData } from '../src/lib/theme-reward-utils';

const prisma = new PrismaClient();

async function main() {
  const rewards = await prisma.reward.findMany({
    where: { category: 'THEME' },
    select: { id: true, name: true, effectData: true },
  });

  let updated = 0;
  for (const reward of rewards) {
    const resolvedThemeId = resolveThemeIdFromRewardData({
      effectData: reward.effectData,
      name: reward.name,
    });

    if (!resolvedThemeId) {
      continue;
    }

    const currentThemeId =
      reward.effectData && typeof reward.effectData === 'object'
        ? (reward.effectData as { themeId?: unknown }).themeId
        : undefined;

    if (currentThemeId === resolvedThemeId) {
      continue;
    }

    await prisma.reward.update({
      where: { id: reward.id },
      data: {
        effectData: {
          ...(reward.effectData && typeof reward.effectData === 'object' ? (reward.effectData as object) : {}),
          themeId: resolvedThemeId,
        },
      },
    });

    updated += 1;
    console.log(`Updated reward: ${reward.name} -> ${resolvedThemeId}`);
  }

  console.log(`Done. Updated ${updated} theme rewards.`);
}

main()
  .catch((error) => {
    console.error('Backfill failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

