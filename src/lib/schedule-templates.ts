/**
 * Szablony harmonogramów dla różnych typów zajęć
 */

export interface ScheduleTemplate {
  name: string;
  description: string;
  type: "WORK" | "SCHOOL" | "UNIVERSITY" | "COURSE" | "OTHER";
  schedules: {
    name: string;
    daysOfWeek: number[];
    startTime: string;
    endTime: string;
    location?: string;
    color?: string;
  }[];
}

export const scheduleTemplates: ScheduleTemplate[] = [
  // Szablony dla szkoły podstawowej/średniej
  {
    name: "Plan lekcji - Szkoła Podstawowa",
    description: "Typowy plan lekcji dla ucznia szkoły podstawowej (8:00-15:00)",
    type: "SCHOOL",
    schedules: [
      {
        name: "Lekcje - Poniedziałek",
        daysOfWeek: [1],
        startTime: "08:00",
        endTime: "15:00",
        location: "Szkoła",
        color: "#9333EA",
      },
      {
        name: "Lekcje - Wtorek",
        daysOfWeek: [2],
        startTime: "08:00",
        endTime: "14:00",
        location: "Szkoła",
        color: "#9333EA",
      },
      {
        name: "Lekcje - Środa",
        daysOfWeek: [3],
        startTime: "08:00",
        endTime: "15:00",
        location: "Szkoła",
        color: "#9333EA",
      },
      {
        name: "Lekcje - Czwartek",
        daysOfWeek: [4],
        startTime: "08:00",
        endTime: "14:00",
        location: "Szkoła",
        color: "#9333EA",
      },
      {
        name: "Lekcje - Piątek",
        daysOfWeek: [5],
        startTime: "08:00",
        endTime: "13:00",
        location: "Szkoła",
        color: "#9333EA",
      },
    ],
  },
  {
    name: "Plan lekcji - Liceum",
    description: "Plan lekcji dla ucznia liceum (8:00-16:00)",
    type: "SCHOOL",
    schedules: [
      {
        name: "Lekcje",
        daysOfWeek: [1, 2, 3, 4, 5],
        startTime: "08:00",
        endTime: "15:30",
        location: "Liceum",
        color: "#9333EA",
      },
    ],
  },

  // Szablony dla studiów
  {
    name: "Plan zajęć - Studia Stacjonarne",
    description: "Typowy plan zajęć na studiach stacjonarnych",
    type: "UNIVERSITY",
    schedules: [
      {
        name: "Wykłady - Poniedziałek",
        daysOfWeek: [1],
        startTime: "09:00",
        endTime: "12:00",
        location: "Uczelnia - sala 101",
        color: "#6366F1",
      },
      {
        name: "Ćwiczenia - Poniedziałek",
        daysOfWeek: [1],
        startTime: "13:00",
        endTime: "15:00",
        location: "Uczelnia - sala 205",
        color: "#6366F1",
      },
      {
        name: "Wykłady - Wtorek",
        daysOfWeek: [2],
        startTime: "10:00",
        endTime: "13:00",
        location: "Uczelnia - aula",
        color: "#6366F1",
      },
      {
        name: "Laboratoria - Środa",
        daysOfWeek: [3],
        startTime: "09:00",
        endTime: "13:00",
        location: "Uczelnia - lab 3",
        color: "#6366F1",
      },
      {
        name: "Wykłady - Czwartek",
        daysOfWeek: [4],
        startTime: "10:00",
        endTime: "12:00",
        location: "Uczelnia - sala 101",
        color: "#6366F1",
      },
      {
        name: "Seminarium - Piątek",
        daysOfWeek: [5],
        startTime: "11:00",
        endTime: "13:00",
        location: "Uczelnia - sala 310",
        color: "#6366F1",
      },
    ],
  },
  {
    name: "Plan zajęć - Studia Zaoczne",
    description: "Zajęcia w weekendy (studia zaoczne/wieczorowe)",
    type: "UNIVERSITY",
    schedules: [
      {
        name: "Zajęcia - Sobota",
        daysOfWeek: [6],
        startTime: "09:00",
        endTime: "17:00",
        location: "Uczelnia",
        color: "#6366F1",
      },
      {
        name: "Zajęcia - Niedziela",
        daysOfWeek: [0],
        startTime: "09:00",
        endTime: "15:00",
        location: "Uczelnia",
        color: "#6366F1",
      },
    ],
  },

  // Szablony dla pracy
  {
    name: "Praca - Pełen etat (8h)",
    description: "Standardowy grafik pracy 8:00-16:00",
    type: "WORK",
    schedules: [
      {
        name: "Praca",
        daysOfWeek: [1, 2, 3, 4, 5],
        startTime: "08:00",
        endTime: "16:00",
        location: "Biuro",
        color: "#3B82F6",
      },
    ],
  },
  {
    name: "Praca - Zmianowa 3-zmianowa",
    description: "Praca w systemie 3-zmianowym",
    type: "WORK",
    schedules: [
      {
        name: "Zmiana I (rano)",
        daysOfWeek: [1, 2],
        startTime: "06:00",
        endTime: "14:00",
        location: "Zakład",
        color: "#3B82F6",
      },
      {
        name: "Zmiana II (popołudnie)",
        daysOfWeek: [3, 4],
        startTime: "14:00",
        endTime: "22:00",
        location: "Zakład",
        color: "#3B82F6",
      },
      {
        name: "Zmiana III (noc)",
        daysOfWeek: [5, 6],
        startTime: "22:00",
        endTime: "06:00",
        location: "Zakład",
        color: "#3B82F6",
      },
    ],
  },
  {
    name: "Praca - 4 dni w tygodniu",
    description: "Praca 4 dni po 10 godzin",
    type: "WORK",
    schedules: [
      {
        name: "Praca",
        daysOfWeek: [1, 2, 3, 4],
        startTime: "07:00",
        endTime: "17:00",
        location: "Biuro",
        color: "#3B82F6",
      },
    ],
  },

  // Szablony dla kursów
  {
    name: "Kurs wieczorowy",
    description: "Zajęcia wieczorne 2-3 razy w tygodniu",
    type: "COURSE",
    schedules: [
      {
        name: "Kurs - Wtorek",
        daysOfWeek: [2],
        startTime: "18:00",
        endTime: "20:00",
        location: "Szkoła językowa",
        color: "#10B981",
      },
      {
        name: "Kurs - Czwartek",
        daysOfWeek: [4],
        startTime: "18:00",
        endTime: "20:00",
        location: "Szkoła językowa",
        color: "#10B981",
      },
    ],
  },
  {
    name: "Kurs weekendowy",
    description: "Intensywny kurs w weekendy",
    type: "COURSE",
    schedules: [
      {
        name: "Kurs - Sobota",
        daysOfWeek: [6],
        startTime: "10:00",
        endTime: "16:00",
        location: "Centrum szkoleniowe",
        color: "#10B981",
      },
    ],
  },
];

/**
 * Pobierz szablon po nazwie
 */
export function getTemplateByName(name: string): ScheduleTemplate | undefined {
  return scheduleTemplates.find((t) => t.name === name);
}

/**
 * Pobierz szablony po typie
 */
export function getTemplatesByType(
  type: "WORK" | "SCHOOL" | "UNIVERSITY" | "COURSE" | "OTHER"
): ScheduleTemplate[] {
  return scheduleTemplates.filter((t) => t.type === type);
}

