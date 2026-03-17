import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PresenceClient } from "./PresenceClient";

export default async function PresencePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (!session.user.householdId) {
    redirect("/");
  }

  const [members, presenceHistory, geofenceZones, geofenceEvents] = await Promise.all([
    prisma.user.findMany({
      where: {
        householdId: session.user.householdId,
      },
      include: {
        presenceRecords: {
          orderBy: {
            timestamp: "desc",
          },
          take: 1,
        },
      },
    }),
    prisma.presence.findMany({
      where: {
        user: {
          householdId: session.user.householdId,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
      orderBy: {
        timestamp: "desc",
      },
      take: 50,
    }),
    prisma.geofenceZone.findMany({
      where: {
        householdId: session.user.householdId,
      },
      include: {
        _count: {
          select: { events: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.geofenceEvent.findMany({
      where: {
        zone: {
          householdId: session.user.householdId,
        },
      },
      include: {
        zone: {
          select: {
            id: true,
            name: true,
            type: true,
            color: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
      orderBy: { timestamp: "desc" },
      take: 50,
    }),
  ]);

  // Mapuj members do oczekiwanego formatu
  const mappedMembers = members.map(m => ({
    id: m.id,
    name: m.name,
    email: m.email,
    avatar: m.avatar,
    color: m.color,
    presenceRecords: m.presenceRecords,
  }));

  return (
    <PresenceClient
      members={mappedMembers}
      presenceHistory={presenceHistory}
      geofenceZones={geofenceZones}
      geofenceEvents={geofenceEvents}
      currentUserId={session.user.id}
      householdId={session.user.householdId}
    />
  );
}

