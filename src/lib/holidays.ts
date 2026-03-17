/**
 * Biblioteka świąt polskich i międzynarodowych
 * Wspiera święta stałe i ruchome (np. Wielkanoc)
 */

export interface Holiday {
  name: string;
  date: Date;
  type: 'public' | 'religious' | 'observance';
  color: string;
  description?: string;
}

/**
 * Oblicza datę Wielkanocy używając algorytmu Gaussa
 * @param year Rok
 * @returns Data niedzieli wielkanocnej
 */
function calculateEaster(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(year, month - 1, day);
}

/**
 * Dodaje dni do daty
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Pobiera listę świąt dla danego roku
 * @param year Rok
 * @returns Lista świąt
 */
export function getHolidays(year: number): Holiday[] {
  const easter = calculateEaster(year);

  const holidays: Holiday[] = [
    // Święta państwowe (dni wolne od pracy)
    {
      name: 'Nowy Rok',
      date: new Date(year, 0, 1),
      type: 'public',
      color: '#DC2626',
      description: 'Pierwszy dzień roku kalendarzowego'
    },
    {
      name: 'Święto Trzech Króli',
      date: new Date(year, 0, 6),
      type: 'public',
      color: '#DC2626',
      description: 'Objawienie Pańskie'
    },
    {
      name: 'Niedziela Wielkanocna',
      date: easter,
      type: 'public',
      color: '#DC2626',
      description: 'Zmartwychwstanie Jezusa Chrystusa'
    },
    {
      name: 'Poniedziałek Wielkanocny',
      date: addDays(easter, 1),
      type: 'public',
      color: '#DC2626',
      description: 'Drugi dzień Wielkanocy'
    },
    {
      name: 'Święto Pracy',
      date: new Date(year, 4, 1),
      type: 'public',
      color: '#DC2626',
      description: 'Międzynarodowy Dzień Pracy'
    },
    {
      name: 'Święto Konstytucji 3 Maja',
      date: new Date(year, 4, 3),
      type: 'public',
      color: '#DC2626',
      description: 'Uchwalenie Konstytucji 3 Maja 1791'
    },
    {
      name: 'Zielone Świątki',
      date: addDays(easter, 49),
      type: 'public',
      color: '#DC2626',
      description: 'Zesłanie Ducha Świętego'
    },
    {
      name: 'Boże Ciało',
      date: addDays(easter, 60),
      type: 'public',
      color: '#DC2626',
      description: 'Uroczystość Najświętszego Ciała i Krwi Chrystusa'
    },
    {
      name: 'Wniebowzięcie Najświętszej Maryi Panny',
      date: new Date(year, 7, 15),
      type: 'public',
      color: '#DC2626',
      description: 'Matki Bożej Zielnej'
    },
    {
      name: 'Wszystkich Świętych',
      date: new Date(year, 10, 1),
      type: 'public',
      color: '#DC2626',
      description: 'Dzień pamięci o świętych'
    },
    {
      name: 'Święto Niepodległości',
      date: new Date(year, 10, 11),
      type: 'public',
      color: '#DC2626',
      description: 'Odzyskanie niepodległości przez Polskę w 1918'
    },
    {
      name: 'Boże Narodzenie',
      date: new Date(year, 11, 25),
      type: 'public',
      color: '#DC2626',
      description: 'Pierwszy dzień Świąt Bożego Narodzenia'
    },
    {
      name: 'Drugi Dzień Bożego Narodzenia',
      date: new Date(year, 11, 26),
      type: 'public',
      color: '#DC2626',
      description: 'Drugi dzień Świąt Bożego Narodzenia'
    },

    // Inne święta religijne (nie są dniami wolnymi)
    {
      name: 'Środa Popielcowa',
      date: addDays(easter, -46),
      type: 'religious',
      color: '#8B5CF6',
      description: 'Początek Wielkiego Postu'
    },
    {
      name: 'Niedziela Palmowa',
      date: addDays(easter, -7),
      type: 'religious',
      color: '#8B5CF6',
      description: 'Ostatnia niedziela przed Wielkanocą'
    },
    {
      name: 'Wielki Czwartek',
      date: addDays(easter, -3),
      type: 'religious',
      color: '#8B5CF6',
      description: 'Ostatnia Wieczerza'
    },
    {
      name: 'Wielki Piątek',
      date: addDays(easter, -2),
      type: 'religious',
      color: '#8B5CF6',
      description: 'Ukrzyżowanie Jezusa'
    },
    {
      name: 'Wielka Sobota',
      date: addDays(easter, -1),
      type: 'religious',
      color: '#8B5CF6',
      description: 'Wigilia Paschalna'
    },

    // Święta świeckie i obchody
    {
      name: 'Walentynki',
      date: new Date(year, 1, 14),
      type: 'observance',
      color: '#EC4899',
      description: 'Dzień Zakochanych'
    },
    {
      name: 'Dzień Kobiet',
      date: new Date(year, 2, 8),
      type: 'observance',
      color: '#EC4899',
      description: 'Międzynarodowy Dzień Kobiet'
    },
    {
      name: 'Dzień Dziecka',
      date: new Date(year, 5, 1),
      type: 'observance',
      color: '#EAB308',
      description: 'Międzynarodowy Dzień Dziecka'
    },
    {
      name: 'Dzień Matki',
      date: new Date(year, 4, 26),
      type: 'observance',
      color: '#EC4899',
      description: 'Dzień Matki'
    },
    {
      name: 'Dzień Ojca',
      date: new Date(year, 5, 23),
      type: 'observance',
      color: '#3B82F6',
      description: 'Dzień Ojca'
    },
    {
      name: 'Halloween',
      date: new Date(year, 9, 31),
      type: 'observance',
      color: '#F97316',
      description: 'Wigilia Wszystkich Świętych'
    },
    {
      name: 'Dzień Zaduszny',
      date: new Date(year, 10, 2),
      type: 'religious',
      color: '#8B5CF6',
      description: 'Dzień Wszystkich Wiernych Zmarłych'
    },
    {
      name: 'Andrzejki',
      date: new Date(year, 10, 29),
      type: 'observance',
      color: '#8B5CF6',
      description: 'Wigilia św. Andrzeja'
    },
    {
      name: 'Mikołajki',
      date: new Date(year, 11, 6),
      type: 'observance',
      color: '#DC2626',
      description: 'Święty Mikołaj'
    },
    {
      name: 'Wigilia',
      date: new Date(year, 11, 24),
      type: 'observance',
      color: '#DC2626',
      description: 'Wigilia Bożego Narodzenia'
    },
    {
      name: 'Sylwester',
      date: new Date(year, 11, 31),
      type: 'observance',
      color: '#EAB308',
      description: 'Ostatni dzień roku'
    },
  ];

  return holidays;
}

/**
 * Sprawdza czy dana data jest świętem
 */
export function isHoliday(date: Date, holidays: Holiday[]): Holiday | undefined {
  return holidays.find(holiday =>
    holiday.date.getFullYear() === date.getFullYear() &&
    holiday.date.getMonth() === date.getMonth() &&
    holiday.date.getDate() === date.getDate()
  );
}

/**
 * Pobiera święta dla danego miesiąca
 */
export function getHolidaysForMonth(year: number, month: number): Holiday[] {
  const allHolidays = getHolidays(year);
  return allHolidays.filter(holiday => holiday.date.getMonth() === month);
}

/**
 * Pobiera święta dla danego zakresu dat
 */
export function getHolidaysForRange(startDate: Date, endDate: Date): Holiday[] {
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();

  const holidays: Holiday[] = [];

  for (let year = startYear; year <= endYear; year++) {
    const yearHolidays = getHolidays(year);
    holidays.push(...yearHolidays.filter(holiday =>
      holiday.date >= startDate && holiday.date <= endDate
    ));
  }

  return holidays;
}

