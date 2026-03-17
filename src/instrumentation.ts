/**
 * Next.js Instrumentation
 * Uruchamia się raz przy starcie serwera (dev i production)
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Importuj dynamicznie aby uniknąć problemów z edge runtime
    const { checkAndSeedOnStartup } = await import("./lib/check-seeds");

    // Uruchom sprawdzenie seedów
    await checkAndSeedOnStartup();
  }
}

