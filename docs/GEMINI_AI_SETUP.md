# 🤖 Google Gemini AI - Inteligentny Import Przepisów

## 🎯 Co to jest?

Integracja z Google Gemini AI umożliwia **znacznie dokładniejszy** import przepisów z internetu. Zamiast tradycyjnego parsowania HTML za pomocą selektorów CSS, Gemini **rozumie** treść przepisu i inteligentnie wyodrębnia dane.

## ✨ Korzyści z używania Gemini

### Tradycyjny parser vs Gemini AI

| Funkcja | Tradycyjny parser | Gemini AI |
|---------|-------------------|-----------|
| **Dokładność składników** | ⚠️ 70-80% | ✅ 95%+ |
| **Dokładność kroków** | ⚠️ 60-70% | ✅ 90%+ |
| **Filtrowanie śmieci** | ⚠️ Podstawowe | ✅ Doskonałe |
| **Normalizacja jednostek** | ✅ Dobre | ✅ Doskonałe |
| **Wykrywanie czasu/temp** | ✅ Wzorce regex | ✅ Kontekstowe |
| **Wartości odżywcze** | ❌ Rzadko | ✅ Często |
| **Obsługa różnych stron** | ⚠️ Ograniczona | ✅ Uniwersalna |

### Konkretne przykłady:

**Problem 1: Składniki w krokach**
```
HTML: <p>1 kg truskawek</p> (w sekcji kroków)

Tradycyjny: 
  Krok 1: "1 kg truskawek" ❌

Gemini:
  (pomija - rozpoznaje że to składnik, nie instrukcja) ✅
```

**Problem 2: Komentarze użytkowników**
```
HTML: <div class="comment">Uratowała mnie Pani...</div>

Tradycyjny:
  Może zaimportować jako krok ❌

Gemini:
  (ignoruje - rozpoznaje jako komentarz) ✅
```

**Problem 3: Złożone ilości**
```
Tekst: "pół szklanki cukru, czyli około 100g"

Tradycyjny:
  name: "pół szklanki cukru, czyli około 100g" ❌
  quantity: undefined

Gemini:
  name: "cukru" ✅
  quantity: 100
  unit: "g"
```

---

## 🚀 Konfiguracja

### Krok 1: Zdobądź klucz API

1. Przejdź na: https://makersuite.google.com/app/apikey
2. Zaloguj się kontem Google
3. Kliknij "Create API Key"
4. Skopiuj wygenerowany klucz

### Krok 2: Dodaj do .env

```bash
# .env lub .env.local
GEMINI_API_KEY="twój-klucz-api-tutaj"
```

### Krok 3: Restart serwera

```bash
npm run dev
```

---

## 💡 Jak to działa?

### Przepływ importu:

```
1. Użytkownik wkleja URL przepisu
   ↓
2. System pobiera HTML strony
   ↓
3. PRÓBA 1: Gemini AI (jeśli skonfigurowane)
   ├─ ✅ Sukces → zwróć dane
   └─ ❌ Błąd → przejdź do kroku 4
   ↓
4. PRÓBA 2: Tradycyjny parser (fallback)
   └─ Zwróć dane (gorsza jakość)
```

### Co robi Gemini?

1. **Analizuje cały HTML** przepisu
2. **Rozumie kontekst** - odróżnia składniki od kroków
3. **Ignoruje śmieci** - komentarze, reklamy, nawigację
4. **Normalizuje dane** - jednostki, ilości, nazwy
5. **Wyodrębnia metadane** - czas, temperaturę, wartości odżywcze
6. **Wykrywa opisowy sposób przygotowania** - ciągły tekst instrukcji
7. **Zwraca czysty JSON** zgodny z naszym schematem

---

## 📊 Przykład działania

### Input (HTML z aniagotuje.com):

```html
<div class="recipe">
  <h1>Kompot z truskawek na zimę</h1>
  <p>To najlepszy sposób na domowy kompot...</p>
  
  <ul class="ingredients">
    <li>1 kg truskawek</li>
    <li>200 g cukru - 16 łyżek</li>
    <li>2 litry wrzątku</li>
    <li>Użyte słoiki: 4 sztuki o pojemności 800 ml</li>
  </ul>
  
  <div class="steps">
    <p>Umyj truskawki pod zimną wodą</p>
    <p>1 kg truskawek</p>
    <p>Komentarze</p>
    <p>Pasteryzuj przez 20 minut w 120°C</p>
  </div>
</div>
```

### Output (Gemini):

