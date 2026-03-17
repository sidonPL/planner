import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TripsClient } from "./TripsClient";

export default async function TripsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (!session.user.householdId) {
    redirect("/");
  }

  const [trips, wishlist, members] = await Promise.all([
    prisma.trip.findMany({
      where: {
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
            items: true,
          },
        },
      },
      orderBy: {
        startDate: "asc",
      },
    }),
    prisma.tripWishlist.findMany({
      where: {
        householdId: session.user.householdId,
      },
      include: {
        addedBy: {
          select: {
            id: true,
            name: true,
            avatar: true,
            color: true,
          },
        },
      },
      orderBy: [
        { priority: "desc" },
        { createdAt: "desc" },
      ],
    }),
    prisma.user.findMany({
      where: {
        householdId: session.user.householdId,
      },
      select: {
        id: true,
        name: true,
        avatar: true,
        color: true,
      },
    }),
  ]);

  return (
    <TripsClient
      trips={trips}
      wishlist={wishlist}
      members={members}
      currentUserId={session.user.id}
    />
  );
}

