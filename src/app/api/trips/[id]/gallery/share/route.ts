import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { customAlphabet } from "nanoid";

const tokenGen = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ", 24);

async function ensureTripAccess(tripId: string, householdId: string) {
  return prisma.trip.findFirst({
    where: {
      id: tripId,
      householdId,
    },
    select: { id: true },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || !session.user.householdId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const trip = await ensureTripAccess(id, session.user.householdId);
  if (!trip) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  const now = new Date();
  const shares = await prisma.tripGalleryShare.findMany({
    where: {
      tripId: id,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: now } },
      ],
    },
    orderBy: { createdAt: "desc" },
  });

  const origin = request.headers.get("origin") ?? process.env.NEXTAUTH_URL ?? "";

  return NextResponse.json(
    shares.map((share) => ({
      id: share.id,
      token: share.token,
      url: origin ? `${origin}/gallery/${share.token}` : `/gallery/${share.token}`,
      createdAt: share.createdAt,
      expiresAt: share.expiresAt,
    }))
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || !session.user.householdId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const trip = await ensureTripAccess(id, session.user.householdId);

  if (!trip) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null) as { expiresAt?: string; ttlDays?: number } | null;
  const ttlDays = typeof body?.ttlDays === "number" ? body.ttlDays : null;
  const expiresAt = body?.expiresAt
    ? new Date(body.expiresAt)
    : ttlDays && ttlDays > 0
      ? new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000)
      : null;

  const share = await prisma.tripGalleryShare.create({
    data: {
      tripId: id,
      token: tokenGen(),
      createdBy: session.user.id,
      expiresAt,
    },
  });

  const origin = request.headers.get("origin") ?? process.env.NEXTAUTH_URL ?? "";
  const url = origin
    ? `${origin}/gallery/${share.token}`
    : `/gallery/${share.token}`;

  return NextResponse.json({
    id: share.id,
    token: share.token,
    url,
    expiresAt: share.expiresAt,
  });
}


