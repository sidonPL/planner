import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { HouseholdSettingsClient } from "./HouseholdSettingsClient";

export default async function HouseholdSettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (!session.user.householdId) {
    redirect("/onboarding");
  }

  const household = await prisma.household.findUnique({
    where: { id: session.user.householdId },
  });

  if (!household) {
    redirect("/onboarding");
  }

  const users = await prisma.user.findMany({
    where: { householdId: session.user.householdId },
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      color: true,
      role: true,
    },
  });

  const currentUser = users.find(u => u.id === session.user.id);

  return (
    <HouseholdSettingsClient
      household={{ ...household, users }}
      currentUserId={session.user.id}
      isAdmin={currentUser?.role === "ADMIN"}
    />
  );
}

