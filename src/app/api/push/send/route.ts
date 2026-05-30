import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/web-push";
import { isUserInHousehold } from "@/lib/household-validation";

// POST - wyślij powiadomienie push do użytkownika
export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { userId, title, message, url, tag, actions, notificationId, taskId } = body;

    const targetUserId = userId || session.user.id;

    if (
      targetUserId !== session.user.id &&
      session.user.role !== "ADMIN"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (
      session.user.householdId &&
      targetUserId !== session.user.id &&
      !(await isUserInHousehold(targetUserId, session.user.householdId))
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: {
        settings: true,
        pushSubscriptions: true,
      },
    });

    if (!user || user.pushSubscriptions.length === 0) {
      return NextResponse.json(
        { error: "No push subscriptions found for user" },
        { status: 404 }
      );
    }

    if (user.settings?.pushEnabled === false) {
      return NextResponse.json(
        { error: "Push notifications disabled for user" },
        { status: 403 }
      );
    }

    const result = await sendPushToUser(targetUserId, {
      title: title || "Planner",
      body: message || "Nowe powiadomienie",
      url: url || "/",
      tag: tag || `planner-${Date.now()}`,
      actions: actions || [],
      notificationId,
      taskId,
    });

    if (result.sent === 0) {
      return NextResponse.json(
        { error: "Push notifications not configured or delivery failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      sent: result.sent,
      failed: result.failed,
    });
  } catch (error) {
    console.error("Error sending push notification:", error);
    return NextResponse.json(
      { error: "Failed to send notification" },
      { status: 500 }
    );
  }
}
