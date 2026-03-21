import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function ensureTripAccess(tripId: string, householdId: string) {
  return prisma.trip.findFirst({
    where: { id: tripId, householdId },
    select: { id: true },
  });
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; photoId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || !session.user.householdId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, photoId } = await params;

  const trip = await ensureTripAccess(id, session.user.householdId);
  if (!trip) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  const photo = await prisma.tripPhoto.findFirst({
    where: { id: photoId, tripId: id },
    select: { id: true },
  });

  if (!photo) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  const existingLike = await prisma.tripPhotoLike.findUnique({
    where: {
      photoId_userId: {
        photoId,
        userId: session.user.id,
      },
    },
  });

  if (existingLike) {
    return NextResponse.json({ error: "Już polubiłeś to zdjęcie" }, { status: 409 });
  }

  await prisma.tripPhotoLike.create({
    data: {
      photoId,
      userId: session.user.id,
    },
  });

  const updated = await prisma.tripPhoto.findUnique({
    where: { id: photoId },
    include: {
      uploadedBy: {
        select: {
          id: true,
          name: true,
        },
      },
      photoLikes: {
        where: { userId: session.user.id },
        select: { id: true },
      },
      _count: {
        select: { photoLikes: true },
      },
    },
  });

  if (!updated) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: updated.id,
    tripId: updated.tripId,
    url: updated.url,
    caption: updated.caption,
    uploadedBy: updated.uploadedById,
    uploadedByName: updated.uploadedBy.name,
    createdAt: updated.createdAt,
    likes: updated._count.photoLikes,
    likedByMe: updated.photoLikes.length > 0,
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; photoId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || !session.user.householdId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, photoId } = await params;

  const trip = await ensureTripAccess(id, session.user.householdId);
  if (!trip) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  const photo = await prisma.tripPhoto.findFirst({
    where: { id: photoId, tripId: id },
    select: { id: true },
  });

  if (!photo) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  const existingLike = await prisma.tripPhotoLike.findUnique({
    where: {
      photoId_userId: {
        photoId,
        userId: session.user.id,
      },
    },
  });

  if (!existingLike) {
    return NextResponse.json({ error: "Nie polubiłeś tego zdjęcia" }, { status: 409 });
  }

  await prisma.tripPhotoLike.delete({
    where: {
      photoId_userId: {
        photoId,
        userId: session.user.id,
      },
    },
  });

  const updated = await prisma.tripPhoto.findUnique({
    where: { id: photoId },
    include: {
      uploadedBy: {
        select: {
          id: true,
          name: true,
        },
      },
      photoLikes: {
        where: { userId: session.user.id },
        select: { id: true },
      },
      _count: {
        select: { photoLikes: true },
      },
    },
  });

  if (!updated) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: updated.id,
    tripId: updated.tripId,
    url: updated.url,
    caption: updated.caption,
    uploadedBy: updated.uploadedById,
    uploadedByName: updated.uploadedBy.name,
    createdAt: updated.createdAt,
    likes: updated._count.photoLikes,
    likedByMe: updated.photoLikes.length > 0,
  });
}

