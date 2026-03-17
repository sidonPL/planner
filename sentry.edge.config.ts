import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  environment: process.env.NODE_ENV || "development",

  beforeSend(event) {
    // Filter out development errors
    if (process.env.NODE_ENV === "development") {
      console.log("Sentry Edge Event (dev):", event);
      return null;
    }

    return event;
  },
});

