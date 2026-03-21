import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string; photoId: string }> }
) {
  const { token, photoId } = await params;

  // Weryfikuj dostęp do galerii
  const share = await prisma.tripGalleryShare.findUnique({
    where: { token },
    select: { id: true, expiresAt: true },
  });

  if (!share) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 });
  }

  if (share.expiresAt && share.expiresAt < new Date()) {
    return NextResponse.json({ error: "Link expired" }, { status: 410 });
  }

  // Weryfikuj, że zdjęcie należy do tej galerii
  const photo = await prisma.tripPhoto.findFirst({
    where: {
      id: photoId,
      trip: {
        galleryShares: {
          some: {
            token,
          },
        },
      },
    },
    select: {
      url: true,
      id: true,
    },
  });

  if (!photo) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  // Jeśli to URL, pobierz i zwróć zawartość
  if (photo.url.startsWith("http://") || photo.url.startsWith("https://")) {
    try {
      const response = await fetch(photo.url);
      if (!response.ok) {
        return NextResponse.json(
          { error: "Failed to fetch photo" },
          { status: 500 }
        );
      }
      const buffer = await response.arrayBuffer();
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": response.headers.get("content-type") || "image/jpeg",
          "Content-Disposition": `attachment; filename="${photo.id}.jpg"`,
          "Cache-Control": "public, max-age=86400",
        },
      });
    } catch (error) {
      console.error("Error fetching external photo:", error);
      return NextResponse.json(
        { error: "Failed to fetch photo" },
        { status: 500 }
      );
    }
  }

  // Dla lokalnych URL-ów (np. /uploads/...), zwróć URL do bezpośredniego dostępu
  return NextResponse.json({
    url: photo.url,
    redirect: true,
  });
}


