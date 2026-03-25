import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { statutoryRates } from '@/drizzle/schema';
import { eq, isNull, and } from 'drizzle-orm';
import { getSession } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

const RATE_KEYS = [
  'nssf_tier1_limit', 'nssf_tier2_limit', 'nssf_rate',
  'shif_rate', 'shif_minimum', 'ahl_rate',
  'personal_relief', 'pension_relief_cap', 'nita',
];

const DEFAULT_RATES: Record<string, number> = {
  nssf_tier1_limit: 9000,
  nssf_tier2_limit: 108000,
  nssf_rate: 6,
  shif_rate: 2.75,
  shif_minimum: 300,
  ahl_rate: 1.5,
  personal_relief: 2400,
  pension_relief_cap: 30000,
  nita: 50,
};

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current (no effectiveTo) rates
    const allRates = await db
      .select()
      .from(statutoryRates)
      .where(isNull(statutoryRates.effectiveTo));

    const ratesMap: Record<string, number> = { ...DEFAULT_RATES };
    allRates.forEach((r) => {
      if (RATE_KEYS.includes(r.rateKey)) {
        ratesMap[r.rateKey] = r.rateValue;
      }
    });

    return NextResponse.json({ rates: ratesMap });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { rates, effectiveFrom } = body as { rates: Record<string, number>; effectiveFrom: string };

    if (!rates || !effectiveFrom) {
      return NextResponse.json({ error: 'rates and effectiveFrom required' }, { status: 400 });
    }

    const now = new Date().toISOString();

    for (const key of RATE_KEYS) {
      if (rates[key] === undefined) continue;

      // Close the existing current rate (set effectiveTo)
      const existing = await db
        .select()
        .from(statutoryRates)
        .where(and(eq(statutoryRates.rateKey, key), isNull(statutoryRates.effectiveTo)));

      for (const ex of existing) {
        await db
          .update(statutoryRates)
          .set({ effectiveTo: effectiveFrom })
          .where(eq(statutoryRates.id, ex.id));
      }

      // Insert new rate
      await db.insert(statutoryRates).values({
        rateType: 'statutory',
        rateKey: key,
        rateValue: rates[key],
        effectiveFrom,
        effectiveTo: null,
        description: `Updated ${key}`,
        createdAt: now,
      });
    }

    await logAudit({
      userId: session.userId,
      action: 'update',
      entity: 'statutory_rates',
      details: `Updated rates effective ${effectiveFrom}: ${Object.keys(rates).join(', ')}`,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
