// filepath: c:\Users\sidon\IdeaProjects\planner\src\app\(dashboard)\shopping\history\page.tsx
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ShoppingHistoryClient } from "./ShoppingHistoryClient";

export default async function ShoppingHistoryPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (!session.user.householdId) {
    redirect("/onboarding");
  }

  // Pobierz zakupione produkty pogrupowane po dacie
  const purchasedItems = await prisma.shoppingItem.findMany({
    where: {
      householdId: session.user.householdId,
      isPurchased: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  // Grupuj po dacie zakupu
  const groupedByDate = purchasedItems.reduce((acc, item) => {
    const dateKey = item.updatedAt.toISOString().split("T")[0];
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(item);
    return acc;
  }, {} as Record<string, typeof purchasedItems>);

  // Konwertuj na tablicę i sortuj po dacie
  const history = Object.entries(groupedByDate)
    .map(([date, items]) => ({
      date,
      items,
      totalItems: items.length,
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return <ShoppingHistoryClient history={history} />;
}

