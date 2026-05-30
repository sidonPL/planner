import { prisma } from "@/lib/prisma";

export async function isUserInHousehold(
  userId: string | null | undefined,
  householdId: string
): Promise<boolean> {
  if (!userId) return false;

  const member = await prisma.user.findFirst({
    where: {
      id: userId,
      householdId,
    },
    select: { id: true },
  });

  return Boolean(member);
}
