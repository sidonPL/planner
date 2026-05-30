import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCronAuth } from "@/lib/web-push";

import { createNotification } from "@/lib/notifications";


export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Pobierz wszystkie pozycje zapasów z ustawionym minimalnym stanem
    const lowStockItems = await prisma.inventoryItem.findMany({
      where: {
        minQuantity: {
          not: null,
        },
      },
      include: {
        household: {
          include: {
            members: {
              select: {
                id: true,
                role: true,
              },
            },
          },
        },
      },
    });

    const notifications: { itemId: string; itemName: string; quantity: number; minQuantity: number }[] = [];

    for (const item of lowStockItems) {
      // Sprawdź czy stan jest niski
      if (item.minQuantity !== null && item.quantity <= item.minQuantity) {
        const message = `📦 Niski stan zapasów: ${item.name} (${item.quantity} ${item.unit || "szt."} / min. ${item.minQuantity} ${item.unit || "szt."})`;

        // Wyślij powiadomienie do adminów gospodarstwa
        const admins = item.household.members.filter((m) => m.role === "ADMIN");

        for (const admin of admins) {
          // Sprawdź czy powiadomienie nie zostało już wysłane dzisiaj
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const existingNotification = await prisma.notification.findFirst({
            where: {
              userId: admin.id,
              type: "SYSTEM",
              message,
              createdAt: {
                gte: today,
              },
            },
          });

          if (!existingNotification) {
            await createNotification({
              userId: admin.id,
              householdId: item.householdId,
              title: "Niski stan zapasów",
              message,
              type: "SYSTEM",
              link: `/inventory`,
            });

            notifications.push({
              itemId: item.id,
              itemName: item.name,
              quantity: item.quantity,
              minQuantity: item.minQuantity,
            });

            // Automatycznie dodaj do listy zakupów jeśli włączone auto-restock
            if (item.autoRestock) {
              const existingShoppingItem = await prisma.shoppingItem.findFirst({
                where: {
                  householdId: item.householdId,
                  name: item.name,
                  isPurchased: false,
                },
              });

              if (!existingShoppingItem) {
                await prisma.shoppingItem.create({
                  data: {
                    name: item.name,
                    quantity: item.minQuantity,
                    unit: item.unit,
                    category: item.category,
                    householdId: item.householdId,
                    isUrgent: true,
                    notes: `Automatycznie dodane - niski stan w zapasach`,
                  },
                });
              }
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Wysłano ${notifications.length} powiadomień o niskim stanie zapasów`,
      notifications,
    });
  } catch (error) {
    console.error("Błąd podczas generowania alertów o zapasach:", error);
    return NextResponse.json(
      { error: "Nie udało się wygenerować alertów" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}

