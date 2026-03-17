import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ===== RATE LIMITING =====
// Simple in-memory rate limiter
// W produkcji na VPS można rozważyć Redis, ale in-memory jest wystarczające dla małych/średnich aplikacji

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

// Configuration - można dostosować przez zmienne środowiskowe
const RATE_LIMIT_WINDOW = parseInt(process.env.RATE_LIMIT_WINDOW || '60000'); // domyślnie 1 minuta
const MAX_REQUESTS = parseInt(process.env.MAX_REQUESTS_PER_WINDOW || '300'); // zwiększone dla dev
const API_RATE_LIMIT = parseInt(process.env.API_RATE_LIMIT || '200'); // zwiększone dla dev
const SSE_RATE_LIMIT = parseInt(process.env.SSE_RATE_LIMIT || '30'); // specjalny limit dla SSE
const SESSION_RATE_LIMIT = parseInt(process.env.SESSION_RATE_LIMIT || '100'); // specjalny limit dla sesji

function getClientIp(request: NextRequest): string {
  // Obsługa różnych proxy headers (ważne dla VPS za reverse proxy jak nginx)
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip'); // Cloudflare

  // Priorytet: CF > X-Real-IP > X-Forwarded-For > fallback
  const ip = cfConnectingIp ?? realIp ?? forwardedFor?.split(',')[0].trim() ?? 'unknown';

  return ip;
}

function getRateLimitKey(request: NextRequest, prefix: string = 'ratelimit'): string {
  const ip = getClientIp(request);
  const { pathname } = request.nextUrl;

  // Różne limity dla różnych endpointów
  if (pathname.startsWith('/api/')) {
    return `${prefix}:api:${ip}`;
  }

  return `${prefix}:${ip}`;
}

function checkRateLimit(
  key: string,
  maxRequests: number = MAX_REQUESTS
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetTime) {
    // Create new entry or reset expired entry
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    };
    rateLimitMap.set(key, newEntry);
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime: newEntry.resetTime,
    };
  }

  // Increment count
  entry.count++;

  if (entry.count > maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
    };
  }

  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetTime: entry.resetTime,
  };
}

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, RATE_LIMIT_WINDOW);

// ===== AUTH & ROUTING =====

// Trasy publiczne (dostępne bez logowania)
const publicRoutes = ["/login", "/register", "/forgot-password", "/reset-password"];

// Trasy wymagające zalogowania ale nie wymagające gospodarstwa
const noHouseholdRoutes = ["/onboarding"];

// Trasy autentykacji (przekierowanie na dashboard jeśli zalogowany)
const authRoutes = ["/login", "/register"];

// Security headers dla VPS
function addSecurityHeaders(response: NextResponse): NextResponse {
  // Podstawowe security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // HSTS - tylko w produkcji
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  // CSP - Content Security Policy (dostosuj do swoich potrzeb)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Content-Security-Policy',
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://unpkg.com https://cdn.jsdelivr.net; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https: blob:; " +
      "font-src 'self' data:; " +
      "connect-src 'self' https:; " +
      "frame-ancestors 'none';"
    );
  }

  // Permissions Policy
  response.headers.set(
    'Permissions-Policy',
    'geolocation=(self), microphone=(), camera=(), payment=()'
  );

  return response;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const clientIp = getClientIp(request);

  // Skip rate limiting dla plików statycznych
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/sw.js') ||
    pathname.startsWith('/manifest.json') ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|gif|webp|css|js|woff|woff2|ttf|eot)$/i)
  ) {
    return NextResponse.next();
  }

  // Health check endpoint - bez rate limiting
  if (pathname === '/api/health') {
    return NextResponse.next();
  }

  // Bardzo luźne limity dla localhost w development
  const isLocalhost = clientIp === '::1' || clientIp === '127.0.0.1' || clientIp === 'unknown' || clientIp.startsWith('::ffff:127.0.0.1');

  // Check rate limit
  const key = getRateLimitKey(request);
  const isApiRoute = pathname.startsWith("/api");

  // Określ limit w zależności od endpointu
  let maxRequests = MAX_REQUESTS;
  if (pathname === '/api/sse') {
    maxRequests = SSE_RATE_LIMIT;
  } else if (pathname === '/api/auth/session') {
    maxRequests = SESSION_RATE_LIMIT;
  } else if (isApiRoute) {
    maxRequests = API_RATE_LIMIT;
  }

  // Dla localhost w development - 10x wyższe limity
  if (isLocalhost && process.env.NODE_ENV === 'development') {
    maxRequests = maxRequests * 10;
  }

  const { allowed, remaining, resetTime } = checkRateLimit(key, maxRequests);

  if (!allowed) {
    console.warn(`Rate limit exceeded for ${getClientIp(request)} on ${pathname}`);
    const response = new NextResponse(
      JSON.stringify({
        error: 'Too Many Requests',
        message: 'Przekroczono limit żądań. Spróbuj ponownie później.',
        retryAfter: Math.ceil((resetTime - Date.now()) / 1000)
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
    response.headers.set('X-RateLimit-Limit', maxRequests.toString());
    response.headers.set('X-RateLimit-Remaining', '0');
    response.headers.set('X-RateLimit-Reset', new Date(resetTime).toISOString());
    response.headers.set('Retry-After', Math.ceil((resetTime - Date.now()) / 1000).toString());
    return addSecurityHeaders(response);
  }

  // Pobierz token sesji z cookies
  const sessionToken = request.cookies.get("authjs.session-token")?.value ||
                       request.cookies.get("__Secure-authjs.session-token")?.value;

  const isLoggedIn = !!sessionToken;
  const isPublicRoute = publicRoutes.includes(pathname);
  const isAuthRoute = authRoutes.includes(pathname);
  const isNoHouseholdRoute = noHouseholdRoutes.includes(pathname);

  // Pozwól na API routes (z rate limiting już zastosowanym)
  if (isApiRoute) {
    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Limit', maxRequests.toString());
    response.headers.set('X-RateLimit-Remaining', remaining.toString());
    response.headers.set('X-RateLimit-Reset', new Date(resetTime).toISOString());
    return addSecurityHeaders(response);
  }

  // Jeśli użytkownik jest zalogowany i próbuje wejść na stronę logowania
  if (isAuthRoute && isLoggedIn) {
    const response = NextResponse.redirect(new URL("/", request.url));
    return addSecurityHeaders(response);
  }

  // Pozwól zalogowanym użytkownikom na dostęp do onboarding
  if (isNoHouseholdRoute && isLoggedIn) {
    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Limit', maxRequests.toString());
    response.headers.set('X-RateLimit-Remaining', remaining.toString());
    response.headers.set('X-RateLimit-Reset', new Date(resetTime).toISOString());
    return addSecurityHeaders(response);
  }

  // Jeśli użytkownik nie jest zalogowany i próbuje wejść na chronioną trasę
  if (!isPublicRoute && !isLoggedIn) {
    const callbackUrl = encodeURIComponent(pathname + request.nextUrl.search);
    const response = NextResponse.redirect(
      new URL(`/login?callbackUrl=${callbackUrl}`, request.url)
    );
    return addSecurityHeaders(response);
  }

  const response = NextResponse.next();
  // Add rate limit headers to all responses
  response.headers.set('X-RateLimit-Limit', maxRequests.toString());
  response.headers.set('X-RateLimit-Remaining', remaining.toString());
  response.headers.set('X-RateLimit-Reset', new Date(resetTime).toISOString());
  return addSecurityHeaders(response);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|public).*)',
  ],
};

