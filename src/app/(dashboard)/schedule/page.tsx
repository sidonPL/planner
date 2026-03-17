import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ScheduleClient } from "./ScheduleClient";

export default async function SchedulePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (!session.user.householdId) {
    redirect("/");
  }

  const [schedules, members] = await Promise.all([
    prisma.schedule.findMany({
      where: {
        householdId: session.user.householdId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        exceptions: {
          orderBy: {
            date: "asc",
          },
        },
      },
      orderBy: {
        startTime: "asc",
      },
    }),
    prisma.user.findMany({
      where: {
        householdId: session.user.householdId,
      },
      select: {
        id: true,
        name: true,
        color: true,
      },
    }),
  ]);

  return (
    <ScheduleClient
      schedules={schedules}
      members={members}
      currentUserId={session.user.id}
    />
  );
}

