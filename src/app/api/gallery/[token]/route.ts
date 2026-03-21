import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
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
                  id: true,
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
    return NextResponse.json({ error: "Link not found" }, { status: 404 });
  }

  if (share.expiresAt && share.expiresAt < new Date()) {
    return NextResponse.json({ error: "Link expired" }, { status: 410 });
  }

  return NextResponse.json({
    trip: {
      id: share.trip.id,
      name: share.trip.name,
      destination: share.trip.destination,
    },
    photos: share.trip.photos.map((photo) => ({
      id: photo.id,
      tripId: photo.tripId,
      url: photo.url,
      caption: photo.caption,
      uploadedBy: photo.uploadedById,
      uploadedByName: photo.uploadedBy.name,
      createdAt: photo.createdAt,
      likes: photo._count.photoLikes,
      likedByMe: false,
    })),
  });
}
