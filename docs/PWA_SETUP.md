# PWA Ikony i Konfiguracja

## ✅ Co zostało skonfigurowane

1. **manifest.json** - Pełna konfiguracja Progressive Web App z:
   - Ikonami w rozmiarach: 72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512
   - Skrótami na pulpicie (Zadania, Przepisy, Harmonogram)
   - Screenshots dla AppStore
   - Responsive design

2. **layout.tsx** - Meta tagi:
   - Manifest linki
   - Apple Web App konfiguracja
   - Icons (favicon, apple-touch-icon, maskable icon)
   - OpenGraph i Twitter Card
   - Viewport i robots generatory

## 🎨 Jak wygenerować ikony

### Opcja 1: Online Generator (Najszybsza)
1. Przejdź na: https://www.pwa-manifest-generator.com/
2. Załóż zdjęcie (np. 1024x1024 PNG z logo)
3. Wygeneruj ikony
4. Pobierz i umieść w `/public/`

### Opcja 2: ImageMagick (Zaawansowana)
```bash
# Zainstaluj ImageMagick jeśli nie masz
# https://imagemagick.org/script/download.php

# Utwórz wszystkie rozmiary z logo.png
magick convert logo.png -define png:color-type=6 -resize 72x72 public/icon-72x72.png
magick convert logo.png -define png:color-type=6 -resize 96x96 public/icon-96x96.png
magick convert logo.png -define png:color-type=6 -resize 128x128 public/icon-128x128.png
magick convert logo.png -define png:color-type=6 -resize 144x144 public/icon-144x144.png
magick convert logo.png -define png:color-type=6 -resize 152x152 public/icon-152x152.png
magick convert logo.png -define png:color-type=6 -resize 192x192 public/icon-192x192.png
magick convert logo.png -define png:color-type=6 -resize 384x384 public/icon-384x384.png
magick convert logo.png -define png:color-type=6 -resize 512x512 public/icon-512x512.png

# Utwórz favicon
magick convert logo.png -define png:color-type=6 -resize 16x16 public/favicon.ico
```

### Opcja 3: Node.js Script
```bash
npm install -D sharp

# Stwórz plik generate-icons.js (patrz na dole)
node generate-icons.js
```

## 📁 Struktura ikon do umieszczenia

```
public/
├── favicon.ico              # 16x16 lub 32x32
├── icon-72x72.png          # Android
├── icon-96x96.png          # Android
├── icon-128x128.png        # Różne
├── icon-144x144.png        # Android
├── icon-152x152.png        # Apple iPad
├── icon-192x192.png        # PWA primary
├── icon-384x384.png        # PWA large
├── icon-512x512.png        # PWA primary
├── icon-maskable.png       # PWA maskable (bez obramowania)
├── apple-touch-icon.png    # iOS (180x180)
├── screenshot-narrow.png   # Mobile screenshot (540x720)
└── screenshot-wide.png     # Desktop screenshot (1280x720)
```

## 🎯 Wymagane ikony minimum

Powinny być **przynajmniej**:
- ✅ `icon-192x192.png` - PWA manifest (główna ikona)
- ✅ `icon-512x512.png` - PWA manifest (duża ikona)
- ✅ `favicon.ico` - Tab w przeglądarce
- ✅ `apple-touch-icon.png` - iOS home screen

## 🚀 Skrypt Node.js do generowania

Stwórz plik `generate-icons.js`:

```javascript
const sharp = require('sharp');
const fs = require('fs');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const sourceImage = 'logo.png'; // Twoje logo 1024x1024

async function generateIcons() {
  for (const size of sizes) {
    await sharp(sourceImage)
      .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255 } })
      .png()
      .toFile(`public/icon-${size}x${size}.png`);
    console.log(`✓ Generated icon-${size}x${size}.png`);
  }
  
  // Apple touch icon
  await sharp(sourceImage)
    .resize(180, 180, { fit: 'contain' })
    .png()
    .toFile('public/apple-touch-icon.png');
  console.log('✓ Generated apple-touch-icon.png');
  
  // Favicon
  await sharp(sourceImage)
    .resize(32, 32)
    .toFile('public/favicon.ico');
  console.log('✓ Generated favicon.ico');
}

generateIcons().catch(console.error);
```

Uruchom: `node generate-icons.js`

## ✨ Maskable Icon (Advanced)

Dla najnowszych przeglądarek, maskable icon powinien mieć:
- Transparent background
- Safe zone 45% od środka
- Rozmiar minimum 192x192

Linki: https://web.dev/maskable-icon/

## 🧪 Testy

1. **Lighthouse** - Chrome DevTools → Lighthouse → PWA
2. **PWA Builder** - https://www.pwabuilder.com/
3. **Manifest Validator** - https://manifest-validator.appspot.com/
4. **Safari Web App** - iOS: Home Screen → Add to Home Screen

## 📋 Checklist Ostateczny

- [ ] Ikony umieszczone w `/public/`
- [ ] Build nie ma błędów: `npm run build`
- [ ] Manifest.json jest dostępny: `http://localhost:3000/manifest.json`
- [ ] Favicon widoczny w tab przeglądarki
- [ ] Ikona aplikacji widoczna na iOS home screen
- [ ] Lighthouse PWA score > 90
- [ ] Service Worker zarejestrowany (sprawdź DevTools → Application)

## 🔗 Przydatne linki

- [PWA Checklist](https://web.dev/pwa-checklist/)
- [Manifest Generator](https://www.pwa-manifest-generator.com/)
- [Image Optimizer](https://tinypng.com/)
- [PWA Tutorial](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/)

