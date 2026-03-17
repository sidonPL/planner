import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { z } from "zod";

const shoppingItemSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().optional().nullable(),
  unit: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  isUrgent: z.boolean().optional(),
  price: z.number().optional().nullable(),
  store: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  assignedToId: z.string().optional().nullable(),
});

// GET - pobierz listę zakupów
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const items = await prisma.shoppingItem.findMany({
      where: {
        householdId: session.user.householdId,
      },
      orderBy: [
        { isPurchased: "asc" },
        { isUrgent: "desc" },
        { category: "asc" },
        { name: "asc" },
      ],
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error("Error fetching shopping items:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - dodaj produkt
export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = shoppingItemSchema.parse(body);

    const item = await prisma.shoppingItem.create({
      data: {
        name: validatedData.name,
        quantity: validatedData.quantity,
        unit: validatedData.unit,
        category: validatedData.category,
        isUrgent: validatedData.isUrgent || false,
        price: validatedData.price,
        store: validatedData.store,
        notes: validatedData.notes,
        assignedToId: validatedData.assignedToId,
        addedBy: session.user.id,
        householdId: session.user.householdId,
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            avatar: true,
            color: true,
          },
        },
      },
    });

    // Jeśli pilny zakup, powiadom członków gospodarstwa
    if (validatedData.isUrgent) {
      const members = await prisma.user.findMany({
        where: {
          householdId: session.user.householdId,
          id: { not: session.user.id }, // Nie powiadamiaj dodającego
        },
        select: { id: true },
      });

      const userName = session.user.name || "Ktoś";
      const message = `🛒 ${userName} dodał pilny zakup: ${validatedData.name}${
        validatedData.quantity ? ` (${validatedData.quantity}${validatedData.unit || ""})` : ""
      }`;

      for (const member of members) {
        await createNotification({
          userId: member.id,
          householdId: session.user.householdId,
          title: "Pilny zakup!",
          message,
          type: "SHOPPING_REMINDER",
          link: "/shopping",
        });
      }
    }

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: error.issues }, { status: 400 });
    }
    console.error("Error creating shopping item:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

