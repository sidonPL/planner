import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCronAuth } from "@/lib/web-push";

import { createNotification } from "@/lib/notifications";

import { startOfDay, addDays } from "date-fns";

export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const today = startOfDay(new Date());
    const tomorrow = addDays(today, 1);

    // Pobierz użytkowników z urodzinami dziś lub jutro
    const users = await prisma.user.findMany({
      where: {
        birthDate: {
          not: null,
        },
        householdId: {
          not: null,
        },
      },
      include: {
        household: {
          include: {
            members: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    const notifications: { userId: string; celebrantName: string; date: string }[] = [];

    for (const user of users) {
      if (!user.birthDate || !user.household) continue;

      // Sprawdź czy urodziny są dziś lub jutro
      const birthDate = new Date(user.birthDate);
      const thisYearBirthday = new Date(
        today.getFullYear(),
        birthDate.getMonth(),
        birthDate.getDate()
      );

      const isTodayBirthday = thisYearBirthday.getTime() === today.getTime();
      const isTomorrowBirthday = thisYearBirthday.getTime() === tomorrow.getTime();

      if (isTodayBirthday || isTomorrowBirthday) {
        const age = today.getFullYear() - birthDate.getFullYear();
        const message = isTodayBirthday
          ? `🎂 ${user.name} ma dziś urodziny! (${age} lat)`
          : `🎂 ${user.name} ma jutro urodziny! (${age} lat)`;

        // Wyślij powiadomienie do wszystkich członków gospodarstwa (oprócz solenizanta)
        for (const member of user.household.members) {
          if (member.id !== user.id) {
            // Sprawdź czy powiadomienie już nie zostało wysłane dzisiaj
            const existingNotification = await prisma.notification.findFirst({
              where: {
                userId: member.id,
                type: "SYSTEM",
                message,
                createdAt: {
                  gte: today,
                },
              },
            });

            if (!existingNotification) {
              await createNotification({
                userId: member.id,
                householdId: user.household.id,
                title: "Urodziny!",
                message,
                type: "SYSTEM",
                link: `/family`,
              });

              notifications.push({
                userId: member.id,
                celebrantName: user.name || "Użytkownik",
                date: isTodayBirthday ? "dziś" : "jutro",
              });
            }
          }
        }
      }

      // Sprawdź imieniny (jeśli są ustawione)
      if (user.nameDay) {
        const [day, month] = user.nameDay.split("-").map(Number);
        const thisYearNameDay = new Date(today.getFullYear(), month - 1, day);

        const isTodayNameDay = thisYearNameDay.getTime() === today.getTime();
        const isTomorrowNameDay = thisYearNameDay.getTime() === tomorrow.getTime();

        if (isTodayNameDay || isTomorrowNameDay) {
          const message = isTodayNameDay
            ? `🎉 ${user.name} ma dziś imieniny!`
            : `🎉 ${user.name} ma jutro imieniny!`;

          // Wyślij powiadomienie do wszystkich członków gospodarstwa (oprócz solenizanta)
          for (const member of user.household.members) {
            if (member.id !== user.id) {
              const existingNotification = await prisma.notification.findFirst({
                where: {
                  userId: member.id,
                  type: "SYSTEM",
                  message,
                  createdAt: {
                    gte: today,
                  },
                },
              });

              if (!existingNotification) {
                await createNotification({
                  userId: member.id,
                  householdId: user.household.id,
                  title: "Imieniny!",
                  message,
                  type: "SYSTEM",
                  link: `/family`,
                });

                notifications.push({
                  userId: member.id,
                  celebrantName: user.name || "Użytkownik",
                  date: isTodayNameDay ? "dziś" : "jutro",
                });
              }
            }
          }
        }
      }
    }

    // Zewnetrzne osoby (znajomi/rodzina spoza gospodarstwa)
    const externalBirthdays = await prisma.externalBirthday.findMany({
      include: {
        household: {
          include: {
            members: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    for (const person of externalBirthdays) {
      const birthDate = new Date(person.birthDate);
      const thisYearBirthday = new Date(
        today.getFullYear(),
        birthDate.getMonth(),
        birthDate.getDate()
      );

      const isTodayBirthday = thisYearBirthday.getTime() === today.getTime();
      const isTomorrowBirthday = thisYearBirthday.getTime() === tomorrow.getTime();

      if (isTodayBirthday || isTomorrowBirthday) {
        const age = today.getFullYear() - birthDate.getFullYear();
        const message = isTodayBirthday
          ? `🎂 ${person.name} ma dziś urodziny! (${age} lat)`
          : `🎂 ${person.name} ma jutro urodziny! (${age} lat)`;

        for (const member of person.household.members) {
          const existingNotification = await prisma.notification.findFirst({
            where: {
              userId: member.id,
              type: "SYSTEM",
              message,
              createdAt: {
                gte: today,
              },
            },
          });

          if (!existingNotification) {
            await createNotification({
              userId: member.id,
              householdId: person.household.id,
              title: "Urodziny!",
              message,
              type: "SYSTEM",
              link: `/birthdays`,
            });

            notifications.push({
              userId: member.id,
              celebrantName: person.name,
              date: isTodayBirthday ? "dziś" : "jutro",
            });
          }
        }
      }

      if (person.nameDay) {
        const [day, month] = person.nameDay.split("-").map(Number);
        const thisYearNameDay = new Date(today.getFullYear(), month - 1, day);

        const isTodayNameDay = thisYearNameDay.getTime() === today.getTime();
        const isTomorrowNameDay = thisYearNameDay.getTime() === tomorrow.getTime();

        if (isTodayNameDay || isTomorrowNameDay) {
          const message = isTodayNameDay
            ? `🎉 ${person.name} ma dziś imieniny!`
            : `🎉 ${person.name} ma jutro imieniny!`;

          for (const member of person.household.members) {
            const existingNotification = await prisma.notification.findFirst({
              where: {
                userId: member.id,
                type: "SYSTEM",
                message,
                createdAt: {
                  gte: today,
                },
              },
            });

            if (!existingNotification) {
              await createNotification({
                userId: member.id,
                householdId: person.household.id,
                title: "Imieniny!",
                message,
                type: "SYSTEM",
                link: `/birthdays`,
              });

              notifications.push({
                userId: member.id,
                celebrantName: person.name,
                date: isTodayNameDay ? "dziś" : "jutro",
              });
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Wysłano ${notifications.length} powiadomień o urodzinach/imieninach`,
      notifications,
    });
  } catch (error) {
    console.error("Błąd podczas generowania powiadomień o urodzinach:", error);
    return NextResponse.json(
      { error: "Nie udało się wygenerować powiadomień" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}

