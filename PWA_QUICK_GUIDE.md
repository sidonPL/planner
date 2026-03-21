# 🎯 PWA Setup - 5 Minut do Gotowego

## TL;DR - Szybki Start

```bash
# 1. Umieść logo.png w katalogu głównym (1024x1024 PNG)

# 2. Zainstaluj Sharp
npm install -D sharp

# 3. Wygeneruj ikony
node generate-pwa-icons.js

# 4. Build
npm run build

# 5. Test
npm run dev
# Otwórz: http://localhost:3000
# DevTools → Application → Manifest (sprawdź ikony)
```

## ✅ Co Już Zrobione

- ✅ `manifest.json` - Pełna konfiguracja
- ✅ `layout.tsx` - Meta tagi, favicon, viewport
- ✅ `generate-pwa-icons.js` - Skrypt generatora
- ✅ Dokumentacja - `PWA_QUICK_START.md`

## ⭕ Co Musisz Zrobić

1. **Przygotuj logo** (1024x1024 PNG)
2. **Wygeneruj ikony** (1 komenda)
3. **Umieść w `/public/`** (automatyczne)
4. **Build i test** (2 komendy)

## 🚀 Dla Windows

```cmd
# Duplikuj i kliknij:
setup-pwa.bat

# Lub ręcznie:
npm install -D sharp
node generate-pwa-icons.js
npm run build
npm run dev
```

## 🚀 Dla Mac/Linux

```bash
# Duplikuj i uruchom:
bash setup-pwa.sh

# Lub ręcznie:
npm install -D sharp
node generate-pwa-icons.js
npm run build
npm run dev
```

## 📋 Wymagane Minimum

Aby PWA działała, muszą być w `/public/`:
- `icon-192x192.png` ⭐
- `icon-512x512.png` ⭐
- `favicon.ico`
- `manifest.json` (✅ już masz)

## 🎨 Gdzie Wziąć Logo

- **Free**: https://pixabay.com/, https://unsplash.com/
- **Icons**: https://www.flaticon.com/, https://www.iconfinder.com/
- **Design**: Figma, Canva, Adobe Express
- **AI**: ChatGPT, DALL-E, Midjourney

**Wymogi**:
- PNG format
- Minimum 1024x1024px
- Przezroczyste tło (RGBA)

## ✨ Po Setup'ie

PWA będzie mieć:
- 📱 Install button w Chrome
- 🏠 Ikona na home screen
- ⚡ Offline support (jeśli masz Service Worker)
- 🎯 Shortcuts na pulpicie
- 🔔 Push notifications (możliwość)

## 🔍 Verification Checklist

```bash
npm run build  # ✅ Powinno przejść
npm run dev    # Czekaj aż będzie serwer

# Otwórz http://localhost:3000
# Testuj w Chrome:
```

1. **DevTools (F12)**
   - Application tab
   - Manifest - powinna lista ikon
   - Service Workers - registered

2. **Lighthouse**
   - Lighthouse tab
   - PWA checkbox
   - Score powinien być > 90

3. **Install Button**
   - Chrome: Powinien być w address bar
   - Kliknij "Install" - powinna pojawić się app

4. **Home Screen**
   - Po instalacji - ikona na desktop
   - iOS: Share → Add to Home Screen

## ❓ Problemy?

### "npm ERR! Module not found"
```bash
npm install -D sharp --legacy-peer-deps
```

### "Ikony nie generują się"
```bash
# Sprawdź czy logo.png istnieje
ls logo.png  # Mac/Linux
dir logo.png # Windows

# Jeśli nie, pobierz z https://pixabay.com/
```

### "Sharp installation failed"
```bash
# Jeśli masz M1/M2 Mac
npm install -D @img/sharp-darwin-arm64

# Lub użyj online generatora
# https://www.pwa-manifest-generator.com/
```

### "Ikony nie zmienią się w Chrome"
```bash
# Hard refresh
Ctrl+Shift+R  # Windows
Cmd+Shift+R   # Mac

# Lub wyczyść cache w DevTools
# Application → Clear site data
```

## 📚 Więcej Info

- **PWA_QUICK_START.md** - Pełny setup krok po kroku
- **docs/PWA_SETUP.md** - Zaawansowana konfiguracja
- **PWA_SETUP_SUMMARY.md** - Co zostało zrobione

## 🎉 Gotowe!

Po ukończeniu tych kroków, PWA będzie:
- ✅ Instalowalna
- ✅ Offline mode (z Service Workerem)
- ✅ Ikona na home screen
- ✅ App shortcuts
- ✅ Lighthouse PWA > 90

---

**Czas setup'u**: ~15 minut  
**Trudność**: ⭐ (super łatwe!)

**Pytania?** Sprawdź `docs/PWA_SETUP.md` lub GitHub issues.

