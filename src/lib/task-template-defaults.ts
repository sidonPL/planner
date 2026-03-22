import { Priority } from "@prisma/client";
import { prisma } from "./prisma";

type DefaultTaskTemplate = {
  name: string;
  description: string;
  icon: string;
  tasks: Array<{
    title: string;
    priority: Priority;
  }>;
};

export const DEFAULT_TASK_TEMPLATES: DefaultTaskTemplate[] = [
  {
    name: "Szybki start dnia",
    description: "Krótki plan poranny, który ustawia priorytety na cały dzień",
    icon: "🌅",
    tasks: [
      { title: "Przejrzeć plan dnia", priority: "MEDIUM" },
      { title: "Ustawić 3 najważniejsze priorytety", priority: "HIGH" },
      { title: "Sprawdzić kalendarz i spotkania", priority: "MEDIUM" },
      { title: "Krótki przegląd wieczorem", priority: "LOW" },
    ],
  },
  {
    name: "Skupiona praca",
    description: "Szablon pracy w blokach deep work bez rozpraszaczy",
    icon: "🎯",
    tasks: [
      { title: "Wyłączyć powiadomienia", priority: "HIGH" },
      { title: "Blok fokusowy 90 min", priority: "HIGH" },
      { title: "15 min przerwy i reset", priority: "MEDIUM" },
      { title: "Drugi blok fokusowy 60 min", priority: "HIGH" },
    ],
  },
  {
    name: "Domowe porządki",
    description: "Szybka rutyna utrzymania porządku w mieszkaniu",
    icon: "🧹",
    tasks: [
      { title: "Opróżnić zlew i blat w kuchni", priority: "MEDIUM" },
      { title: "10 minut odkładania rzeczy na miejsce", priority: "MEDIUM" },
      { title: "Wynieść śmieci", priority: "HIGH" },
      { title: "Szybkie odkurzenie strefy dziennej", priority: "LOW" },
    ],
  },
  {
    name: "Zakupy i gotowanie",
    description: "Planowanie posiłków i przygotowanie listy zakupów",
    icon: "🛒",
    tasks: [
      { title: "Sprawdzić zapasy w lodówce", priority: "MEDIUM" },
      { title: "Ułożyć jadłospis na 3 dni", priority: "HIGH" },
      { title: "Przygotować listę zakupów", priority: "HIGH" },
      { title: "Zamówić lub zrobić zakupy", priority: "MEDIUM" },
    ],
  },
  {
    name: "Zamknięcie dnia",
    description: "Wieczorny reset i przygotowanie na jutro",
    icon: "🌙",
    tasks: [
      { title: "Podsumować wykonane zadania", priority: "LOW" },
      { title: "Rozplanować 3 cele na jutro", priority: "MEDIUM" },
      { title: "Przygotować ubranie i stanowisko", priority: "LOW" },
      { title: "Wyłączyć ekrany 30 min przed snem", priority: "MEDIUM" },
    ],
  },
];

export async function ensureDefaultTaskTemplates(params: {
  householdId: string;
  createdBy: string;
}): Promise<number> {
  const existing = await prisma.taskTemplate.findMany({
    where: {
      householdId: params.householdId,
      name: {
        in: DEFAULT_TASK_TEMPLATES.map((template) => template.name),
      },
    },
    select: {
      name: true,
    },
  });

  const existingNames = new Set(existing.map((template) => template.name));
  const missingTemplates = DEFAULT_TASK_TEMPLATES.filter(
    (template) => !existingNames.has(template.name)
  );

  for (const template of missingTemplates) {
    await prisma.taskTemplate.create({
      data: {
        name: template.name,
        description: template.description,
        icon: template.icon,
        householdId: params.householdId,
        createdBy: params.createdBy,
        taskTemplates: {
          create: template.tasks.map((task, index) => ({
            title: task.title,
            priority: task.priority,
            position: index,
          })),
        },
      },
    });
  }

  return missingTemplates.length;
}

