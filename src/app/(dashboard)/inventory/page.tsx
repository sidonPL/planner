import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { InventoryClient } from "./InventoryClient";

export default async function InventoryPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (!session.user.householdId) {
    redirect("/");
  }

  const items = await prisma.inventoryItem.findMany({
    where: {
      householdId: session.user.householdId,
    },
    orderBy: [
      { category: "asc" },
      { name: "asc" },
    ],
  });

  return <InventoryClient items={items} />;
}

