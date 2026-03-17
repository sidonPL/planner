import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import ProfileClient from "./ProfileClient";

export const metadata: Metadata = {
  title: "Profil | Family Planner",
  description: "Zarządzaj swoim profilem",
};

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      color: true,
      birthDate: true,
      nameDay: true,
      role: true,
      householdId: true,
      household: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!user) {
    redirect("/login");
  }

  return <ProfileClient user={user} />;
}

