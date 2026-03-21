import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; shareId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || !session.user.householdId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, shareId } = await params;

  const trip = await prisma.trip.findFirst({
    where: {
      id,
      householdId: session.user.householdId,
    },
    select: { id: true },
  });

  if (!trip) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  const share = await prisma.tripGalleryShare.findFirst({
    where: {
      id: shareId,
      tripId: id,
    },
    select: { id: true },
  });

  if (!share) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 });
  }

  await prisma.tripGalleryShare.delete({ where: { id: shareId } });
  return NextResponse.json({ success: true });
}

