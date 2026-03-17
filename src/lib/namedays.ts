/**
 * Kalendarz imienin polskich
 * Źródło: tradycyjny kalendarz rzymskokatolicki
 */

export interface NameDay {
  name: string;
  date: Date;
  names: string[]; // Może być kilka imion tego samego dnia
}

/**
 * Kalendarz imienin - mapa miesiąc → dzień → lista imion
 */
const nameDaysCalendar: Record<number, Record<number, string[]>> = {
  0: { // Styczeń
    1: ["Mieczysław", "Maria", "Mieszko"],
    2: ["Bazyli", "Grzegorz"],
    3: ["Genowefy", "Danuty"],
    4: ["Anieli", "Eugeniusza"],
    5: ["Szymona", "Edwarda"],
    6: ["Kacpra", "Melchiora", "Baltazara"],
    7: ["Lucjana", "Rajmunda"],
    8: ["Seweryna", "Juliany"],
    9: ["Marceliny", "Adriana"],
    10: ["Danuty", "Wilhelma"],
    11: ["Honoraty", "Matyldy"],
    12: ["Tatiana", "Arkadiusza"],
    13: ["Weroniki", "Hilarego"],
    14: ["Feliksa", "Ninny"],
    15: ["Pawła", "Arnolda"],
    16: ["Marcelego", "Wawrzyńca"],
    17: ["Antoniego"],
    18: ["Piotra", "Małgorzaty"],
    19: ["Henryka", "Mariusza"],
    20: ["Fabiana", "Sebastiana"],
    21: ["Agnieszki", "Jarosława"],
    22: ["Anastazego", "Wincentego"],
    23: ["Ildefons", "Rajmunda"],
    24: ["Franciszka", "Felicji"],
    25: ["Pawła", "Miłosza"],
    26: ["Tymoteusza", "Michała"],
    27: ["Angeli", "Przybysława"],
    28: ["Tomasza", "Walerego"],
    29: ["Franciszka", "Zdzisławy"],
    30: ["Macieja", "Martyny"],
    31: ["Marceli", "Ludwiki"]
  },
  1: { // Luty
    1: ["Ignacego", "Brygidy"],
    2: ["Marii", "Miłosława"],
    3: ["Błażeja", "Oskara"],
    4: ["Weroniki", "Andrzeja"],
    5: ["Agaty", "Adelajdy"],
    6: ["Doroty", "Bogdana"],
    7: ["Ryszarda", "Teodora"],
    8: ["Hieronima", "Sebastiana"],
    9: ["Apolonii", "Eryka"],
    10: ["Scholastyki", "Jacka"],
    11: ["Lucjana", "Grzegorza"],
    12: ["Eulalii", "Modesta"],
    13: ["Katarzyny", "Grzegorza"],
    14: ["Walentego", "Cyryla"],
    15: ["Faustyna", "Jowity"],
    16: ["Danuty", "Juliany"],
    17: ["Łukasza", "Donata"],
    18: ["Szymona", "Konstancji"],
    19: ["Konrada", "Arnolda"],
    20: ["Leona", "Zenobiusza"],
    21: ["Eleonory", "Roberta"],
    22: ["Małgorzaty", "Piotra"],
    23: ["Romany", "Damiana"],
    24: ["Macieja", "Mateusza"],
    25: ["Cezarego", "Wiktora"],
    26: ["Aleksandra", "Mirelli"],
    27: ["Gabriela", "Anastazji"],
    28: ["Romana", "Ludomira"],
    29: ["Romana"] // Tylko w latach przestępnych
  },
  2: { // Marzec
    1: ["Albiny", "Antoniny"],
    2: ["Heleny", "Pawła"],
    3: ["Kunegundy", "Maryny"],
    4: ["Kazimierza", "Lucjusza"],
    5: ["Adriana", "Fryderyka"],
    6: ["Róży", "Jordana"],
    7: ["Tomasza", "Felicyty"],
    8: ["Beaty", "Jana"],
    9: ["Franciszki", "Dominiki"],
    10: ["Macieja", "Aleksandra"],
    11: ["Benedykta", "Konstantego"],
    12: ["Grzegorza", "Bernarda"],
    13: ["Krystyny", "Bożeny"],
    14: ["Leona", "Matyldy"],
    15: ["Klemensa", "Ludwiki"],
    16: ["Izabeli", "Hilarego"],
    17: ["Patryka", "Zbigniewa"],
    18: ["Edwarda", "Cyryla"],
    19: ["Józefa"],
    20: ["Klaudii", "Maurycego"],
    21: ["Benedykta", "Lubomira"],
    22: ["Katarzyny", "Oktawii"],
    23: ["Pelagii", "Feliksa"],
    24: ["Gabriela", "Marka"],
    25: ["Mariola", "Dyzmy"],
    26: ["Emanuela", "Teodora"],
    27: ["Lidii", "Ruperta"],
    28: ["Jana", "Sykstusa"],
    29: ["Wiktoryny", "Eustachego"],
    30: ["Jana", "Amelii"],
    31: ["Beniamina", "Balbiny"]
  },
  3: { // Kwiecień
    1: ["Grażyny", "Hugona"],
    2: ["Franciszka", "Teodozji"],
    3: ["Ryszarda", "Pankracego"],
    4: ["Izydora", "Ambrożego"],
    5: ["Wincentego", "Ireny"],
    6: ["Izoldy", "Celestyna"],
    7: ["Rufina", "Donata"],
    8: ["Dionizego", "Julie"],
    9: ["Marii", "Dymitra"],
    10: ["Michała", "Makarego"],
    11: ["Leona", "Filipa"],
    12: ["Juliusza", "Wiktora"],
    13: ["Przemysława", "Hermenegildy"],
    14: ["Justyny", "Waleriana"],
    15: ["Ludwiny", "Wacławy"],
    16: ["Bernardety", "Benedykty"],
    17: ["Roberta", "Rudolfa"],
    18: ["Bogusławy", "Apoloniusza"],
    19: ["Leona", "Tymona"],
    20: ["Czesława", "Agnieszki"],
    21: ["Bartosza", "Anzelma"],
    22: ["Kai", "Leona"],
    23: ["Jerzego", "Wojciecha"],
    24: ["Grzegorza", "Aleksandra"],
    25: ["Marka", "Jaromira"],
    26: ["Marii", "Kleta"],
    27: ["Zyty", "Piotra"],
    28: ["Pawła", "Walerii"],
    29: ["Piotra", "Katarzyny"],
    30: ["Mariana", "Katarzyny"]
  },
  4: { // Maj
    1: ["Józefa", "Filipa"],
    2: ["Zygmunta", "Anatazego"],
    3: ["Marii", "Antoniny"],
    4: ["Moniki", "Floriana"],
    5: ["Ireny", "Walerii"],
    6: ["Judyty", "Filipa"],
    7: ["Gizeli", "Benedykta"],
    8: ["Stanisława", "Wiktora"],
    9: ["Grzegorza", "Karoliny"],
    10: ["Izydora", "Antoniny"],
    11: ["Franciszka", "Ignacego"],
    12: ["Pankracego", "Achillesa"],
    13: ["Roberta", "Serwacego"],
    14: ["Bonifacego", "Macieja"],
    15: ["Zofii", "Dionizego"],
    16: ["Andrzeja", "Szymona"],
    17: ["Paschalisa", "Weroniki"],
    18: ["Feliksa", "Erika"],
    19: ["Piotra", "Iwo"],
    20: ["Bernardyna", "Bazylego"],
    21: ["Wiktora", "Tymoteusza"],
    22: ["Heleny", "Juli"],
    23: ["Iwony", "Dezyderego"],
    24: ["Joanny", "Zuzanny"],
    25: ["Grzegorza", "Urbana"],
    26: ["Filipa", "Pauliny"],
    27: ["Magdaleny", "Juliana"],
    28: ["Jaromira", "Germana"],
    29: ["Bogumiły", "Urszuli"],
    30: ["Ferdynanda", "Joanny"],
    31: ["Anieli", "Petroneli"]
  },
  5: { // Czerwiec
    1: ["Justyna", "Annabeli"],
    2: ["Marianny", "Erazma"],
    3: ["Leszka", "Karola"],
    4: ["Karola", "Franciszka"],
    5: ["Bonifacego", "Walerii"],
    6: ["Norberta", "Wawrzyńca"],
    7: ["Roberta", "Wiesławy"],
    8: ["Medarda", "Maksyma"],
    9: ["Felicjana", "Pelagii"],
    10: ["Bogumila", "Diany"],
    11: ["Barnaby", "Feliksa"],
    12: ["Onufrego", "Jana"],
    13: ["Antoniego", "Lucjana"],
    14: ["Bazylego", "Elżbiety"],
    15: ["Wita", "Jolanty"],
    16: ["Justyny", "Benona"],
    17: ["Laury", "Marceli"],
    18: ["Elżbiety", "Marka"],
    19: ["Gerarda", "Protazego"],
    20: ["Bogny", "Florentyna"],
    21: ["Alicji", "Alojzego"],
    22: ["Pauliny", "Tomasza"],
    23: ["Wandy", "Zenona"],
    24: ["Jana"],
    25: ["Łucji", "Wilhelma"],
    26: ["Jana", "Pawła"],
    27: ["Władysława", "Cyryla"],
    28: ["Leona", "Ireneusza"],
    29: ["Piotra", "Pawła"],
    30: ["Emilii", "Lucyny"]
  },
  6: { // Lipiec
    1: ["Haliny", "Mariana"],
    2: ["Urbana", "Marii"],
    3: ["Jacka", "Anatola"],
    4: ["Malwiny", "Czesława"],
    5: ["Antoniego", "Marii"],
    6: ["Marii", "Góreckiej"],
    7: ["Cyryla", "Metodego"],
    8: ["Elżbiety", "Edgara"],
    9: ["Weroniki", "Lukrecji"],
    10: ["Witalisa", "Amadeusza"],
    11: ["Olgi", "Benedykta"],
    12: ["Jana", "Brunona"],
    13: ["Andrzeja", "Małgorzaty"],
    14: ["Ulryka", "Bonawentury"],
    15: ["Henryka", "Włodzimierza"],
    16: ["Marii", "Carmen"],
    17: ["Jadwigi", "Anety"],
    18: ["Kamila", "Szymona"],
    19: ["Wincentego", "Czesława"],
    20: ["Hieronima", "Małgorzaty"],
    21: ["Daniela", "Wawrzyńca"],
    22: ["Magdaleny", "Wawrzyńca"],
    23: ["Bogny", "Brigidy"],
    24: ["Kingi", "Krystyny"],
    25: ["Krzysztofa", "Walentyny"],
    26: ["Anny", "Joachima"],
    27: ["Natalii", "Lillany"],
    28: ["Wiktora", "Innocentego"],
    29: ["Marty", "Olafa"],
    30: ["Julity", "Piotra"],
    31: ["Ignacego", "Helena"]
  },
  7: { // Sierpień
    1: ["Justyna", "Petera"],
    2: ["Kariny", "Stefana"],
    3: ["Augusta", "Lidii"],
    4: ["Dominika", "Protazego"],
    5: ["Marii", "Stanisława"],
    6: ["Jakuba", "Sławy"],
    7: ["Kajetana", "Sykstusa"],
    8: ["Cyryla", "Emiliana"],
    9: ["Romana", "Ryszarda"],
    10: ["Borysa", "Wawrzyńca"],
    11: ["Klary", "Zuzanny"],
    12: ["Lecha", "Hilarego"],
    13: ["Hipolita", "Poncjana"],
    14: ["Alfreda", "Maksymiliana"],
    15: ["Marii", "Napoleona"],
    16: ["Rocha", "Stefana"],
    17: ["Jacka", "Mirona"],
    18: ["Ilony", "Agapita"],
    19: ["Juliana", "Bolesława"],
    20: ["Bernarda", "Samuela"],
    21: ["Joanny", "Franciszki"],
    22: ["Cezarego", "Filipa"],
    23: ["Filipa", "Rozy"],
    24: ["Bartłomieja", "Ludwiki"],
    25: ["Ludwika", "Patryka"],
    26: ["Marii", "Aleksandry"],
    27: ["Moniki", "Cezarego"],
    28: ["Augustyna", "Wyszomira"],
    29: ["Sabiny", "Jana"],
    30: ["Róży", "Felicji"],
    31: ["Rajmunda", "Bogdana"]
  },
  8: { // Wrzesień
    1: ["Idziego", "Bronisława"],
    2: ["Stefana", "Juliana"],
    3: ["Szymona", "Grzegorza"],
    4: ["Róży", "Iris"],
    5: ["Doroty", "Wawrzyńca"],
    6: ["Beaty", "Eugeniusza"],
    7: ["Reginy", "Melchiora"],
    8: ["Marii", "Adrianny"],
    9: ["Sergiusza", "Piotra"],
    10: ["Łucji", "Mikołaja"],
    11: ["Jacka", "Dagny"],
    12: ["Radzimira", "Gwidona"],
    13: ["Eugenii", "Jana"],
    14: ["Bernarda", "Roksany"],
    15: ["Albina", "Nikodema"],
    16: ["Edyty", "Cypriana"],
    17: ["Franciszka", "Lamberta"],
    18: ["Irmy", "Stanisława"],
    19: ["Januarego", "Konstancji"],
    20: ["Filipiny", "Eustachego"],
    21: ["Mateusza", "Jonasza"],
    22: ["Tomasza", "Maurycego"],
    23: ["Bogusława", "Tekli"],
    24: ["Gerarda", "Ruslana"],
    25: ["Klarencji", "Władysława"],
    26: ["Justyny", "Cypriana"],
    27: ["Miłosza", "Wincentego"],
    28: ["Wacława", "Marka"],
    29: ["Michała", "Gabriela"],
    30: ["Wery", "Hieronima"]
  },
  9: { // Październik
    1: ["Teresy", "Remigiusza"],
    2: ["Dionizego", "Teofila"],
    3: ["Gerarda", "Franciszka"],
    4: ["Franciszka", "Edwina"],
    5: ["Artura", "Placyda"],
    6: ["Brunona", "Artura"],
    7: ["Marii", "Justyny"],
    8: ["Pelagii", "Brygidy"],
    9: ["Dionizego", "Ludwika"],
    10: ["Pauliny", "Franciszka"],
    11: ["Aldony", "Aleksandra"],
    12: ["Maksymiliana", "Edwina"],
    13: ["Edwarda", "Gerwazego"],
    14: ["Romana", "Kaliksta"],
    15: ["Teresy", "Aureli"],
    16: ["Gawła", "Ambrożego"],
    17: ["Wiktora", "Małgorzaty"],
    18: ["Łukasza", "Juliana"],
    19: ["Izaaka", "Jana"],
    20: ["Ireny", "Kleopatry"],
    21: ["Urszuli", "Hilarego"],
    22: ["Filipa", "Kordelii"],
    23: ["Seweryna", "Ignacego"],
    24: ["Rafała", "Antoniego"],
    25: ["Darii", "Kryspina"],
    26: ["Lucjana", "Ewarysta"],
    27: ["Sabiny", "Iwony"],
    28: ["Szymona", "Tadeusza"],
    29: ["Eugeniusza", "Felicji"],
    30: ["Zenobii", "Edmunda"],
    31: ["Urbana", "Krystyny"]
  },
  10: { // Listopad
    1: ["Wszystkich Świętych"],
    2: ["Bohdana", "Stefana"],
    3: ["Huberta", "Sylwii"],
    4: ["Karola", "Boromeusza"],
    5: ["Elżbiety", "Dominika"],
    6: ["Leonarda", "Felicji"],
    7: ["Antoniego", "Ernesta"],
    8: ["Seweryna", "Gotfryda"],
    9: ["Teodora", "Ursyna"],
    10: ["Leny", "Andrzeja"],
    11: ["Marcina", "Bartosza"],
    12: ["Renaty", "Witolda"],
    13: ["Stanisława", "Mikołaja"],
    14: ["Serafina", "Wawrzyńca"],
    15: ["Alberta", "Leopolda"],
    16: ["Marii", "Gertrudy"],
    17: ["Salomei", "Grzegorza"],
    18: ["Romana", "Karoliny"],
    19: ["Elżbiety", "Seweryna"],
    20: ["Anatola", "Rafała"],
    21: ["Janusza", "Marii"],
    22: ["Cecylii", "Filipa"],
    23: ["Adeli", "Klemensa"],
    24: ["Emmy", "Flory"],
    25: ["Katarzyny", "Elżbiety"],
    26: ["Konrada", "Delfiny"],
    27: ["Wergiliusza", "Maksyma"],
    28: ["Zdzisława", "Grzegorza"],
    29: ["Błażeja", "Saturnina"],
    30: ["Andrzeja", "Maury"]
  },
  11: { // Grudzień
    1: ["Eligiusza", "Natalii"],
    2: ["Balbiny", "Pauliny"],
    3: ["Franciszka", "Ksawery"],
    4: ["Barbary", "Jana"],
    5: ["Saby", "Kryspina"],
    6: ["Mikołaja", "Emiliana"],
    7: ["Marcina", "Ambrożego"],
    8: ["Marii", "Mariusza"],
    9: ["Wiesławy", "Leokadii"],
    10: ["Julii", "Danieli"],
    11: ["Damazego", "Waldemara"],
    12: ["Aleksandra", "Dagmary"],
    13: ["Łucji", "Otylii"],
    14: ["Izydora", "Alfreda"],
    15: ["Celiny", "Niny"],
    16: ["Albiny", "Zdzisławy"],
    17: ["Olimpii", "Łazarza"],
    18: ["Gracji", "Bogusława"],
    19: ["Dariusza", "Urbana"],
    20: ["Dominika", "Juliana"],
    21: ["Tomasza", "Piotra"],
    22: ["Zenona", "Honoraty"],
    23: ["Wiktorii", "Sławomira"],
    24: ["Adama", "Ewy"],
    25: ["Bożego Narodzenia"],
    26: ["Szczepana", "Dionizego"],
    27: ["Jana", "Żanety"],
    28: ["Młodzianków", "Grzegorza"],
    29: ["Tomasza", "Dawida"],
    30: ["Eugenii", "Melanki"],
    31: ["Sylwestra", "Melanii"]
  }
};

