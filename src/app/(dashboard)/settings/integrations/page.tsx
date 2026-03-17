import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CalendarIntegrationsClient } from "./CalendarIntegrationsClient";

export default async function CalendarIntegrationsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  // Pobierz integracje użytkownika
  const integrations = await prisma.calendarIntegration.findMany({
    where: {
      userId: session.user.id,
    },
    include: {
      _count: {
        select: { importedEvents: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return <CalendarIntegrationsClient integrations={integrations} />;
}

