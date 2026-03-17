import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths } from "date-fns";
import { pl } from "date-fns/locale";
import { prisma } from "./prisma";
import { sendEmail } from "./email";

type ReportPeriod = "weekly" | "monthly";

interface HouseholdStats {
  completedTasks: number;
  completedRoutines: number; // Dodano: ukończone rutyny
  totalTasks: number;
  totalRoutines: number; // Dodano: wszystkie rutyny
  taskCompletionRate: number;
  topPerformer: { name: string; count: number } | null;
  upcomingEvents: { title: string; date: Date }[];
  budgetSummary: {
    totalIncome: number;
    totalExpense: number;
    balance: number;
  };
  meals: { date: Date; name: string }[];
  trips: { name: string; startDate: Date; endDate: Date }[];
}

async function getHouseholdStats(
  householdId: string,
  startDate: Date,
  endDate: Date
): Promise<HouseholdStats> {
  // Pobierz ukończone zwykłe zadania (bez rutyn)
  const completedTasksWhere = {
    completedAt: {
      gte: startDate,
      lte: endDate,
    },
    task: {
      householdId,
      isRecurring: false,
    },
  };
  const completedTasks = await prisma.taskCompletion.count({
    where: completedTasksWhere,
  });

  // Pobierz ukończone rutyny
  const completedRoutinesWhere = {
    completedAt: {
      gte: startDate,
      lte: endDate,
    },
    task: {
      householdId,
      isRecurring: true,
    },
  };
  const completedRoutines = await prisma.taskCompletion.count({
    where: completedRoutinesWhere,
  });

  // Pobierz wszystkie zwykłe zadania z tego okresu
  const totalTasks = await prisma.task.count({
    where: {
      householdId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
      isRecurring: false,
    },
  });

  // Pobierz wszystkie rutyny z tego okresu
  const totalRoutines = await prisma.task.count({
    where: {
      householdId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
      isRecurring: true,
    },
  });

  // Najlepszy wykonawca (przez TaskCompletion - wszystkie zadania i rutyny)
  const topPerformerData = await prisma.taskCompletion.groupBy({
    by: ["userId"],
    where: {
      completedAt: {
        gte: startDate,
        lte: endDate,
      },
      task: {
        householdId,
      },
    },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 1,
  });

  let topPerformer = null;
  if (topPerformerData.length > 0 && topPerformerData[0].userId) {
    const user = await prisma.user.findUnique({
      where: { id: topPerformerData[0].userId },
      select: { name: true },
    });
    topPerformer = {
      name: user?.name || "Nieznany",
      count: topPerformerData[0]._count?.id || 0,
    };
  }

  // Nadchodzące wydarzenia (następne 7 dni)
  const upcomingEvents = await prisma.event.findMany({
    where: {
      householdId,
      startDate: {
        gte: new Date(),
        lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    },
    select: { title: true, startDate: true },
    orderBy: { startDate: "asc" },
    take: 5,
  });

  // Podsumowanie budżetu
  const transactions = await prisma.transaction.findMany({
    where: {
      householdId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: { type: true, amount: true },
  });

  const budgetSummary = {
    totalIncome: transactions
      .filter((t) => t.type === "INCOME")
      .reduce((sum, t) => sum + t.amount, 0),
    totalExpense: transactions
      .filter((t) => t.type === "EXPENSE")
      .reduce((sum, t) => sum + t.amount, 0),
    balance: 0,
  };
  budgetSummary.balance = budgetSummary.totalIncome - budgetSummary.totalExpense;

  // Posiłki na najbliższy tydzień
  const meals = await prisma.meal.findMany({
    where: {
      householdId,
      date: {
        gte: new Date(),
        lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    },
    include: { recipe: { select: { name: true } } },
    orderBy: { date: "asc" },
    take: 10,
  });

  // Nadchodzące wyjazdy
  const trips = await prisma.trip.findMany({
    where: {
      householdId,
      startDate: {
        gte: new Date(),
      },
    },
    select: { name: true, startDate: true, endDate: true },
    orderBy: { startDate: "asc" },
    take: 3,
  });

  return {
    completedTasks,
    completedRoutines,
    totalTasks,
    totalRoutines,
    taskCompletionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    topPerformer,
    upcomingEvents: upcomingEvents.map((e) => ({ title: e.title, date: e.startDate })),
    budgetSummary,
    meals: meals.map((m) => ({
      date: m.date,
      name: m.recipe?.name || m.customName || "Posiłek",
    })),
    trips,
  };
}

function generateReportHtml(
  stats: HouseholdStats,
  period: ReportPeriod,
  householdName: string,
  startDate: Date,
  endDate: Date
): string {
  const periodLabel = period === "weekly" ? "tygodniowy" : "miesięczny";
  const dateRange = `${format(startDate, "d MMMM", { locale: pl })} - ${format(endDate, "d MMMM yyyy", { locale: pl })}`;

  return `
<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Raport ${periodLabel}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background: white;
      border-radius: 12px;
      padding: 30px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h1 {
      color: #2563eb;
      margin-bottom: 5px;
    }
    .subtitle {
      color: #666;
      margin-bottom: 30px;
    }
    .section {
      margin-bottom: 25px;
      padding-bottom: 25px;
      border-bottom: 1px solid #eee;
    }
    .section:last-child {
      border-bottom: none;
      margin-bottom: 0;
      padding-bottom: 0;
    }
    .section-title {
      font-size: 18px;
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 15px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .stat-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
    }
    .stat-card {
      background: #f8fafc;
      padding: 15px;
      border-radius: 8px;
      text-align: center;
    }
    .stat-value {
      font-size: 28px;
      font-weight: bold;
      color: #2563eb;
    }
    .stat-label {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
    }
    .list-item {
      padding: 10px 0;
      border-bottom: 1px solid #f0f0f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .list-item:last-child {
      border-bottom: none;
    }
    .badge {
      background: #e0e7ff;
      color: #3730a3;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
    }
    .highlight {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      margin-bottom: 20px;
    }
    .highlight-value {
      font-size: 36px;
      font-weight: bold;
    }
    .balance-positive { color: #10b981; }
    .balance-negative { color: #ef4444; }
    .footer {
      text-align: center;
      margin-top: 30px;
      color: #999;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 Raport ${periodLabel}</h1>
    <p class="subtitle">${householdName} • ${dateRange}</p>

    ${stats.topPerformer ? `
    <div class="highlight">
      <div>🏆 Lider produktywności</div>
      <div class="highlight-value">${stats.topPerformer.name}</div>
      <div>${stats.topPerformer.count} ukończonych zadań</div>
    </div>
    ` : ''}

    <div class="section">
      <div class="section-title">✅ Zadania</div>
      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-value">${stats.completedTasks}</div>
          <div class="stat-label">Ukończone zadania</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${stats.completedRoutines}</div>
          <div class="stat-label">Ukończone rutyny</div>
        </div>
      </div>
      <div class="stat-card" style="margin-top: 15px;">
        <div class="stat-value">${stats.taskCompletionRate}%</div>
        <div class="stat-label">Realizacja zadań</div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">💰 Budżet</div>
      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-value balance-positive">+${stats.budgetSummary.totalIncome.toFixed(0)} zł</div>
          <div class="stat-label">Przychody</div>
        </div>
        <div class="stat-card">
          <div class="stat-value balance-negative">-${stats.budgetSummary.totalExpense.toFixed(0)} zł</div>
          <div class="stat-label">Wydatki</div>
        </div>
      </div>
      <div class="stat-card" style="margin-top: 15px;">
        <div class="stat-value ${stats.budgetSummary.balance >= 0 ? 'balance-positive' : 'balance-negative'}">
          ${stats.budgetSummary.balance >= 0 ? '+' : ''}${stats.budgetSummary.balance.toFixed(0)} zł
        </div>
        <div class="stat-label">Bilans</div>
      </div>
    </div>

    ${stats.upcomingEvents.length > 0 ? `
    <div class="section">
      <div class="section-title">📅 Nadchodzące wydarzenia</div>
      ${stats.upcomingEvents.map(e => `
        <div class="list-item">
          <span>${e.title}</span>
          <span class="badge">${format(new Date(e.date), "d MMM", { locale: pl })}</span>
        </div>
      `).join('')}
    </div>
    ` : ''}

    ${stats.meals.length > 0 ? `
    <div class="section">
      <div class="section-title">🍽️ Zaplanowane posiłki</div>
      ${stats.meals.slice(0, 5).map(m => `
        <div class="list-item">
          <span>${m.name}</span>
          <span class="badge">${format(new Date(m.date), "EEEE, d MMM", { locale: pl })}</span>
        </div>
      `).join('')}
    </div>
    ` : ''}

    ${stats.trips.length > 0 ? `
    <div class="section">
      <div class="section-title">✈️ Nadchodzące wyjazdy</div>
      ${stats.trips.map(t => `
        <div class="list-item">
          <span>${t.name}</span>
          <span class="badge">${format(new Date(t.startDate), "d MMM", { locale: pl })} - ${format(new Date(t.endDate), "d MMM", { locale: pl })}</span>
        </div>
      `).join('')}
    </div>
    ` : ''}

    <div class="footer">
      <p>Ten raport został wygenerowany automatycznie przez Planner Domowy.</p>
      <p>Możesz zmienić ustawienia raportów w ustawieniach aplikacji.</p>
    </div>
  </div>
</body>
</html>
`;
}

export async function generateAndSendReport(
  householdId: string,
  period: ReportPeriod
): Promise<{ success: boolean; sentTo: string[] }> {
  const now = new Date();
  let startDate: Date;
  let endDate: Date;

  if (period === "weekly") {
    startDate = startOfWeek(subWeeks(now, 1), { locale: pl });
    endDate = endOfWeek(subWeeks(now, 1), { locale: pl });
  } else {
    startDate = startOfMonth(subMonths(now, 1));
    endDate = endOfMonth(subMonths(now, 1));
  }

  // Pobierz gospodarstwo i użytkowników z ich ustawieniami
  const household = await prisma.household.findUnique({
    where: { id: householdId },
    include: {
      members: {
        include: {
          settings: true,
        },
      },
    },
  });

  if (!household) {
    return { success: false, sentTo: [] };
  }

  // Filtruj użytkowników z włączonymi raportami email
  const membersWithReports = household.members.filter(
    (member) => (member.settings as { emailReports?: boolean } | null)?.emailReports === true
  );

  const stats = await getHouseholdStats(householdId, startDate, endDate);
  const html = generateReportHtml(stats, period, household.name, startDate, endDate);

  const sentTo: string[] = [];

  for (const member of membersWithReports) {
    if (member.email) {
      const result = await sendEmail({
        to: member.email,
        subject: `📊 Raport ${period === "weekly" ? "tygodniowy" : "miesięczny"} - ${household.name}`,
        html,
      });

      if (result.success) {
        sentTo.push(member.email);
      }
    }
  }

  return { success: sentTo.length > 0, sentTo };
}

export async function sendAllHouseholdReports(period: ReportPeriod) {
  const households = await prisma.household.findMany({
    select: { id: true },
  });

  const results = [];
  for (const household of households) {
    const result = await generateAndSendReport(household.id, period);
    results.push({ householdId: household.id, ...result });
  }

  return results;
}

