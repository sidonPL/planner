import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ShoppingClient } from "./ShoppingClient";

export default async function ShoppingPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (!session.user.householdId) {
    redirect("/");
  }

  const [shoppingItems, inventoryItems, householdUsers] = await Promise.all([
    prisma.shoppingItem.findMany({
      where: {
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
      orderBy: [
        { isPurchased: "asc" },
        { isUrgent: "desc" },
        { category: "asc" },
        { name: "asc" },
      ],
    }),
    prisma.inventoryItem.findMany({
      where: {
        householdId: session.user.householdId,
      },
    }),
    prisma.user.findMany({
      where: {
        householdId: session.user.householdId,
      },
      select: {
        id: true,
        name: true,
        avatar: true,
        color: true,
      },
    }),
  ]);

  return (
    <ShoppingClient
      initialItems={shoppingItems}
      inventoryItems={inventoryItems}
      householdUsers={householdUsers}
      currentUserId={session.user.id}
    />
  );
}

