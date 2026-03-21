import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PublicGalleryClient } from "./PublicGalleryClient";

interface PublicGalleryPageProps {
  params: Promise<{ token: string }>;
}

export default async function PublicGalleryPage({ params }: PublicGalleryPageProps) {
  const { token } = await params;

  const share = await prisma.tripGalleryShare.findUnique({
    where: { token },
    include: {
      trip: {
        select: {
          id: true,
          name: true,
          destination: true,
          photos: {
            include: {
              uploadedBy: {
                select: {
                  name: true,
                },
              },
              _count: {
                select: { photoLikes: true },
              },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      },
    },
  });

  if (!share) {
    notFound();
  }

  if (share.expiresAt && share.expiresAt < new Date()) {
    return (
      <main className="mx-auto max-w-4xl p-6">
        <h1 className="text-2xl font-bold">Link wygasł</h1>
        <p className="mt-2 text-muted-foreground">Ten link do galerii nie jest już aktywny.</p>
      </main>
    );
  }

  const photos = share.trip.photos.map((photo) => ({
    id: photo.id,
    tripId: share.trip.id,
    url: photo.url,
    caption: photo.caption,
    uploadedByName: photo.uploadedBy.name,
    createdAt: photo.createdAt,
    likes: photo._count.photoLikes,
  }));

  return (
    <PublicGalleryClient
      tripName={share.trip.name}
      destination={share.trip.destination}
      photos={photos}
      token={token}
    />
  );
}


