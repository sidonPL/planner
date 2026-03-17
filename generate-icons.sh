#!/bin/bash

# Skrypt do generowania ikon PWA z jednego źródłowego pliku
# Użycie: ./generate-icons.sh logo.png

if [ -z "$1" ]; then
    echo "Użycie: ./generate-icons.sh logo.png"
    exit 1
fi

SOURCE_FILE=$1

if [ ! -f "$SOURCE_FILE" ]; then
    echo "Błąd: Plik $SOURCE_FILE nie istnieje!"
    exit 1
fi

# Sprawdź czy ImageMagick jest zainstalowany
if ! command -v convert &> /dev/null; then
    echo "ImageMagick nie jest zainstalowany!"
    echo "Instalacja: sudo apt install imagemagick"
    exit 1
fi

# Utwórz katalog na ikony jeśli nie istnieje
mkdir -p public/icons

# Generuj ikony
echo "Generowanie ikon PWA..."

convert "$SOURCE_FILE" -resize 72x72 public/icons/icon-72x72.png
echo "✓ icon-72x72.png"

convert "$SOURCE_FILE" -resize 96x96 public/icons/icon-96x96.png
echo "✓ icon-96x96.png"

convert "$SOURCE_FILE" -resize 128x128 public/icons/icon-128x128.png
echo "✓ icon-128x128.png"

convert "$SOURCE_FILE" -resize 144x144 public/icons/icon-144x144.png
echo "✓ icon-144x144.png"

convert "$SOURCE_FILE" -resize 152x152 public/icons/icon-152x152.png
echo "✓ icon-152x152.png"

convert "$SOURCE_FILE" -resize 192x192 public/icons/icon-192x192.png
echo "✓ icon-192x192.png"

convert "$SOURCE_FILE" -resize 384x384 public/icons/icon-384x384.png
echo "✓ icon-384x384.png"

convert "$SOURCE_FILE" -resize 512x512 public/icons/icon-512x512.png
echo "✓ icon-512x512.png"

# Apple Touch Icon
convert "$SOURCE_FILE" -resize 180x180 public/apple-touch-icon.png
echo "✓ apple-touch-icon.png"

# Favicon
convert "$SOURCE_FILE" -resize 32x32 public/favicon.ico
echo "✓ favicon.ico"

echo ""
echo "✅ Wszystkie ikony zostały wygenerowane!"
echo "Lokalizacja: public/icons/"

# Pokaż rozmiary plików
echo ""
echo "Rozmiary plików:"
du -h public/icons/*.png public/apple-touch-icon.png public/favicon.ico

echo ""
echo "Gotowe! Możesz teraz przetestować PWA."

