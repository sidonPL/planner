import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { FamilyLocationClient } from "./FamilyLocationClient";
import { prisma } from "@/lib/prisma";

export default async function FamilyLocationPage() {
  const session = await auth();

  if (!session?.user?.householdId) {
    redirect("/auth/signin");
  }

  // Pobierz aktualny status użytkownika
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { shareLocationWithFamily: true },
  });

  return <FamilyLocationClient initialSharingEnabled={user?.shareLocationWithFamily || false} />;
}

