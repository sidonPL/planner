import { prisma } from '../src/lib/prisma';

async function setHouseholdOwners() {
  console.log('🔧 Migracja właścicieli gospodarstw...\n');

  // Znajdź gospodarstwa bez właściciela
  const households = await prisma.household.findMany({
    where: { ownerId: null },
    include: {
      members: {
        orderBy: { createdAt: 'asc' },
        select: { id: true, email: true, createdAt: true }
      }
    }
  });

  console.log(`📊 Znaleziono ${households.length} gospodarstw bez właściciela\n`);

  let updated = 0;
  let skipped = 0;

  for (const household of households) {
    if (household.members.length === 0) {
      console.log(`⚠️  Gospodarstwo "${household.name}" (${household.id}) nie ma członków - pomijam`);
      skipped++;
      continue;
    }

    // Ustaw pierwszego członka (najstarszego) jako właściciela
    const firstMember = household.members[0];

    await prisma.household.update({
      where: { id: household.id },
      data: { ownerId: firstMember.id }
    });

    console.log(`✅ Gospodarstwo "${household.name}" → Właściciel: ${firstMember.email}`);
    updated++;
  }

  console.log(`\n📊 Podsumowanie:`);
  console.log(`   Zaktualizowano: ${updated}`);
  console.log(`   Pominięto: ${skipped}`);
  console.log(`\n✅ Migracja zakończona!`);
}

setHouseholdOwners()
  .catch((error) => {
    console.error('❌ Błąd migracji:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

