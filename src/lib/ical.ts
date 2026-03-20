/**
 * Parser i generator dla formatu iCalendar (.ics)
 * RFC 5545: https://tools.ietf.org/html/rfc5545
 */

export interface ICalEvent {
  uid: string;
  summary: string;
  description?: string;
  location?: string;
  start: Date;
  end?: Date;
  isAllDay: boolean;
  rrule?: string; // Reguła powtarzania
  categories?: string[]; // Kategorie wydarzenia
  color?: string; // Kolor z kalendarza
  attachments?: Array<{ url: string; name?: string }>; // Załączniki
  raw?: string; // Oryginalny fragment
}

/**
 * Parsuje plik .ics i zwraca tablicę wydarzeń
 */
export function parseICS(icalData: string): ICalEvent[] {
  const events: ICalEvent[] = [];
  const lines = icalData.split(/\r?\n/);

  let currentEvent: Partial<ICalEvent> | null = null;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();

    // Obsługa line folding (linie zaczynające się od spacji)
    while (i + 1 < lines.length && lines[i + 1].match(/^[ \t]/)) {
      i++;
      line += lines[i].trim();
    }

    if (line === 'BEGIN:VEVENT') {
      currentEvent = {};
      continue;
    }

    if (line === 'END:VEVENT') {
      if (currentEvent && currentEvent.uid && currentEvent.summary && currentEvent.start) {
        events.push({
          uid: currentEvent.uid,
          summary: currentEvent.summary,
          description: currentEvent.description,
          location: currentEvent.location,
          start: currentEvent.start,
          end: currentEvent.end,
          isAllDay: currentEvent.isAllDay || false,
          rrule: currentEvent.rrule,
          categories: currentEvent.categories,
          color: currentEvent.color,
          raw: currentEvent.raw,
        });
      }
      currentEvent = null;
      continue;
    }

    if (!currentEvent) continue;

    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    const fullProperty = line.substring(0, colonIndex);
    const value = line.substring(colonIndex + 1);

    // Właściwość może mieć parametry np. DTSTART;VALUE=DATE:20231225
    const [property, ...params] = fullProperty.split(';');
    const paramMap: Record<string, string> = {};
    params.forEach(p => {
      const [key, val] = p.split('=');
      if (key && val) paramMap[key] = val;
    });

    switch (property) {
      case 'UID':
        currentEvent.uid = value;
        break;

      case 'SUMMARY':
        currentEvent.summary = unescapeICalText(value);
        break;

      case 'DESCRIPTION':
        currentEvent.description = unescapeICalText(value);
        break;

      case 'LOCATION':
        currentEvent.location = unescapeICalText(value);
        break;

      case 'DTSTART':
        currentEvent.start = parseICalDate(value);
        currentEvent.isAllDay = paramMap.VALUE === 'DATE';
        break;

      case 'DTEND':
        currentEvent.end = parseICalDate(value);
        break;

      case 'RRULE':
        currentEvent.rrule = value;
        break;

      case 'CATEGORIES':
        currentEvent.categories = value.split(',').map(c => c.trim());
        break;

      case 'COLOR':
      case 'X-APPLE-CALENDAR-COLOR':
      case 'X-OUTLOOK-COLOR':
        currentEvent.color = value;
        break;

      case 'ATTACH':
        // Załączniki w .ics mogą mieć różne formaty
        if (!currentEvent.attachments) {
          currentEvent.attachments = [];
        }
        // Format: ATTACH;FILENAME=document.pdf:http://example.com/doc.pdf
        const filename = paramMap.FILENAME || extractFilenameFromUrl(value);
        currentEvent.attachments.push({
          url: value,
          name: filename,
        });
        break;
    }
  }

  return events;
}

/**
 * Parsuje datę z formatu iCalendar
 * Formaty:
 * - 20231225 (DATE)
 * - 20231225T120000 (lokalna data-czas)
 * - 20231225T120000Z (UTC)
 * - 20231225T120000;TZID=Europe/Warsaw (ze strefą czasową)
 */
function parseICalDate(value: string): Date {
  // Usuń TZID jeśli jest
  const dateStr = value.replace(/TZID=[^:]+:/, '');

  // Data bez czasu (VALUE=DATE)
  if (dateStr.length === 8) {
    const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(4, 6)) - 1;
    const day = parseInt(dateStr.substring(6, 8));
    return new Date(year, month, day);
  }

  // Data z czasem
  const year = parseInt(dateStr.substring(0, 4));
  const month = parseInt(dateStr.substring(4, 6)) - 1;
  const day = parseInt(dateStr.substring(6, 8));
  const hour = parseInt(dateStr.substring(9, 11));
  const minute = parseInt(dateStr.substring(11, 13));
  const second = parseInt(dateStr.substring(13, 15));

  // UTC (kończy się na Z)
  if (dateStr.endsWith('Z')) {
    return new Date(Date.UTC(year, month, day, hour, minute, second));
  }

  // Lokalna data-czas
  return new Date(year, month, day, hour, minute, second);
}

/**
 * Unescape tekstu z formatu iCalendar
 * \n -> nowa linia
 * \, -> przecinek
 * \; -> średnik
 * \\ -> backslash
 */
