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
      photos: {
        include: {
          uploadedBy: {
            select: {
              id: true,
              name: true,
            },
          },
          photoLikes: {
            where: {
              userId: session.user.id,
            },
            select: { id: true },
          },
          _count: {
            select: { photoLikes: true },
          },
        },
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

  const tripWithPhotoPayload = {
    ...trip,
    photos: trip.photos.map((photo) => ({
      id: photo.id,
      tripId: photo.tripId,
      url: photo.url,
      caption: photo.caption,
      uploadedBy: photo.uploadedById,
      uploadedByName: photo.uploadedBy.name,
      createdAt: photo.createdAt,
      likes: photo._count.photoLikes,
      likedByMe: photo.photoLikes.length > 0,
    })),
  };

  return (
    <TripDetailClient
      trip={tripWithPhotoPayload}
      members={members}
      currentUserId={session.user.id}
    />
  );
}

