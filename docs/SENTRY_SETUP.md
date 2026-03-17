# Sentry Setup - Error Tracking dla Produkcji

**Data**: 2026-01-05  
**Status**: ✅ Skonfigurowane  
**Środowisko**: Produkcja (VPS)

---

## 🎯 Co to daje?

Sentry to narzędzie do:
- 🐛 **Monitorowania błędów** w czasie rzeczywistym
- 📊 **Analizy performance** aplikacji
- 👤 **Śledzenia user journey** przed błędem
- 🔔 **Alertów** o krytycznych problemach
- 📈 **Raportów** i statystyk

---

## 📦 Co zostało zainstalowane?

1. `@sentry/nextjs` - SDK Sentry dla Next.js
2. Konfiguracja dla:
   - Client-side (`sentry.client.config.ts`)
   - Server-side (`sentry.server.config.ts`)
   - Edge runtime (`sentry.edge.config.ts`)
3. Helper functions (`src/lib/sentry.ts`)
4. Next.js integration (`next.config.ts`)

---

## 🚀 Setup - Krok po kroku

### 1. Utwórz konto na Sentry.io

1. Wejdź na https://sentry.io/signup/
2. Załóż darmowe konto (50k events/miesiąc)
3. Utwórz nowy projekt typu **Next.js**
4. Skopiuj **DSN** (Data Source Name)

### 2. Dodaj zmienne środowiskowe

W pliku `.env.local` (lokalnie) i na VPS:

```bash
# Sentry Error Tracking
NEXT_PUBLIC_SENTRY_DSN="https://xxx@xxx.ingest.sentry.io/xxx"
SENTRY_ORG="your-org-name"
SENTRY_PROJECT="planner"
SENTRY_AUTH_TOKEN="your-auth-token"  # Opcjonalne, dla source maps
```

**Jak uzyskać Auth Token:**
1. Sentry → Settings → Auth Tokens
2. Create New Token
3. Uprawnienia: `project:releases`, `org:read`
4. Skopiuj token

### 3. Zbuduj projekt

```bash
npm run build
```

Podczas buildu Sentry automatycznie:
- ✅ Wstrzykuje konfigurację
- ✅ Uploaduje source maps (jeśli SENTRY_AUTH_TOKEN jest ustawiony)
- ✅ Tworzy release

---

## 💻 Jak używać w kodzie?

### Basic Error Logging

```typescript
import { captureException } from '@/lib/sentry';

try {
  // Twój kod
  await riskyOperation();
} catch (error) {
  captureException(error, {
    tags: {
      component: 'RecipeForm',
      action: 'create',
    },
    extra: {
      recipeId: recipe.id,
      userId: user.id,
    },
  });
  
  toast.error("Wystąpił błąd");
}
```

### Message Logging

```typescript
import { captureMessage } from '@/lib/sentry';

captureMessage('User completed onboarding', {
  level: 'info',
  tags: {
    userId: user.id,
  },
});
```

### User Context (przy logowaniu)

```typescript
import { setUserContext, clearUserContext } from '@/lib/sentry';

// Po zalogowaniu
setUserContext({
  id: user.id,
  email: user.email,
  username: user.name,
});

// Przy wylogowaniu
clearUserContext();
```

### Breadcrumbs (ślad aktywności)

```typescript
import { addBreadcrumb } from '@/lib/sentry';

addBreadcrumb('User opened recipe form', {
  recipeId: recipe.id,
});
```

### Wrapper dla funkcji

```typescript
import { withErrorTracking } from '@/lib/sentry';

const createRecipe = withErrorTracking(
  async (data: RecipeData) => {
    // Twój kod
    return await prisma.recipe.create({ data });
  },
  {
    name: 'createRecipe',
    tags: { module: 'recipes' },
  }
);
```

---

## 🔧 Przykłady użycia w projekcie

### 1. API Routes

```typescript
// src/app/api/recipes/route.ts
import { captureException } from '@/lib/sentry';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const recipe = await prisma.recipe.create({ data });
    return NextResponse.json(recipe);
  } catch (error) {
    captureException(error, {
      tags: {
        endpoint: '/api/recipes',
        method: 'POST',
      },
      extra: {
        requestBody: data,
      },
    });
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 2. Server Actions

```typescript
'use server'

import { captureException } from '@/lib/sentry';

export async function deleteRecipe(id: string) {
  try {
    await prisma.recipe.delete({ where: { id } });
    return { success: true };
  } catch (error) {
    captureException(error, {
      tags: { action: 'deleteRecipe' },
      extra: { recipeId: id },
    });
    return { success: false, error: 'Failed to delete' };
  }
}
```

### 3. Client Components

```typescript
'use client'

import { captureException } from '@/lib/sentry';

