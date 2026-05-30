import { NextRequest } from "next/server";
import { auth } from "@/auth";
import {
  registerSSEClient,
  unregisterSSEClient,
} from "@/lib/sse-hub";

export async function GET(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;

  const stream = new ReadableStream({
    start(controller) {
      registerSSEClient(userId, controller);

      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode("event: ping\ndata: connected\n\n"));

      const pingInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode("event: ping\ndata: ping\n\n"));
        } catch {
          clearInterval(pingInterval);
        }
      }, 30000);

      req.signal.addEventListener("abort", () => {
        clearInterval(pingInterval);
        unregisterSSEClient(userId, controller);
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },
    cancel() {
      // controller-specific cleanup happens in abort handler
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
