import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET - pobierz odznaki
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const badges = await prisma.badge.findMany({
      orderBy: { points: "desc" },
    });

    return NextResponse.json(badges);
  } catch (error) {
    console.error("Error fetching badges:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - stwórz nową odznakę (admin only)
export async function POST() {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await Request.prototype.json.call(arguments[0]);
    const { name, description, icon, condition, points } = body;

    if (!name || !condition) {
      return NextResponse.json(
        { error: "Name and condition are required" },
        { status: 400 }
      );
    }

    const badge = await prisma.badge.create({
      data: {
        name,
        description: description || null,
        icon: icon || null,
        condition,
        points: points || 0,
      },
    });

    return NextResponse.json(badge, { status: 201 });
  } catch (error) {
    console.error("Error creating badge:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

