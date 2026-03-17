import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check for OAuth accounts
    const accounts = await prisma.account.findMany({
      where: {
        userId: session.user.id,
      },
      select: {
        provider: true,
      },
    });

    const connections = {
      google: accounts.some(a => a.provider === "google"),
      facebook: accounts.some(a => a.provider === "facebook"),
      microsoft: accounts.some(a => a.provider === "microsoft-entra-id"),
    };

    return NextResponse.json(connections);
  } catch (error) {
    console.error("Error fetching OAuth connections:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

