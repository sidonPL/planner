import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SettingsClient } from "./SettingsClient";

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      settings: true,
      household: true,
    },
  });

  const members = session.user.householdId
    ? await prisma.user.findMany({
        where: { householdId: session.user.householdId },
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          color: true,
          role: true,
        },
      })
    : [];

  return (
    <SettingsClient
      user={user}
      members={members}
      currentUserId={session.user.id}
    />
  );
}

