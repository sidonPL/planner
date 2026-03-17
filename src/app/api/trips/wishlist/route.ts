import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const wishlistSchema = z.object({
  destination: z.string().min(1),
  description: z.string().optional(),
  country: z.string().optional(),
  address: z.string().optional(),
  estimatedBudget: z.number().optional(),
  currency: z.string().default("PLN"),
  priority: z.number().min(1).max(5).default(3),
  season: z.string().optional(),
  notes: z.string().optional(),
  imageUrl: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  interestedUserIds: z.array(z.string()).optional(),
});

// GET - pobierz listę marzeń
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const wishlist = await prisma.tripWishlist.findMany({
      where: {
        householdId: session.user.householdId,
      },
      include: {
        addedBy: {
          select: {
            id: true,
            name: true,
            avatar: true,
            color: true,
          },
        },
      },
      orderBy: [
        { priority: "desc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json(wishlist);
  } catch (error) {
    console.error("Error fetching wishlist:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - dodaj miejsce do listy marzeń
export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = wishlistSchema.parse(body);

    const wishlistItem = await prisma.tripWishlist.create({
      data: {
        destination: validatedData.destination,
        description: validatedData.description,
        country: validatedData.country,
        address: validatedData.address,
        estimatedBudget: validatedData.estimatedBudget,
        currency: validatedData.currency,
        priority: validatedData.priority,
        season: validatedData.season,
        notes: validatedData.notes,
        imageUrl: validatedData.imageUrl,
        latitude: validatedData.latitude,
        longitude: validatedData.longitude,
        interestedUserIds: validatedData.interestedUserIds || [],
        householdId: session.user.householdId,
        addedById: session.user.id,
      },
      include: {
        addedBy: {
          select: {
            id: true,
            name: true,
            avatar: true,
            color: true,
          },
        },
      },
    });

    return NextResponse.json(wishlistItem, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: error.issues }, { status: 400 });
    }
    console.error("Error creating wishlist item:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

