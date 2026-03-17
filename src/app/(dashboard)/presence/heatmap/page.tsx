import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { HeatmapClient } from "./HeatmapClient";

export default async function HeatmapPage() {
  const session = await auth();

  if (!session?.user?.householdId) {
    redirect("/auth/signin");
  }

  return <HeatmapClient />;
}
