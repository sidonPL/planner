import { NextRequest, NextResponse } from 'next/server';

// Cache dla kursów walut (1 godzina)
const ratesCache = new Map<string, { rates: Record<string, number>; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 godzina

/**
 * GET /api/currency/convert?from=EUR&to=PLN&amount=100
 * Konwertuje kwotę między walutami
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from') || 'PLN';
    const to = searchParams.get('to') || 'PLN';
    const amount = parseFloat(searchParams.get('amount') || '1');

    if (from === to) {
      return NextResponse.json({
        from,
        to,
        amount,
        result: amount,
        rate: 1
      });
    }

    // Check cache
    const cacheKey = 'latest';
    const cached = ratesCache.get(cacheKey);
    let rates: Record<string, number>;

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      rates = cached.rates;
    } else {
      // Fetch from API (using frankfurter.app - free, no API key needed)
      const response = await fetch('https://api.frankfurter.app/latest?from=PLN');

      if (!response.ok) {
        // Fallback to mock rates
        rates = {
          EUR: 0.23,
          USD: 0.25,
          GBP: 0.20,
          CHF: 0.22,
          PLN: 1,
        };
      } else {
        const data = await response.json();
        rates = { ...data.rates, PLN: 1 };

        // Cache the rates
        ratesCache.set(cacheKey, { rates, timestamp: Date.now() });
      }
    }

    // Calculate conversion
    const fromRate = rates[from] || 1;
    const toRate = rates[to] || 1;
    const rate = toRate / fromRate;
    const result = amount * rate;

    return NextResponse.json({
      from,
      to,
      amount,
      result: Math.round(result * 100) / 100,
      rate: Math.round(rate * 10000) / 10000,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Currency conversion error:', error);
    return NextResponse.json(
      { error: 'Failed to convert currency' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/currency/rates
 * Pobiera aktualne kursy walut
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { base = 'PLN' } = body;

    // Check cache
    const cacheKey = base;
    const cached = ratesCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({ base, rates: cached.rates, cached: true });
    }

    // Fetch from API
    const response = await fetch(`https://api.frankfurter.app/latest?from=${base}`);

    if (!response.ok) {
      // Fallback to mock rates
      const mockRates = {
        EUR: 0.23,
        USD: 0.25,
        GBP: 0.20,
        CHF: 0.22,
        PLN: base === 'PLN' ? 1 : 4.3,
      };
      return NextResponse.json({ base, rates: mockRates, mock: true });
    }

    const data = await response.json();
    const rates = { ...data.rates, [base]: 1 };

    // Cache the rates
    ratesCache.set(cacheKey, { rates, timestamp: Date.now() });

    return NextResponse.json({ base, rates, cached: false });
  } catch (error) {
    console.error('Currency rates error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch currency rates' },
      { status: 500 }
    );
  }
}
