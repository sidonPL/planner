import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function canAccessTrip(tripId: string, householdId: string) {
  return prisma.trip.findFirst({
    where: { id: tripId, householdId },
    select: { id: true },
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; photoId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || !session.user.householdId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, photoId } = await params;
  const trip = await canAccessTrip(id, session.user.householdId);
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

  const body = await request.json().catch(() => null) as { caption?: string | null } | null;
  const caption = body?.caption?.trim() ? body.caption.trim() : null;

  const photo = await prisma.tripPhoto.findFirst({
    where: { id: photoId, tripId: id },
    select: { uploadedById: true },
  });

  if (!photo) return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  if (photo.uploadedById !== session.user.id) {
    return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
  }

  const updated = await prisma.tripPhoto.update({
    where: { id: photoId },
    data: { caption },
    include: {
      uploadedBy: { select: { name: true } },
      photoLikes: { where: { userId: session.user.id }, select: { id: true } },
      _count: { select: { photoLikes: true } },
    },
  });

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
  const trip = await canAccessTrip(id, session.user.householdId);
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

  const photo = await prisma.tripPhoto.findFirst({
    where: { id: photoId, tripId: id },
    select: { uploadedById: true },
  });

  if (!photo) return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  if (photo.uploadedById !== session.user.id) {
    return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
  }

  await prisma.tripPhoto.delete({ where: { id: photoId } });
  return NextResponse.json({ success: true });
}

