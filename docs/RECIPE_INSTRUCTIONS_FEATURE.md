# 📝 Opisowy sposób przygotowania - Nowa funkcja!

## 🎯 Co to jest?

W kroku 3 wizarda przepisów możesz teraz dodać **opisowy sposób przygotowania** jako alternatywę lub uzupełnienie do szczegółowych kroków.

## ✨ Dlaczego to przydatne?

### Tradycyjne kroki (szczegółowe):
```
Krok 1: Umyj truskawki pod zimną wodą
Krok 2: Przygotuj słoiki
Krok 3: Dodaj truskawki do słoików
Krok 4: Dodaj cukier
...
```

### Opisowy sposób (ciągły tekst):
```
Umyj truskawki pod zimną wodą i osusz. Przygotuj cztery czyste 
słoiki o pojemności 800 ml każdy. Do każdego słoika umieść po 
około 250 gramów truskawek. Na truskawki wsypuj cukier. Do 
każdego słoika wlej po 500 ml wrzątku. Słoiki zakręć i przez 
ściereczkę kilkukrotnie zakołysz słoikiem, by cukier rozpuścił 
się w wodzie...
```

## 📱 Jak używać?

### Opcja 1: Tylko opisowy sposób
1. Wklej ciągły tekst w pole "Opisowy sposób przygotowania"
2. Pozostaw 1 pusty krok (wymagane minimum)
3. Zapisz przepis

### Opcja 2: Tylko szczegółowe kroki
1. Pomiń pole opisowe
2. Dodaj szczegółowe kroki z czasem i temperaturą
3. Zapisz przepis

### Opcja 3: Oba! (Rekomendowane)
1. Dodaj opisowy sposób dla ogólnego przeglądu
2. Dodaj szczegółowe kroki dla dokładnych instrukcji
3. Najlepsze z obu światów! 🎉

## 🤖 Gemini AI automatycznie wykrywa

Jeśli używasz importu z Gemini AI, system automatycznie:
- ✅ Wykrywa opisowy sposób przygotowania na stronie
- ✅ Dodaje go do pola `instructions`
- ✅ Dodatkowo wyodrębnia szczegółowe kroki jeśli są dostępne

## 💡 Przykłady użycia

### Blog kulinarny
Blogi często mają długi, opisowy przepis:
```
"Najpierw przygotuj ciasto. W misce wymieszaj mąkę z cukrem 
i solą. Dodaj roztopione masło i jajka. Wyrabiaj ciasto przez 
około 5 minut, aż stanie się gładkie i elastyczne..."
```
→ Idealny dla pola "Opisowy sposób przygotowania"

### Przepis babci
```
"Bierzesz truskawki, myjesz je dobrze, potem dajesz do słoików 
z cukrem i zalewasz wrzątkiem. Gotowe!"
```
→ Można dodać jako opisowy + rozbić na kroki dla dokładności

### Profesjonalny przepis
Szczegółowe kroki z parametrami:
- Krok 1: Podgrzej piekarnik do 180°C (10 min)
- Krok 2: Wymieszaj składniki suche (5 min)
- Krok 3: Piecz 25 minut w 180°C

→ Użyj szczegółowych kroków z czasem/temperaturą

## 🎨 Wyświetlanie

### W wizardzie (podgląd):
```
┌─────────────────────────────────┐
│ 📝 Sposób przygotowania         │
│ Umyj truskawki pod zimną wodą...│
└─────────────────────────────────┘

Kroki szczegółowe (4)
1. Umyj truskawki (5 min)
2. Przygotuj słoiki
...
```

### Na stronie przepisu:
System wyświetli oba - użytkownik może wybrać preferowany format.

## 🔧 Techniczne szczegóły

### Baza danych:
```sql
-- Nowe pole w tabeli Recipe
instructions TEXT NULL
```

### API:
```json
{
  "name": "Kompot z truskawek",
  "instructions": "Umyj truskawki pod zimną wodą...",
  "steps": [
    {
      "content": "Umyj truskawki",
      "duration": 5,
      "temperature": null
    }
  ]
}
```

## ✅ Checklist

Kiedy używać opisowego sposobu:
- [ ] Importujesz przepis z bloga kulinarnego
- [ ] Masz przepis w formie ciągłego tekstu
- [ ] Chcesz szybko dodać przepis bez szczegółów
- [ ] Przepis jest prosty i nie wymaga kroków

Kiedy używać szczegółowych kroków:
- [ ] Potrzebujesz precyzyjnych czasów dla każdego kroku
- [ ] Przepis wymaga konkretnych temperatur
- [ ] Chcesz śledzić postęp krok po kroku
- [ ] Przepis jest złożony

Najlepsze rozwiązanie: **Użyj obu!**
- Opisowy dla ogólnego przeglądu
- Kroki dla precyzji

---

**Miłego gotowania! 🍳**