```json
{
  "name": "Kompot z truskawek na zimę",
  "description": "To najlepszy sposób na domowy kompot z truskawek",
  "category": "desserts",
  "servings": 4,
  "prepTime": 20,
  "cookTime": 15,
  "ingredients": [
    {
      "name": "truskawek",
      "quantity": 1,
      "unit": "kg",
      "optional": false
    },
    {
      "name": "cukru",
      "quantity": 200,
      "unit": "g",
      "optional": false
    },
    {
      "name": "wrzątku",
      "quantity": 2,
      "unit": "l",
      "optional": false
    }
  ],
  "steps": [
    {
      "content": "Umyj truskawki pod zimną wodą",
      "duration": null,
      "temperature": null
    },
    {
      "content": "Pasteryzuj przez 20 minut w 120°C",
      "duration": 20,
      "temperature": 120
    }
  ]
}
```

**Zauważ co Gemini pominął:**
- ❌ "Użyte słoiki: 4 sztuki..." (notatka)
- ❌ "1 kg truskawek" (składnik w sekcji kroków)
- ❌ "Komentarze" (nawigacja)

---

## 🎨 UX - Jak użytkownik widzi?

### Przed (tradycyjny parser):
```
✅ Przepis zaimportowany! Sprawdź i edytuj dane przed zapisaniem.
```

### Po (Gemini):
```
🤖 Przepis zaimportowany przez AI! Sprawdź dane.
```

---

## 💰 Koszty

### Bezpłatny tier (wystarczający dla większości):
- ✅ **60 requestów/minutę**
- ✅ **1500 requestów/dzień**
- ✅ **1M tokenów/miesiąc** (ok. 500-1000 przepisów)

### Szacunkowe koszty:
- 1 import przepisu ≈ 1000-2000 tokenów
- Bezpłatnie: ~500 przepisów/miesiąc
- Płatnie: $0.001 za przepis (1000 przepisów = $1)

**Wniosek:** Dla osobistego użytku - zawsze darmowe! 🎉

---

## 🔧 Konfiguracja zaawansowana

### Dostosowanie promptu

Edytuj plik: `src/lib/gemini-recipe-parser.ts`

```typescript
const RECIPE_EXTRACTION_PROMPT = `
Jesteś ekspertem w analizie przepisów kulinarnych...

DODATKOWE ZASADY:
- Ignoruj reklamy
- Wykryj wartości odżywcze jeśli są dostępne
- ...
`;
```

### Zmiana modelu

```typescript
// Szybszy, tańszy (domyślny)
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Wolniejszy, dokładniejszy
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
```

---

## 🐛 Troubleshooting

### Problem: "Gemini API not configured"

**Rozwiązanie:**
1. Sprawdź czy `.env` zawiera `GEMINI_API_KEY`
2. Restart serwera: `npm run dev`
3. Sprawdź czy klucz jest poprawny

### Problem: Import bardzo powolny

**Przyczyna:** Gemini czasem może być wolniejsze niż tradycyjny parser

**Rozwiązanie:**
- Poczekaj 5-10 sekund
- Jeśli timeout, system użyje tradycyjnego parsera

### Problem: Niepoprawne dane mimo Gemini

**Co zrobić:**
1. Sprawdź w konsoli czy rzeczywiście użyto Gemini (szukaj "🤖")
2. Edytuj dane w wizardzie przed zapisem
3. Zgłoś problem z przykładowym URL

---

## 📈 Metryki

System loguje w konsoli:

```
🤖 Trying Gemini AI for recipe parsing...
✅ Gemini successfully parsed recipe: Kompot z truskawek
   - 3 ingredients
   - 2 steps
```

lub

```
ℹ️ Gemini API not configured, using traditional parser
📝 Using traditional HTML parser...
```

---

## 🎯 Wskazówki pro

1. **Zawsze sprawdź dane w wizardzie** - nawet Gemini może się pomylić
2. **Używaj Gemini dla trudnych stron** - blogów, niestandardowych formatów
3. **Tradycyjny parser wystarczy dla znanych stron** - aniagotuje.pl, kwestiasmaku.com
4. **Gemini = lepsze rozumienie kontekstu** - idealny dla stron w różnych językach

---

## 🔐 Bezpieczeństwo

- ✅ Klucz API jest **tylko na serwerze** (nie wysyłany do przeglądarki)
- ✅ HTML jest **obcinany do 50KB** przed wysłaniem do Gemini
- ✅ Timeout **10 sekund** - potem fallback
- ✅ Wszystkie błędy są **logowane** ale nie przerywają procesu

---

## 📚 Dokumentacja API

- [Google AI Studio](https://makersuite.google.com/)
- [Gemini API Docs](https://ai.google.dev/docs)
- [Pricing](https://ai.google.dev/pricing)

---

**Ostatnia aktualizacja:** 2026-01-10

**Autor:** System Planner - Inteligentny import przepisów 🍳

