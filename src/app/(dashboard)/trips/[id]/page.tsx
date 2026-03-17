import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TripDetailClient } from "./TripDetailClient";

interface TripDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function TripDetailPage({ params }: TripDetailPageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (!session.user.householdId) {
    redirect("/");
  }

  const { id } = await params;

  const trip = await prisma.trip.findFirst({
    where: {
      id,
      householdId: session.user.householdId,
    },
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
              color: true,
            },
          },
        },
      },
      checklists: {
        include: {
          items: {
            orderBy: {
              createdAt: "asc",
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      },
      places: {
        orderBy: {
          visitOrder: "asc",
        },
      },
      documents: {
        orderBy: {
          createdAt: "desc",
        },
      },
      expenses: {
        orderBy: {
          date: "desc",
        },
      },
      itinerary: {
        include: {
          activities: {
            orderBy: {
              time: "asc",
            },
          },
        },
        orderBy: {
          date: "asc",
        },
      },
      accommodations: {
        orderBy: {
          checkIn: "asc",
        },
      },
      transports: {
        orderBy: {
          departureTime: "asc",
        },
      },
    },
  });

  if (!trip) {
    notFound();
  }

  const members = await prisma.user.findMany({
    where: {
      householdId: session.user.householdId,
    },
    select: {
      id: true,
      name: true,
      avatar: true,
      color: true,
    },
  });

  return (
    <TripDetailClient
      trip={trip}
      members={members}
      currentUserId={session.user.id}
    />
  );
}