function unescapeICalText(text: string): string {
  return text
    .replace(/\\n/g, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}

/**
 * Escape tekstu do formatu iCalendar
 */
function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Wyciąga nazwę pliku z URL
 */
function extractFilenameFromUrl(url: string): string | undefined {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const filename = pathname.split('/').pop();
    return filename && filename.length > 0 ? decodeURIComponent(filename) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Formatuje datę do formatu iCalendar
 */
function formatICalDate(date: Date, isAllDay: boolean): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  if (isAllDay) {
    return `${year}${month}${day}`;
  }

  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');

  return `${year}${month}${day}T${hour}${minute}${second}`;
}

/**
 * Generuje plik .ics z wydarzeń
 */
export function generateICS(events: ICalEvent[], calendarName: string = 'Calendar'): string {
  const lines: string[] = [];

  lines.push('BEGIN:VCALENDAR');
  lines.push('VERSION:2.0');
  lines.push('PRODID:-//Planner Domowy//Calendar Export//PL');
  lines.push(`X-WR-CALNAME:${escapeICalText(calendarName)}`);
  lines.push('X-WR-TIMEZONE:Europe/Warsaw');

  events.forEach(event => {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${event.uid}`);
    lines.push(`SUMMARY:${escapeICalText(event.summary)}`);

    if (event.description) {
      lines.push(`DESCRIPTION:${escapeICalText(event.description)}`);
    }

    if (event.location) {
      lines.push(`LOCATION:${escapeICalText(event.location)}`);
    }

    if (event.isAllDay) {
      lines.push(`DTSTART;VALUE=DATE:${formatICalDate(event.start, true)}`);
      if (event.end) {
        lines.push(`DTEND;VALUE=DATE:${formatICalDate(event.end, true)}`);
      }
    } else {
      lines.push(`DTSTART:${formatICalDate(event.start, false)}`);
      if (event.end) {
        lines.push(`DTEND:${formatICalDate(event.end, false)}`);
      }
    }

    if (event.rrule) {
      lines.push(`RRULE:${event.rrule}`);
    }

    lines.push(`DTSTAMP:${formatICalDate(new Date(), false)}`);
    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');

  return lines.join('\r\n');
}

/**
 * Filtruje wydarzenia według kryteriów
 */
export function filterEvents(
  events: ICalEvent[],
  filter: {
    categories?: string[]; // Dozwolone kategorie (puste = wszystkie)
    keywords?: string[]; // Słowa kluczowe w tytule (include)
    excludeKeywords?: string[]; // Słowa kluczowe do wykluczenia
  }
): ICalEvent[] {
  return events.filter((event) => {
    // Filtr kategorii
    if (filter.categories && filter.categories.length > 0) {
      if (!event.categories || event.categories.length === 0) {
        return false; // Brak kategorii = odrzuć
      }
      const hasMatchingCategory = event.categories.some((cat) =>
        filter.categories!.includes(cat)
      );
      if (!hasMatchingCategory) return false;
    }

    // Filtr słów kluczowych (include)
    if (filter.keywords && filter.keywords.length > 0) {
      const titleLower = event.summary.toLowerCase();
      const hasKeyword = filter.keywords.some((kw) =>
        titleLower.includes(kw.toLowerCase())
      );
      if (!hasKeyword) return false;
    }

    // Filtr wykluczających słów kluczowych
    if (filter.excludeKeywords && filter.excludeKeywords.length > 0) {
      const titleLower = event.summary.toLowerCase();
      const hasExcludedKeyword = filter.excludeKeywords.some((kw) =>
        titleLower.includes(kw.toLowerCase())
      );
      if (hasExcludedKeyword) return false;
    }

    return true;
  });
}

/**
 * Mapuje kolor z zewnętrznego kalendarza na kolor aplikacji
 */
export function mapColor(externalColor: string | undefined, mapping?: Record<string, string>): string {
  if (!externalColor) return "#6366F1"; // Domyślny indigo

  // Jeśli jest mapowanie, użyj go
  if (mapping && mapping[externalColor]) {
    return mapping[externalColor];
  }

  // Domyślnie zwróć kolor z kalendarza (jeśli jest hex)
  if (externalColor.startsWith("#")) {
    return externalColor;
  }

  // Mapowanie popularnych nazw kolorów
  const colorNames: Record<string, string> = {
    red: "#EF4444",
    blue: "#3B82F6",
    green: "#10B981",
    yellow: "#F59E0B",
    purple: "#A855F7",
    pink: "#EC4899",
    orange: "#F97316",
    gray: "#6B7280",
  };

  return colorNames[externalColor.toLowerCase()] || "#6366F1";
}

/**
 * Pobiera .ics z URL (dla subskrypcji)
 */
export async function fetchICS(url: string): Promise<string> {
  // Zamień webcal:// na https://
  const httpsUrl = url.replace(/^webcal:\/\//i, 'https://');

  const response = await fetch(httpsUrl, {
    headers: {
      'User-Agent': 'PlannerDomowy/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch .ics: ${response.status} ${response.statusText}`);
  }

  return await response.text();
}

