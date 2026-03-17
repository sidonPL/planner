import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const session = await auth();
    const { provider } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Map provider names
    const providerMap: Record<string, string> = {
      google: "google",
      facebook: "facebook",
      microsoft: "microsoft-entra-id",
    };

    const actualProvider = providerMap[provider];
    if (!actualProvider) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }

    // Check if user has password (can't disconnect if no password)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { password: true },
    });

    // Check if user has other OAuth accounts
    const otherAccounts = await prisma.account.count({
      where: {
        userId: session.user.id,
        provider: { not: actualProvider },
      },
    });

    if (!user?.password && otherAccounts === 0) {
      return NextResponse.json(
        { error: "Nie możesz odłączyć ostatniej metody logowania. Ustaw najpierw hasło." },
        { status: 400 }
      );
    }

    // Delete the OAuth account
    await prisma.account.deleteMany({
      where: {
        userId: session.user.id,
        provider: actualProvider,
      },
    });

    // Also delete calendar integration if Google or Microsoft
    if (provider === "google" || provider === "microsoft") {
      await prisma.calendarIntegration.deleteMany({
        where: {
          userId: session.user.id,
          type: provider === "google" ? "GOOGLE" : "OUTLOOK",
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error disconnecting OAuth:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

