type SSEController = ReadableStreamDefaultController<Uint8Array>;

const clients = new Map<string, Set<SSEController>>();

export function registerSSEClient(userId: string, controller: SSEController) {
  const existing = clients.get(userId) ?? new Set<SSEController>();
  existing.add(controller);
  clients.set(userId, existing);
}

export function unregisterSSEClient(userId: string, controller?: SSEController) {
  if (!controller) {
    clients.delete(userId);
    return;
  }

  const existing = clients.get(userId);
  if (!existing) return;

  existing.delete(controller);
  if (existing.size === 0) {
    clients.delete(userId);
  }
}

export function sendSSEEvent(userId: string, eventType: string, data: unknown) {
  const controllers = clients.get(userId);
  if (!controllers || controllers.size === 0) {
    return false;
  }

  const encoder = new TextEncoder();
  const message = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  let sent = false;

  for (const controller of controllers) {
    try {
      controller.enqueue(encoder.encode(message));
      sent = true;
    } catch (error) {
      console.error("Error sending SSE event:", error);
      controllers.delete(controller);
    }
  }

  if (controllers.size === 0) {
    clients.delete(userId);
  }

  return sent;
}

export function sendSSEToUsers(userIds: string[], eventType: string, data: unknown) {
  let sent = 0;
  for (const userId of userIds) {
    if (sendSSEEvent(userId, eventType, data)) {
      sent += 1;
    }
  }
  return sent;
}

export function broadcastToAll(eventType: string, data: unknown) {
  return sendSSEToUsers([...clients.keys()], eventType, data);
}

export function getConnectedSSEClientsCount() {
  let total = 0;
  for (const set of clients.values()) {
    total += set.size;
  }
  return total;
}
