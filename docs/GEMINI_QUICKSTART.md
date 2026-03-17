# 🚀 Quick Start - Gemini AI dla importu przepisów

## TL;DR

**Dodaj jedną linijkę do `.env` i import przepisów będzie 10x lepszy!**

```bash
GEMINI_API_KEY="twój-klucz-z-google"
```

## 3 kroki do lepszego importu:

### 1️⃣ Zdobądź klucz (2 minuty)
- Wejdź na: https://makersuite.google.com/app/apikey
- Zaloguj się Google
- Kliknij "Create API Key"
- Skopiuj klucz

### 2️⃣ Dodaj do .env
```bash
# .env.local lub .env
GEMINI_API_KEY="AIzaSyC..."  # wklej swój klucz
```

### 3️⃣ Restart
```bash
npm run dev
```

## ✅ Gotowe!

Od teraz import przepisów działa **znacznie lepiej**:

### Przed (tradycyjny parser):
- ❌ Składniki się mieszają z krokami
- ❌ Komentarze jako instrukcje
- ❌ Niepełne nazwy składników
- ❌ "cukru - 16 łyżek" zamiast "cukru"

### Po (Gemini AI):
- ✅ Składniki i kroki idealnie rozdzielone
- ✅ Zero komentarzy i śmieci
- ✅ Pełne, poprawne nazwy
- ✅ Czyste dane bez notatek

## 💰 Ile to kosztuje?

**DARMOWE** dla normalnego użytku!
- 500-1000 przepisów/miesiąc = $0
- Więcej niż 1000/miesiąc = ~$0.001 za przepis

## 🎯 Jak sprawdzić czy działa?

Zaimportuj przepis - zobaczysz:

```
🤖 Przepis zaimportowany przez AI! Sprawdź dane.
```

Zamiast zwykłego:
```
✅ Przepis zaimportowany! Sprawdź i edytuj dane...
```

## ❓ Co jeśli nie skonfiguruję?

Nic strasznego! System użyje **tradycyjnego parsera** (taki jak teraz).

Gemini to **opcjonalne ulepszenie**, nie wymóg.

## 📚 Więcej info

Zobacz: `docs/GEMINI_AI_SETUP.md`

---

**Miłego gotowania! 🍳**

