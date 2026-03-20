import { google, calendar_v3 } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"];

/**
 * Tworzy OAuth2 client dla Google Calendar
 */
export function getGoogleOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXTAUTH_URL}/api/calendar/oauth/google/callback`
  );
}

/**
 * Generuje URL autoryzacji
 */
export function getAuthorizationUrl(userId: string) {
  const oauth2Client = getGoogleOAuthClient();

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
    state: userId, // Przekazujemy userId przez state
  });
}

/**
 * Wymienia kod na tokeny
 */
export async function exchangeCodeForTokens(code: string) {
  const oauth2Client = getGoogleOAuthClient();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

/**
 * Odświeża access token używając refresh token
 */
export async function refreshAccessToken(refreshToken: string) {
  const oauth2Client = getGoogleOAuthClient();
  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  const { credentials } = await oauth2Client.refreshAccessToken();
  return credentials;
}

/**
 * Pobiera listę kalendarzy użytkownika
 */
export async function listCalendars(accessToken: string) {
  const oauth2Client = getGoogleOAuthClient();
  oauth2Client.setCredentials({ access_token: accessToken });

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });
  const response = await calendar.calendarList.list();

  return response.data.items || [];
}

/**
 * Pobiera wydarzenia z kalendarza
 */
export async function fetchGoogleCalendarEvents(
  accessToken: string,
  calendarId: string,
  timeMin?: Date,
  timeMax?: Date
) {
  const oauth2Client = getGoogleOAuthClient();
  oauth2Client.setCredentials({ access_token: accessToken });

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  const response = await calendar.events.list({
    calendarId,
    timeMin: timeMin?.toISOString() || new Date().toISOString(),
    timeMax: timeMax?.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 250,
  });

  return response.data.items || [];
}

function buildGoogleEventResource(event: {
  summary: string;
  description?: string;
  location?: string;
  start: Date;
  end?: Date;
  isAllDay?: boolean;
}): calendar_v3.Schema$Event {
  const eventResource: calendar_v3.Schema$Event = {
    summary: event.summary,
    description: event.description,
    location: event.location,
  };

  if (event.isAllDay) {
    eventResource.start = {
      date: event.start.toISOString().split("T")[0],
      timeZone: "Europe/Warsaw",
    };
    eventResource.end = {
      date: (event.end || event.start).toISOString().split("T")[0],
      timeZone: "Europe/Warsaw",
    };
  } else {
    eventResource.start = {
      dateTime: event.start.toISOString(),
      timeZone: "Europe/Warsaw",
    };
    eventResource.end = {
      dateTime: (event.end || event.start).toISOString(),
      timeZone: "Europe/Warsaw",
    };
  }

  return eventResource;
}

/**
 * Konwertuje wydarzenie Google na nasze ICalEvent
 */
export function convertGoogleEventToICalEvent(googleEvent: calendar_v3.Schema$Event) {
  const startDate = googleEvent.start?.dateTime
    ? new Date(googleEvent.start.dateTime)
    : new Date(googleEvent.start?.date || new Date());

  const endDate = googleEvent.end?.dateTime
    ? new Date(googleEvent.end.dateTime)
    : googleEvent.end?.date
    ? new Date(googleEvent.end.date)
    : undefined;

  const isAllDay = Boolean(googleEvent.start?.date);

  return {
    uid: googleEvent.id || `google-${startDate.getTime()}`,
    summary: googleEvent.summary || "Bez tytułu",
    description: googleEvent.description || undefined,
    location: googleEvent.location || undefined,
    start: startDate,
    end: endDate,
    isAllDay,
    color: googleEvent.colorId,
    attachments: googleEvent.attachments
      ?.filter((att) => !!att.fileUrl)
      .map((att) => ({
        url: att.fileUrl as string,
        name: att.title || undefined,
      })),
    categories: [],
  };
}

/**
 * Tworzy wydarzenie w Google Calendar (dwukierunkowa sync)
 */
export async function createGoogleCalendarEvent(
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
  const oauth2Client = getGoogleOAuthClient();
  oauth2Client.setCredentials({ access_token: accessToken });

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  const eventResource = buildGoogleEventResource(event);

  const response = await calendar.events.insert({
    calendarId,
    requestBody: eventResource,
  });

  return response.data;
}

/**
 * Aktualizuje wydarzenie w Google Calendar
 */
export async function updateGoogleCalendarEvent(
  accessToken: string,
  calendarId: string,
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
  const oauth2Client = getGoogleOAuthClient();
  oauth2Client.setCredentials({ access_token: accessToken });

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  const eventResource = buildGoogleEventResource(event);

  const response = await calendar.events.update({
    calendarId,
    eventId,
    requestBody: eventResource,
  });

  return response.data;
}

/**
 * Usuwa wydarzenie z Google Calendar
 */
export async function deleteGoogleCalendarEvent(
  accessToken: string,
  calendarId: string,
  eventId: string
) {
  const oauth2Client = getGoogleOAuthClient();
  oauth2Client.setCredentials({ access_token: accessToken });

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  await calendar.events.delete({
    calendarId,
    eventId,
  });
}