export function RecipeForm() {
  const handleSubmit = async (data: RecipeData) => {
    try {
      await fetch('/api/recipes', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch (error) {
      captureException(error, {
        tags: { component: 'RecipeForm' },
      });
      toast.error('Nie udało się zapisać przepisu');
    }
  };
  
  // ...
}
```

---

## 📊 Monitorowanie w Sentry Dashboard

### Co zobaczysz:

1. **Issues** - Lista wszystkich błędów
   - Stack traces
   - User context
   - Breadcrumbs (co robił użytkownik przed błędem)
   - Device/Browser info

2. **Performance** - Metryki wydajności
   - Transaction duration
   - Slow API calls
   - Page load times

3. **Releases** - Wersje aplikacji
   - Errors per release
   - Regression tracking

4. **Alerts** - Powiadomienia
   - Email/Slack gdy nowy błąd
   - Spike detection

---

## ⚙️ Konfiguracja Alertów

1. Sentry → Settings → Alerts
2. Create Alert Rule:
   - **When**: An event is seen
   - **If**: The issue is first seen
   - **Then**: Send notification to Email/Slack

Przykładowe reguły:
- 🔴 **Critical**: Błąd występuje > 100x w ciągu 1h
- 🟠 **Warning**: Nowy typ błędu
- 🟡 **Info**: Release deployed

---

## 🧪 Testowanie

### Development Mode
W development Sentry **NIE wysyła** błędów (tylko loguje do konsoli).

### Test w Production Mode

```bash
# Zbuduj w trybie produkcyjnym
npm run build
npm start

# W przeglądarce:
# 1. Otwórz /test-sentry (musisz stworzyć endpoint)
# 2. Lub wywołaj błąd w aplikacji
# 3. Sprawdź Sentry dashboard
```

Stwórz test endpoint:

```typescript
// src/app/api/sentry-test/route.ts
export async function GET() {
  throw new Error("Sentry test error!");
}
```

---

## 📈 Best Practices

### ✅ DO:
- Używaj `captureException` dla wszystkich catch blocków w produkcji
- Dodawaj context (tags, extra) do błędów
- Set user context po zalogowaniu
- Dodawaj breadcrumbs dla ważnych akcji użytkownika
- Monitoruj Sentry dashboard regularnie

### ❌ DON'T:
- Nie loguj wrażliwych danych (hasła, tokeny)
- Nie wysyłaj PII (Personally Identifiable Information) bez zgody
- Nie ignoruj błędów - zawsze je loguj
- Nie używaj w development (już wyłączone w config)

---

## 🔒 Privacy & GDPR

Sentry automatycznie:
- ✅ Scrubuje wrażliwe dane (passwords, credit cards)
- ✅ Można wykluczyć IP addresses
- ✅ Można wykluczyć user data

W `sentry.client.config.ts`:

```typescript
beforeSend(event) {
  // Remove sensitive data
  if (event.request) {
    delete event.request.cookies;
  }
  
  // Scrub user emails if needed
  if (event.user?.email) {
    event.user.email = event.user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3');
  }
  
  return event;
}
```

---

## 🎯 Monitoring Metrics

### Śledź:
- **Error Rate**: < 1% requests
- **Crash-Free Users**: > 99.9%
- **Response Time**: API < 200ms
- **Apdex Score**: > 0.9

---

## 🔄 Update Sentry

```bash
npm update @sentry/nextjs
```

---

## 📝 Checklist Deployment

Przed wdrożeniem na produkcję:

- [ ] Sentry DSN ustawiony w `.env.production`
- [ ] Auth token ustawiony (opcjonalne, dla source maps)
- [ ] Alerts skonfigurowane
- [ ] Test endpoint działa
- [ ] User context set on login
- [ ] Critical errors mają wysokie priority

---

## 🆘 Troubleshooting

### Błędy nie pojawiają się w Sentry?

1. Sprawdź czy `NEXT_PUBLIC_SENTRY_DSN` jest ustawiony
2. Sprawdź czy `NODE_ENV=production`
3. Sprawdź console logs - czy Sentry się inicjalizuje
4. Sprawdź network tab - czy requesty idą do Sentry

### Source maps nie działają?

1. Sprawdź czy `SENTRY_AUTH_TOKEN` jest ustawiony
2. Sprawdź logi build - czy source maps są uploadowane
3. W Sentry → Settings → Source Maps - czy są pliki

---

## 💰 Koszty

**Free Tier** (wystarczający dla małych/średnich projektów):
- 50,000 errors/miesiąc
- 10,000 transactions/miesiąc
- 100 GB attachments/miesiąc
- 30 days retention

**Team Plan** ($26/miesiąc - jeśli potrzeba więcej):
- 100,000 errors/miesiąc
- 100,000 transactions/miesiąc
- 90 days retention

---

## 📚 Dodatkowe Zasoby

- 📖 [Sentry Docs](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- 🎥 [Sentry Tutorial](https://www.youtube.com/watch?v=dQw4w9WgXcQ)
- 💬 [Sentry Discord](https://discord.gg/sentry)

---

**Setup zakończony**: 2026-01-05  
**Status**: ✅ Gotowe do użycia  
**Następny krok**: Deploy na VPS i testowanie!

