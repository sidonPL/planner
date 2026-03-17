import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Metadata } from "next";
import { ExternalBirthdaysClient } from "./ExternalBirthdaysClient";

export const metadata: Metadata = {
  title: "Urodziny znajomych | Planner",
  description: "Zarządzaj urodzinami osób spoza gospodarstwa",
};

export default async function ExternalBirthdaysPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (!session.user.householdId) {
    redirect("/onboarding");
  }

  const externalBirthdays = await prisma.externalBirthday.findMany({
    where: {
      householdId: session.user.householdId,
    },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  // Pobierz członków gospodarstwa z datami urodzenia i imieninami
  const householdMembers = await prisma.user.findMany({
    where: {
      householdId: session.user.householdId,
      OR: [
        { birthDate: { not: null } },
        { nameDay: { not: null } },
      ],
    },
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      color: true,
      birthDate: true,
      nameDay: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  return <ExternalBirthdaysClient
    externalBirthdays={externalBirthdays}
    householdMembers={householdMembers}
  />;
}

