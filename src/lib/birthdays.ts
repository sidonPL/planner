/**
 * Helper do generowania wydarzeń urodzinowych
 */

export interface UserWithBirthDate {
  id: string;
  name: string | null;
  email: string;
  color: string;
  avatar: string | null;
  birthDate: Date | null;
}

export interface ExternalBirthdayData {
  id: string;
  name: string;
  birthDate: Date;
  color: string;
  relationship?: string | null;
}

export interface BirthdayEvent {
  id: string;
  userId: string;
  name: string;
  date: Date;
  age: number;
  color: string;
  avatar: string | null;
  isExternal?: boolean;
  relationship?: string | null;
}

/**
 * Generuje wydarzenia urodzinowe dla danego roku
 * @param users Użytkownicy z datami urodzin
 * @param year Rok
 * @returns Lista wydarzeń urodzinowych
 */
export function generateBirthdayEvents(
  users: UserWithBirthDate[],
  year: number
): BirthdayEvent[] {
  const birthdays: BirthdayEvent[] = [];

  for (const user of users) {
    if (!user.birthDate) continue;

    const birthDate = new Date(user.birthDate);
    const birthdayThisYear = new Date(
      year,
      birthDate.getMonth(),
      birthDate.getDate()
    );

    // Oblicz wiek
    const age = year - birthDate.getFullYear();

    birthdays.push({
      id: `birthday-${user.id}-${year}`,
      userId: user.id,
      name: user.name || user.email,
      date: birthdayThisYear,
      age,
      color: user.color,
      avatar: user.avatar,
    });
  }

  return birthdays;
}

/**
 * Generuje wydarzenia urodzinowe dla zakresu dat
 */
export function generateBirthdayEventsForRange(
  users: UserWithBirthDate[],
  startDate: Date,
  endDate: Date
): BirthdayEvent[] {
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();

  const allBirthdays: BirthdayEvent[] = [];

  for (let year = startYear; year <= endYear; year++) {
    const yearBirthdays = generateBirthdayEvents(users, year);

    // Filtruj tylko te w zakresie dat
    const filtered = yearBirthdays.filter(
      (b) => b.date >= startDate && b.date <= endDate
    );

    allBirthdays.push(...filtered);
  }

  return allBirthdays;
}

/**
 * Sprawdza czy dzisiaj są czyjeś urodziny
 */
export function getTodaysBirthdays(users: UserWithBirthDate[]): BirthdayEvent[] {
  const today = new Date();
  const todayMonth = today.getMonth();
  const todayDay = today.getDate();
  const currentYear = today.getFullYear();

  return users
    .filter((user) => {
      if (!user.birthDate) return false;
      const birthDate = new Date(user.birthDate);
      return (
        birthDate.getMonth() === todayMonth &&
        birthDate.getDate() === todayDay
      );
    })
    .map((user) => {
      const birthDate = new Date(user.birthDate!);
      const age = currentYear - birthDate.getFullYear();

      return {
        id: `birthday-${user.id}-${currentYear}`,
        userId: user.id,
        name: user.name || user.email,
        date: new Date(currentYear, todayMonth, todayDay),
        age,
        color: user.color,
        avatar: user.avatar,
      };
    });
}

/**
 * Pobiera nadchodzące urodziny w najbliższych N dniach
 */
export function getUpcomingBirthdays(
  users: UserWithBirthDate[],
  daysAhead: number = 7
): BirthdayEvent[] {
  const today = new Date();
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + daysAhead);

  return generateBirthdayEventsForRange(users, today, endDate).sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );
}

/**
 * Formatuje wiadomość urodzinową
 */
export function formatBirthdayMessage(birthday: BirthdayEvent): string {
  return `🎂 Urodziny ${birthday.name} - ${birthday.age} lat`;
}

/**
 * Generuje wydarzenia urodzinowe dla zewnętrznych urodzin
 */
export function generateExternalBirthdayEvents(
  externalBirthdays: ExternalBirthdayData[],
  year: number
): BirthdayEvent[] {
  const birthdays: BirthdayEvent[] = [];

  for (const birthday of externalBirthdays) {
    const birthDate = new Date(birthday.birthDate);
    const birthdayThisYear = new Date(
      year,
      birthDate.getMonth(),
      birthDate.getDate()
    );

    // Oblicz wiek
    const age = year - birthDate.getFullYear();

    birthdays.push({
      id: `external-birthday-${birthday.id}-${year}`,
      userId: birthday.id,
      name: birthday.name,
      date: birthdayThisYear,
      age,
      color: birthday.color,
      avatar: null,
      isExternal: true,
      relationship: birthday.relationship,
    });
  }

  return birthdays;
}

/**
 * Generuje wydarzenia urodzinowe dla zewnętrznych urodzin w zakresie dat
 */
export function generateExternalBirthdayEventsForRange(
  externalBirthdays: ExternalBirthdayData[],
  startDate: Date,
  endDate: Date
): BirthdayEvent[] {
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();

  const allBirthdays: BirthdayEvent[] = [];

  for (let year = startYear; year <= endYear; year++) {
    const yearBirthdays = generateExternalBirthdayEvents(externalBirthdays, year);

    // Filtruj tylko te w zakresie dat
    const filtered = yearBirthdays.filter(
      (b) => b.date >= startDate && b.date <= endDate
    );

    allBirthdays.push(...filtered);
  }

  return allBirthdays;
}

/**
 * Łączy urodziny członków gospodarstwa i zewnętrzne urodziny
 */
export function combineAllBirthdays(
  users: UserWithBirthDate[],
  externalBirthdays: ExternalBirthdayData[],
  startDate: Date,
  endDate: Date
): BirthdayEvent[] {
  const memberBirthdays = generateBirthdayEventsForRange(users, startDate, endDate);
  const externalBirthdayEvents = generateExternalBirthdayEventsForRange(
    externalBirthdays,
    startDate,
    endDate
  );

  return [...memberBirthdays, ...externalBirthdayEvents].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );
}
