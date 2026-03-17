import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { WeeklyReportClient } from "./WeeklyReportClient";

export default async function WeeklyReportsPage() {
  const session = await auth();

  if (!session?.user?.householdId) {
    redirect("/auth/signin");
  }

  return <WeeklyReportClient />;
}
