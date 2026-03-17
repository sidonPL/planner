import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { CookingStatsClient } from "./CookingStatsClient";

export default async function RecipeStatisticsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return <CookingStatsClient />;
}

