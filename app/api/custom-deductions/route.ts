import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { customDeductions } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { getSession } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.orgId) {
      return NextResponse.json({ error: 'No organisation selected' }, { status: 400 });
    }

    const results = await db
      .select()
      .from(customDeductions)
      .where(eq(customDeductions.orgId, session.orgId))
      .orderBy(customDeductions.name);

    return NextResponse.json(results);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'admin' && session.role !== 'accountant')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.orgId) {
      return NextResponse.json({ error: 'No organisation selected' }, { status: 400 });
    }

    const body = await request.json();

    if (!body.name) {
      return NextResponse.json({ error: 'Deduction name is required' }, { status: 400 });
    }

    const result = await db.insert(customDeductions).values({
      name: body.name,
      description: body.description || null,
      deductionType: body.deductionType || 'fixed',
      isPensionContribution: body.isPensionContribution || false,
      isEmployerCost: body.isEmployerCost || false,
      orgId: session.orgId,
      isActive: true,
      createdAt: new Date().toISOString(),
    }).returning();

    const newDed = result[0];

    await logAudit({
      userId: session.userId,
      action: 'create',
      entity: 'custom_deduction',
      entityId: newDed.id,
      details: `Created custom deduction: ${newDed.name}`,
      orgId: session.orgId,
    });

    return NextResponse.json(newDed, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
