import { NextRequest } from "next/server";
import { auth } from "@/auth";

// Przechowuj aktywne połączenia SSE
const clients = new Map<string, ReadableStreamDefaultController>();

export async function GET(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;

  // Utwórz stream SSE
  const stream = new ReadableStream({
    start(controller) {
      // Zapisz kontroler dla tego użytkownika
      clients.set(userId, controller);

      // Wyślij inicjalny ping
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode("event: ping\ndata: connected\n\n"));

      // Keep-alive ping co 30 sekund
      const pingInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode("event: ping\ndata: ping\n\n"));
        } catch {
          clearInterval(pingInterval);
        }
      }, 30000);

      // Cleanup przy zamknięciu
      req.signal.addEventListener("abort", () => {
        clearInterval(pingInterval);
        clients.delete(userId);
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },
    cancel() {
      clients.delete(userId);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

// Funkcja pomocnicza do wysyłania eventów do konkretnego użytkownika
export function sendSSEEvent(userId: string, eventType: string, data: unknown) {
  const controller = clients.get(userId);
  if (controller) {
    try {
      const encoder = new TextEncoder();
      const message = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
      controller.enqueue(encoder.encode(message));
    } catch (error) {
      console.error("Error sending SSE event:", error);
      clients.delete(userId);
    }
  }
}

// Funkcja do wysyłania eventów do wszystkich użytkowników z danego gospodarstwa
export function broadcastToHousehold(householdId: string, eventType: string, data: unknown) {
  // Ta funkcja wymaga dodatkowej logiki do mapowania householdId -> userId
  // Na razie zostawiamy jako placeholder
  console.log("Broadcasting to household:", householdId, eventType, data);
}

// Funkcja do wysyłania eventów do wszystkich połączonych użytkowników
export function broadcastToAll(eventType: string, data: unknown) {
  const encoder = new TextEncoder();
  const message = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;

  clients.forEach((controller, userId) => {
    try {
      controller.enqueue(encoder.encode(message));
    } catch (error) {
      console.error(`Error broadcasting to user ${userId}:`, error);
      clients.delete(userId);
    }
  });
}

