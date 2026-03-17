/**
 * Walidacja i bezpieczenstwo dla modulu przepisow
 */

/**
 * Sprawdza czy URL jest prawidlowym URLem YouTube
 */
export function isValidYouTubeUrl(url: string): boolean {
  if (!url) return false;

  try {
    const urlObj = new URL(url);
    const validDomains = ['youtube.com', 'www.youtube.com', 'youtu.be', 'm.youtube.com'];
    return validDomains.includes(urlObj.hostname);
  } catch {
    return false;
  }
}

/**
 * Wyodrebnia YouTube Video ID z URL
 */
export function extractYouTubeVideoId(url: string): string | null {
  if (!isValidYouTubeUrl(url)) return null;

  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Konwertuje URL YouTube na embed URL
 */
export function getYouTubeEmbedUrl(url: string): string | null {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) return null;

  return `https://www.youtube.com/embed/${videoId}`;
}

/**
 * Waliduje rozmiar pliku obrazu
 */
export function validateImageFile(file: File, maxSizeMB: number = 5): {
  valid: boolean;
  error?: string;
} {
  // Sprawdz typ pliku
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Nieprawidlowy format pliku. Akceptowane formaty: JPG, PNG, WEBP, GIF',
    };
  }

  // Sprawdz rozmiar
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `Plik jest za duzy. Maksymalny rozmiar: ${maxSizeMB}MB`,
    };
  }

  return { valid: true };
}

/**
 * Kompresuje obraz do okreslonego rozmiaru
 */
export async function compressImage(
  file: File,
  maxWidth: number = 1200,
  maxHeight: number = 1200,
  quality: number = 0.8
): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Zachowaj proporcje
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              reject(new Error('Kompresja obrazu nie powiodla sie'));
            }
          },
          file.type,
          quality
        );
      };

      img.onerror = () => {
        reject(new Error('Nie udalo sie zaladowac obrazu'));
      };
    };

    reader.onerror = () => {
      reject(new Error('Nie udalo sie odczytac pliku'));
    };
  });
}

/**
 * Sanityzuje tekst usuwajac potencjalnie niebezpieczny HTML
 * (Prosta wersja - dla pelnej ochrony uzyj DOMPurify)
 */
export function sanitizeText(text: string): string {
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Waliduje nazwe przepisu
 */
export function validateRecipeName(name: string): {
  valid: boolean;
  error?: string;
} {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'Nazwa przepisu jest wymagana' };
  }

  if (name.length < 3) {
    return { valid: false, error: 'Nazwa musi miec co najmniej 3 znaki' };
  }

  if (name.length > 100) {
    return { valid: false, error: 'Nazwa nie moze przekraczac 100 znakow' };
  }

  return { valid: true };
}

/**
 * Waliduje czas (prep/cook/rest)
 */
export function validateTime(time: number | null): {
  valid: boolean;
  error?: string;
} {
  if (time === null || time === undefined) {
    return { valid: true }; // Czas jest opcjonalny
  }

  if (time < 0) {
    return { valid: false, error: 'Czas nie moze byc ujemny' };
  }

  if (time > 1440) {
    // 24 godziny
    return { valid: false, error: 'Czas nie moze przekraczac 24 godzin' };
  }

  return { valid: true };
}

/**
 * Waliduje liczbe porcji
 */
export function validateServings(servings: number): {
  valid: boolean;
  error?: string;
} {
  if (!servings || servings < 1) {
    return { valid: false, error: 'Liczba porcji musi byc wieksza od 0' };
  }

  if (servings > 100) {
    return { valid: false, error: 'Liczba porcji nie moze przekraczac 100' };
  }

  return { valid: true };
}

