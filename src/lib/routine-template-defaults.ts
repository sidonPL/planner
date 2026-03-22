import { prisma } from "./prisma";

type RoutineTask = {
  title: string;
  time: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
};

type DefaultRoutineTemplate = {
  name: string;
  description: string;
  icon: string;
  category: string;
  tasks: RoutineTask[];
  isPublic: true;
};

const DEFAULT_PUBLIC_ROUTINE_TEMPLATES: DefaultRoutineTemplate[] = [
  {
    name: "Poranna rutyna",
    description: "Standardowa rutyna poranna - start dnia krok po kroku",
    icon: "🌅",
    category: "morning",
    isPublic: true,
    tasks: [
      { title: "Wziąć prysznic", time: "07:00", priority: "MEDIUM" },
      { title: "Zrobić kawę", time: "07:15", priority: "MEDIUM" },
      { title: "Zjeść śniadanie", time: "07:30", priority: "MEDIUM" },
      { title: "Umyć zęby", time: "07:45", priority: "MEDIUM" },
    ],
  },
  {
    name: "Wieczorna rutyna",
    description: "Rutyna wieczorna - wyciszenie i przygotowanie do snu",
    icon: "🌙",
    category: "evening",
    isPublic: true,
    tasks: [
      { title: "Kolacja", time: "19:00", priority: "MEDIUM" },
      { title: "Posprzątać kuchnię", time: "19:30", priority: "LOW" },
      { title: "Umyć zęby", time: "21:30", priority: "HIGH" },
      { title: "Odłożyć telefon", time: "22:00", priority: "MEDIUM" },
    ],
  },
  {
    name: "Sprzątanie cotygodniowe",
    description: "Szybki plan na cotygodniowe porządki",
    icon: "🧹",
    category: "weekly",
    isPublic: true,
    tasks: [
      { title: "Odkurzyć mieszkanie", time: "10:00", priority: "HIGH" },
      { title: "Umyć podłogi", time: "10:30", priority: "HIGH" },
      { title: "Wyczyścić łazienkę", time: "11:00", priority: "HIGH" },
      { title: "Wynieść śmieci", time: "11:30", priority: "MEDIUM" },
    ],
  },
];

export async function ensurePublicRoutineTemplates(): Promise<number> {
  const existing = await prisma.routineTemplate.findMany({
    where: {
      isPublic: true,
      name: { in: DEFAULT_PUBLIC_ROUTINE_TEMPLATES.map((template) => template.name) },
    },
    select: { name: true },
  });

  const existingNames = new Set(existing.map((template) => template.name));
  const missingTemplates = DEFAULT_PUBLIC_ROUTINE_TEMPLATES.filter(
    (template) => !existingNames.has(template.name)
  );

  if (missingTemplates.length === 0) {
    return 0;
  }

  await prisma.routineTemplate.createMany({
    data: missingTemplates,
  });

  return missingTemplates.length;
}

