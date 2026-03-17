import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const toggleSchema = z.object({
  enabled: z.boolean(),
});

// PATCH - Włącz/wyłącz udostępnianie lokalizacji
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { enabled } = toggleSchema.parse(body);

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        shareLocationWithFamily: enabled,
        // Jeśli wyłączamy, usuń lokalizację
        ...(enabled === false && {
          lastKnownLatitude: null,
          lastKnownLongitude: null,
          lastLocationUpdate: null,
        }),
      },
    });

    return NextResponse.json({ success: true, enabled });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Error toggling location sharing:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

