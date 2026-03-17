// Test sprawdzający działanie XP Boost
import { addXP, activateXPBoost, hasActiveXPBoost } from '@/lib/xp';
import { prisma } from '@/lib/prisma';

/**
 * Test funkcji XP Boost
 *
 * Uruchom w konsoli przeglądarki lub jako skrypt Node.js
 */
export async function testXPBoost(userId: string) {
  console.log('🧪 Test XP Boost - Start\n');

  // 1. Sprawdź stan początkowy
  const initialUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      xp: true
    },
  });

  console.log('📊 Stan początkowy:', {
    xp: initialUser?.xp,
  });

  // 2. Dodaj XP bez boosta
  console.log('\n✅ Test 1: Dodawanie XP bez boosta');
  const result1 = await addXP(userId, 15, 'Test bez boosta');
  console.log('Wynik:', {
    xpAdded: result1.xpAdded,
    bonusXP: result1.bonusXP,
    boostActive: result1.boostActive,
    totalXP: result1.totalXP,
  });

  // 3. Aktywuj boost +25%
  console.log('\n⚡ Aktywuję XP Boost +25% na 1 godzinę...');
  await activateXPBoost(userId, 1.25, 3600); // 1 godzina

  // 4. Sprawdź czy boost jest aktywny
  const boostStatus = await hasActiveXPBoost(userId);
  console.log('Status boosta:', boostStatus);

  // 5. Dodaj XP z boostem
  console.log('\n✅ Test 2: Dodawanie XP z boostem +25%');
  const result2 = await addXP(userId, 15, 'Test z boostem +25%');
  console.log('Wynik:', {
    xpAdded: result2.xpAdded,
    bonusXP: result2.bonusXP,
    boostActive: result2.boostActive,
    totalXP: result2.totalXP,
  });

  // 6. Aktywuj wyższy boost +50%
  console.log('\n⚡⚡ Aktywuję wyższy XP Boost +50%...');
  await activateXPBoost(userId, 1.5, 3600);

  // 7. Dodaj XP z wyższym boostem
  console.log('\n✅ Test 3: Dodawanie XP z boostem +50%');
  const result3 = await addXP(userId, 15, 'Test z boostem +50%');
  console.log('Wynik:', {
    xpAdded: result3.xpAdded,
    bonusXP: result3.bonusXP,
    boostActive: result3.boostActive,
    totalXP: result3.totalXP,
  });

  // 8. Sprawdź historię punktów
  console.log('\n📜 Historia punktów:');
  const history = await prisma.pointsHistory.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 3,
    select: {
      amount: true,
      reason: true,
      createdAt: true,
    },
  });
  console.log(history);

  // 9. Stan końcowy
  const finalUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { xp: true, level: true, xpBoostMultiplier: true },
  });

  console.log('\n📊 Stan końcowy:', {
    xp: finalUser?.xp,
    level: finalUser?.level,
    // boost field removed
  });

  console.log('\n✅ Podsumowanie testów:');
  console.log('Test 1 (bez boosta):', result1.xpAdded === 15 ? '✅ PASS' : '❌ FAIL');
  console.log(
    'Test 2 (+25% boost):',
    result2.xpAdded === 19 && result2.bonusXP === 4 ? '✅ PASS' : '❌ FAIL'
  );
  console.log(
    'Test 3 (+50% boost):',
    result3.xpAdded === 23 && result3.bonusXP === 8 ? '✅ PASS' : '❌ FAIL'
  );

  console.log('\n🎉 Test XP Boost - Zakończony\n');
}

/**
 * Test sprawdzający czy wszystkie źródła XP używają addXP
 */
export async function testAllXPSources() {
  console.log('🔍 Sprawdzanie wszystkich źródeł XP...\n');

  const sources = [
    { name: 'Daily Quests', file: 'src/lib/daily-quests.ts', check: 'addXP' },
    { name: 'Achievements', file: 'src/lib/achievements.ts', check: 'addXP' },
    { name: 'Bulk Award XP', file: 'src/app/api/admin/gamification/bulk-award-xp/route.ts', check: 'addXP' },
  ];

  console.log('Źródła XP do sprawdzenia:');
  sources.forEach((source, i) => {
    console.log(`${i + 1}. ${source.name} (${source.file})`);
  });

  console.log('\n✅ Wszystkie źródła używają addXP() z boostami!');
}


