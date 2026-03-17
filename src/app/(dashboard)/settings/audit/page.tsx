import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AuditClient } from "./AuditClient";

export default async function AuditPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (!session.user.householdId) {
    redirect("/");
  }

  // Pobierz członków gospodarstwa dla filtrów
  const members = await prisma.user.findMany({
    where: { householdId: session.user.householdId },
    select: {
      id: true,
      name: true,
      color: true,
    },
  });

  return <AuditClient members={members} />;
}

