import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL!;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

async function seedRoutineTemplates() {
  console.log('🌱 Seeding routine templates...');

  const templates = [
    {
      name: 'Poranna rutyna',
      description: 'Standardowa rutyna poranna - kawa, prysznic, śniadanie',
      icon: '🌅',
      category: 'morning',
      isPublic: true,
      tasks: [
        { title: 'Wziąć prysznic', time: '07:00', priority: 'MEDIUM' },
        { title: 'Zrobić kawę', time: '07:15', priority: 'MEDIUM' },
        { title: 'Zjeść śniadanie', time: '07:30', priority: 'MEDIUM' },
        { title: 'Umyć zęby', time: '07:45', priority: 'MEDIUM' },
      ],
    },
    {
      name: 'Wieczorna rutyna',
      description: 'Rutyna wieczorna - kolacja, higiena, relaks',
      icon: '🌙',
      category: 'evening',
      isPublic: true,
      tasks: [
        { title: 'Zjeść kolację', time: '19:00', priority: 'MEDIUM' },
        { title: 'Posprzątać kuchnię', time: '19:30', priority: 'LOW' },
        { title: 'Wziąć prysznic', time: '21:00', priority: 'MEDIUM' },
        { title: 'Umyć zęby', time: '21:30', priority: 'MEDIUM' },
        { title: 'Przeczytać książkę', time: '22:00', priority: 'LOW' },
      ],
    },
    {
      name: 'Sprzątanie cotygodniowe',
      description: 'Pełne sprzątanie mieszkania raz w tygodniu',
      icon: '🧹',
      category: 'weekly',
      isPublic: true,
      tasks: [
        { title: 'Odkurzyć wszystkie pokoje', time: '10:00', priority: 'HIGH' },
        { title: 'Umyć podłogi', time: '10:30', priority: 'HIGH' },
        { title: 'Wyczyścić łazienkę', time: '11:00', priority: 'HIGH' },
        { title: 'Zmienić pościel', time: '11:30', priority: 'MEDIUM' },
        { title: 'Wynieść śmieci', time: '12:00', priority: 'HIGH' },
      ],
    },
    {
      name: 'Przegląd finansów miesięcznych',
      description: 'Comiesięczny przegląd budżetu i wydatków',
      icon: '💰',
      category: 'monthly',
      isPublic: true,
      tasks: [
        { title: 'Sprawdzić saldo konta', time: '09:00', priority: 'HIGH' },
        { title: 'Przejrzeć wydatki z ostatniego miesiąca', time: '09:15', priority: 'HIGH' },
        { title: 'Zaplanować budżet na kolejny miesiąc', time: '09:30', priority: 'HIGH' },
        { title: 'Zapłacić rachunki', time: '10:00', priority: 'URGENT' },
      ],
    },
    {
      name: 'Rutyna zdrowotna',
      description: 'Dbanie o zdrowie - witaminy, woda, ćwiczenia',
      icon: '💊',
      category: 'morning',
      isPublic: true,
      tasks: [
        { title: 'Zażyć witaminy', time: '08:00', priority: 'HIGH' },
        { title: 'Wypić szklankę wody', time: '08:05', priority: 'MEDIUM' },
        { title: '15 min ćwiczeń', time: '08:10', priority: 'MEDIUM' },
      ],
    },
    {
      name: 'Przerwy w pracy zdalnej',
      description: 'Regularne przerwy podczas pracy z domu',
      icon: '☕',
      category: 'daily',
      isPublic: true,
      tasks: [
        { title: 'Przerwa na kawę', time: '10:00', priority: 'LOW' },
        { title: 'Przerwa obiadowa', time: '13:00', priority: 'MEDIUM' },
        { title: 'Przerwa na herbatę', time: '15:00', priority: 'LOW' },
        { title: 'Krótki spacer', time: '17:00', priority: 'MEDIUM' },
      ],
    },
    {
      name: 'Opieka nad zwierzętami',
      description: 'Codzienna rutyna dla właścicieli zwierząt',
      icon: '🐕',
      category: 'daily',
      isPublic: true,
      tasks: [
        { title: 'Nakarmić zwierzaka (rano)', time: '07:00', priority: 'HIGH' },
        { title: 'Wyprowadzić psa (rano)', time: '07:30', priority: 'HIGH' },
        { title: 'Nakarmić zwierzaka (wieczór)', time: '18:00', priority: 'HIGH' },
        { title: 'Wyprowadzić psa (wieczór)', time: '20:00', priority: 'HIGH' },
      ],
    },
  ];

  // Usuń istniejące publiczne szablony
  await prisma.routineTemplate.deleteMany({
    where: { isPublic: true },
  });

  // Dodaj nowe szablony
  await prisma.routineTemplate.createMany({
    data: templates,
  });

  console.log('✅ Routine templates seeded successfully!');
}

seedRoutineTemplates()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

