import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import { format } from "date-fns";
import { pl } from "date-fns/locale";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Cron job - codzienny email digest z rutyną na dziś
// Uruchamiany codziennie o 6:00 rano
export async function GET(req: Request) {
  try {
    // Sprawdź authorization header (cron secret)
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[Daily Routine Digest] Starting...");

    const users = await prisma.user.findMany({
      where: {
        email: {
          not: undefined
        },
        householdId: {
          not: null
        },
        // Można dodać filtr: settings.emailRoutineDigest = true
      },
      select: {
        id: true,
        name: true,
        email: true,
        householdId: true,
      }
    });

    console.log(`[Daily Routine Digest] Found ${users.length} users`);

    let sentCount = 0;

    for (const user of users) {
      if (!user.email || !user.householdId) continue;

      // Pobierz rutyny dla tego gospodarstwa
      const userRoutines = await prisma.task.findMany({
        where: {
          householdId: user.householdId,
          isRecurring: true,
          recurrenceType: "DAILY",
          status: {
            not: "COMPLETED"
          },
          OR: [
            { assigneeId: user.id },
            { assigneeId: null }
          ]
        },
        include: {
          category: true,
          assignee: true
        },
        orderBy: {
          dueTime: "asc"
        }
      });

      if (userRoutines.length === 0) {
        console.log(`[Daily Routine Digest] No routines for user ${user.name}, skipping`);
        continue;
      }

      // Grupuj według pory dnia
      const getTimeCategory = (time: string | null) => {
        if (!time) return "Bez godziny";
        const hour = parseInt(time.split(":")[0]);
        if (hour >= 5 && hour < 12) return "Poranne (5:00-11:59)";
        if (hour >= 12 && hour < 17) return "Popołudniowe (12:00-16:59)";
        if (hour >= 17 && hour < 23) return "Wieczorne (17:00-22:59)";
        return "Nocne (23:00-4:59)";
      };

      type UserRoutine = typeof userRoutines[number];
      const groupedRoutines = userRoutines.reduce<Record<string, UserRoutine[]>>((acc, routine) => {
        const category = getTimeCategory(routine.dueTime);
        if (!acc[category]) acc[category] = [];
        acc[category].push(routine);
        return acc;
      }, {});

      try {
        // Utwórz HTML email
        const emailHtml = `
<!DOCTYPE html>
<html lang="pl">
<head>
  <style>
    body { font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
    .content { padding: 30px; }
    .time-group { margin-bottom: 30px; }
    .time-group h3 { color: #667eea; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
    .routine { background: #f9fafb; border-left: 4px solid #667eea; padding: 15px; margin: 10px 0; border-radius: 4px; }
    .routine-time { font-weight: bold; color: #667eea; font-size: 14px; }
    .routine-title { font-size: 16px; margin: 5px 0; }
    .routine-category { font-size: 12px; color: #6b7280; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
    .emoji { font-size: 24px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="emoji">📋</div>
      <h1>Twoje rutyny na dziś</h1>
      <p>${format(new Date(), "EEEE, d MMMM yyyy", { locale: pl })}</p>
    </div>
    <div class="content">
      <p>Cześć ${user.name || ""}! 👋</p>
      <p>Oto lista Twoich rutyn zaplanowanych na dziś (${userRoutines.length} ${userRoutines.length === 1 ? 'rutyna' : userRoutines.length < 5 ? 'rutyny' : 'rutyn'}):</p>
      
      ${Object.entries(groupedRoutines).map(([category, routines]) => `
        <div class="time-group">
          <h3>${category}</h3>
          ${routines.map((routine) => `
            <div class="routine">
              ${routine.dueTime ? `<div class="routine-time">🕐 ${routine.dueTime}</div>` : ''}
              <div class="routine-title">${routine.title}</div>
              ${routine.category ? `<div class="routine-category">📁 ${routine.category.name}</div>` : ''}
            </div>
          `).join('')}
        </div>
      `).join('')}
      
      <p style="margin-top: 30px; padding: 15px; background: #fef3c7; border-radius: 6px; border-left: 4px solid #f59e0b;">
        💡 <strong>Wskazówka:</strong> Regularne wykonywanie rutyn pomaga budować zdrowe nawyki!
      </p>
    </div>
    <div class="footer">
      <p>Wysłane z aplikacji Planner</p>
      <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/tasks/routines" style="color: #667eea;">Zobacz rutyny w aplikacji</a></p>
    </div>
  </div>
</body>
</html>
        `;

        // Wyślij email przez Resend
        if (!resend) {
          console.warn("[Daily Routine Digest] Resend not configured, skipping email");
          continue;
        }

        await resend.emails.send({
          from: process.env.EMAIL_FROM || "Planner <noreply@yourdomain.com>",
          to: user.email,
          subject: `📋 Twoje rutyny na dziś - ${format(new Date(), "d MMM", { locale: pl })}`,
          html: emailHtml
        });

        sentCount++;
        console.log(`[Daily Routine Digest] Sent email to ${user.email}`);
      } catch (error) {
        console.error(`[Daily Routine Digest] Error sending email to ${user.email}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      userCount: users.length,
      emailsSent: sentCount
    });
  } catch (error) {
    console.error("[Daily Routine Digest] Error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}


