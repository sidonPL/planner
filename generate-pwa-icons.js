#!/usr/bin/env node

/**
 * PWA Icon Generator
 * Generuje ikony PWA w różnych rozmiarach z logo źródłowego
 * 
 * Uruchomienie:
 * 1. npm install -D sharp
 * 2. Umieść logo.png w katalogu root
 * 3. node generate-pwa-icons.js
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, 'public');
const LOGO_PATH = path.join(__dirname, 'logo.png');

// Definicje rozmiarów ikon
const iconSizes = [
  { size: 72, name: 'icon-72x72.png', purpose: 'any' },
  { size: 96, name: 'icon-96x96.png', purpose: 'any' },
  { size: 128, name: 'icon-128x128.png', purpose: 'any' },
  { size: 144, name: 'icon-144x144.png', purpose: 'any' },
  { size: 152, name: 'icon-152x152.png', purpose: 'any' },
  { size: 192, name: 'icon-192x192.png', purpose: 'any maskable' },
  { size: 384, name: 'icon-384x384.png', purpose: 'any' },
  { size: 512, name: 'icon-512x512.png', purpose: 'any maskable' },
];

const otherIcons = [
  { size: 180, name: 'apple-touch-icon.png', purpose: 'Apple' },
  { size: 32, name: 'favicon.ico', purpose: 'Favicon' },
];

async function generateIcon(inputPath, outputPath, size, isIco = false) {
  try {
    let pipeline = sharp(inputPath)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      });

    if (isIco) {
      await pipeline.ico().toFile(outputPath);
    } else {
      await pipeline.png().toFile(outputPath);
    }

    console.log(`✓ Generated ${path.basename(outputPath)} (${size}x${size})`);
  } catch (error) {
    console.error(`✗ Failed to generate ${path.basename(outputPath)}:`, error.message);
  }
}

async function generateIcons() {
  // Sprawdź czy logo istnieje
  if (!fs.existsSync(LOGO_PATH)) {
    console.error(
      `❌ Błąd: logo.png nie znaleziono w katalogu głównym!\n\n` +
      `Instrukcje:\n` +
      `1. Umieść plik "logo.png" (minimum 1024x1024) w katalogu głównym projektu\n` +
      `2. Upewnij się, że to PNG z przezroczystością\n` +
      `3. Uruchom ponownie: node generate-pwa-icons.js`
    );
    process.exit(1);
  }

  // Sprawdź czy public folder istnieje
  if (!fs.existsSync(PUBLIC_DIR)) {
    fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  }

  console.log('🎨 Generowanie ikon PWA...\n');

  // Generuj główne ikony
  console.log('📱 Ikony PWA:');
  for (const icon of iconSizes) {
    await generateIcon(
      LOGO_PATH,
      path.join(PUBLIC_DIR, icon.name),
      icon.size,
      false
    );
  }

  // Generuj pozostałe ikony
  console.log('\n🍎 Inne ikony:');
  for (const icon of otherIcons) {
    const isIco = icon.name.endsWith('.ico');
    await generateIcon(
      LOGO_PATH,
      path.join(PUBLIC_DIR, icon.name),
      icon.size,
      isIco
    );
  }

  console.log('\n✅ Ikony zostały wygenerowane pomyślnie!\n');
  console.log('📋 Umieszczone pliki:');
  [...iconSizes, ...otherIcons].forEach(icon => {
    console.log(`   • ${icon.name}`);
  });
  console.log('\n💡 Wskazówka: Przejrzyj manifest.json, aby potwierdzić ścieżki ikon.');
}

// Główny punkt wejścia
generateIcons().catch(error => {
  console.error('❌ Błąd generowania ikon:', error);
  process.exit(1);
});

