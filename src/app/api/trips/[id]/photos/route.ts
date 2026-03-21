import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { existsSync } from "fs";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "trips");

async function ensureTripAccess(tripId: string, householdId: string) {
  return prisma.trip.findFirst({
    where: {
      id: tripId,
      householdId,
    },
  });
}

export async function GET(
  _request: NextRequest,
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

  const photos = await prisma.tripPhoto.findMany({
    where: { tripId: id },
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
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    photos.map((photo) => ({
      id: photo.id,
      tripId: photo.tripId,
      url: photo.url,
      caption: photo.caption,
      uploadedBy: photo.uploadedById,
      uploadedByName: photo.uploadedBy.name,
      createdAt: photo.createdAt,
      likes: photo._count.photoLikes,
      likedByMe: photo.photoLikes.length > 0,
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

  const formData = await request.formData();
  const files = formData.getAll("photos").filter((f): f is File => f instanceof File);
  const captionRaw = formData.get("caption");
  const caption = typeof captionRaw === "string" && captionRaw.trim().length > 0
    ? captionRaw.trim()
    : null;

  if (files.length === 0) {
    return NextResponse.json({ error: "Brak zdjęć do przesłania" }, { status: 400 });
  }

  const tripUploadDir = path.join(UPLOAD_DIR, id);
  if (!existsSync(tripUploadDir)) {
    await mkdir(tripUploadDir, { recursive: true });
  }

  const createdPhotos = [] as Array<{
    id: string;
    tripId: string;
    url: string;
    caption: string | null;
    uploadedBy: string;
    uploadedByName: string | null;
    createdAt: Date;
    likes: number;
    likedByMe: boolean;
  }>;

  for (const file of files) {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Niedozwolony typ pliku: ${file.type}` },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Plik ${file.name} przekracza limit 10MB` },
        { status: 400 }
      );
    }

    const ext = path.extname(file.name) || `.${file.type.split("/")[1]}`;
    const filename = `${uuidv4()}${ext}`;
    const filepath = path.join(tripUploadDir, filename);

    const bytes = await file.arrayBuffer();
    await writeFile(filepath, Buffer.from(bytes));

    const url = `/uploads/trips/${id}/${filename}`;

    const photo = await prisma.tripPhoto.create({
      data: {
        tripId: id,
        url,
        caption,
        uploadedById: session.user.id,
      },
      include: {
        uploadedBy: {
          select: {
            name: true,
          },
        },
      },
    });

    createdPhotos.push({
      id: photo.id,
      tripId: photo.tripId,
      url: photo.url,
      caption: photo.caption,
      uploadedBy: photo.uploadedById,
      uploadedByName: photo.uploadedBy.name,
      createdAt: photo.createdAt,
      likes: 0,
      likedByMe: false,
    });
  }

  return NextResponse.json(createdPhotos, { status: 201 });
}

