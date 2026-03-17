/**
 * Utility dla formatowania danych
 */

/**
 * Formatuje datę w czytelny sposób
 */
export function formatDate(date: Date | string, options?: {
  includeTime?: boolean;
  relative?: boolean;
}): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (options?.relative) {
    return getRelativeTime(dateObj);
  }

  if (options?.includeTime) {
    return dateObj.toLocaleString('pl-PL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return dateObj.toLocaleDateString('pl-PL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Zwraca względny czas (np. "2 godziny temu")
 */
export function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) {
    return 'przed chwilą';
  } else if (diffMin < 60) {
    return `${diffMin} ${pluralize(diffMin, 'minutę', 'minuty', 'minut')} temu`;
  } else if (diffHour < 24) {
    return `${diffHour} ${pluralize(diffHour, 'godzinę', 'godziny', 'godzin')} temu`;
  } else if (diffDay < 7) {
    return `${diffDay} ${pluralize(diffDay, 'dzień', 'dni', 'dni')} temu`;
  } else {
    return formatDate(date);
  }
}

/**
 * Polska pluralizacja (odmiana przez przypadki)
 */
export function pluralize(
  count: number,
  singular: string,
  plural2to4: string,
  plural5plus: string
): string {
  if (count === 1) {
    return singular;
  } else if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20)) {
    return plural2to4;
  } else {
    return plural5plus;
  }
}

/**
 * Formatuje rozmiar pliku
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Formatuje liczbę z separatorami tysięcy
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('pl-PL');
}

/**
 * Formatuje walutę (PLN)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN',
  }).format(amount);
}

/**
 * Skraca tekst do określonej długości
 */
export function truncateText(text: string, maxLength: number, suffix: string = '...'): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Kapitalizuje pierwszą literę
 */
export function capitalize(text: string): string {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/**
 * Konwertuje slug na tytuł
 */
export function slugToTitle(slug: string): string {
  return slug
    .split('-')
    .map(word => capitalize(word))
    .join(' ');
}

/**
 * Konwertuje tytuł na slug
 */
export function titleToSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9ąćęłńóśźż\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

/**
 * Wyciąga inicjały z imienia i nazwiska
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

/**
 * Maskuje email (user@example.com -> u***r@example.com)
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (local.length <= 2) return email;

  const masked = local[0] + '*'.repeat(local.length - 2) + local[local.length - 1];
  return `${masked}@${domain}`;
}

/**
 * Sprawdza czy string jest poprawnym JSON
 */
export function isValidJSON(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * Deep clone obiektu
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Porównuje dwa obiekty (shallow)
 */
export function shallowEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) return true;
  if (typeof obj1 !== 'object' || typeof obj2 !== 'object') return false;
  if (obj1 === null || obj2 === null) return false;

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) return false;

  return keys1.every(key => obj1[key] === obj2[key]);
}

