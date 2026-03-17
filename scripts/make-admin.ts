import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function makeAdmin() {
  const email = process.argv[2];

  if (!email) {
    console.error('❌ Podaj email użytkownika:');
    console.log('Usage: npm run make-admin twoj-email@example.com');
    process.exit(1);
  }

  try {
    const user = await prisma.user.update({
      where: { email },
      data: { role: 'ADMIN' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    console.log('✅ Użytkownik został adminem!');
    console.log('---');
    console.log(`ID:    ${user.id}`);
    console.log(`Email: ${user.email}`);
    console.log(`Name:  ${user.name}`);
    console.log(`Role:  ${user.role}`);
    console.log('---');
    console.log('🎉 Możesz teraz wejść na /admin/gamification');
  } catch (error: any) {
    if (error.code === 'P2025') {
      console.error(`❌ Nie znaleziono użytkownika: ${email}`);
    } else {
      console.error('❌ Błąd:', error.message);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

makeAdmin();

