import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanityzuje HTML, aby zabezpieczyć przed XSS attacks
 * Używane dla user-generated content
 */

// Konfiguracja dla zwykłego tekstu (bez HTML)
const PLAIN_TEXT_CONFIG = {
  ALLOWED_TAGS: [] as string[],
  ALLOWED_ATTR: [] as string[],
};

// Konfiguracja dla prostego formatowania (bold, italic, links)
const BASIC_HTML_CONFIG = {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'br', 'p', 'ul', 'ol', 'li'],
  ALLOWED_ATTR: ['href', 'title', 'target'],
};

// Konfiguracja dla bogatszego formatowania (używane w przepisach)
const RICH_HTML_CONFIG = {
  ALLOWED_TAGS: [
    'b', 'i', 'em', 'strong', 'a', 'br', 'p', 'ul', 'ol', 'li',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'blockquote', 'code', 'pre',
  ],
  ALLOWED_ATTR: ['href', 'title', 'target', 'class'],
};

/**
 * Sanityzuje zwykły tekst (usuwa wszystkie tagi HTML)
 */
export function sanitizePlainText(text: string | null | undefined): string {
  if (!text) return '';
  return DOMPurify.sanitize(text, PLAIN_TEXT_CONFIG);
}

/**
 * Sanityzuje tekst z podstawowym formatowaniem HTML
 */
export function sanitizeBasicHTML(html: string | null | undefined): string {
  if (!html) return '';
  return DOMPurify.sanitize(html, BASIC_HTML_CONFIG);
}

/**
 * Sanityzuje tekst z bogatszym formatowaniem HTML
 */
export function sanitizeRichHTML(html: string | null | undefined): string {
  if (!html) return '';
  return DOMPurify.sanitize(html, RICH_HTML_CONFIG);
}

/**
 * Sanityzuje URL (zabezpiecza przed javascript: i data: URLs)
 */
export function sanitizeURL(url: string | null | undefined): string {
  if (!url) return '';

  // Usuń niebezpieczne protokoły
  const cleanUrl = url.trim();
  if (
    cleanUrl.startsWith('javascript:') ||
    cleanUrl.startsWith('data:') ||
    cleanUrl.startsWith('vbscript:')
  ) {
    return '';
  }

  return DOMPurify.sanitize(cleanUrl, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
}

/**
 * Sanityzuje tablicę stringów
 */
export function sanitizeArray(arr: string[] | null | undefined): string[] {
  if (!arr || !Array.isArray(arr)) return [];
  return arr.map(item => sanitizePlainText(item)).filter(Boolean);
}

/**
 * Sanityzuje obiekt z polami tekstowymi
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  fields: (keyof T)[],
  sanitizer: (text: string) => string = sanitizePlainText
): T {
  const sanitized = { ...obj };

  for (const field of fields) {
    if (typeof sanitized[field] === 'string') {
      sanitized[field] = sanitizer(sanitized[field] as string) as T[keyof T];
    }
  }

  return sanitized;
}