/**
 * Pobiera imieniny dla danej daty
 */
export function getNameDaysForDate(date: Date): string[] {
  const month = date.getMonth();
  const day = date.getDate();

  return nameDaysCalendar[month]?.[day] || [];
}

/**
 * Pobiera wszystkie daty imienin dla danego imienia
 */
export function getNameDayDates(name: string, year: number): Date[] {
  const dates: Date[] = [];
  const normalizedName = name.toLowerCase();

  for (const [monthStr, days] of Object.entries(nameDaysCalendar)) {
    const month = parseInt(monthStr);
    for (const [dayStr, names] of Object.entries(days)) {
      const day = parseInt(dayStr);
      if (names.some(n => n.toLowerCase() === normalizedName)) {
        dates.push(new Date(year, month, day));
      }
    }
  }

  return dates;
}

/**
 * Pobiera imieniny dla danego zakresu dat
 */
export function getNameDaysForRange(startDate: Date, endDate: Date): NameDay[] {
  const nameDays: NameDay[] = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    const names = getNameDaysForDate(current);
    if (names.length > 0) {
      nameDays.push({
        name: names[0], // Pierwsze imię jako główne
        date: new Date(current),
        names: names
      });
    }
    current.setDate(current.getDate() + 1);
  }

  return nameDays;
}

