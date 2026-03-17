import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { NewRecipeClient } from "./NewRecipeClient";

export default async function NewRecipePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (!session.user.householdId) {
    redirect("/");
  }

  return <NewRecipeClient />;
}

