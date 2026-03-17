import { ConfidentialClientApplication } from "@azure/msal-node";

const SCOPES = ["Calendars.Read", "offline_access"];

/**
 * Tworzy MSAL client dla Microsoft OAuth
 */
function getMsalClient() {
  return new ConfidentialClientApplication({
    auth: {
      clientId: process.env.MICROSOFT_CLIENT_ID!,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
      authority: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID || "common"}`,
    },
  });
}

/**
 * Generuje URL autoryzacji
 */
export function getMicrosoftAuthUrl(userId: string) {
  const msalClient = getMsalClient();
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/calendar/oauth/microsoft/callback`;

  return msalClient.getAuthCodeUrl({
    scopes: SCOPES,
    redirectUri,
    state: userId,
  });
}

/**
 * Wymienia kod na tokeny
 */
export async function exchangeMicrosoftCode(code: string) {
  const msalClient = getMsalClient();
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/calendar/oauth/microsoft/callback`;

  const response = await msalClient.acquireTokenByCode({
    code,
    scopes: SCOPES,
    redirectUri,
  });

  // MSAL przechowuje refresh token wewnętrznie, zwracamy account.homeAccountId jako identifier
  return {
    accessToken: response.accessToken,
    refreshToken: response.account?.homeAccountId || code, // Używamy homeAccountId
    expiresOn: response.expiresOn,
  };
}

/**
 * Odświeża access token
 */
export async function refreshMicrosoftToken(refreshToken: string) {
  const msalClient = getMsalClient();

  const response = await msalClient.acquireTokenByRefreshToken({
    refreshToken,
    scopes: SCOPES,
  });

  if (!response) {
    throw new Error("Failed to refresh Microsoft token: No response received");
  }

  return {
    accessToken: response.accessToken,
    refreshToken, // MSAL nie zwraca nowego refresh token, używamy starego
    expiresOn: response.expiresOn,
  };
}

/**
 * Pobiera kalendarze użytkownika
 */
export async function listMicrosoftCalendars(accessToken: string) {
  const response = await fetch("https://graph.microsoft.com/v1.0/me/calendars", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Microsoft API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.value || [];
}

/**
 * Pobiera wydarzenia z kalendarza
 */
export async function fetchMicrosoftCalendarEvents(
  accessToken: string,
  calendarId?: string,
  startDateTime?: string,
  endDateTime?: string
) {
  const calendarPath = calendarId ? `/calendars/${calendarId}` : "";
  const params = new URLSearchParams();

  if (startDateTime) params.append("startDateTime", startDateTime);
  if (endDateTime) params.append("endDateTime", endDateTime);
  params.append("$top", "250");
  params.append("$orderby", "start/dateTime");

  const url = `https://graph.microsoft.com/v1.0/me${calendarPath}/events?${params}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Prefer: 'outlook.timezone="UTC"',
    },
  });

  if (!response.ok) {
    throw new Error(`Microsoft API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.value || [];
}

interface MicrosoftEvent {
  id: string;
  subject?: string;
  bodyPreview?: string;
  body?: { content?: string };
  location?: { displayName?: string };
  start: { dateTime: string };
  end?: { dateTime: string };
  isAllDay?: boolean;
  categories?: string[];
  attachments?: Array<{
    id: string;
    name: string;
    contentUrl?: string;
  }>;
}

/**
 * Konwertuje wydarzenie Microsoft na ICalEvent
 */
export function convertMicrosoftEventToICalEvent(msEvent: MicrosoftEvent) {
  const startDate = new Date(msEvent.start.dateTime);
  const endDate = msEvent.end ? new Date(msEvent.end.dateTime) : undefined;
  const isAllDay = msEvent.isAllDay || false;

  return {
    uid: msEvent.id,
    summary: msEvent.subject || "Bez tytułu",
    description: msEvent.bodyPreview || msEvent.body?.content,
    location: msEvent.location?.displayName,
    start: startDate,
    end: endDate,
    isAllDay,
    color: msEvent.categories?.[0], // Pierwsza kategoria jako kolor
    attachments: msEvent.attachments?.map((att) => ({
      url: att.contentUrl || `attachment:${att.id}`,
      name: att.name,
    })),
    categories: msEvent.categories || [],
  };
}

/**
 * Tworzy wydarzenie w Microsoft Calendar
 */
export async function createMicrosoftCalendarEvent(
  accessToken: string,
  calendarId: string,
  event: {
    summary: string;
    description?: string;
    location?: string;
    start: Date;
    end?: Date;
    isAllDay?: boolean;
  }
) {
  interface MicrosoftEventResource {
    subject: string;
    body: {
      contentType: string;
      content: string;
    };
    start: {
      dateTime: string;
      timeZone: string;
    };
    end: {
      dateTime: string;
      timeZone: string;
    };
    isAllDay: boolean;
    location?: {
      displayName: string;
    };
  }

  const eventResource: MicrosoftEventResource = {
    subject: event.summary,
    body: {
      contentType: "Text",
      content: event.description || "",
    },
    start: {
      dateTime: event.start.toISOString(),
      timeZone: "Europe/Warsaw",
    },
    end: {
      dateTime: (event.end || event.start).toISOString(),
      timeZone: "Europe/Warsaw",
    },
    isAllDay: event.isAllDay || false,
  };

  if (event.location) {
    eventResource.location = {
      displayName: event.location,
    };
  }

  const calendarPath = calendarId ? `/calendars/${calendarId}` : "";
  const url = `https://graph.microsoft.com/v1.0/me${calendarPath}/events`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(eventResource),
  });

  if (!response.ok) {
    throw new Error(`Microsoft API error: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Aktualizuje wydarzenie w Microsoft Calendar
 */
export async function updateMicrosoftCalendarEvent(
  accessToken: string,
  eventId: string,
  event: {
    summary: string;
    description?: string;
    location?: string;
    start: Date;
    end?: Date;
    isAllDay?: boolean;
  }
) {
  interface MicrosoftEventResource {
    subject: string;
    body: {
      contentType: string;
      content: string;
    };
    start: {
      dateTime: string;
      timeZone: string;
    };
    end: {
      dateTime: string;
      timeZone: string;
    };
    isAllDay: boolean;
    location?: {
      displayName: string;
    };
  }

  const eventResource: MicrosoftEventResource = {
    subject: event.summary,
    body: {
      contentType: "Text",
      content: event.description || "",
    },
    start: {
      dateTime: event.start.toISOString(),
      timeZone: "Europe/Warsaw",
    },
    end: {
      dateTime: (event.end || event.start).toISOString(),
      timeZone: "Europe/Warsaw",
    },
    isAllDay: event.isAllDay || false,
  };

  if (event.location) {
    eventResource.location = {
      displayName: event.location,
    };
  }

  const url = `https://graph.microsoft.com/v1.0/me/events/${eventId}`;

  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(eventResource),
  });

  if (!response.ok) {
    throw new Error(`Microsoft API error: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Usuwa wydarzenie z Microsoft Calendar
 */
export async function deleteMicrosoftCalendarEvent(
  accessToken: string,
  eventId: string
) {
  const url = `https://graph.microsoft.com/v1.0/me/events/${eventId}`;

  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Microsoft API error: ${response.statusText}`);
  }
}