/**
 * Sprawdza czy użytkownik ma imieniny danego dnia
 */
export function hasNameDayToday(userName: string | null, date: Date = new Date()): boolean {
  if (!userName) return false;

  const todayNames = getNameDaysForDate(date);
  const normalizedUserName = userName.toLowerCase();

  return todayNames.some(name => name.toLowerCase() === normalizedUserName);
}

/**
 * Pobiera nadchodzące imieniny dla użytkownika
 */
export function getUpcomingNameDays(userName: string | null, daysAhead: number = 30): Date[] {
  if (!userName) return [];

  const today = new Date();
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + daysAhead);

  const currentYear = today.getFullYear();
  const nextYear = endDate.getFullYear();

  const dates: Date[] = [];

  // Pobierz daty dla bieżącego roku
  dates.push(...getNameDayDates(userName, currentYear));

  // Jeśli zakres przekracza rok, dodaj też następny rok
  if (nextYear > currentYear) {
    dates.push(...getNameDayDates(userName, nextYear));
  }

  // Filtruj tylko te w zakresie
  return dates.filter(date => date >= today && date <= endDate);
}

/**
 * Format: "Imieniny: Jan, Anna, Piotr"
 */
export function formatNameDayMessage(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return `Imieniny: ${names[0]}`;
  if (names.length === 2) return `Imieniny: ${names[0]} i ${names[1]}`;

  const allButLast = names.slice(0, -1).join(", ");
  const last = names[names.length - 1];
  return `Imieniny: ${allButLast} i ${last}`;
}

