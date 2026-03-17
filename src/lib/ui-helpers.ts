/**
 * Funkcje pomocnicze dla animacji i transitions
 */

/**
 * Płynne przewijanie do elementu
 */
export function smoothScrollToElement(
  elementId: string,
  offset: number = 0
): void {
  const element = document.getElementById(elementId);
  if (!element) return;

  const elementPosition = element.getBoundingClientRect().top;
  const offsetPosition = elementPosition + window.pageYOffset - offset;

  window.scrollTo({
    top: offsetPosition,
    behavior: "smooth",
  });
}

/**
 * Sprawdza czy element jest widoczny w viewport
 */
export function isElementInViewport(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

/**
 * Debounced window resize listener
 */
export function onWindowResize(
  callback: () => void,
  delay: number = 100
): () => void {
  let timeoutId: NodeJS.Timeout;

  const handleResize = () => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(callback, delay);
  };

  window.addEventListener("resize", handleResize);

  // Cleanup function
  return () => {
    window.removeEventListener("resize", handleResize);
    clearTimeout(timeoutId);
  };
}

/**
 * Lazy load obrazów z intersection observer
 */
export function lazyLoadImage(img: HTMLImageElement): void {
  const dataSrc = img.getAttribute("data-src");
  if (!dataSrc) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const target = entry.target as HTMLImageElement;
          target.src = dataSrc;
          target.removeAttribute("data-src");
          observer.unobserve(target);
        }
      });
    },
    {
      rootMargin: "50px", // Load 50px before entering viewport
    }
  );

  observer.observe(img);
}

/**
 * Animuje wartość liczbową (np. dla counterów)
 */
export function animateValue(
  start: number,
  end: number,
  duration: number,
  callback: (value: number) => void
): void {
  const startTime = Date.now();
  const range = end - start;

  function update() {
    const now = Date.now();
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Easing function (ease-out)
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = start + range * eased;

    callback(Math.round(current));

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

/**
 * Kopiuje tekst do schowka z animacją sukcesu
 */
export async function copyToClipboard(
  text: string,
  onSuccess?: () => void
): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    onSuccess?.();
    return true;
  } catch (err) {
    console.error("Failed to copy:", err);
    return false;
  }
}

/**
 * Generuje losowy kolor dla avatara/placeholdera
 */
export function generateColorFromString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  const hue = hash % 360;
  return `hsl(${hue}, 70%, 60%)`;
}

