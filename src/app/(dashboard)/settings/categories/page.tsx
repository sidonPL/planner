// filepath: c:\Users\sidon\IdeaProjects\planner\src\app\(dashboard)\settings\categories\page.tsx
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CategoriesClient } from "./CategoriesClient";

export default async function CategoriesPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (!session.user.householdId) {
    redirect("/onboarding");
  }

  const categories = await prisma.category.findMany({
    where: { householdId: session.user.householdId },
    include: {
      _count: {
        select: { tasks: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return <CategoriesClient categories={categories} />;
}

